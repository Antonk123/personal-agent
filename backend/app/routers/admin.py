import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.tenant import get_current_tenant
from app.models.conversation import Conversation, Message
from app.models.memory import MemoryFragment
from app.models.profile import UserProfile
from app.models.tenant import Tenant
from app.services.memory_service import MemoryService

router = APIRouter(prefix="/admin", tags=["admin"])


class TenantCreate(BaseModel):
    name: str
    email: EmailStr


@router.post("/tenants")
async def create_tenant(body: TenantCreate, db: AsyncSession = Depends(get_db)):
    """Create a new tenant."""
    result = await db.execute(select(Tenant).where(Tenant.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    tenant = Tenant(name=body.name, email=body.email)
    db.add(tenant)
    await db.flush()
    await db.refresh(tenant)
    return {"id": str(tenant.id), "name": tenant.name, "email": tenant.email}


@router.get("/export")
async def export_data(
    tenant_id: uuid.UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Export all tenant data as JSON (GDPR compliance)."""
    profile_result = await db.execute(
        select(UserProfile).where(UserProfile.tenant_id == tenant_id)
    )
    profile = profile_result.scalar_one_or_none()

    mem_service = MemoryService(db)
    assignments = await mem_service.list_assignments(tenant_id)

    conv_result = await db.execute(
        select(Conversation).where(Conversation.tenant_id == tenant_id)
    )
    conversations = conv_result.scalars().all()

    msg_result = await db.execute(
        select(Message).where(Message.tenant_id == tenant_id).order_by(Message.created_at)
    )
    messages = msg_result.scalars().all()

    frag_result = await db.execute(
        select(MemoryFragment).where(MemoryFragment.tenant_id == tenant_id)
    )
    fragments = frag_result.scalars().all()

    return {
        "profile": {
            "company_name": profile.company_name if profile else None,
            "role": profile.role if profile else None,
            "services": profile.services if profile else None,
            "preferences": profile.preferences if profile else None,
            "terminology": profile.terminology if profile else None,
        },
        "assignments": [
            {"name": a.name, "role": a.role, "client": a.client, "phase": a.phase, "status": a.status}
            for a in assignments
        ],
        "conversations": [
            {
                "id": str(c.id),
                "title": c.title,
                "messages": [
                    {"role": m.role, "content": m.content, "created_at": m.created_at.isoformat()}
                    for m in messages
                    if m.conversation_id == c.id
                ],
            }
            for c in conversations
        ],
        "memory_fragments": [
            {"content": f.content, "category": f.category, "created_at": f.created_at.isoformat()}
            for f in fragments
        ],
    }
