from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    yield
    await app.state.redis.close()


app = FastAPI(title="Byggagent API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.app_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Import and register routers
from app.routers.auth import router as auth_router  # noqa: E402
from app.routers.chat import router as chat_router  # noqa: E402
from app.routers.memory import router as memory_router  # noqa: E402
from app.routers.admin import router as admin_router  # noqa: E402
from app.routers.import_data import router as import_router  # noqa: E402

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(memory_router)
app.include_router(admin_router)
app.include_router(import_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
