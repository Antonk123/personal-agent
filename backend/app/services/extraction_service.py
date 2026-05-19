import json
import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.llm.claude_adapter import ClaudeAdapter
from app.llm.prompts import EXTRACTION_PROMPT
from app.models.memory import MemoryFragment
from app.services.memory_service import MemoryService
from app.utils.embeddings import generate_embedding

logger = logging.getLogger(__name__)


class ExtractionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.memory_service = MemoryService(db)

    async def _call_llm(self, prompt: str) -> str:
        """Call LLM for extraction. Separated for mocking."""
        adapter = ClaudeAdapter(api_key=settings.anthropic_api_key, model=settings.default_model)
        response = await adapter.generate(
            system_prompt="Du är en informationsextraktor. Svara BARA med valid JSON.",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
        )
        return response.content

    async def extract(self, tenant_id: uuid.UUID, messages: list[dict]) -> dict:
        """Extract structured information from a conversation."""
        conversation_text = "\n".join(
            f"{m['role'].upper()}: {m['content']}" for m in messages
        )
        prompt = EXTRACTION_PROMPT.format(conversation=conversation_text)

        raw_response = await self._call_llm(prompt)

        try:
            cleaned = raw_response.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1]
                cleaned = cleaned.rsplit("```", 1)[0]
            extracted = json.loads(cleaned)
        except (json.JSONDecodeError, IndexError) as exc:
            logger.warning(
                "Extraction JSON parse failed: %s | raw response start: %r",
                exc,
                raw_response[:200],
            )
            return {"error": "Failed to parse extraction response"}

        await self._apply_extractions(tenant_id, extracted)
        return extracted

    async def _apply_extractions(self, tenant_id: uuid.UUID, extracted: dict):
        """Apply extracted information to the memory system."""
        # New contacts
        for contact_data in extracted.get("new_contacts", []):
            assignment_name = contact_data.pop("assignment", "")
            assignment_id = None
            if assignment_name:
                assignment_id = await self._find_assignment_id(tenant_id, assignment_name)
            await self.memory_service.add_contact(tenant_id, contact_data, assignment_id)

        # New decisions
        for decision_data in extracted.get("new_decisions", []):
            assignment_name = decision_data.pop("assignment", "")
            assignment_id = None
            if assignment_name:
                assignment_id = await self._find_assignment_id(tenant_id, assignment_name)
            await self.memory_service.add_decision(tenant_id, decision_data, assignment_id)

        # New assignments
        for assignment_data in extracted.get("new_assignments", []):
            await self.memory_service.create_assignment(tenant_id, assignment_data)

        # Memory fragments (with embeddings)
        fragments_in = extracted.get("memory_fragments", [])
        fragments_saved = 0
        for fragment_data in fragments_in:
            try:
                embedding = await generate_embedding(fragment_data["content"])
            except Exception as exc:
                logger.warning(
                    "Embedding failed (memory_fragment dropped — content: %r): %s",
                    fragment_data.get("content", "")[:100],
                    exc,
                )
                continue
            try:
                fragment = MemoryFragment(
                    tenant_id=tenant_id,
                    content=fragment_data["content"],
                    category=fragment_data.get("category", "fact"),
                    embedding=embedding,
                )
                self.db.add(fragment)
                fragments_saved += 1
            except Exception as exc:
                logger.warning("MemoryFragment insert failed: %s", exc)
        if fragments_in:
            logger.info(
                "Extraction: %d/%d memory_fragments saved (tenant=%s)",
                fragments_saved,
                len(fragments_in),
                tenant_id,
            )

        # Profile updates
        profile_updates = extracted.get("profile_updates", {})
        if profile_updates and any(profile_updates.values()):
            await self.memory_service.create_or_update_profile(tenant_id, profile_updates)

        await self.db.flush()

    async def _find_assignment_id(self, tenant_id: uuid.UUID, name: str) -> uuid.UUID | None:
        """Find assignment ID by name."""
        assignments = await self.memory_service.list_assignments(tenant_id)
        for a in assignments:
            if a.name.lower() == name.lower():
                return a.id
        return None
