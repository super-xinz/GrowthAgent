# Xiaohongshu Comment Growth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Reddit-facing product with a Xiaohongshu workflow that discovers relevant notes and comments, generates grounded reply drafts, and executes comments only after explicit human confirmation.

**Architecture:** Run the supplied Xiaohongshu MCP as a persistent Docker service and wrap its REST API behind a typed async Python client. Preserve Product Brain and product management while adding platform-neutral content fields and Xiaohongshu-specific opportunity metadata. Keep every write behind a short-lived, single-use confirmation token.

**Tech Stack:** Docker Compose, xiaohongshu-mcp, FastAPI, HTTPX, SQLAlchemy, Alembic, Next.js 15, React 19, TypeScript.

## Global Constraints

- Do not publish Xiaohongshu notes, images, or videos.
- Do not automate likes, favorites, or bulk comments.
- Real comments and comment replies require per-action human confirmation.
- Never expose or log Xiaohongshu cookies.
- Remove all Reddit-facing UI and terminology.
- Preserve product ordering and seven-day trash behavior.

---

### Task 1: MCP Service and Client Contract

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.gitignore`
- Modify: `.env.example`
- Modify: `apps/api/app/config.py`
- Create: `apps/api/app/xiaohongshu_client.py`
- Create: `tests/test_xiaohongshu_client.py`

- [ ] Write failing HTTPX mock-transport tests for health, login status, QR code, search, detail, comment, reply, timeout, and remote error normalization.
- [ ] Run focused tests and verify RED.
- [ ] Add the MCP service with persistent data and implement the typed async client without write retries.
- [ ] Run focused tests and verify GREEN.

### Task 2: Login API and Account UI

**Files:**
- Modify: `apps/api/app/main.py`
- Create: `apps/web/app/account/page.tsx`
- Create: `apps/web/app/account/XiaohongshuLogin.tsx`
- Modify: `apps/web/app/SidebarNav.tsx`
- Modify: `apps/web/lib/api.ts`

- [ ] Add failing API tests for status, QR proxy, and cookie reset.
- [ ] Implement stable ThreadPilot login endpoints and Chinese error responses.
- [ ] Build QR login UI with refresh, status polling, logged-in state, and confirmed reset.
- [ ] Verify API tests, frontend tests, lint, and typecheck.

### Task 3: Xiaohongshu Content and Opportunity Import

**Files:**
- Modify: `apps/api/app/models.py`
- Modify: `apps/api/app/schemas.py`
- Create: `apps/api/alembic/versions/0003_xiaohongshu_content.py`
- Create: `apps/api/app/xiaohongshu_service.py`
- Modify: `apps/api/app/main.py`
- Test: `tests/test_xiaohongshu_workflow.py`

- [ ] Write failing tests for keyword search import, feed/comment IDs, xsec tokens, note/comment opportunity classification, and duplicate suppression.
- [ ] Add platform-neutral fields and migration.
- [ ] Implement search/detail ingestion and opportunity creation.
- [ ] Verify focused and complete backend tests.

### Task 4: Draft and Human-Confirmed Comment Execution

**Files:**
- Modify: `apps/api/app/models.py`
- Modify: `apps/api/app/services.py`
- Modify: `apps/api/app/main.py`
- Test: `tests/test_xiaohongshu_workflow.py`

- [ ] Write failing tests for grounded Chinese drafts, one-time confirmation tokens, expiry, account binding, idempotency, quota, and no write retry.
- [ ] Implement draft generation and confirmation records.
- [ ] Implement confirmed note-comment and comment-reply execution through the MCP client.
- [ ] Verify all safety and idempotency tests.

### Task 5: Replace Reddit UI with Xiaohongshu Workflow

**Files:**
- Modify: `apps/web/app/dashboard/page.tsx`
- Modify: `apps/web/app/products/[id]/page.tsx`
- Modify: `apps/web/app/products/[id]/opportunities/page.tsx`
- Modify: `apps/web/app/products/[id]/conversations/page.tsx`
- Modify: `apps/web/app/products/[id]/safety/page.tsx`
- Modify: `apps/web/app/SidebarNav.tsx`
- Modify: `apps/web/lib/labels.ts`
- Modify: `apps/web/app/navigation.css`

- [ ] Rename navigation and all visible platform copy.
- [ ] Add search action, Xiaohongshu note/comment context, editable draft, and confirmation dialog.
- [ ] Replace safety page with Xiaohongshu account and operation audit information.
- [ ] Verify no visible Reddit/subreddit/shadow strings remain.

### Task 6: End-to-End Verification

- [ ] Start MCP and verify health.
- [ ] Display QR code and wait for the user to scan.
- [ ] Verify real search, detail import, opportunity scoring, and draft generation.
- [ ] Stop before a real comment until the user explicitly confirms that exact draft and target.
- [ ] Run Ruff, Pytest, frontend tests, ESLint, TypeScript, production build, and health checks.
- [ ] Commit verified changes and push `main`.
