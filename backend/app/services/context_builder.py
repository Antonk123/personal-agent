import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.prompts import SYSTEM_PROMPT_TEMPLATE

logger = logging.getLogger(__name__)
from app.services.memory_service import MemoryService
from app.services.retrieval_service import RetrievalService


class ContextBuilder:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.memory_service = MemoryService(db)
        self.retrieval_service = RetrievalService(db)

    async def build_system_prompt(self, tenant_id: uuid.UUID, user_message: str) -> str:
        """Backward-compatible: returns only the prompt."""
        prompt, _ = await self.build_with_refs(tenant_id, user_message)
        return prompt

    async def build_with_refs(
        self, tenant_id: uuid.UUID, user_message: str
    ) -> tuple[str, list[dict]]:
        """Build system prompt AND list of refs that were injected.

        Each ref is `{type, id, label}` and represents a memory item the agent had
        access to when generating the response. Used for per-message reference
        rendering in the UI.
        """
        profile = await self.memory_service.get_profile(tenant_id)
        assignments = await self.memory_service.list_assignments(tenant_id, status="active")

        try:
            retrieved = await self.retrieval_service.retrieve_context(tenant_id, user_message)
        except Exception as exc:
            logger.warning("Retrieval failed for tenant %s: %s", tenant_id, exc)
            retrieved = []

        profile_context = self._format_profile(profile)
        assignments_context = self._format_assignments(assignments)
        retrieved_context = self._format_retrieved(retrieved)
        preference_instructions = self._format_preferences(profile)

        user_name = profile.company_name if profile else "användaren"
        company_name = profile.company_name if profile else "företaget"
        role_context = ""
        if profile and profile.role:
            role_context = f"Användaren arbetar som {profile.role}."
        if profile and profile.services:
            role_context += f" Tjänster: {', '.join(profile.services)}."

        prompt = SYSTEM_PROMPT_TEMPLATE.format(
            user_name=user_name,
            company_name=company_name,
            role_context=role_context,
            profile_context=profile_context,
            assignments_context=assignments_context,
            retrieved_context=retrieved_context,
            preference_instructions=preference_instructions,
        )

        refs = self._collect_refs(assignments, retrieved)
        return prompt, refs

    def _collect_refs(self, assignments, retrieved: list[dict]) -> list[dict]:
        """Dedupe and produce frontend-friendly ref dicts."""
        seen: set[tuple[str, str]] = set()
        refs: list[dict] = []
        for a in assignments:
            key = ("assignment", str(a.id))
            if key in seen:
                continue
            seen.add(key)
            refs.append({"type": "assignment", "id": str(a.id), "label": a.name})
        for r in retrieved:
            key = (r.get("type", "memory"), r.get("entity_id", ""))
            if not key[1] or key in seen:
                continue
            seen.add(key)
            label = r.get("content", "")
            # short label: first chunk after colon, else first 60 chars
            if ":" in label:
                label = label.split(":", 1)[1].split("|", 1)[0].strip()
            label = label[:80]
            refs.append({"type": r["type"], "id": r["entity_id"], "label": label})
        return refs

    def _format_profile(self, profile) -> str:
        if not profile:
            return "Ingen profil skapad ännu."
        parts = []
        if profile.company_name:
            parts.append(f"- Företag: {profile.company_name}")
        if profile.company_description:
            parts.append(f"- Beskrivning: {profile.company_description}")
        if profile.role:
            parts.append(f"- Roll: {profile.role}")
        if profile.services:
            parts.append(f"- Tjänster: {', '.join(profile.services)}")
        if profile.terminology:
            terms = [f"{k}: {v}" for k, v in profile.terminology.items()]
            parts.append(f"- Terminologi: {', '.join(terms)}")
        return "\n".join(parts) if parts else "Grundläggande profil, detaljer saknas."

    def _format_assignments(self, assignments) -> str:
        if not assignments:
            return "Inga aktiva uppdrag registrerade."
        parts = []
        for a in assignments:
            line = f"- **{a.name}**"
            if a.role:
                line += f" (Roll: {a.role})"
            if a.client:
                line += f" | Beställare: {a.client}"
            if a.phase:
                line += f" | Fas: {a.phase}"
            parts.append(line)
        return "\n".join(parts)

    def _format_retrieved(self, retrieved: list[dict]) -> str:
        if not retrieved:
            return "Ingen specifik kontext hittad för denna fråga."
        parts = [f"- [{r['type']}] {r['content']}" for r in retrieved]
        return "\n".join(parts)

    def _format_preferences(self, profile) -> str:
        if not profile or not profile.preferences:
            return ""
        parts = []
        prefs = profile.preferences
        if prefs.get("style"):
            parts.append(f"- Svarsstil: {prefs['style']}")
        if prefs.get("format"):
            parts.append(f"- Format: {prefs['format']}")
        return "\n".join(parts)
