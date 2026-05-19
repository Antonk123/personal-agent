"""Smoke tests for the FastAPI app.

Verifies that each router is mounted and returns a sane status code.
No real DB is used — see ``conftest.py`` for the override strategy.
"""
from __future__ import annotations

from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from app.routers import auth as auth_router


# ---------------------------------------------------------------------------
# Root / health
# ---------------------------------------------------------------------------


async def test_health_returns_ok(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# Auth router
# ---------------------------------------------------------------------------


async def test_magic_link_accepts_email(client: AsyncClient, monkeypatch: pytest.MonkeyPatch):
    """POST /auth/magic-link should always return 200 even for unknown emails.

    The real handler talks to Postgres; we patch the service so the request
    completes without a DB. The handler also swallows SMTP errors.
    """

    async def fake_request_magic_link(self, email: str):
        return None  # unknown email -> no token, endpoint still returns 200

    monkeypatch.setattr(
        auth_router.AuthService, "request_magic_link", fake_request_magic_link
    )

    response = await client.post(
        "/auth/magic-link", json={"email": "nobody@example.com"}
    )
    assert response.status_code == 200
    assert response.json() == {"message": "Magic link sent"}


async def test_magic_link_rejects_invalid_email(client: AsyncClient):
    """Pydantic EmailStr should reject malformed input with 422."""
    response = await client.post("/auth/magic-link", json={"email": "not-an-email"})
    assert response.status_code == 422


async def test_verify_invalid_token_returns_400(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    async def fake_verify(self, token: str):
        return None

    monkeypatch.setattr(auth_router.AuthService, "verify_magic_link", fake_verify)

    response = await client.get("/auth/verify", params={"token": "garbage"})
    assert response.status_code == 400


async def test_verify_code_invalid_returns_404(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    """Unknown email + code combo should yield 404, not reveal existence."""

    async def fake_verify_code(self, email: str, code: str):
        return None

    monkeypatch.setattr(auth_router.AuthService, "verify_code", fake_verify_code)

    response = await client.post(
        "/auth/verify-code",
        json={"email": "nobody@example.com", "code": "123456"},
    )
    assert response.status_code == 404


async def test_verify_code_rejects_bad_format(client: AsyncClient):
    """Non-6-digit codes are rejected by pydantic with 422."""
    response = await client.post(
        "/auth/verify-code",
        json={"email": "anyone@example.com", "code": "abc"},
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Chat router — requires auth
# ---------------------------------------------------------------------------


async def test_chat_conversations_requires_auth(client: AsyncClient):
    response = await client.get("/chat/conversations")
    assert response.status_code == 401


async def test_chat_send_requires_auth(client: AsyncClient):
    response = await client.post("/chat/", json={"message": "hello"})
    assert response.status_code == 401


async def test_chat_regenerate_requires_auth(client: AsyncClient):
    response = await client.post(
        "/chat/conversations/00000000-0000-0000-0000-000000000000/regenerate"
    )
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Memory router — requires auth
# ---------------------------------------------------------------------------


async def test_memory_profile_requires_auth(client: AsyncClient):
    response = await client.get("/memory/profile")
    assert response.status_code == 401


async def test_memory_assignments_requires_auth(client: AsyncClient):
    response = await client.get("/memory/assignments")
    assert response.status_code == 401


async def test_delete_assignment_requires_auth(client: AsyncClient):
    response = await client.delete(
        "/memory/assignments/00000000-0000-0000-0000-000000000000"
    )
    assert response.status_code == 401


async def test_delete_contact_requires_auth(client: AsyncClient):
    response = await client.delete(
        "/memory/contacts/00000000-0000-0000-0000-000000000000"
    )
    assert response.status_code == 401


async def test_delete_decision_requires_auth(client: AsyncClient):
    response = await client.delete(
        "/memory/decisions/00000000-0000-0000-0000-000000000000"
    )
    assert response.status_code == 401


async def test_delete_fragment_requires_auth(client: AsyncClient):
    response = await client.delete(
        "/memory/fragments/00000000-0000-0000-0000-000000000000"
    )
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Admin router
# ---------------------------------------------------------------------------


async def test_admin_export_requires_auth(client: AsyncClient):
    response = await client.get("/admin/export")
    assert response.status_code == 401


async def test_admin_create_tenant_validates_payload(client: AsyncClient):
    """POST /admin/tenants requires name + email; missing fields -> 422.

    This proves the route is mounted without hitting the DB.
    """
    response = await client.post("/admin/tenants", json={})
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Import router — requires auth
# ---------------------------------------------------------------------------


async def test_import_chatgpt_requires_auth(client: AsyncClient):
    # No auth header and no file -> auth dependency runs first -> 401.
    response = await client.post("/import/chatgpt")
    assert response.status_code == 401


async def test_import_claude_requires_auth(client: AsyncClient):
    response = await client.post("/import/claude")
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# OpenAPI sanity — every router we care about should be registered
# ---------------------------------------------------------------------------


async def test_openapi_lists_all_routers(client: AsyncClient):
    response = await client.get("/openapi.json")
    assert response.status_code == 200
    paths = response.json()["paths"]
    expected_prefixes = ("/health", "/auth/", "/chat/", "/memory/", "/admin/", "/import/")
    for prefix in expected_prefixes:
        assert any(p.startswith(prefix) for p in paths), f"No route registered for {prefix}"
