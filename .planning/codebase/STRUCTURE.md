# Codebase Structure

**Analysis Date:** 2026-05-18

## Directory Layout

```
personal-agent/
├── backend/                    # FastAPI Python backend
│   ├── app/
│   │   ├── main.py             # App factory, router registration, lifespan
│   │   ├── config.py           # Pydantic Settings (env vars)
│   │   ├── database.py         # SQLAlchemy async engine, Base, get_db
│   │   ├── llm/
│   │   │   ├── adapter.py      # Abstract LLMAdapter + LLMResponse dataclass
│   │   │   ├── claude_adapter.py  # Anthropic Claude implementation
│   │   │   └── prompts.py      # SYSTEM_PROMPT_TEMPLATE, EXTRACTION_PROMPT, ONBOARDING_PROMPTS
│   │   ├── middleware/
│   │   │   └── tenant.py       # get_current_tenant dependency (Bearer token → tenant_id)
│   │   ├── models/
│   │   │   ├── __init__.py     # Re-exports all models
│   │   │   ├── tenant.py       # Tenant
│   │   │   ├── auth.py         # MagicLink, Session
│   │   │   ├── profile.py      # UserProfile
│   │   │   ├── assignment.py   # Assignment, Contact, Decision
│   │   │   ├── conversation.py # Conversation, Message
│   │   │   └── memory.py       # MemoryFragment (pgvector Vector(1536))
│   │   ├── routers/
│   │   │   ├── auth.py         # POST /auth/magic-link, GET /auth/verify, POST /auth/dev-seed
│   │   │   ├── chat.py         # POST /chat/, GET|PATCH|DELETE /chat/conversations/…
│   │   │   ├── memory.py       # GET|PUT /memory/profile, CRUD /memory/assignments/…
│   │   │   ├── admin.py        # POST /admin/tenants, GET /admin/export
│   │   │   └── import_data.py  # Data import endpoint
│   │   ├── services/
│   │   │   ├── auth_service.py         # Magic-link + session logic
│   │   │   ├── chat_service.py         # Message flow, history, LLM call
│   │   │   ├── context_builder.py      # Assembles system prompt
│   │   │   ├── extraction_service.py   # Post-chat LLM extraction → memory
│   │   │   ├── memory_service.py       # Profile/Assignment/Contact/Decision CRUD
│   │   │   ├── retrieval_service.py    # Entity search + pgvector semantic search
│   │   │   └── import_service.py       # Bulk data import
│   │   └── utils/
│   │       ├── email.py         # send_magic_link_email (SMTP)
│   │       └── embeddings.py    # generate_embedding (OpenAI text-embedding-3-small)
│   ├── alembic/
│   │   └── versions/
│   │       └── 001_initial.py   # Single migration (initial schema)
│   └── tests/                   # Empty — no tests written yet
├── frontend/                    # Next.js 14 App Router frontend
│   └── src/
│       ├── app/
│       │   ├── layout.tsx       # Root layout (fonts, metadata, html lang="sv")
│       │   ├── page.tsx         # Root redirect → /chat or /auth/login
│       │   ├── globals.css      # Tailwind base + CSS custom properties (design tokens)
│       │   ├── auth/
│       │   │   ├── login/page.tsx    # Magic-link request form
│       │   │   └── verify/page.tsx   # Token verification, session storage
│       │   ├── chat/
│       │   │   ├── layout.tsx        # Auth guard + sidebar/drawer shell
│       │   │   ├── page.tsx          # New conversation (blank state)
│       │   │   └── [id]/page.tsx     # Load existing conversation
│       │   ├── onboarding/
│       │   │   └── page.tsx          # 4-step wizard (company, role, services, description)
│       │   ├── memory/
│       │   │   ├── page.tsx          # Memory overview (profile + assignment stats)
│       │   │   └── profile/page.tsx  # Profile edit form
│       │   ├── assignments/
│       │   │   ├── page.tsx          # Assignments list
│       │   │   ├── new/page.tsx      # Create assignment form
│       │   │   └── [id]/page.tsx     # Assignment detail (contacts, decisions)
│       │   └── account/
│       │       └── page.tsx          # Theme toggle, export data, logout
│       ├── components/
│       │   ├── AppShell.tsx          # Auth guard + sticky header + BottomNav (non-chat pages)
│       │   ├── chat/
│       │   │   ├── ChatInput.tsx     # Message input bar
│       │   │   ├── ChatMessage.tsx   # Single message bubble (user / assistant)
│       │   │   ├── ChatMessages.tsx  # Message list + empty state suggestions
│       │   │   └── ConversationList.tsx  # Sidebar/drawer with grouping, search, rename, delete
│       │   ├── memory/               # Memory-related components (directory exists, files TBD)
│       │   ├── onboarding/           # Onboarding components (directory exists, files TBD)
│       │   └── ui/
│       │       ├── Avatar.tsx        # User/AI avatar with initials
│       │       ├── Badge.tsx         # Tone-aware badge (accent, success, warning, danger)
│       │       ├── BottomNav.tsx     # Mobile 4-tab nav bar
│       │       ├── Button.tsx        # Primary/ghost/danger variants, loading state
│       │       ├── Card.tsx          # Surface card with padding/interactive variants
│       │       ├── IconButton.tsx    # Square icon-only button
│       │       ├── Input.tsx         # Text input + Label component
│       │       ├── Logo.tsx          # Cortex wordmark (sm/md sizes)
│       │       ├── Skeleton.tsx      # Loading skeleton
│       │       └── Spinner.tsx       # Animated spinner
│       ├── lib/
│       │   ├── api.ts               # ApiClient singleton — all HTTP calls
│       │   ├── auth.ts              # isAuthenticated, setSession, clearSession (localStorage)
│       │   ├── cn.ts                # clsx/twMerge utility
│       │   ├── hooks.ts             # useChat hook (sendMessage, loadConversation, loadConversations)
│       │   └── theme.ts             # useTheme hook (dark/light, localStorage persistence)
│       └── stores/
│           └── chat-store.ts        # Zustand store: conversations, messages, loading, error
├── .planning/
│   └── codebase/                    # GSD codebase map documents
├── .remember/                       # Agent memory logs
├── docker-compose.yml               # Dev: db (pgvector/pg16), redis, backend, frontend
├── docker-compose.prod.yml          # Production compose variant
├── .env.example                     # Env var template (committed)
└── .env                             # Local secrets (gitignored)
```

## Directory Purposes

**`backend/app/routers/`:**
- Purpose: HTTP boundary — request parsing, dependency injection, response serialization
- Contains: One file per API domain; Pydantic models inline
- Key files: `chat.py`, `auth.py`, `memory.py`

**`backend/app/services/`:**
- Purpose: All business logic; instantiated per-request with `AsyncSession`
- Contains: Service classes with async methods
- Key files: `chat_service.py`, `memory_service.py`, `context_builder.py`

**`backend/app/models/`:**
- Purpose: SQLAlchemy ORM definitions; `__init__.py` re-exports all for Alembic autogenerate
- Contains: One model file per domain area
- Key files: `memory.py` (pgvector), `assignment.py` (relationships)

**`backend/app/llm/`:**
- Purpose: Provider-agnostic LLM abstraction
- Contains: Abstract adapter, Claude implementation, all prompt strings
- Key files: `adapter.py`, `claude_adapter.py`, `prompts.py`

**`frontend/src/app/`:**
- Purpose: Next.js App Router pages and layouts
- Contains: Route segments matching URL structure; `"use client"` pages only (no RSC yet)
- Key files: `chat/layout.tsx`, `page.tsx` (root redirect)

**`frontend/src/components/`:**
- Purpose: Reusable React components
- Contains: Domain-grouped subdirectories (`chat/`, `ui/`) + `AppShell.tsx`
- Key files: `ConversationList.tsx` (complex), `AppShell.tsx`

**`frontend/src/lib/`:**
- Purpose: Shared utilities, hooks, API client
- Contains: Non-component logic
- Key files: `api.ts` (all backend calls), `hooks.ts` (chat hook), `auth.ts`

**`frontend/src/stores/`:**
- Purpose: Zustand client state
- Contains: One store file currently
- Key files: `chat-store.ts`

## Key File Locations

**Entry Points:**
- `backend/app/main.py`: FastAPI app, CORS, lifespan, router registration
- `frontend/src/app/layout.tsx`: Root Next.js layout
- `frontend/src/app/page.tsx`: Root redirect logic

**Configuration:**
- `backend/app/config.py`: All env vars via Pydantic Settings
- `frontend/src/app/globals.css`: Design tokens (CSS custom properties), Tailwind config
- `docker-compose.yml`: Service wiring for local dev

**Core Logic:**
- `backend/app/services/chat_service.py`: Chat turn orchestration
- `backend/app/services/context_builder.py`: System prompt assembly
- `backend/app/llm/prompts.py`: All LLM prompts (system, extraction, onboarding)
- `frontend/src/lib/api.ts`: All API call definitions

**Database:**
- `backend/app/database.py`: Engine, session factory, Base
- `backend/alembic/versions/001_initial.py`: Full initial schema migration

## Naming Conventions

**Backend files:**
- Services: `{domain}_service.py` (e.g. `auth_service.py`, `chat_service.py`)
- Routers: `{domain}.py` (e.g. `auth.py`, `chat.py`)
- Models: `{domain}.py` singular (e.g. `tenant.py`, `assignment.py`)
- Utils: descriptive name (e.g. `embeddings.py`, `email.py`)

**Frontend files:**
- Components: PascalCase `.tsx` (e.g. `ChatInput.tsx`, `ConversationList.tsx`)
- Pages: `page.tsx` (Next.js convention)
- Layouts: `layout.tsx`
- Lib files: camelCase `.ts` (e.g. `api.ts`, `hooks.ts`, `chat-store.ts`)
- Stores: `{domain}-store.ts`

**Backend classes:**
- Service classes: `{Domain}Service` (e.g. `ChatService`, `MemoryService`)
- Router vars: `router` (module-level `APIRouter`)
- Settings: `settings` singleton

## Where to Add New Code

**New API endpoint:**
- Add route to existing router in `backend/app/routers/{domain}.py`, or create new `backend/app/routers/{domain}.py`
- Register new router in `backend/app/main.py` with `app.include_router(...)`
- Add corresponding method to `frontend/src/lib/api.ts` `ApiClient` class

**New backend service:**
- Create `backend/app/services/{domain}_service.py` with class `{Domain}Service(db: AsyncSession)`
- Instantiate in router handler: `service = DomainService(db)`

**New database model:**
- Create `backend/app/models/{domain}.py` with SQLAlchemy `Base` subclass
- Export from `backend/app/models/__init__.py`
- Generate migration: `alembic revision --autogenerate -m "add {model}"`

**New frontend page:**
- Create `frontend/src/app/{route}/page.tsx`
- Use `AppShell` for standard authenticated pages (memory, account, assignments pattern)
- Use dedicated layout.tsx for sections needing custom shell (chat pattern)

**New UI component:**
- Generic/shared: `frontend/src/components/ui/{ComponentName}.tsx`
- Domain-specific: `frontend/src/components/{domain}/{ComponentName}.tsx`

**New Zustand store:**
- Create `frontend/src/stores/{domain}-store.ts`
- Use `create<State>()` pattern matching `chat-store.ts`

**New prompt:**
- Add to `backend/app/llm/prompts.py` as a module-level constant string

## Special Directories

**`.planning/codebase/`:**
- Purpose: GSD codebase map documents (ARCHITECTURE.md, STRUCTURE.md, etc.)
- Generated: By `/gsd-map-codebase` agent
- Committed: Yes

**`.remember/`:**
- Purpose: Agent autonomous operation logs and temporary files
- Generated: Yes (runtime)
- Committed: No (ephemeral logs)

**`backend/alembic/versions/`:**
- Purpose: Database migration scripts
- Generated: Via `alembic revision`
- Committed: Yes — required for schema management

**`frontend/.next/`:**
- Purpose: Next.js build output and cache
- Generated: Yes
- Committed: No

**`frontend/node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-05-18*
