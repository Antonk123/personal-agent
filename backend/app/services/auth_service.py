import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.auth import MagicLink, Session
from app.models.tenant import Tenant


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def request_magic_link(self, email: str) -> str | None:
        """Create a magic link for the given email. Returns token or None if not found."""
        result = await self.db.execute(select(Tenant).where(Tenant.email == email))
        tenant = result.scalar_one_or_none()

        if not tenant:
            return None

        token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.magic_link_expiry_minutes
        )

        link = MagicLink(tenant_id=tenant.id, token=token, expires_at=expires_at)
        self.db.add(link)
        await self.db.flush()

        return token

    async def verify_magic_link(self, token: str) -> Session | None:
        """Verify a magic link and create a session."""
        result = await self.db.execute(select(MagicLink).where(MagicLink.token == token))
        link = result.scalar_one_or_none()

        if not link:
            return None
        if link.used:
            return None
        if link.expires_at < datetime.now(timezone.utc):
            return None

        link.used = True

        session_token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.session_expiry_days)

        session = Session(tenant_id=link.tenant_id, token=session_token, expires_at=expires_at)
        self.db.add(session)
        await self.db.flush()

        return session

    async def validate_session(self, token: str) -> uuid.UUID | None:
        """Validate a session token. Returns tenant_id or None."""
        result = await self.db.execute(select(Session).where(Session.token == token))
        session = result.scalar_one_or_none()

        if not session:
            return None
        if session.expires_at < datetime.now(timezone.utc):
            return None

        return session.tenant_id
