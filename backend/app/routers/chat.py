import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.tenant import get_current_tenant
from app.models.conversation import Conversation, Message
from app.services.chat_service import ChatService

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


class RefItem(BaseModel):
    type: str
    id: str
    label: str


class ChatResponse(BaseModel):
    conversation_id: str
    response: str
    tokens_used: int
    refs: list[RefItem] = []
    message_id: str | None = None


@router.post("/", response_model=ChatResponse)
async def send_message(
    body: ChatRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    service = ChatService(db)
    conv_id = uuid.UUID(body.conversation_id) if body.conversation_id else None
    result = await service.send_message(
        tenant_id=tenant_id,
        message=body.message,
        conversation_id=conv_id,
    )
    return ChatResponse(**result)


@router.post("/conversations/{conversation_id}/regenerate", response_model=ChatResponse)
async def regenerate_response(
    conversation_id: uuid.UUID,
    tenant_id: uuid.UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Regenerate the last assistant response for a conversation."""
    service = ChatService(db)
    try:
        result = await service.regenerate_last(
            tenant_id=tenant_id,
            conversation_id=conversation_id,
        )
    except ValueError as exc:
        reason = str(exc)
        if reason == "conversation_not_found":
            raise HTTPException(status_code=404, detail="Conversation not found") from exc
        raise HTTPException(status_code=400, detail="No user message to regenerate from") from exc
    return ChatResponse(**result)


@router.post("/conversations/backfill-titles")
async def backfill_titles(
    tenant_id: uuid.UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Generera titlar för konversationer utan titel (för tenant)."""
    service = ChatService(db)
    count = await service.backfill_titles(tenant_id)
    return {"updated": count}


@router.get("/conversations")
async def list_conversations(
    tenant_id: uuid.UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    service = ChatService(db)
    conversations = await service.get_conversations(tenant_id)
    return [
        {"id": str(c.id), "title": c.title, "updated_at": c.updated_at.isoformat()}
        for c in conversations
    ]


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: uuid.UUID,
    tenant_id: uuid.UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    service = ChatService(db)
    messages = await service.get_messages(tenant_id, conversation_id)
    return [
        {
            "id": str(m.id),
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at.isoformat(),
            "refs": (m.metadata_ or {}).get("refs", []) if m.role == "assistant" else [],
        }
        for m in messages
    ]


class UpdateConversation(BaseModel):
    title: str = Field(min_length=1, max_length=255)


@router.patch("/conversations/{conversation_id}")
async def update_conversation(
    conversation_id: uuid.UUID,
    body: UpdateConversation,
    tenant_id: uuid.UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Rename a conversation."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.tenant_id == tenant_id,
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.execute(
        update(Conversation)
        .where(Conversation.id == conversation_id)
        .values(title=body.title.strip())
    )
    await db.commit()
    return {"id": str(conversation_id), "title": body.title.strip()}


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: uuid.UUID,
    tenant_id: uuid.UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Delete a conversation and all its messages."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.tenant_id == tenant_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.execute(delete(Message).where(Message.conversation_id == conversation_id))
    await db.execute(delete(Conversation).where(Conversation.id == conversation_id))
    await db.commit()
    return None
