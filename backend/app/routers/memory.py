import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.tenant import get_current_tenant
from app.models.assignment import Assignment, Contact, Decision
from app.services.memory_service import MemoryService

router = APIRouter(prefix="/memory", tags=["memory"])


class ProfileUpdate(BaseModel):
    company_name: str | None = None
    company_description: str | None = None
    role: str | None = None
    services: list[str] | None = None
    preferences: dict | None = None
    terminology: dict | None = None


class AssignmentCreate(BaseModel):
    name: str
    role: str | None = None
    client: str | None = None
    phase: str | None = None
    notes: str | None = None


class ContactCreate(BaseModel):
    name: str
    company: str | None = None
    role: str | None = None
    phone: str | None = None
    email: str | None = None
    notes: str | None = None


class DecisionCreate(BaseModel):
    summary: str
    context: str | None = None


@router.get("/stats")
async def get_stats(
    tenant_id: uuid.UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    assignments_count = await db.scalar(
        select(func.count()).select_from(Assignment).where(Assignment.tenant_id == tenant_id)
    )
    contacts_count = await db.scalar(
        select(func.count()).select_from(Contact).where(Contact.tenant_id == tenant_id)
    )
    decisions_count = await db.scalar(
        select(func.count()).select_from(Decision).where(Decision.tenant_id == tenant_id)
    )
    return {
        "assignments": int(assignments_count or 0),
        "contacts": int(contacts_count or 0),
        "decisions": int(decisions_count or 0),
    }


@router.get("/profile")
async def get_profile(
    tenant_id: uuid.UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    service = MemoryService(db)
    profile = await service.get_profile(tenant_id)
    if not profile:
        return {}
    return {
        "company_name": profile.company_name,
        "company_description": profile.company_description,
        "role": profile.role,
        "services": profile.services,
        "preferences": profile.preferences,
        "terminology": profile.terminology,
        "onboarding_completed": profile.onboarding_completed,
    }


@router.put("/profile")
async def update_profile(
    body: ProfileUpdate,
    tenant_id: uuid.UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    service = MemoryService(db)
    profile = await service.create_or_update_profile(tenant_id, body.model_dump(exclude_none=True))
    return {
        "company_name": profile.company_name,
        "role": profile.role,
        "services": profile.services,
        "preferences": profile.preferences,
    }


@router.get("/assignments")
async def list_assignments(
    status: str | None = None,
    tenant_id: uuid.UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    service = MemoryService(db)
    assignments = await service.list_assignments(tenant_id, status=status)
    return [
        {
            "id": str(a.id),
            "name": a.name,
            "role": a.role,
            "client": a.client,
            "phase": a.phase,
            "status": a.status,
        }
        for a in assignments
    ]


@router.post("/assignments")
async def create_assignment(
    body: AssignmentCreate,
    tenant_id: uuid.UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    service = MemoryService(db)
    a = await service.create_assignment(tenant_id, body.model_dump(exclude_none=True))
    return {"id": str(a.id), "name": a.name, "role": a.role, "client": a.client}


@router.get("/assignments/{assignment_id}")
async def get_assignment(
    assignment_id: uuid.UUID,
    tenant_id: uuid.UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    service = MemoryService(db)
    a = await service.get_assignment(tenant_id, assignment_id)
    if not a:
        return {}
    return {
        "id": str(a.id),
        "name": a.name,
        "role": a.role,
        "client": a.client,
        "phase": a.phase,
        "status": a.status,
        "contacts": [
            {"id": str(c.id), "name": c.name, "company": c.company, "role": c.role}
            for c in a.contacts
        ],
        "decisions": [
            {"id": str(d.id), "summary": d.summary, "decided_at": d.decided_at.isoformat()}
            for d in a.decisions
        ],
    }


@router.post("/assignments/{assignment_id}/contacts")
async def add_contact(
    assignment_id: uuid.UUID,
    body: ContactCreate,
    tenant_id: uuid.UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    service = MemoryService(db)
    c = await service.add_contact(tenant_id, body.model_dump(exclude_none=True), assignment_id)
    return {"id": str(c.id), "name": c.name, "company": c.company}


@router.post("/assignments/{assignment_id}/decisions")
async def add_decision(
    assignment_id: uuid.UUID,
    body: DecisionCreate,
    tenant_id: uuid.UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    service = MemoryService(db)
    d = await service.add_decision(tenant_id, body.model_dump(exclude_none=True), assignment_id)
    return {"id": str(d.id), "summary": d.summary}
