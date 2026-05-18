"""Import conversations from ChatGPT and Claude exports to populate memory."""
import uuid

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.tenant import get_current_tenant
from app.services.import_service import ImportService

router = APIRouter(prefix="/import", tags=["import"])


@router.post("/chatgpt")
async def import_chatgpt(
    file: UploadFile = File(...),
    tenant_id: uuid.UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Import a ChatGPT conversations.json export file.

    Accepts the JSON file from ChatGPT Settings > Data controls > Export data.
    Parses conversations and runs memory extraction on each.
    """
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="File must be a .json file")

    content = await file.read()
    service = ImportService(db)
    result = await service.import_chatgpt(tenant_id, content)
    return result


@router.post("/claude")
async def import_claude(
    file: UploadFile = File(...),
    tenant_id: uuid.UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Import a Claude conversation export (JSON).

    Accepts JSON with array of conversations, each having messages with role/content.
    """
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="File must be a .json file")

    content = await file.read()
    service = ImportService(db)
    result = await service.import_claude(tenant_id, content)
    return result
