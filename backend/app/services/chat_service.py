import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.llm.adapter import LLMResponse
from app.llm.claude_adapter import ClaudeAdapter
from app.models.conversation import Conversation, Message
from app.services.context_builder import ContextBuilder
from app.services.extraction_service import ExtractionService


class ChatService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.context_builder = ContextBuilder(db)
        self.extraction_service = ExtractionService(db)

    async def _generate_response(self, system_prompt: str, messages: list[dict]) -> LLMResponse:
        """Generate LLM response."""
        adapter = ClaudeAdapter(api_key=settings.anthropic_api_key, model=settings.default_model)
        return await adapter.generate(system_prompt=system_prompt, messages=messages)

    async def _run_extraction(self, tenant_id: uuid.UUID, messages: list[dict]):
        """Run memory extraction."""
        try:
            await self.extraction_service.extract(tenant_id, messages)
        except Exception:
            pass  # Don't fail chat if extraction fails

    async def send_message(
        self,
        tenant_id: uuid.UUID,
        message: str,
        conversation_id: uuid.UUID | None = None,
    ) -> dict:
        """Send a message and get a response."""
        if conversation_id:
            conversation = await self._get_conversation(tenant_id, conversation_id)
        else:
            conversation = await self._create_conversation(tenant_id)

        # Store user message
        user_msg = Message(
            conversation_id=conversation.id,
            tenant_id=tenant_id,
            role="user",
            content=message,
        )
        self.db.add(user_msg)
        await self.db.flush()

        # Get conversation history
        history = await self._get_history(conversation.id)

        # Build system prompt with context
        system_prompt = await self.context_builder.build_system_prompt(tenant_id, message)

        # Format messages for LLM
        llm_messages = [{"role": m.role, "content": m.content} for m in history]

        # Generate response
        response = await self._generate_response(system_prompt, llm_messages)

        # Store assistant message
        assistant_msg = Message(
            conversation_id=conversation.id,
            tenant_id=tenant_id,
            role="assistant",
            content=response.content,
            metadata_={"model": response.model, "tokens": response.total_tokens},
        )
        self.db.add(assistant_msg)
        await self.db.flush()

        # Run extraction on recent messages
        recent = [{"role": m.role, "content": m.content} for m in history[-3:]]
        recent.append({"role": "assistant", "content": response.content})
        await self._run_extraction(tenant_id, recent)

        return {
            "conversation_id": str(conversation.id),
            "response": response.content,
            "tokens_used": response.total_tokens,
        }

    async def _create_conversation(self, tenant_id: uuid.UUID) -> Conversation:
        conversation = Conversation(tenant_id=tenant_id)
        self.db.add(conversation)
        await self.db.flush()
        await self.db.refresh(conversation)
        return conversation

    async def _get_conversation(
        self, tenant_id: uuid.UUID, conversation_id: uuid.UUID
    ) -> Conversation:
        result = await self.db.execute(
            select(Conversation).where(
                Conversation.id == conversation_id, Conversation.tenant_id == tenant_id
            )
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            return await self._create_conversation(tenant_id)
        return conversation

    async def _get_history(self, conversation_id: uuid.UUID, limit: int = 20) -> list[Message]:
        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_conversations(
        self, tenant_id: uuid.UUID, limit: int = 20
    ) -> list[Conversation]:
        result = await self.db.execute(
            select(Conversation)
            .where(Conversation.tenant_id == tenant_id)
            .order_by(Conversation.updated_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_messages(
        self, tenant_id: uuid.UUID, conversation_id: uuid.UUID
    ) -> list[Message]:
        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id, Message.tenant_id == tenant_id)
            .order_by(Message.created_at.asc())
        )
        return list(result.scalars().all())
