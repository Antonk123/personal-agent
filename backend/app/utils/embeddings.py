import asyncio

import voyageai

from app.config import settings

# voyage-3 är multilingual och hanterar svenska bra. 1024 dim.
EMBEDDING_MODEL = "voyage-3"
EMBEDDING_DIM = 1024


async def generate_embedding(text: str, input_type: str = "document") -> list[float]:
    """Generate an embedding vector using Voyage AI.

    Voyage är Anthropic's rekommenderade embedding-partner; voyage-3 är
    multilingual (svenska + engelska + tekniska termer) och har 1024-dim vektor.

    `input_type` ska vara "document" för fragment som lagras och "query" för
    sökningar — modellen kalibrerar embeddings olika för de två rollerna.
    """
    client = voyageai.Client(api_key=settings.voyage_api_key)
    # Voyage SDK är synkron — kör i thread-pool för att inte blockera event loop.
    result = await asyncio.to_thread(
        client.embed,
        [text],
        model=EMBEDDING_MODEL,
        input_type=input_type,
    )
    return result.embeddings[0]
