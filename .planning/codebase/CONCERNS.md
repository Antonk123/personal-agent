# Codebase Concerns

**Analysis Date:** 2026-05-18

---

## Tech Debt

**Old brand name "Byggagent" in code artifacts:**
- Issue: Rename from Byggagent → Cortex was done in UI but not in backend internals.
- Files: `backend/app/main.py` (line 17: `FastAPI(title="Byggagent API")`), `backend/app/config.py` (line 6: database URL `byggagent:changeme@db:5432/byggagent`), `backend/app/routers/auth.py` (line 75: `test_email = "test@byggagent.dev"`), `backend/pyproject.toml` (line 2: `name = "byggagent-backend"`)
- Impact: Misleading API docs, confusing dev-seed email, inconsistency if product name matters to tenants.
- Fix approach: Replace `Byggagent API` → `Cortex API` in `main.py`, rename pyproject name, change dev-seed email to `test@cortex.dev`.

**`ONBOARDING_PROMPTS` defined but never consumed:**
- Issue: `backend/app/llm/prompts.py` defines a four-step `ONBOARDING_PROMPTS` dict that is never imported or used anywhere. The actual onboarding is a static frontend form (`frontend/src/app/onboarding/page.tsx`).
- Files: `backend/app/llm/prompts.py` (lines 60–83)
- Impact: Dead code; creates confusion about whether an LLM-driven onboarding flow was planned or abandoned.
- Fix approach: Either delete `ONBOARDING_PROMPTS` or document the intended use in a comment. Do not build on it without first deciding the architecture.

**`updated_assignments` and `followups` silently ignored in extraction:**
- Issue: `EXTRACTION_PROMPT` asks the LLM to return `updated_assignments` and `followups` keys, but `ExtractionService._apply_extractions` only processes `new_assignments`, `new_contacts`, `new_decisions`, `memory_fragments`, and `profile_updates`. The other two keys are silently discarded.
- Files: `backend/app/services/extraction_service.py` (lines 50–91), `backend/app/llm/prompts.py` (lines 36–49)
- Impact: Assignment phase/status updates from chat are never persisted. Follow-up tasks are never stored. Memory quality degrades silently.
- Fix approach: Either handle `updated_assignments` (call `memory_service.update_assignment`) and `followups` (store to a new table or `memory_fragments`), or remove them from the prompt to avoid confusing the LLM.

**`python-jose` dependency declared but never imported:**
- Issue: `pyproject.toml` lists `python-jose[cryptography]>=3.3.0` as a dependency, but no source file imports it. Session tokens are plain `uuid4` strings — no JWT signing is done.
- Files: `backend/pyproject.toml`
- Impact: Unnecessary dependency weight; signals an incomplete migration or abandoned JWT plan.
- Fix approach: Remove from dependencies, or implement JWT-signed session tokens if that security property is desired.

**Redis initialized but never used:**
- Issue: `backend/app/main.py` connects to Redis on startup and stores the client in `app.state.redis`, but no router or service ever reads `app.state.redis`. Redis containers are spun up in both `docker-compose.yml` and `docker-compose.prod.yml`.
- Files: `backend/app/main.py` (lines 11–14)
- Impact: Wasted infrastructure resource; if Redis is unavailable at startup the app fails to start unnecessarily.
- Fix approach: Remove the Redis lifespan setup until a concrete use case (rate limiting, caching, sessions) is implemented — or implement rate limiting using it immediately.

---

## Known Bugs

**`send_message` does not commit the transaction — relies on `get_db` auto-commit:**
- Symptoms: If any downstream code after `flush()` raises, the user message and assistant message are rolled back correctly, but the transaction pattern is fragile: `chat_service.py` calls `flush()` multiple times but never `commit()`. The commit is deferred to `get_db`'s `yield` exit.
- Files: `backend/app/services/chat_service.py` (lines 51, 74, 91), `backend/app/database.py` (lines 18–19)
- Trigger: Any exception thrown after the first `flush()` (e.g., in `_run_extraction` before the bare `pass`) correctly rolls back, but if the exception is caught at a higher layer without re-raising, the session may commit partial state.
- Workaround: The `_run_extraction` wrapper catches all exceptions, so in practice this is contained. However the pattern is fragile to future code additions.

**`_get_conversation` silently creates a new conversation when the provided ID is not found:**
- Symptoms: If a client sends a stale or wrong `conversation_id`, instead of returning 404 the server silently creates a new conversation and responds as if it belonged to the request's context.
- Files: `backend/app/services/chat_service.py` (lines 95–106)
- Trigger: Any request with a non-existent `conversation_id` UUID belonging to any tenant.

---

## Security Considerations

**Admin tenant creation endpoint is unauthenticated:**
- Risk: `POST /admin/tenants` creates a new tenant (self-registration) and requires no authentication whatsoever — no admin key, no secret header.
- Files: `backend/app/routers/admin.py` (lines 24–35)
- Current mitigation: None. Anyone who can reach the API can register arbitrary tenants.
- Recommendations: Gate with a secret header (`X-Admin-Key`) validated against an env var, or restrict via network/reverse proxy in production. For a SaaS with invite-only signup, this must be protected before public exposure.

**`POST /auth/dev-seed` protection is hostname-based only:**
- Risk: The dev-seed endpoint (creates a long-lived 365-day session) only checks that `"localhost"` or `"127.0.0.1"` appears in `settings.app_url`. If `app_url` is misconfigured in production (e.g. still contains `localhost` as a substring), this endpoint is fully open.
- Files: `backend/app/routers/auth.py` (lines 69–100)
- Current mitigation: Hostname substring check.
- Recommendations: Add an explicit `settings.debug: bool = False` flag and gate on that, not on URL content. Better yet, guard the router registration itself with `if settings.debug`.

**Session tokens stored in `localStorage` — XSS risk:**
- Risk: Bearer session tokens are stored in `localStorage`. Any XSS vulnerability (e.g., injected via user-controlled chat content rendered as HTML, a compromised dependency) can steal the token.
- Files: `frontend/src/lib/auth.ts`, `frontend/src/lib/api.ts` (line 6)
- Current mitigation: None beyond standard browser same-origin policy.
- Recommendations: Move to `httpOnly` cookies managed by the backend, or at minimum ensure chat message content is never rendered as raw HTML (`ChatMessage.tsx` should be verified to sanitize markdown/HTML output).

**No input length validation on chat message:**
- Risk: `ChatRequest.message: str` in `backend/app/routers/chat.py` (line 17) has no `Field(max_length=...)`. A malicious or buggy client can send arbitrarily large messages, causing unbounded LLM API calls and storage writes.
- Files: `backend/app/routers/chat.py` (lines 16–18), `backend/app/services/chat_service.py`
- Current mitigation: None.
- Recommendations: Add `message: str = Field(max_length=10_000)` (or similar). Add file-size validation on import endpoints.

**No file size limit on ChatGPT/Claude import uploads:**
- Risk: `POST /import/chatgpt` and `POST /import/claude` read the entire uploaded file with `await file.read()` with no size check. A large upload triggers unbounded memory allocation and potentially hundreds of LLM extraction calls.
- Files: `backend/app/routers/import_data.py` (lines 28, 46), `backend/app/services/import_service.py`
- Current mitigation: Only `.json` extension check.
- Recommendations: Add a max-size check immediately after `file.read()` (e.g., reject `> 10 MB`). Add a cap on the number of conversations extracted per import.

**Default secrets in `config.py` could ship to production:**
- Risk: `magic_link_secret`, `secret_key` both default to `"dev-secret-change-me"`. If the `.env` file is missing or incomplete in production, the app starts silently with known-weak secrets.
- Files: `backend/app/config.py` (lines 12–15)
- Current mitigation: Pydantic-settings reads from `.env` — only safe if the file is always present.
- Recommendations: Replace defaults with `None` and add a `model_validator` that raises at startup if either is falsy or matches the dev placeholder.

**`is_active` flag on `Tenant` model is never checked:**
- Risk: The `Tenant` model has an `is_active` boolean field, but `AuthService.validate_session` and `AuthService.request_magic_link` never query or enforce it. A deactivated tenant can still log in and use the API.
- Files: `backend/app/services/auth_service.py`, `backend/app/models/tenant.py` (line 17)
- Current mitigation: None.
- Recommendations: Add `Tenant.is_active == True` filter in `validate_session` and `request_magic_link`.

---

## Performance Bottlenecks

**Per-request LLM client instantiation:**
- Problem: `ClaudeAdapter` and its `anthropic.AsyncAnthropic` client are instantiated on every chat request and every extraction call. Similarly, `openai.AsyncOpenAI` is instantiated in every `generate_embedding` call.
- Files: `backend/app/services/chat_service.py` (line 22), `backend/app/services/extraction_service.py` (line 21), `backend/app/utils/embeddings.py` (line 11)
- Cause: No module-level or app-state singleton for LLM clients. Each construction opens new HTTP connection pools.
- Improvement path: Create shared singleton clients at app startup (e.g., in `lifespan`) and inject via `app.state` or a DI provider.

**N+1 assignment lookup in extraction:**
- Problem: `ExtractionService._find_assignment_id` calls `memory_service.list_assignments()` (a full DB query) once per extracted contact and once per extracted decision. For a conversation that mentions three contacts across two assignments, this is 5 separate `SELECT *` queries.
- Files: `backend/app/services/extraction_service.py` (lines 53–65, 93–98)
- Cause: Lookup is per-item rather than pre-fetched.
- Improvement path: Fetch assignments once before the loop and build a name-to-id dict.

**Chat history unbounded token growth:**
- Problem: `ChatService._get_history` fetches the last 20 messages and sends all of them to the LLM unchanged. For long conversations with verbose messages, the context window fills up silently, which will cause Claude to return errors or truncate outputs at the API level.
- Files: `backend/app/services/chat_service.py` (lines 108–115, 61)
- Cause: No token counting or trimming before LLM call.
- Improvement path: Count tokens (using `anthropic.count_tokens` or character approximation) and trim history from the oldest end to stay under a budget.

**Semantic search always runs even when OpenAI key is absent:**
- Problem: `RetrievalService.retrieve_context` calls `semantic_search` which calls `generate_embedding` (OpenAI API) on every chat message. When `openai_api_key` is empty, this fails silently with a bare `except Exception: pass`. The OpenAI API call adds 100–300 ms latency even in the happy path.
- Files: `backend/app/services/retrieval_service.py` (lines 96–100), `backend/app/utils/embeddings.py`
- Cause: No guard against empty API key before attempting the embedding call.
- Improvement path: Skip semantic search if `settings.openai_api_key` is falsy. Log a warning at startup if embeddings are disabled.

---

## Fragile Areas

**Extraction pipeline — silent total failure:**
- Files: `backend/app/services/chat_service.py` (lines 25–30), `backend/app/services/extraction_service.py` (lines 83–84), `backend/app/services/retrieval_service.py` (lines 99–100), `backend/app/services/import_service.py` (lines 80–81, 175–176)
- Why fragile: The entire memory-extraction subsystem is wrapped in bare `except Exception: pass` at multiple levels. Any bug introduced in extraction code (not just API failures) is completely invisible. The system degrades silently rather than alerting.
- Safe modification: Before changing extraction logic, add structured logging (`logger.exception(...)`) inside the bare `except` blocks. Never add new logic inside a `pass` exception handler without at minimum a log line.
- Test coverage: Zero — the `backend/tests/` directory is completely empty.

**`MemoryService.create_or_update_profile` uses `setattr` with unconstrained dict keys:**
- Files: `backend/app/services/memory_service.py` (lines 26–29), `backend/app/services/extraction_service.py` (line 89)
- Why fragile: The LLM-returned `profile_updates` dict is applied directly via `setattr(profile, key, value)` for any key that `hasattr(profile, key)`. If the LLM hallucinates a key matching an existing SQLAlchemy internal attribute (e.g. `_sa_instance_state`), this could corrupt the ORM object.
- Safe modification: Whitelist allowed profile keys explicitly rather than relying on `hasattr`.

**`ExtractionService._apply_extractions` uses `dict.pop()` that mutates input:**
- Files: `backend/app/services/extraction_service.py` (lines 54, 62)
- Why fragile: `contact_data.pop("assignment", "")` mutates the dict from the LLM JSON in place. If the same extraction result is processed twice (e.g., in a retry scenario), the `assignment` key will be missing the second time.
- Safe modification: Use `contact_data.get("assignment", "")` and construct the new dict without the key, or deep-copy before mutation.

**Frontend auth guard is client-side only:**
- Files: `frontend/src/app/chat/layout.tsx` (lines 17–21)
- Why fragile: Authentication check is a `useEffect` reading from `localStorage`. On server-side render the check is skipped (returns `null`), meaning protected pages flash briefly before redirect. There is no middleware-level route protection.
- Safe modification: Add a `middleware.ts` at the Next.js root that checks for the token cookie (requires moving auth to cookies) or accepts the current flash-then-redirect pattern as acceptable for this use case.

---

## Scaling Limits

**Single-tenant database — no row-level security:**
- Current capacity: Multi-tenant isolation relies entirely on application-layer `tenant_id` filtering. Every query manually adds a `WHERE tenant_id = ?` clause.
- Limit: One missed `tenant_id` filter in any query creates a data leak between tenants. This is a standard multi-tenancy risk — there are currently no cross-tenant checks, RLS policies, or automated tests to catch regressions.
- Scaling path: Add PostgreSQL Row Level Security policies as a defense-in-depth layer, or add integration tests that verify cross-tenant isolation for all endpoints.

**Conversation list hard-capped at 20:**
- Current capacity: `ChatService.get_conversations` has `limit: int = 20` with no pagination exposed.
- Limit: Users with many conversations will silently lose access to older ones via the UI.
- Scaling path: Add `offset`/`cursor` pagination to `GET /chat/conversations` and update `ConversationList` component to support infinite scroll or load-more.

---

## Dependencies at Risk

**`pgvector/pgvector:pg16` Docker image — extension version coupling:**
- Risk: The pgvector Docker image version is pinned to `pg16` but not to a specific pgvector release. A silent image update could change vector distance semantics or API.
- Impact: Embedding queries could silently change behavior.
- Migration plan: Pin to a specific digest or explicit version tag (e.g., `pgvector/pgvector:0.7.4-pg16`).

---

## Missing Critical Features

**No rate limiting on any endpoint:**
- Problem: Auth (`/auth/magic-link`), chat (`/chat/`), and import endpoints have no rate limiting. Redis is provisioned but unused.
- Blocks: Production deployment — magic-link endpoint can be used to enumerate registered emails (timing side-channel) and spam email delivery. Chat endpoint can drain LLM credits.

**No magic link cleanup / expiry purge job:**
- Problem: Used and expired `MagicLink` rows in the `magic_links` table are never deleted. Sessions that have passed `expires_at` are also never purged.
- Files: `backend/app/models/auth.py`, `backend/app/services/auth_service.py`
- Blocks: Table will grow indefinitely; expired sessions remain queryable (though correctly rejected by the expiry check).

**No streaming for chat responses:**
- Problem: `ClaudeAdapter` implements `generate_stream` but it is never called. `ChatService.send_message` uses blocking `generate`, meaning users see no output until the full response is ready (can be 5–15 seconds for long answers).
- Files: `backend/app/services/chat_service.py` (line 64), `backend/app/llm/claude_adapter.py` (lines 35–51)
- Blocks: Acceptable UX for a productivity tool used on-site.

---

## Test Coverage Gaps

**Entire backend test suite is absent:**
- What's not tested: Everything. `backend/tests/` is an empty directory. Dev dependencies (`pytest`, `pytest-asyncio`, `factory-boy`) are declared in `pyproject.toml` but no test files exist.
- Files: `backend/tests/` (empty)
- Risk: Any refactor of auth, extraction, retrieval, or tenant isolation can introduce regressions with no safety net.
- Priority: High

**Multi-tenant isolation has no automated verification:**
- What's not tested: No test verifies that `GET /chat/conversations`, `GET /memory/assignments`, or any other tenant-scoped endpoint cannot return data belonging to a different tenant.
- Files: All routers under `backend/app/routers/`
- Risk: A missing `tenant_id` filter in a future query silently leaks data between tenants.
- Priority: High

**Extraction pipeline behavior is entirely unverified:**
- What's not tested: LLM JSON parsing, `_apply_extractions` logic, duplicate deduplication in retrieval, token budget trimming.
- Files: `backend/app/services/extraction_service.py`, `backend/app/services/retrieval_service.py`
- Risk: Silent memory corruption or data loss from malformed LLM output goes undetected.
- Priority: Medium

---

*Concerns audit: 2026-05-18*
