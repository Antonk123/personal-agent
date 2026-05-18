import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assignment import Assignment, Contact
from app.models.memory import MemoryFragment
from app.utils.embeddings import generate_embedding


class RetrievalService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_embedding(self, text: str) -> list[float]:
        """Get embedding for text. Separated for easy mocking in tests."""
        return await generate_embedding(text)

    async def entity_search(self, tenant_id: uuid.UUID, query: str) -> list[dict]:
        """Search for known entities mentioned in the query."""
        results = []
        query_lower = query.lower()

        # Search assignments
        assignments = await self.db.execute(
            select(Assignment).where(
                Assignment.tenant_id == tenant_id, Assignment.status == "active"
            )
        )
        for assignment in assignments.scalars():
            if assignment.name.lower() in query_lower:
                results.append(
                    {
                        "type": "assignment",
                        "content": (
                            f"Uppdrag: {assignment.name} | Roll: {assignment.role or 'ej angiven'} | "
                            f"Beställare: {assignment.client or 'ej angiven'} | Fas: {assignment.phase or 'ej angiven'}"
                        ),
                        "relevance": 1.0,
                        "entity_id": str(assignment.id),
                    }
                )

        # Search contacts
        contacts = await self.db.execute(
            select(Contact).where(Contact.tenant_id == tenant_id)
        )
        for contact in contacts.scalars():
            if contact.name.lower() in query_lower:
                results.append(
                    {
                        "type": "contact",
                        "content": (
                            f"Kontakt: {contact.name} | Företag: {contact.company or 'ej angivet'} | "
                            f"Roll: {contact.role or 'ej angiven'}"
                        ),
                        "relevance": 1.0,
                        "entity_id": str(contact.id),
                    }
                )

        return results

    async def semantic_search(
        self, tenant_id: uuid.UUID, query: str, limit: int = 5
    ) -> list[dict]:
        """Search memory fragments using vector similarity."""
        query_embedding = await self._get_embedding(query)

        result = await self.db.execute(
            select(MemoryFragment)
            .where(MemoryFragment.tenant_id == tenant_id)
            .order_by(MemoryFragment.embedding.cosine_distance(query_embedding))
            .limit(limit)
        )

        fragments = result.scalars().all()
        return [
            {
                "type": "memory",
                "content": f.content,
                "category": f.category,
                "relevance": 0.8,
                "entity_id": str(f.id),
            }
            for f in fragments
        ]

    async def retrieve_context(
        self, tenant_id: uuid.UUID, query: str, max_tokens: int = 2000
    ) -> list[dict]:
        """Retrieve relevant context combining entity and semantic search."""
        entity_results = await self.entity_search(tenant_id, query)

        # Only do semantic search if we have embeddings
        semantic_results = []
        try:
            semantic_results = await self.semantic_search(tenant_id, query)
        except Exception:
            pass  # No embeddings yet or API unavailable

        # Combine and deduplicate
        all_results = entity_results + semantic_results
        seen_ids = set()
        unique_results = []
        for r in all_results:
            if r["entity_id"] not in seen_ids:
                seen_ids.add(r["entity_id"])
                unique_results.append(r)

        unique_results.sort(key=lambda x: x["relevance"], reverse=True)

        # Trim to token budget
        char_budget = max_tokens * 4
        trimmed = []
        total_chars = 0
        for r in unique_results:
            if total_chars + len(r["content"]) > char_budget:
                break
            trimmed.append(r)
            total_chars += len(r["content"])

        return trimmed
