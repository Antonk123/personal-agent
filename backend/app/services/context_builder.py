import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.prompts import SYSTEM_PROMPT_TEMPLATE
from app.services.memory_service import MemoryService
from app.services.retrieval_service import RetrievalService


class ContextBuilder:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.memory_service = MemoryService(db)
        self.retrieval_service = RetrievalService(db)

    async def build_system_prompt(self, tenant_id: uuid.UUID, user_message: str) -> str:
        """Build a complete system prompt with all relevant context."""
        profile = await self.memory_service.get_profile(tenant_id)
        assignments = await self.memory_service.list_assignments(tenant_id, status="active")

        # Retrieve relevant context
        try:
            retrieved = await self.retrieval_service.retrieve_context(tenant_id, user_message)
        except Exception:
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

        return SYSTEM_PROMPT_TEMPLATE.format(
            user_name=user_name,
            company_name=company_name,
            role_context=role_context,
            profile_context=profile_context,
            assignments_context=assignments_context,
            retrieved_context=retrieved_context,
            preference_instructions=preference_instructions,
        )

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
