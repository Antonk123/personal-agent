#!/bin/bash
# Kör detta i byggagent/-mappen för att initiera git och pusha till GitHub
# Skapa först ett tomt repo på GitHub: https://github.com/new (namn: byggagent)

set -e

# Ta bort ev. trasig git-state från sandbox
rm -rf .git

# Initiera nytt repo
git init -b main
git add -A
git commit -m "feat: initial implementation - full stack personal work agent

Backend:
- FastAPI with async SQLAlchemy + pgvector
- Three-layer memory system (profile, assignments, conversation extraction)
- Claude LLM adapter with abstraction for future local models
- Semantic search via OpenAI embeddings + cosine similarity
- Magic link auth (passwordless)
- ChatGPT/Claude conversation import with auto-extraction
- Multi-tenant architecture

Frontend:
- Next.js 14 PWA (mobile-first, installable)
- Guided onboarding interview
- Chat interface with conversation history
- Memory management UI
- Zustand state management

Infrastructure:
- Docker Compose dev + prod (Traefik + SSL)
- Alembic async migrations"

echo ""
echo "✓ Repo initierat och committat!"
echo ""
echo "Nästa steg - skapa repo på GitHub och kör:"
echo "  git remote add origin git@github.com:DITT-ANVÄNDARNAMN/byggagent.git"
echo "  git push -u origin main"
