import logging
import re
import uuid

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assignment import Assignment, Contact, Decision
from app.models.memory import MemoryFragment
from app.utils.embeddings import generate_embedding

logger = logging.getLogger(__name__)


def _keywords(text: str, min_len: int = 4) -> list[str]:
    """Plocka ut nyckelord ur query för LIKE-sökning."""
    tokens = re.findall(r"\w+", text.lower())
    stop = {"och", "att", "med", "för", "den", "det", "som", "vad", "hur", "har", "kan"}
    return [t for t in tokens if len(t) >= min_len and t not in stop]


class RetrievalService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_embedding(self, text: str) -> list[float]:
        """Get embedding for a search query. Separated for easy mocking in tests."""
        return await generate_embedding(text, input_type="query")

    async def entity_search(self, tenant_id: uuid.UUID, query: str) -> list[dict]:
        """Search for known entities mentioned in the query.

        Matchar både exakt-substring (assignment-namn) och nyckelord (decisions,
        contacts, fragments) så att även frågor som inte använder entiteters
        kanoniska namn kan surfa relevant kontext.
        """
        results = []
        query_lower = query.lower()
        keywords = _keywords(query)

        # Assignments — namn-substring som tidigare. Bredda till keyword-match
        # mot name/role/client/phase så att frågor som inte använder uppdragets
        # exakta namn också kan surfa det.
        matched_assignment_ids: set[uuid.UUID] = set()
        assignments = await self.db.execute(
            select(Assignment).where(
                Assignment.tenant_id == tenant_id, Assignment.status == "active"
            )
        )
        for assignment in assignments.scalars():
            blob = " ".join(
                filter(
                    None,
                    [
                        assignment.name,
                        assignment.role or "",
                        assignment.client or "",
                        assignment.phase or "",
                    ],
                )
            ).lower()
            hit_by_name = assignment.name.lower() in query_lower
            hit_by_kw = any(kw in blob for kw in keywords)
            if hit_by_name or hit_by_kw:
                matched_assignment_ids.add(assignment.id)
                results.append(
                    {
                        "type": "assignment",
                        "content": (
                            f"Uppdrag: {assignment.name} | Roll: {assignment.role or 'ej angiven'} | "
                            f"Beställare: {assignment.client or 'ej angiven'} | Fas: {assignment.phase or 'ej angiven'}"
                        ),
                        "relevance": 1.0 if hit_by_name else 0.7,
                        "entity_id": str(assignment.id),
                    }
                )

        # Contacts — direkt-match (namn/företag/notes) + transitiv match
        # via länkat assignment (om en assignment surfades så följ med dess
        # kontakter, även om kontaktens egna fält inte matchar nyckelord).
        contacts = await self.db.execute(
            select(Contact).where(Contact.tenant_id == tenant_id)
        )
        for contact in contacts.scalars():
            blob = " ".join(
                filter(
                    None,
                    [
                        contact.name,
                        contact.company or "",
                        contact.role or "",
                        contact.notes or "",
                    ],
                )
            ).lower()
            hit_by_name = contact.name.lower() in query_lower
            hit_by_kw = any(kw in blob for kw in keywords)
            hit_by_assignment = (
                contact.assignment_id is not None
                and contact.assignment_id in matched_assignment_ids
            )
            if hit_by_name or hit_by_kw or hit_by_assignment:
                if hit_by_name:
                    relevance = 1.0
                elif hit_by_kw:
                    relevance = 0.6
                else:
                    relevance = 0.5
                results.append(
                    {
                        "type": "contact",
                        "content": (
                            f"Kontakt: {contact.name} | Företag: {contact.company or 'ej angivet'} | "
                            f"Roll: {contact.role or 'ej angiven'}"
                            + (f" | Anteckning: {contact.notes}" if contact.notes else "")
                        ),
                        "relevance": relevance,
                        "entity_id": str(contact.id),
                    }
                )

        # Decisions — text-sök på summary/context (fungerar utan embeddings)
        if keywords:
            ilike_clauses = []
            for kw in keywords[:8]:
                like = f"%{kw}%"
                ilike_clauses.append(Decision.summary.ilike(like))
                ilike_clauses.append(Decision.context.ilike(like))
            decisions = await self.db.execute(
                select(Decision)
                .where(Decision.tenant_id == tenant_id, or_(*ilike_clauses))
                .limit(5)
            )
            for d in decisions.scalars():
                results.append(
                    {
                        "type": "decision",
                        "content": (
                            f"Beslut: {d.summary}"
                            + (f" | Kontext: {d.context}" if d.context else "")
                        ),
                        "relevance": 0.7,
                        "entity_id": str(d.id),
                    }
                )

        # Memory fragments — text-sök på content (fallback när embeddings saknas)
        if keywords:
            frag_clauses = [MemoryFragment.content.ilike(f"%{kw}%") for kw in keywords[:8]]
            fragments = await self.db.execute(
                select(MemoryFragment)
                .where(MemoryFragment.tenant_id == tenant_id, or_(*frag_clauses))
                .limit(5)
            )
            for f in fragments.scalars():
                results.append(
                    {
                        "type": "memory",
                        "content": f.content,
                        "category": f.category,
                        "relevance": 0.65,
                        "entity_id": str(f.id),
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
        except Exception as exc:
            logger.info(
                "Semantic search skipped (embeddings unavailable): %s", exc
            )

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
