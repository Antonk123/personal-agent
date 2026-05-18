<!-- refreshed: 2026-05-18 -->
# Architecture

**Analysis Date:** 2026-05-18

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        Next.js Frontend (React)                      │
│  Pages: /chat  /memory  /assignments  /account  /onboarding  /auth  │
│  `frontend/src/app/`                                                 │
├──────────────────────┬──────────────────────┬───────────────────────┤
│   Components         │   Stores (Zustand)   │    lib/               │
│  `components/`       │  `stores/chat-store` │  api.ts  hooks.ts     │
└──────────┬───────────┴──────────────────────┴──────────────────────┘
           │  HTTP/JSON (Bearer token)
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                                  │
│  `backend/app/main.py`                                               │
├──────────┬──────────────┬────────────┬─────────────┬───────────────┤
│  /auth   │  /chat       │  /memory   │  /admin     │  /import      │
│ auth.py  │ chat.py      │ memory.py  │ admin.py    │ import_data   │
└──────────┴──────┬───────┴────────────┴─────────────┴───────────────┘
                  │  Dependency Injection (get_current_tenant)
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Service Layer                                 │
├──────────┬──────────────┬─────────────────┬────────────────────────┤
│ AuthSvc  │  ChatService │ MemoryService   │ RetrievalService       │
│          │  ContextBldr │ ExtractionSvc   │                        │
└──────────┴──────┬───────┴─────────────────┴────────────────────────┘
                  │
         ┌────────┴──────────┐
         ▼                   ▼
┌─────────────────┐  ┌────────────────────────────────┐
│  LLM Layer      │  │   SQLAlchemy ORM Models         │
│  ClaudeAdapter  │  │  `backend/app/models/`          │
│  (Anthropic)    │  │                                 │
│  + OpenAI embed │  └──────────────┬─────────────────┘
└─────────────────┘                 │
                                    ▼
                     ┌──────────────────────────────┐
                     │  PostgreSQL + pgvector        │
                     │  (via Docker / prod server)  │
                     └──────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| FastAPI app | CORS, lifespan (Redis), router registration | `backend/app/main.py` |
| `get_current_tenant` | Bearer-token auth, resolves tenant UUID | `backend/app/middleware/tenant.py` |
| AuthService | Magic-link creation/verification, session validation | `backend/app/services/auth_service.py` |
| ChatService | Message persistence, history retrieval, LLM orchestration | `backend/app/services/chat_service.py` |
| ContextBuilder | Assembles system prompt from profile + assignments + retrieved context | `backend/app/services/context_builder.py` |
| MemoryService | CRUD for UserProfile, Assignment, Contact, Decision | `backend/app/services/memory_service.py` |
| ExtractionService | Post-chat LLM extraction → persists memory fragments & entities | `backend/app/services/extraction_service.py` |
| RetrievalService | Entity search (name-match) + semantic vector search | `backend/app/services/retrieval_service.py` |
| ClaudeAdapter | Anthropic SDK wrapper, implements abstract LLMAdapter | `backend/app/llm/claude_adapter.py` |
| `generate_embedding` | OpenAI text-embedding-3-small, 1536-dim vectors | `backend/app/utils/embeddings.py` |
| `api` (singleton) | Typed HTTP client, bearer-token injection, 401 redirect | `frontend/src/lib/api.ts` |
| `useChatStore` | Zustand store: conversations, messages, loading state | `frontend/src/stores/chat-store.ts` |
| `useChat` hook | Bridges store + api.ts for sendMessage / loadConversation | `frontend/src/lib/hooks.ts` |
| AppShell | Auth guard + sticky header + BottomNav for non-chat pages | `frontend/src/components/AppShell.tsx` |
| chat/layout.tsx | Auth guard + sidebar/drawer shell for /chat routes | `frontend/src/app/chat/layout.tsx` |

## Pattern Overview

**Overall:** Multi-tenant SaaS with layered backend (Router → Service → ORM) and a Next.js App Router frontend backed by Zustand client state.

**Key Characteristics:**
- Every database row carries `tenant_id` (UUID); all queries filter by it
- Auth is custom magic-link (no third-party auth provider); session token stored in `localStorage`
- Two LLM providers: Anthropic Claude (generation) and OpenAI (embeddings only)
- Memory system is append-only: extraction runs silently after every chat turn
- Retrieval combines keyword entity-matching and pgvector cosine-distance search

## Layers

**Routers (HTTP boundary):**
- Purpose: Validate request shape, resolve dependencies, return serialized dicts
- Location: `backend/app/routers/`
- Contains: Pydantic request/response models, route handlers
- Depends on: Services, `get_current_tenant`, `get_db`
- Used by: Frontend via REST

**Services (business logic):**
- Purpose: All non-trivial logic lives here; instantiated per-request with injected `AsyncSession`
- Location: `backend/app/services/`
- Contains: `auth_service.py`, `chat_service.py`, `context_builder.py`, `extraction_service.py`, `memory_service.py`, `retrieval_service.py`
- Depends on: Models, LLM layer, utils
- Used by: Routers

**LLM Adapter (abstraction):**
- Purpose: Decouple services from specific LLM providers
- Location: `backend/app/llm/`
- Contains: Abstract `LLMAdapter`, `ClaudeAdapter`, prompt templates in `prompts.py`
- Depends on: anthropic SDK, settings
- Used by: ChatService, ExtractionService

**Models (ORM):**
- Purpose: SQLAlchemy declarative models; single source of schema truth
- Location: `backend/app/models/`
- Contains: Tenant, MagicLink, Session, UserProfile, Assignment, Contact, Decision, Conversation, Message, MemoryFragment
- Depends on: `database.py` (Base, engine)
- Used by: Services, Alembic migrations

**Frontend Pages:**
- Purpose: Next.js App Router pages with client-side auth guards
- Location: `frontend/src/app/`
- Contains: Route segments; chat layout owns sidebar/drawer; non-chat pages use AppShell
- Depends on: `lib/api.ts`, `stores/`, components
- Used by: Browser

## Data Flow

### Primary Chat Request Path

1. User types message in `ChatInput` component (`frontend/src/components/chat/ChatInput.tsx`)
2. `useChat().sendMessage()` optimistically adds user message to Zustand store, calls `api.sendMessage()` (`frontend/src/lib/hooks.ts`)
3. `POST /chat/` hits `chat.py` router; `get_current_tenant` middleware validates Bearer token → resolves `tenant_id` (`backend/app/middleware/tenant.py`)
4. `ChatService.send_message()` persists user `Message`, fetches conversation history (`backend/app/services/chat_service.py`)
5. `ContextBuilder.build_system_prompt()` pulls profile + active assignments + retrieval results (`backend/app/services/context_builder.py`)
6. `RetrievalService.retrieve_context()` runs entity-name search + pgvector cosine search (`backend/app/services/retrieval_service.py`)
7. `ClaudeAdapter.generate()` calls Anthropic API with assembled system prompt + history (`backend/app/llm/claude_adapter.py`)
8. Assistant `Message` persisted with token metadata; `ExtractionService.extract()` runs silently on recent messages (`backend/app/services/extraction_service.py`)
9. Response `{conversation_id, response, tokens_used}` returned; frontend adds assistant message to store and updates URL to `/chat/{id}`

### Magic-Link Auth Flow

1. `POST /auth/magic-link` — `AuthService.request_magic_link()` creates `MagicLink` row; token emailed via SMTP
2. User clicks link → `GET /auth/verify?token=…` → `AuthService.verify_magic_link()` marks link used, creates `Session`
3. Frontend stores `session_token` in `localStorage`; subsequent requests attach `Authorization: Bearer <token>`
4. `clearSession()` on logout removes token; `isAuthenticated()` checks token presence for client-side guards

### Memory Extraction Flow (background, after every chat turn)

1. `ChatService._run_extraction()` calls `ExtractionService.extract()` with last 3 messages + assistant reply
2. `ExtractionService` formats conversation, sends to Claude with structured JSON extraction prompt
3. Extracted entities (assignments, contacts, decisions, memory fragments) applied via `MemoryService`
4. `MemoryFragment` records get OpenAI embeddings and stored with `pgvector Vector(1536)` column

**State Management:**
- Backend: stateless per-request (sessions in DB, Redis available but only used for app.state.redis connection object)
- Frontend: Zustand `useChatStore` holds conversations list, current conversation messages, loading/error flags. No persistence across page refresh (re-fetches from API on mount)

## Key Abstractions

**LLMAdapter (abstract base):**
- Purpose: Provider-agnostic interface for LLM generation
- Examples: `backend/app/llm/adapter.py` (abstract), `backend/app/llm/claude_adapter.py` (concrete)
- Pattern: ABC with `generate()` and `generate_stream()` — only `generate()` is used in production; streaming is defined but not wired to any endpoint

**Tenant isolation:**
- Purpose: All data rows carry `tenant_id`; `get_current_tenant` dependency enforces it at the boundary
- Examples: Every model in `backend/app/models/`
- Pattern: FastAPI `Depends(get_current_tenant)` on every protected route; services always receive `tenant_id` as first argument

**ApiClient singleton:**
- Purpose: Single typed HTTP client with automatic auth header injection and 401 handling
- Examples: `frontend/src/lib/api.ts`
- Pattern: Class with private `request<T>()` helper; exported as `api` singleton

## Entry Points

**Backend:**
- Location: `backend/app/main.py`
- Triggers: Uvicorn (Docker container maps port 8000)
- Responsibilities: Creates FastAPI app, registers CORS middleware, opens Redis on startup, registers all routers

**Frontend:**
- Location: `frontend/src/app/layout.tsx` (root), `frontend/src/app/page.tsx` (redirect)
- Triggers: Next.js dev server / production build (port 3000)
- Responsibilities: Root layout sets fonts + metadata; root page.tsx immediately redirects to `/chat` or `/auth/login`

## Architectural Constraints

- **Threading:** Python async (asyncio); FastAPI + asyncpg + SQLAlchemy async — all I/O is non-blocking
- **Global state:** `settings` singleton in `backend/app/config.py` (module-level); `api` singleton in `frontend/src/lib/api.ts`
- **Circular imports:** Routers imported below app creation in `main.py` (noqa E402 comments) to avoid circular import from router modules importing `app`
- **Streaming:** `ClaudeAdapter.generate_stream()` exists but no streaming endpoint is wired — all chat is request/response
- **Redis:** Initialized on startup and stored as `app.state.redis`; no code currently reads from it (reserved for future rate-limiting/caching)

## Anti-Patterns

### Direct DB queries in router handlers

**What happens:** `chat.py` router performs raw `select/update/delete` on `Conversation` and `Message` models directly, bypassing the service layer (`backend/app/routers/chat.py` lines 87–124)
**Why it's wrong:** Business logic leaks into the HTTP layer; harder to test and reuse
**Do this instead:** Move conversation rename/delete into `ChatService` methods, keep router thin

### Silent extraction failure swallowing

**What happens:** `ChatService._run_extraction()` has a bare `except: pass` (`backend/app/services/chat_service.py` line 29); `ExtractionService._apply_extractions()` has inner `except: pass` for embedding failures
**Why it's wrong:** Extraction failures are invisible; memory silently degrades with no logs or metrics
**Do this instead:** Log the exception at WARNING level before suppressing; consider a dead-letter queue

### `useChat` hook mutates URL via `window.history.replaceState`

**What happens:** After first message, hook calls `window.history.replaceState(null, "", /chat/${id})` instead of using Next.js router (`frontend/src/lib/hooks.ts` line 30)
**Why it's wrong:** Bypasses Next.js routing; browser back/forward may behave inconsistently
**Do this instead:** Use `router.replace()` from `useRouter()`

## Error Handling

**Strategy:** Routers raise `HTTPException` for known error states; services return `None` for not-found; LLM and extraction errors are suppressed with silent fallbacks.

**Patterns:**
- Auth errors: `HTTPException(401)` from `get_current_tenant`; frontend catches 401 and redirects to login
- Not found: Services return `None`; routers check and raise `HTTPException(404)` or return `{}`
- LLM failures: Wrapped in try/except in `ChatService` and `ContextBuilder`; chat will fail if generation fails but extraction is silent

## Cross-Cutting Concerns

**Logging:** Standard Python `logging` module used in `auth.py` router for SMTP failures; otherwise no structured logging framework
**Validation:** Pydantic models on all router inputs; SQLAlchemy typed columns enforce DB constraints
**Authentication:** `Depends(get_current_tenant)` on all protected routes; frontend `isAuthenticated()` + `AppShell`/`layout.tsx` guards on all authenticated pages

---

*Architecture analysis: 2026-05-18*
