import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.tenant import get_current_tenant
from app.models.assignment import Assignment, Contact, Decision
from app.models.memory import MemoryFragment
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
    fragments_count = await db.scalar(
        select(func.count())
        .select_from(MemoryFragment)
        .where(MemoryFragment.tenant_id == tenant_id)
    )
    return {
        "assignments": int(assignments_count or 0),
        "contacts": int(contacts_count or 0),
        "decisions": int(decisions_count or 0),
        "fragments": int(fragments_count or 0),
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


# ---------------------------------------------------------------------------
# DELETE endpoints — tenant-scoped, 204 on success, 404 if not found.
# Assignment-delete orphans linked contacts/decisions (assignment_id → NULL)
# rather than cascading, so the data survives if the user only wants to
# tear down the project-level container.
# ---------------------------------------------------------------------------


async def _delete_owned(
    db: AsyncSession,
    model,
    entity_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> None:
    result = await db.execute(
        select(model).where(model.id == entity_id, model.tenant_id == tenant_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
    await db.execute(delete(model).where(model.id == entity_id))


@router.delete("/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    assignment_id: uuid.UUID,
    tenant_id: uuid.UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Assignment).where(
            Assignment.id == assignment_id, Assignment.tenant_id == tenant_id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Assignment not found")
    # Orphan linked contacts and decisions instead of cascading the delete.
    await db.execute(
        update(Contact)
        .where(Contact.assignment_id == assignment_id)
        .values(assignment_id=None)
    )
    await db.execute(
        update(Decision)
        .where(Decision.assignment_id == assignment_id)
        .values(assignment_id=None)
    )
    await db.execute(delete(Assignment).where(Assignment.id == assignment_id))
    await db.commit()
    return None


@router.delete("/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: uuid.UUID,
    tenant_id: uuid.UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    await _delete_owned(db, Contact, contact_id, tenant_id)
    await db.commit()
    return None


@router.delete("/decisions/{decision_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_decision(
    decision_id: uuid.UUID,
    tenant_id: uuid.UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    await _delete_owned(db, Decision, decision_id, tenant_id)
    await db.commit()
    return None


@router.delete("/fragments/{fragment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fragment(
    fragment_id: uuid.UUID,
    tenant_id: uuid.UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    await _delete_owned(db, MemoryFragment, fragment_id, tenant_id)
    await db.commit()
    return None


@router.get("/all")
async def list_all(
    tenant_id: uuid.UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Compact inventory of every memory entity belonging to the tenant.

    Used by the management UI to surface orphaned contacts/decisions and
    memory fragments that don't show up in the per-assignment view.
    Returns IDs + minimal display fields; full detail still lives on the
    typed endpoints.
    """
    assignments = (
        (
            await db.execute(
                select(Assignment).where(Assignment.tenant_id == tenant_id)
            )
        )
        .scalars()
        .all()
    )
    contacts = (
        (await db.execute(select(Contact).where(Contact.tenant_id == tenant_id)))
        .scalars()
        .all()
    )
    decisions = (
        (await db.execute(select(Decision).where(Decision.tenant_id == tenant_id)))
        .scalars()
        .all()
    )
    fragments = (
        (
            await db.execute(
                select(MemoryFragment).where(MemoryFragment.tenant_id == tenant_id)
            )
        )
        .scalars()
        .all()
    )
    return {
        "assignments": [
            {"id": str(a.id), "name": a.name, "status": a.status} for a in assignments
        ],
        "contacts": [
            {
                "id": str(c.id),
                "name": c.name,
                "company": c.company,
                "assignment_id": str(c.assignment_id) if c.assignment_id else None,
            }
            for c in contacts
        ],
        "decisions": [
            {
                "id": str(d.id),
                "summary": d.summary,
                "assignment_id": str(d.assignment_id) if d.assignment_id else None,
            }
            for d in decisions
        ],
        "fragments": [
            {"id": str(f.id), "content": f.content[:120], "category": f.category}
            for f in fragments
        ],
    }
