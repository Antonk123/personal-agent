# Cortex — Personlig Arbetsassistent

AI-assistent med persistent, strukturerat minne. Byggd för konsulter och proffs som behöver en agent som faktiskt kommer ihåg deras uppdrag, kontakter och beslut.

## Arkitektur

```
frontend/    Next.js 14 PWA (mobil-först)
backend/     FastAPI + SQLAlchemy async + pgvector
```

## Kärnfunktioner

- **Tre-lagers minne**: Statisk profil → Strukturerade uppdrag → Automatisk konversationsextraktion
- **Semantisk sökning**: pgvector embeddings för att hitta relevant kontext
- **Magic link auth**: Lösenordslöst, enkelt
- **Import**: Migrera konversationer från ChatGPT/Claude
- **PWA**: Installerbar på telefon, offline-ready

## Kom igång (utveckling)

```bash
cp .env.example .env
# Fyll i dina nycklar i .env

docker compose up -d
# Backend: http://localhost:8000
# Postgres: localhost:5432

cd frontend && npm install && npm run dev
# Frontend: http://localhost:3000
```

## Produktion

```bash
docker compose -f docker-compose.prod.yml up -d
```

Kräver DNS pekat mot servern + korrekt `DOMAIN` i `.env`. Traefik hanterar SSL automatiskt via Let's Encrypt.

## Tech Stack

| Lager | Teknik |
|-------|--------|
| Frontend | Next.js 14, React, Zustand, Tailwind CSS |
| Backend | FastAPI, SQLAlchemy (async), Alembic |
| Databas | PostgreSQL 16 + pgvector |
| Cache | Redis 7 |
| LLM | Claude (Anthropic API), utbyggbart för lokala modeller |
| Embeddings | OpenAI text-embedding-3-small |
| Deploy | Docker Compose, Traefik reverse proxy |
