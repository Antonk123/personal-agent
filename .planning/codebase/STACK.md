# Technology Stack

**Analysis Date:** 2026-05-18

## Languages

**Primary:**
- Python 3.12 - Backend (FastAPI, all server logic)
- TypeScript 5.5 - Frontend (Next.js app, strict mode enabled)

**Secondary:**
- CSS (Tailwind via PostCSS) - Frontend styling
- SQL - Database migrations via Alembic

## Runtime

**Environment:**
- Python 3.12 (CPython, `python:3.12-slim` Docker image)
- Node.js 20 (`node:20-alpine` Docker image for frontend)

**Package Manager:**
- Backend: `pip` with `pyproject.toml` (PEP 517)
- Frontend: `npm` with `package-lock.json`
- Lockfiles: Both present (`package-lock.json`, no backend lockfile — pip resolves at build time)

## Frameworks

**Core:**
- FastAPI >= 0.115.0 - Python async web framework, all API routes
- Next.js ^14.2.0 - React SSR/SSG framework, App Router (`src/app/`)
- React ^18.3.0 - UI library

**State Management:**
- Zustand ^4.5.0 - Frontend client state (`src/stores/chat-store.ts`)

**Testing:**
- pytest >= 8.2.0 - Backend test runner (no tests currently written)
- pytest-asyncio >= 0.23.0 - Async test support
- pytest-cov >= 5.0.0 - Coverage

**Build/Dev:**
- Uvicorn >= 0.30.0 (with standard extras) - ASGI server, 2 workers in production
- Alembic >= 1.13.0 - Database schema migrations (`backend/alembic/`)
- Ruff >= 0.5.0 - Python linter/formatter (target: py312, line-length: 100)
- next-pwa ^5.6.0 - Progressive Web App support (disabled in dev)
- Tailwind CSS ^3.4.0 - Utility-first CSS framework
- @tailwindcss/typography ^0.5.0 - Prose styling for markdown rendering
- PostCSS ^8.4.0 - CSS processing

## Key Dependencies

**Critical:**
- anthropic >= 0.30.0 - Anthropic Python SDK, primary LLM provider (`backend/app/llm/claude_adapter.py`)
- openai >= 1.30.0 - OpenAI Python SDK, used exclusively for embeddings (`backend/app/utils/embeddings.py`)
- SQLAlchemy[asyncio] >= 2.0.30 - ORM with async engine (`backend/app/database.py`)
- asyncpg >= 0.29.0 - Async PostgreSQL driver
- pgvector >= 0.3.0 - Vector similarity search via `Vector(1536)` column in `memory_fragments`
- redis[hiredis] >= 5.0.0 - Async Redis client, session/cache layer (`backend/app/main.py`)
- pydantic-settings >= 2.3.0 - Settings management from env vars (`backend/app/config.py`)
- aiosmtplib >= 3.0.0 - Async SMTP for magic-link email (`backend/app/utils/email.py`)
- python-jose[cryptography] >= 3.3.0 - JWT utilities

**Infrastructure:**
- react-markdown ^10.1.0 + remark-gfm ^4.0.1 - Markdown rendering for chat messages
- lucide-react ^1.16.0 - Icon library
- httpx >= 0.27.0 - Async HTTP client (also used in tests)

## Configuration

**Environment:**
- All settings defined in `backend/app/config.py` via `pydantic-settings` `BaseSettings`
- Loaded from `.env` file at repo root (mounted into backend container via `env_file: .env`)
- Frontend receives `NEXT_PUBLIC_API_URL` as build-time `ARG` in Dockerfile

**Required env vars (from `.env.example`):**
- `DATABASE_URL` - PostgreSQL connection string (asyncpg driver)
- `REDIS_URL` - Redis connection URL
- `MAGIC_LINK_SECRET`, `SECRET_KEY` - Signing secrets
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `FROM_EMAIL` - Email config
- `ANTHROPIC_API_KEY` - Claude API key
- `OPENAI_API_KEY` - OpenAI API key (embeddings only)
- `APP_URL`, `API_URL` - Cross-origin URLs
- `DOMAIN`, `ACME_EMAIL` - Production Traefik/TLS config

**Build:**
- `frontend/next.config.js` - Next.js config with PWA wrapper and standalone output
- `frontend/tailwind.config.ts` - Design tokens as CSS vars (`var(--color-*)`)
- `frontend/tsconfig.json` - Strict TypeScript, path alias `@/*` → `./src/*`

## Platform Requirements

**Development:**
- Docker + Docker Compose (`docker-compose.yml`)
- Services: PostgreSQL 16 (pgvector image), Redis 7-alpine, backend (port 8000), frontend (port 3000)

**Production:**
- Docker Compose with Traefik v3.0 reverse proxy (`docker-compose.prod.yml`)
- TLS via Let's Encrypt ACME HTTP challenge
- Deployed on Portainer at 10.10.10.18 (`/opt/personal-agent/`)
- Public URL: `agent.kaarle.xyz` via Cloudflare Tunnel (NPM as reverse proxy)
- Backend runs 2 Uvicorn workers in production

---

*Stack analysis: 2026-05-18*
