import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.auth import MagicLink, Session
from app.models.tenant import Tenant

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def request_magic_link(self, email: str) -> tuple[str, str] | None:
        """Create a magic link for the given email.

        Returns a ``(token, code)`` tuple on success, or ``None`` if the email
        does not match a tenant. The token is the long-lived UUID used in the
        emailed URL; the code is a 6-digit numeric one-time code that can be
        pasted directly into the PWA when the link opens in the wrong browser.
        """
        result = await self.db.execute(select(Tenant).where(Tenant.email == email))
        tenant = result.scalar_one_or_none()

        if not tenant:
            return None

        token = str(uuid.uuid4())
        code = f"{secrets.randbelow(1_000_000):06d}"
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.magic_link_expiry_minutes
        )

        link = MagicLink(
            tenant_id=tenant.id,
            token=token,
            code=code,
            expires_at=expires_at,
        )
        self.db.add(link)
        await self.db.flush()

        return token, code

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

    async def verify_code(self, email: str, code: str) -> Session | None:
        """Verify a 6-digit code paired with an email and create a session.

        Returns ``None`` if no tenant matches the email, or no unused, unexpired
        magic link exists with the given code for that tenant.
        """
        tenant_result = await self.db.execute(
            select(Tenant).where(Tenant.email == email)
        )
        tenant = tenant_result.scalar_one_or_none()
        if not tenant:
            logger.info("verify_code: no tenant for %s", email)
            return None

        now = datetime.now(timezone.utc)
        link_result = await self.db.execute(
            select(MagicLink)
            .where(MagicLink.tenant_id == tenant.id)
            .where(MagicLink.code == code)
            .where(MagicLink.used.is_(False))
            .where(MagicLink.expires_at > now)
            .order_by(MagicLink.created_at.desc())
        )
        link = link_result.scalars().first()

        if not link:
            logger.info("verify_code: no valid code for tenant %s", tenant.id)
            return None

        link.used = True

        session_token = str(uuid.uuid4())
        expires_at = now + timedelta(days=settings.session_expiry_days)

        session = Session(
            tenant_id=link.tenant_id, token=session_token, expires_at=expires_at
        )
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
