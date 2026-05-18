import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.auth import Session
from app.models.tenant import Tenant
from app.services.auth_service import AuthService
from app.utils.email import send_magic_link_email

router = APIRouter(prefix="/auth", tags=["auth"])


class MagicLinkRequest(BaseModel):
    email: EmailStr


class MagicLinkResponse(BaseModel):
    message: str


class SessionResponse(BaseModel):
    session_token: str
    expires_at: str


@router.post("/magic-link", response_model=MagicLinkResponse)
async def request_magic_link(body: MagicLinkRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    token = await service.request_magic_link(body.email)

    if token:
        try:
            await send_magic_link_email(body.email, token)
        except Exception:
            pass  # Log but don't reveal to user

    # Always return 200 to not reveal email existence
    return MagicLinkResponse(message="Magic link sent")


@router.get("/verify", response_model=SessionResponse)
async def verify_magic_link(token: str, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    session = await service.verify_magic_link(token)

    if not session:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    return SessionResponse(
        session_token=session.token, expires_at=session.expires_at.isoformat()
    )


class DevSeedResponse(BaseModel):
    session_token: str
    email: str
    message: str


@router.post("/dev-seed", response_model=DevSeedResponse)
async def dev_seed(db: AsyncSession = Depends(get_db)):
    """DEV ONLY: Create a test tenant and return a valid session token."""
    if "localhost" not in settings.app_url and "127.0.0.1" not in settings.app_url:
        raise HTTPException(status_code=403, detail="Only available in dev")

    test_email = "test@byggagent.dev"

    # Check if tenant already exists
    result = await db.execute(select(Tenant).where(Tenant.email == test_email))
    tenant = result.scalar_one_or_none()

    if not tenant:
        tenant = Tenant(name="Testföretag AB", email=test_email)
        db.add(tenant)
        await db.flush()

    # Create a long-lived session
    session_token = str(uuid.uuid4())
    session = Session(
        tenant_id=tenant.id,
        token=session_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=365),
    )
    db.add(session)
    await db.commit()

    return DevSeedResponse(
        session_token=session_token,
        email=test_email,
        message="Dev tenant created. Use this token as Bearer token.",
    )
