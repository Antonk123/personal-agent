"""Service for importing conversations from ChatGPT and Claude exports."""
import json
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.models.conversation import Conversation, Message
from app.services.extraction_service import ExtractionService


class ImportService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.extraction_service = ExtractionService(db)

    async def import_chatgpt(self, tenant_id: uuid.UUID, raw_content: bytes) -> dict:
        """Import ChatGPT export format.

        ChatGPT export is a JSON array of conversations, each with:
        {
            "title": "...",
            "mapping": {
                "<node_id>": {
                    "message": {
                        "author": {"role": "user"|"assistant"|"system"},
                        "content": {"parts": ["..."]}
                    }
                }
            }
        }
        """
        try:
            data = json.loads(raw_content)
        except json.JSONDecodeError:
            return {"error": "Invalid JSON file", "imported": 0}

        if not isinstance(data, list):
            return {"error": "Expected a JSON array of conversations", "imported": 0}

        imported_count = 0
        extracted_count = 0

        for conv_data in data:
            title = conv_data.get("title", "Imported from ChatGPT")
            mapping = conv_data.get("mapping", {})

            # Extract messages from ChatGPT's tree structure
            messages = self._extract_chatgpt_messages(mapping)

            if not messages:
                continue

            # Create conversation
            conversation = Conversation(tenant_id=tenant_id, title=title)
            self.db.add(conversation)
            await self.db.flush()

            # Store messages
            for msg in messages:
                db_msg = Message(
                    conversation_id=conversation.id,
                    tenant_id=tenant_id,
                    role=msg["role"],
                    content=msg["content"],
                )
                self.db.add(db_msg)

            await self.db.flush()
            imported_count += 1

            # Run extraction on conversation (batch: process last messages)
            if len(messages) > 1:
                try:
                    # Extract from chunks of 6 messages to stay within context
                    for i in range(0, len(messages), 6):
                        chunk = messages[i : i + 6]
                        await self.extraction_service.extract(tenant_id, chunk)
                        extracted_count += 1
                except Exception as exc:
                    logger.warning("Extraction failed during import: %s", exc)

        return {
            "imported_conversations": imported_count,
            "extraction_runs": extracted_count,
            "source": "chatgpt",
        }

    async def import_claude(self, tenant_id: uuid.UUID, raw_content: bytes) -> dict:
        """Import Claude export format.

        Expected format (flexible):
        [
            {
                "name": "Conversation title",
                "messages": [
                    {"role": "user", "content": "..."},
                    {"role": "assistant", "content": "..."}
                ]
            }
        ]

        Also supports the format from Claude's chat_conversations.json export.
        """
        try:
            data = json.loads(raw_content)
        except json.JSONDecodeError:
            return {"error": "Invalid JSON file", "imported": 0}

        if not isinstance(data, list):
            # Try wrapping single conversation
            data = [data]

        imported_count = 0
        extracted_count = 0

        for conv_data in data:
            # Support both "name" and "title" fields
            title = conv_data.get("name", conv_data.get("title", "Imported from Claude"))

            # Support both "chat_messages" (Claude export) and "messages" (generic)
            messages_raw = conv_data.get("chat_messages", conv_data.get("messages", []))

            messages = []
            for msg in messages_raw:
                role = msg.get("sender", msg.get("role", ""))
                # Claude exports use "human"/"assistant", normalize
                if role == "human":
                    role = "user"
                if role not in ("user", "assistant"):
                    continue

                # Content can be string or structured
                content = msg.get("text", msg.get("content", ""))
                if isinstance(content, list):
                    # Handle content blocks (Claude format)
                    text_parts = [
                        p.get("text", "") for p in content if isinstance(p, dict) and p.get("type") == "text"
                    ]
                    content = "\n".join(text_parts)

                if not content or not content.strip():
                    continue

                messages.append({"role": role, "content": content.strip()})

            if not messages:
                continue

            # Create conversation
            conversation = Conversation(tenant_id=tenant_id, title=title)
            self.db.add(conversation)
            await self.db.flush()

            # Store messages
            for msg in messages:
                db_msg = Message(
                    conversation_id=conversation.id,
                    tenant_id=tenant_id,
                    role=msg["role"],
                    content=msg["content"],
                )
                self.db.add(db_msg)

            await self.db.flush()
            imported_count += 1

            # Run extraction
            if len(messages) > 1:
                try:
                    for i in range(0, len(messages), 6):
                        chunk = messages[i : i + 6]
                        await self.extraction_service.extract(tenant_id, chunk)
                        extracted_count += 1
                except Exception:
                    pass

        return {
            "imported_conversations": imported_count,
            "extraction_runs": extracted_count,
            "source": "claude",
        }

    def _extract_chatgpt_messages(self, mapping: dict) -> list[dict]:
        """Extract ordered messages from ChatGPT's tree/mapping structure."""
        messages = []

        # Build parent-child chain to get ordered messages
        nodes = []
        for node_id, node_data in mapping.items():
            msg = node_data.get("message")
            if not msg:
                continue

            author_role = msg.get("author", {}).get("role", "")
            if author_role not in ("user", "assistant"):
                continue

            content_parts = msg.get("content", {}).get("parts", [])
            content = "\n".join(str(p) for p in content_parts if isinstance(p, str))

            if not content.strip():
                continue

            create_time = msg.get("create_time", 0) or 0
            nodes.append(
                {"role": author_role, "content": content.strip(), "time": create_time}
            )

        # Sort by creation time
        nodes.sort(key=lambda x: x["time"])

        return [{"role": n["role"], "content": n["content"]} for n in nodes]
