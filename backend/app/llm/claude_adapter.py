from typing import AsyncGenerator

import anthropic

from app.llm.adapter import LLMAdapter, LLMResponse

# Server-side tools auto-executed by the API. Web search runs on Anthropic's
# infrastructure; we just opt in via the tool declaration and read the final
# text blocks back from response.content. `max_uses` caps how many times the
# model can call the tool in a single turn — bursts of 5+ sequential searches
# get expensive fast (each search ≈ 1-2k tokens of injected content + a
# per-search fee), and the user almost never benefits from more than 2-3.
DEFAULT_TOOLS = [
    {"type": "web_search_20250305", "name": "web_search", "max_uses": 3}
]


def _extract_text(content_blocks) -> str:
    """Concatenate text from response content blocks, ignoring tool-use blocks."""
    parts: list[str] = []
    for block in content_blocks:
        if getattr(block, "type", None) == "text":
            parts.append(block.text)
    return "".join(parts).strip()


class ClaudeAdapter(LLMAdapter):
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-6"):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)
        self.model = model

    async def generate(
        self,
        system_prompt: str,
        messages: list[dict],
        max_tokens: int = 4096,
        temperature: float = 0.7,
        tools: list[dict] | None = DEFAULT_TOOLS,
    ) -> LLMResponse:
        kwargs: dict = {
            "model": self.model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "system": system_prompt,
            "messages": messages,
        }
        if tools:
            kwargs["tools"] = tools

        response = await self.client.messages.create(**kwargs)

        return LLMResponse(
            content=_extract_text(response.content),
            model=response.model,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
        )

    async def generate_stream(
        self,
        system_prompt: str,
        messages: list[dict],
        max_tokens: int = 4096,
        temperature: float = 0.7,
        tools: list[dict] | None = DEFAULT_TOOLS,
    ) -> AsyncGenerator[str, None]:
        kwargs: dict = {
            "model": self.model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "system": system_prompt,
            "messages": messages,
        }
        if tools:
            kwargs["tools"] = tools

        async with self.client.messages.stream(**kwargs) as stream:
            async for text in stream.text_stream:
                yield text
