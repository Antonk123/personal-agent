import uuid

from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.auth_service import AuthService


async def get_current_tenant(request: Request, db: AsyncSession = Depends(get_db)) -> uuid.UUID:
    """Extract tenant_id from session token in Authorization header."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = auth_header.removeprefix("Bearer ")
    service = AuthService(db)
    tenant_id = await service.validate_session(token)

    if not tenant_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    return tenant_id
