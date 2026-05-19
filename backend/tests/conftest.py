"""Shared pytest fixtures.

Smoke tests intentionally avoid spinning up a real database. We override
``get_db`` with an ``AsyncMock`` so the FastAPI dependency graph resolves
without a Postgres connection. Tests that need to exercise DB-backed logic
should override individual services instead of using a real session.
"""
from __future__ import annotations

from collections.abc import AsyncIterator
from unittest.mock import AsyncMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.database import get_db
from app.main import app


async def _fake_get_db() -> AsyncIterator[AsyncMock]:
    """Yield a mocked AsyncSession.

    Endpoints that only need the dependency wired (e.g. routes that 401
    before touching the DB) will work out of the box. Routes that actually
    call ``db.execute(...)`` need to be mocked at the service layer per-test.
    """
    yield AsyncMock()


@pytest.fixture(autouse=True)
def _override_db():
    """Replace the DB dependency for every test, then clean up."""
    app.dependency_overrides[get_db] = _fake_get_db
    yield
    app.dependency_overrides.pop(get_db, None)


@pytest_asyncio.fixture
async def client() -> AsyncIterator[AsyncClient]:
    """Async HTTP client bound to the FastAPI app via ASGITransport.

    Lifespan is intentionally NOT triggered (no Redis required for smoke).
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
