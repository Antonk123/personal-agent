# Coding Conventions

**Analysis Date:** 2026-05-18

## Naming Patterns

**Files (Backend — Python):**
- Modules use `snake_case`: `auth_service.py`, `memory_service.py`, `chat_service.py`
- Router files match the resource name: `auth.py`, `chat.py`, `memory.py`
- All under `backend/app/{routers,services,models,utils,llm}/`

**Files (Frontend — TypeScript):**
- React components use `PascalCase`: `ChatInput.tsx`, `ConversationList.tsx`, `AppShell.tsx`
- Utility/lib files use `kebab-case`: `chat-store.ts`, `api.ts`, `cn.ts`, `hooks.ts`
- Next.js route files follow the framework convention: `page.tsx`, `layout.tsx`

**Functions (Backend):**
- All async: `async def send_message(...)`, `async def get_profile(...)`
- Private helpers prefixed with `_`: `_generate_response`, `_run_extraction`, `_get_history`
- Names are verb-noun or verb-object: `request_magic_link`, `verify_magic_link`, `validate_session`
- Docstrings on public methods only (single-line summary): `"""Create a magic link... Returns token or None."""`

**Functions (Frontend):**
- React hooks: `camelCase` prefixed with `use`: `useChat`, `useChatStore`
- Event handlers: verb-based, `camelCase`: `handleSubmit`, `handleRename`, `handleDelete`
- Simple helpers: plain `camelCase`: `groupByDate`, `isAuthenticated`, `clearSession`
- Async operations in hooks return `void` — errors caught locally

**Classes (Backend):**
- Services: `PascalCase` + `Service` suffix: `ChatService`, `AuthService`, `MemoryService`
- Pydantic request/response models: `PascalCase` + semantic suffix: `ChatRequest`, `ChatResponse`, `MagicLinkRequest`
- SQLAlchemy models: plain `PascalCase` entity names: `Conversation`, `Message`, `MemoryFragment`

**Variables:**
- Backend: `snake_case` throughout — `tenant_id`, `session_token`, `conversation_id`
- Frontend: `camelCase` throughout — `conversationId`, `isLoading`, `currentConversationId`
- Constants: `SCREAMING_SNAKE_CASE` in both — `STEPS`, `VARIANTS`, `SIZES`, `SYSTEM_PROMPT_TEMPLATE`

**Types (Frontend):**
- Local component interfaces: `PascalCase`, colocated at top of file: `interface ChatMessageProps`, `interface Form`
- Store interfaces: defined inline in the store file (`interface ChatState`, `interface Message`)
- Union types for constrained strings: `type Variant = "primary" | "secondary" | "ghost" | "danger"`

## Code Style

**Formatting (Backend):**
- Tool: `ruff` (configured in `backend/pyproject.toml`)
- Line length: 100 characters
- Target: Python 3.12

**Formatting (Frontend):**
- No Prettier config present — formatting is implicit via TypeScript strict mode + Next.js lint
- String literals: double quotes throughout
- Trailing commas used in multi-line structures

**Linting (Frontend):**
- `next lint` (ESLint via Next.js built-in config)
- TypeScript strict mode enabled (`"strict": true` in `frontend/tsconfig.json`)

## Import Organization

**Backend (Python):**
Order within a file:
1. Standard library (`import uuid`, `from datetime import ...`)
2. Third-party (`from fastapi import ...`, `from sqlalchemy import ...`)
3. Internal app imports (`from app.config import settings`, `from app.models... import ...`)

All internal imports use absolute paths from `app.*` — no relative imports.

Exception: routers registered in `backend/app/main.py` use post-import at module level with `# noqa: E402` to avoid circular import issues.

**Frontend (TypeScript):**
Order within a file:
1. `"use client"` directive (when needed) — always first line
2. React/framework imports (`import { useEffect, useState } from "react"`)
3. Next.js imports (`from "next/navigation"`, `from "next/link"`)
4. Third-party libraries (`from "lucide-react"`, `from "react-markdown"`)
5. Internal imports using `@/` alias: `from "@/lib/api"`, `from "@/stores/chat-store"`, `from "@/components/ui/Button"`

**Path Aliases (Frontend):**
- `@/*` maps to `frontend/src/*` (configured in `frontend/tsconfig.json`)
- Use: `import { api } from "@/lib/api"`, not relative paths

## Error Handling

**Backend Patterns:**

Routers raise `HTTPException` with explicit status codes and detail strings:
```python
raise HTTPException(status_code=400, detail="Invalid or expired token")
raise HTTPException(status_code=404, detail="Conversation not found")
raise HTTPException(status_code=401, detail="Not authenticated")
```

Services return `None` to signal "not found" — the router decides to raise or return empty:
```python
async def validate_session(self, token: str) -> uuid.UUID | None:
    ...
    return None  # caller raises 401
```

Background/non-critical operations swallow exceptions silently:
```python
async def _run_extraction(self, ...):
    try:
        await self.extraction_service.extract(...)
    except Exception:
        pass  # Don't fail chat if extraction fails
```

Non-critical loops also silently skip on individual failure:
```python
except Exception:
    pass  # Skip if embedding fails
```

Email send failures are logged but do not propagate (endpoint returns 200):
```python
except Exception as exc:
    import logging
    logging.getLogger(__name__).exception("Failed to send magic link to %s: %s", body.email, exc)
```

**Frontend Patterns:**

`try/catch` in async hook functions. User-facing errors set to Swedish string state variable:
```typescript
} catch (err) {
  setError("Kunde inte skicka meddelandet. Försök igen.");
}
```

Some failures are silently swallowed when the operation is best-effort:
```typescript
} catch {
  // Silent fail
}
```

The API client centrally handles 401 by redirecting to `/auth/login` and throwing:
```typescript
if (response.status === 401) {
  localStorage.removeItem("session_token");
  window.location.href = "/auth/login";
  throw new Error("Unauthorized");
}
```

Optimistic UI with rollback on failure (rename/delete in `ConversationList.tsx`):
```typescript
renameConversation(id, trimmed);  // optimistic
try {
  await api.renameConversation(id, trimmed);
} catch {
  loadConversations();  // revert
}
```

## Logging

**Backend:**
- Standard `logging` module — no third-party logging framework
- Use `logging.getLogger(__name__)` to get a named logger per module
- Only log exceptions (`logger.exception(...)`) for critical failures like email sends
- Most success paths have no log statements

**Frontend:**
- No logging framework — `console.*` not used in production code
- Errors surface to users via state, not console

## Comments

**Backend:**
- Inline comments explain non-obvious intent: `# Always return 200 to not reveal email existence`, `# noqa: E402`
- Docstrings on public service methods only — single sentence, on same line as `"""`:
  ```python
  async def request_magic_link(self, email: str) -> str | None:
      """Create a magic link for the given email. Returns token or None if not found."""
  ```
- Private helpers (`_prefixed`) often have no docstring
- Short inline section labels in long functions: `# Store user message`, `# Get conversation history`

**Frontend:**
- No JSDoc comments — type signatures serve as documentation
- Inline comments rare — only for non-obvious logic

## Function Design

**Backend:**
- Services are async classes injected with `db: AsyncSession` in `__init__`
- Public methods accept typed arguments; private helpers `_prefixed` for internal orchestration
- Return types annotated: `-> Session | None`, `-> list[Message]`, `-> dict`
- Functions are small and single-purpose; complex operations composed via `await self._helper()`

**Frontend:**
- Components accept typed `Props` interface (defined just above the component)
- Event handlers are plain `function` declarations inside the component (not arrow functions stored in variables)
- Custom hooks return only what callers need: `return { sendMessage, loadConversation, loadConversations }`
- `forwardRef` used for reusable UI primitives (`Button`)

## Module Design (Backend)

**Structure pattern:** Router → Service → Model
- Routers (`backend/app/routers/`) handle HTTP concerns and Pydantic validation only
- Services (`backend/app/services/`) contain all business logic
- Models (`backend/app/models/`) are SQLAlchemy `Mapped` classes only — no business methods
- Services are instantiated inside router handlers, not as module-level singletons: `service = ChatService(db)`

**Pydantic models:**
- Request bodies and response schemas defined in the router file (not a separate `schemas.py`)
- `BaseModel` for all I/O types; `model_dump(exclude_none=True)` used when passing to services

## Module Design (Frontend)

**State:** Zustand store in `frontend/src/stores/chat-store.ts` holds server-synced state
**API:** Singleton `api` class instance exported from `frontend/src/lib/api.ts`
**Hooks:** Custom hooks in `frontend/src/lib/hooks.ts` bridge the store and API
**Components:** Presentational — receive props or read from store; do not call `api` directly (hooks do)
**Exception:** `ConversationList.tsx` calls `api` directly for rename/delete — a minor inconsistency

**Exports:**
- Named exports for all components and utilities: `export function Button(...)`, `export const api = ...`
- Default exports only for Next.js page files (`export default function ConversationPage()`)
- No barrel `index.ts` files

## UI / Styling Conventions

**Tailwind custom tokens (all semantic — no raw hex in JSX):**
- Colors: `bg-bg`, `bg-surface`, `bg-surface-2`, `text-fg`, `text-fg-muted`, `text-fg-subtle`, `border-border`, `bg-accent`, `text-accent`, `bg-danger`, etc.
- Dark mode via `data-theme="dark"` attribute or `prefers-color-scheme`; CSS custom properties in `frontend/src/app/globals.css`

**`cn()` utility** (`frontend/src/lib/cn.ts`): simple class merge (no `clsx`/`tailwind-merge`):
```typescript
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
```

**Component variant pattern** — lookup object keyed by union type:
```typescript
const VARIANTS: Record<Variant, string> = { primary: "...", secondary: "...", ... };
```
Applied via `cn(VARIANTS[variant], SIZES[size], ...)`.

**Swedish UI text:** All user-visible strings are in Swedish. Error messages, placeholders, button labels, and empty states are Swedish throughout.

**Animations:** Custom Tailwind keyframes `animate-fade-in`, `animate-slide-up`, `animate-shimmer` — use these, not inline `transition` hacks.

---

*Convention analysis: 2026-05-18*
