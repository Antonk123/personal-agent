import openai

from app.config import settings


async def generate_embedding(text: str) -> list[float]:
    """Generate an embedding vector using OpenAI's text-embedding-3-small.

    We use OpenAI for embeddings (good quality, cheap) even though we use Claude for generation.
    """
    client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding
