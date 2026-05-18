# External Integrations

**Analysis Date:** 2026-05-18

## APIs & External Services

**LLM — Chat Generation:**
- Anthropic Claude - Primary AI response generation and memory extraction
  - SDK/Client: `anthropic` >= 0.30.0, `anthropic.AsyncAnthropic`
  - Adapter: `backend/app/llm/claude_adapter.py`
  - Default model: `claude-sonnet-4-6` (configured via `DEFAULT_MODEL` env var)
  - Auth: `ANTHROPIC_API_KEY`
  - Used for: streaming and non-streaming chat responses, structured JSON extraction (`ExtractionService`)

**LLM — Embeddings:**
- OpenAI - Vector embeddings only (not used for generation)
  - SDK/Client: `openai` >= 1.30.0, `openai.AsyncOpenAI`
  - Implementation: `backend/app/utils/embeddings.py`
  - Model: `text-embedding-3-small` (1536-dimensional vectors)
  - Auth: `OPENAI_API_KEY`
  - Used for: semantic memory search in `RetrievalService`, stored in `memory_fragments.embedding`

**Email — Magic Link Auth:**
- SMTP provider (Resend configured in production)
  - SDK/Client: `aiosmtplib` >= 3.0.0
  - Implementation: `backend/app/utils/email.py`
  - Auth: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`
  - From address: `FROM_EMAIL`
  - Dev fallback: logs magic link to stdout/stderr when `SMTP_USER` is empty
  - Email content: Swedish-language HTML+plain text template branded as "Cortex"

## Data Storage

**Databases:**
- PostgreSQL 16 with pgvector extension
  - Docker image: `pgvector/pgvector:pg16`
  - Connection: `DATABASE_URL` env var (asyncpg driver format: `postgresql+asyncpg://...`)
  - Client: SQLAlchemy 2.0 async engine + asyncpg driver (`backend/app/database.py`)
  - ORM: SQLAlchemy `DeclarativeBase` with async sessions
  - Migrations: Alembic (`backend/alembic/`, single migration `001_initial.py`)
  - Vector column: `memory_fragments.embedding` — `Vector(1536)`, cosine distance search

**Tables:**
- `tenants` — tenant/user accounts (`backend/app/models/tenant.py`)
- `magic_links` — one-time auth tokens (`backend/app/models/auth.py`)
- `sessions` — active auth sessions (`backend/app/models/auth.py`)
- `conversations` — chat threads (`backend/app/models/conversation.py`)
- `messages` — individual chat messages with metadata JSONB (`backend/app/models/conversation.py`)
- `memory_fragments` — extracted facts with vector embeddings (`backend/app/models/memory.py`)
- `profiles` — user profile data (`backend/app/models/profile.py`)
- `assignments` — project/client assignments (`backend/app/models/assignment.py`)
- `contacts`, `decisions` — assignment-related records (`backend/app/models/assignment.py`)

**Cache / Session Store:**
- Redis 7
  - Docker image: `redis:7-alpine`
  - Connection: `REDIS_URL` env var
  - Client: `redis.asyncio` (hiredis backend), initialized at app startup (`backend/app/main.py`)
  - Persistence: AOF enabled in production (`redis-server --appendonly yes`)
  - Note: Redis client is attached to `app.state.redis` but not yet used for active caching (available for future use)

**File Storage:**
- Docker named volume `file_storage` mounted at `/app/data` in backend container
- No S3 or cloud file storage

## Authentication & Identity

**Auth Provider:**
- Custom magic-link implementation (no third-party auth provider)
  - Implementation: `backend/app/services/auth_service.py`, `backend/app/routers/auth.py`
  - Flow: email → UUID token stored in `magic_links` table → verified once → `sessions` record created
  - Token expiry: 15 minutes (magic link), 7 days (session)
  - Session token: UUID stored in browser `localStorage` (`frontend/src/lib/auth.ts`)
  - Frontend sends token as `Authorization: Bearer <token>` header
  - Backend validates via `get_current_tenant` dependency (`backend/app/middleware/tenant.py`)
  - Multi-tenant: all data rows scoped by `tenant_id` UUID

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry or similar)

**Logs:**
- Python `logging` module throughout backend (standard library)
- Notable: SMTP failures logged via `logger.exception()` in `backend/app/routers/auth.py`
- Magic link URL logged to stdout in dev mode when SMTP not configured

## CI/CD & Deployment

**Hosting:**
- Portainer instance at `10.10.10.18` (self-hosted, `/opt/personal-agent/`)
- Cloudflare Tunnel + NPM (Nginx Proxy Manager) as public reverse proxy
- Public domain: `agent.kaarle.xyz`

**Production Stack:**
- `docker-compose.prod.yml` — adds Traefik v3.0 for TLS termination
- Let's Encrypt TLS via ACME HTTP challenge
- Backend label: `Host(\`api.${DOMAIN}\`)`
- Frontend label: `Host(\`${DOMAIN}\`)`

**CI Pipeline:**
- None detected (no GitHub Actions, CircleCI, etc.)

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `ANTHROPIC_API_KEY` — Claude API access
- `OPENAI_API_KEY` — OpenAI embeddings access
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `FROM_EMAIL` — email delivery
- `MAGIC_LINK_SECRET`, `SECRET_KEY` — cryptographic signing
- `APP_URL` — CORS origin allowlist (frontend URL)
- `API_URL` — backend URL used in email links
- `DOMAIN`, `ACME_EMAIL` — production TLS (Traefik only)

**Secrets location:**
- `.env` file at repo root (gitignored), mounted into backend container via `env_file: .env`
- `.env.example` provides a template with all required keys

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

---

*Integration audit: 2026-05-18*
