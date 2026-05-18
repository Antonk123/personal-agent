# Testing Patterns

**Analysis Date:** 2026-05-18

## Current State: No Tests Exist

There are zero test files in this repository. The backend has an empty `backend/tests/` directory (no files, not even `__init__.py` or `conftest.py`). The frontend has no test files anywhere under `frontend/src/`.

However, the backend's `pyproject.toml` includes a fully configured test stack in `[project.optional-dependencies] dev`:

```toml
[project.optional-dependencies]
dev = [
    "pytest>=8.2.0",
    "pytest-asyncio>=0.23.0",
    "pytest-cov>=5.0.0",
    "httpx>=0.27.0",
    "factory-boy>=3.3.0",
    "ruff>=0.5.0",
]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

This indicates test infrastructure was planned but never implemented. The following documents where tests should live and what patterns to follow based on the codebase structure.

---

## Intended Test Framework (Backend)

**Runner:** pytest 8.2+ with pytest-asyncio 0.23+
- Config: `backend/pyproject.toml` (`[tool.pytest.ini_options]`)
- `asyncio_mode = "auto"` means all `async def test_*` functions run automatically as coroutines — no `@pytest.mark.asyncio` decorator needed

**HTTP Test Client:** httpx (AsyncClient) — already in dev deps
**Factories:** factory-boy 3.3+ — for building test fixtures
**Coverage:** pytest-cov 5.0+

**Run Commands (when tests are added):**
```bash
cd backend
pytest                        # Run all tests
pytest --cov=app              # With coverage
pytest tests/test_auth.py     # Single file
pytest -k "test_magic_link"   # By name pattern
```

---

## Where to Add Tests

**Backend test directory:** `backend/tests/`

Recommended structure once tests are added:
```
backend/tests/
├── conftest.py               # Shared fixtures: db session, test client, tenant factory
├── test_auth.py              # Auth router: magic link, verify, dev-seed
├── test_chat.py              # Chat router: send message, list conversations, CRUD
├── test_memory.py            # Memory router: profile, assignments, contacts, decisions
├── services/
│   ├── test_auth_service.py
│   ├── test_chat_service.py
│   └── test_extraction_service.py
└── utils/
    └── test_embeddings.py
```

**Frontend test directory:** `frontend/src/` (co-located) or `frontend/__tests__/`

If tests are added to the frontend, the recommended stack is:
- Vitest (compatible with Next.js 14, ESM-native) — not currently in `package.json`, must be added
- React Testing Library for component tests

Recommended structure:
```
frontend/src/
├── lib/
│   ├── api.test.ts           # API client method tests (mock fetch)
│   └── hooks.test.ts         # useChat hook tests
├── stores/
│   └── chat-store.test.ts    # Zustand store mutation tests
└── components/
    └── ui/
        └── Button.test.tsx   # UI primitives
```

---

## Recommended Test Patterns (Backend)

### conftest.py — Core Fixtures

The async session factory and test client are the critical fixtures to create first:

```python
# backend/tests/conftest.py
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.main import app
from app.database import Base, get_db

TEST_DATABASE_URL = "postgresql+asyncpg://test:test@localhost:5432/byggagent_test"

@pytest_asyncio.fixture(scope="session")
async def engine():
    eng = create_async_engine(TEST_DATABASE_URL)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()

@pytest_asyncio.fixture
async def db(engine):
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        yield session
        await session.rollback()

@pytest_asyncio.fixture
async def client(db):
    app.dependency_overrides[get_db] = lambda: db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
```

### Router Tests (Integration)

Test via the HTTP client, not by calling service methods directly. This tests the full stack including Pydantic validation and auth middleware:

```python
# backend/tests/test_auth.py
async def test_magic_link_unknown_email_returns_200(client):
    """Should not reveal whether email exists."""
    response = await client.post("/auth/magic-link", json={"email": "unknown@test.com"})
    assert response.status_code == 200

async def test_verify_invalid_token_returns_400(client):
    response = await client.get("/auth/verify?token=bad-token")
    assert response.status_code == 400

async def test_chat_requires_auth(client):
    response = await client.post("/chat/", json={"message": "hello"})
    assert response.status_code == 401
```

### Service Unit Tests

Test services with a real DB session (from `db` fixture). Mock external calls (LLM, email):

```python
# backend/tests/services/test_auth_service.py
from unittest.mock import AsyncMock, patch
from app.services.auth_service import AuthService

async def test_request_magic_link_unknown_email_returns_none(db, seed_tenant):
    service = AuthService(db)
    token = await service.request_magic_link("nobody@example.com")
    assert token is None

async def test_verify_magic_link_creates_session(db, seed_tenant):
    service = AuthService(db)
    token = await service.request_magic_link(seed_tenant.email)
    session = await service.verify_magic_link(token)
    assert session is not None
    assert session.tenant_id == seed_tenant.id
```

### Mocking LLM Calls

The `ExtractionService._call_llm` and `ChatService._generate_response` methods are explicitly separated for mocking (note the docstring: "Separated for mocking."):

```python
# Mock at the adapter level
from unittest.mock import AsyncMock, patch
from app.llm.adapter import LLMResponse

@patch("app.services.chat_service.ClaudeAdapter")
async def test_send_message(mock_adapter_cls, db, seed_tenant):
    mock_adapter = AsyncMock()
    mock_adapter.generate.return_value = LLMResponse(
        content="Test response", model="claude-test", input_tokens=10, output_tokens=20
    )
    mock_adapter_cls.return_value = mock_adapter

    service = ChatService(db)
    result = await service.send_message(
        tenant_id=seed_tenant.id,
        message="Hello",
    )
    assert result["response"] == "Test response"
    assert "conversation_id" in result
```

---

## Recommended Test Patterns (Frontend)

If Vitest + React Testing Library are added:

### Store Tests

Zustand stores are pure functions — test without any React rendering:

```typescript
// frontend/src/stores/chat-store.test.ts
import { useChatStore } from "./chat-store";

beforeEach(() => useChatStore.getState().reset());

test("addMessage appends to messages array", () => {
  const msg = { id: "1", role: "user" as const, content: "hello", created_at: "" };
  useChatStore.getState().addMessage(msg);
  expect(useChatStore.getState().messages).toHaveLength(1);
});

test("removeConversation clears messages when active", () => {
  const store = useChatStore.getState();
  store.setCurrentConversation("abc");
  store.removeConversation("abc");
  expect(store.currentConversationId).toBeNull();
  expect(store.messages).toHaveLength(0);
});
```

### API Client Tests

Mock `fetch` globally to test `ApiClient` methods:

```typescript
// frontend/src/lib/api.test.ts
import { api } from "./api";

beforeEach(() => {
  global.fetch = vi.fn();
});

test("sendMessage posts to /chat/", async () => {
  (fetch as vi.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ conversation_id: "x", response: "hi", tokens_used: 5 }),
  });
  const result = await api.sendMessage("hello");
  expect(result.response).toBe("hi");
});
```

---

## Coverage

**Requirements:** Not enforced — no coverage thresholds configured.

**Generate coverage (backend, when tests exist):**
```bash
cd backend
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

## High-Priority Areas to Test First

Given the current zero-coverage state, the highest-value tests to write are:

1. **Auth flow** (`backend/tests/test_auth.py`) — magic link creation, verification, session validation, expiry
2. **Chat service** (`backend/tests/services/test_chat_service.py`) — message send, conversation creation, history retrieval; LLM mocked
3. **Tenant auth middleware** (`backend/tests/test_auth.py`) — all protected routes reject unauthenticated requests
4. **Extraction service** (`backend/tests/services/test_extraction_service.py`) — JSON parsing, apply-extractions logic; LLM mocked
5. **Zustand store** (`frontend/src/stores/chat-store.test.ts`) — all state mutations and the `removeConversation` edge case

---

*Testing analysis: 2026-05-18*
