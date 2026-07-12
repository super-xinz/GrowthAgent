# ThreadPilot Growth Workflow Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Xiaohongshu discovery, auto-drafting, review, and reliable human-confirmed publishing fully operable from the Chinese web UI.

**Architecture:** Add durable draft and ownership fields, refresh ephemeral Xiaohongshu tokens through a read-only preflight service, and expose one workflow-oriented search endpoint that imports and drafts high-score opportunities. Recompose dashboard and opportunity UI around workflow state instead of legacy metrics.

**Tech Stack:** FastAPI, SQLAlchemy Async, Alembic, HTTPX, Next.js 15, React 19, TypeScript, Docker Compose.

## Global Constraints

- Automatic draft threshold is 0.70.
- Every external comment or reply still requires one explicit human confirmation.
- Never retry a write request.
- Never claim product affiliation unless `is_owned=true` and a real disclosure is configured.
- Do not publish notes, like, favorite, follow, DM, or bulk comment.

---

### Task 1: Reliable publish preflight

**Files:** `apps/api/app/xiaohongshu_service.py`, `apps/api/app/main.py`, `tests/test_xiaohongshu_workflow.py`

- [ ] Add failing tests for stale token refresh, missing target comment, and exactly one write call.
- [ ] Implement search-by-source-keyword token refresh and detail verification.
- [ ] Use refreshed token in execute and return actionable Chinese errors.
- [ ] Run focused tests.

### Task 2: Ownership and durable automatic drafts

**Files:** `apps/api/app/models.py`, `apps/api/app/schemas.py`, `apps/api/app/xiaohongshu_service.py`, `apps/api/app/main.py`, `apps/api/alembic/versions/0007_growth_workflow.py`, `tests/test_xiaohongshu_workflow.py`

- [ ] Add failing tests for 0.70 threshold, durable drafts, and ownership-safe promotion.
- [ ] Add product ownership and opportunity draft fields with migration.
- [ ] Generate and persist drafts during search import for qualifying opportunities.
- [ ] Return draft and workflow state in opportunity API.

### Task 3: Workflow dashboard and search entry

**Files:** `apps/web/app/dashboard/page.tsx`, `apps/web/app/dashboard/ProductManager.tsx`, `apps/web/app/products/[id]/page.tsx`, `apps/web/app/products/[id]/ProductModeControls.tsx`, `apps/web/lib/api.ts`, `apps/web/lib/navigation.ts`, `apps/web/app/navigation.css`, `apps/web/tests/navigation.test.ts`

- [ ] Add failing frontend tests for workflow summaries and opportunity filters.
- [ ] Add visible search CTA to each product and product hero.
- [ ] Redesign dashboard cards and hierarchy around high intent, review queue, and published work.
- [ ] Verify responsive layout, lint, and typecheck.

### Task 4: Review-first opportunity UI

**Files:** `apps/web/app/products/[id]/opportunities/page.tsx`, `apps/web/app/products/[id]/opportunities/OpportunityActions.tsx`, `apps/web/app/navigation.css`

- [ ] Show persisted auto-drafts without an extra generation click.
- [ ] Add workflow filters and clear empty/loading/error states.
- [ ] Keep editable draft plus exact-target confirmation dialog.
- [ ] Never invoke execute during automated browser testing.

### Task 5: Full verification and delivery

- [ ] Apply migration and confirm Alembic head.
- [ ] Run complete backend and frontend verification.
- [ ] Run production dependency audit and isolated Docker build.
- [ ] Validate API/MCP/Web health and one confirmation-only flow.
- [ ] Commit all verified changes and push main.
