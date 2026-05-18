import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.assignment import Assignment, Contact, Decision
from app.models.profile import UserProfile


class MemoryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # --- Layer 1: Profile ---

    async def get_profile(self, tenant_id: uuid.UUID) -> UserProfile | None:
        result = await self.db.execute(
            select(UserProfile).where(UserProfile.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def create_or_update_profile(self, tenant_id: uuid.UUID, data: dict) -> UserProfile:
        profile = await self.get_profile(tenant_id)
        if profile:
            for key, value in data.items():
                if hasattr(profile, key) and value is not None:
                    setattr(profile, key, value)
        else:
            profile = UserProfile(tenant_id=tenant_id, **data)
            self.db.add(profile)
        await self.db.flush()
        await self.db.refresh(profile)
        return profile

    # --- Layer 2: Assignments ---

    async def create_assignment(self, tenant_id: uuid.UUID, data: dict) -> Assignment:
        assignment = Assignment(tenant_id=tenant_id, **data)
        self.db.add(assignment)
        await self.db.flush()
        await self.db.refresh(assignment)
        return assignment

    async def get_assignment(
        self, tenant_id: uuid.UUID, assignment_id: uuid.UUID
    ) -> Assignment | None:
        result = await self.db.execute(
            select(Assignment)
            .options(selectinload(Assignment.contacts), selectinload(Assignment.decisions))
            .where(Assignment.id == assignment_id, Assignment.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def list_assignments(
        self, tenant_id: uuid.UUID, status: str | None = None
    ) -> list[Assignment]:
        query = select(Assignment).where(Assignment.tenant_id == tenant_id)
        if status:
            query = query.where(Assignment.status == status)
        query = query.order_by(Assignment.updated_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_assignment(
        self, tenant_id: uuid.UUID, assignment_id: uuid.UUID, data: dict
    ) -> Assignment | None:
        assignment = await self.get_assignment(tenant_id, assignment_id)
        if not assignment:
            return None
        for key, value in data.items():
            if hasattr(assignment, key) and value is not None:
                setattr(assignment, key, value)
        await self.db.flush()
        await self.db.refresh(assignment)
        return assignment

    # --- Contacts ---

    async def add_contact(
        self, tenant_id: uuid.UUID, data: dict, assignment_id: uuid.UUID | None = None
    ) -> Contact:
        contact = Contact(tenant_id=tenant_id, assignment_id=assignment_id, **data)
        self.db.add(contact)
        await self.db.flush()
        await self.db.refresh(contact)
        return contact

    async def list_contacts(self, tenant_id: uuid.UUID) -> list[Contact]:
        result = await self.db.execute(
            select(Contact).where(Contact.tenant_id == tenant_id).order_by(Contact.name)
        )
        return list(result.scalars().all())

    # --- Decisions ---

    async def add_decision(
        self, tenant_id: uuid.UUID, data: dict, assignment_id: uuid.UUID | None = None
    ) -> Decision:
        decision = Decision(tenant_id=tenant_id, assignment_id=assignment_id, **data)
        self.db.add(decision)
        await self.db.flush()
        await self.db.refresh(decision)
        return decision

    async def list_decisions(
        self, tenant_id: uuid.UUID, assignment_id: uuid.UUID | None = None
    ) -> list[Decision]:
        query = select(Decision).where(Decision.tenant_id == tenant_id)
        if assignment_id:
            query = query.where(Decision.assignment_id == assignment_id)
        query = query.order_by(Decision.decided_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())
