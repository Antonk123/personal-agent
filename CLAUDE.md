# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cortex — a personal AI work assistant with persistent structured memory. Multi-tenant SaaS with magic-link auth, three-layer memory system (profile → assignments → auto-extracted fragments), and semantic vector search via pgvector.

## Commands

### Development

```bash
# Start all services (Postgres, Redis, backend, frontend)
docker compose up -d

# Frontend only (outside Docker for faster iteration)
cd frontend && npm run dev          # http://localhost:3000

# Backend runs inside Docker with --reload, hot-reloads on file changes
# Logs: docker compose logs -f backend
```

### Database Migrations

```bash
cd backend
alembic upgrade head                # Apply all migrations
alembic revision --autogenerate -m "description"  # Create new migration
```

### Testing

```bash
# Backend (no real DB needed — uses mocked AsyncSession)
cd backend && pytest                      # All tests
cd backend && pytest tests/test_smoke.py  # Single file
cd backend && pytest -k "test_magic"      # By pattern

# Frontend
cd frontend && npm test                   # Vitest single run
cd frontend && npm run test:watch         # Watch mode
```

### Linting

```bash
cd backend && ruff check . && ruff format --check .   # Python (line-length: 100, py312)
cd frontend && npm run lint                            # next lint (ESLint)
```

### Production

```bash
docker compose -f docker-compose.prod.yml up -d
# Traefik handles SSL via Let's Encrypt
# Deployed at /opt/personal-agent/ on 10.10.10.18
```

## Architecture

```
Router (HTTP + Pydantic validation)
  → Service (business logic, instantiated per-request with AsyncSession)
    → LLM Adapter (ClaudeAdapter) / ORM Models
      → PostgreSQL + pgvector
```

**Multi-tenancy:** Every DB row has `tenant_id`. The `get_current_tenant` dependency (`backend/app/middleware/tenant.py`) resolves Bearer token → tenant UUID on all protected routes.

**Chat flow:** User message → ChatService persists → ContextBuilder assembles system prompt (profile + assignments + retrieved context) → RetrievalService (entity search + vector cosine) → ClaudeAdapter.generate() → Response persisted → ExtractionService silently extracts memory entities in background.

**Streaming:** Chat uses SSE (`text/event-stream`) for both send and regenerate endpoints.

**State management:** Zustand store (`frontend/src/stores/chat-store.ts`) for client state. API calls go through the singleton `api` client (`frontend/src/lib/api.ts`) which auto-injects Bearer token and redirects to login on 401.

## Key Conventions

- **All UI text is in Swedish** — error messages, labels, placeholders, empty states
- **Semantic Tailwind tokens only** — use `bg-surface`, `text-fg`, `text-fg-muted`, `border-border`, `bg-accent` etc. (defined as CSS vars in `globals.css`). No raw hex/color values in JSX.
- **Backend imports are absolute** — always `from app.services.x import X`, never relative
- **Frontend path alias** — `@/*` maps to `frontend/src/*`
- **Services are classes** instantiated with `db: AsyncSession` in handlers: `service = ChatService(db)`
- **Pydantic models** for request/response are defined in the router file, not a separate schemas module
- **No barrel exports** — import directly from the source file
- **Embeddings** use Voyage AI (`backend/app/utils/embeddings.py`), 1024-dim vectors

## Environment

All config via `.env` at repo root (loaded by pydantic-settings in `backend/app/config.py`). Key vars:

- `DATABASE_URL`, `REDIS_URL` — infrastructure
- `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY` — LLM providers
- `MAGIC_LINK_SECRET`, `SECRET_KEY` — auth signing
- `SMTP_*`, `FROM_EMAIL` — magic-link email delivery
- `APP_URL`, `API_URL` — cross-origin URLs
- `NEXT_PUBLIC_API_URL` — frontend build-time API base (passed as Docker build arg)
