from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
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
