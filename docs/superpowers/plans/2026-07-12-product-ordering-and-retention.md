# Product Ordering and Seven-Day Retention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent product ordering, seven-day soft deletion, recovery, manual permanent deletion, and automatic expiry cleanup.

**Architecture:** Extend `Product` with ordering and retention fields, expose transactional lifecycle APIs, and centralize expired-product cleanup in a reusable async service called by Celery Beat. The Dashboard owns reorder/delete/trash interactions while the root switcher consumes the same ordered active-product endpoint.

**Tech Stack:** FastAPI, SQLAlchemy async, Alembic, Celery, PostgreSQL/SQLite tests, Next.js 15, React 19, TypeScript, native HTML drag events.

## Global Constraints

- Soft-deleted products remain recoverable for exactly seven days.
- Active product queries exclude deleted products and preserve `sort_order`.
- Reordering is transactional and rejects stale or incomplete ID sets with HTTP 409.
- Product switcher and Dashboard must show identical persisted order.
- Permanent deletion is limited to trashed products and cascades associated data.
- Reddit publishing safety behavior remains unchanged.

---

### Task 1: Product Lifecycle Model and Migration

**Files:**
- Modify: `apps/api/app/models.py`
- Modify: `apps/api/app/schemas.py`
- Create: `apps/api/alembic/versions/0002_product_ordering_retention.py`
- Test: `tests/test_product_lifecycle.py`

**Interfaces:**
- Produces `Product.sort_order: int`, `deleted_at: datetime | None`, `purge_after: datetime | None` and `ProductOrderUpdate.product_ids: list[str]`.

- [ ] Write a failing test that creates two products and expects ascending `sort_order` plus lifecycle fields in JSON.
- [ ] Run `docker compose exec -T api pytest -q /app/tests/test_product_lifecycle.py` and verify missing fields fail.
- [ ] Add model/schema fields and an Alembic migration that backfills stable order by `created_at`.
- [ ] Run the focused test and verify it passes.

### Task 2: Ordering and Soft-Delete APIs

**Files:**
- Modify: `apps/api/app/main.py`
- Modify: `tests/test_product_lifecycle.py`

**Interfaces:**
- Produces `PUT /v1/products/order`, `GET /v1/products/trash`, `DELETE /v1/products/{id}`, and `POST /v1/products/{id}/restore`.

- [ ] Add failing tests for persisted reorder, incomplete-set 409, deletion hiding, deleted detail 404, paused/autopublish-off state, and restore-to-end.
- [ ] Run focused tests and verify each fails for the missing behavior.
- [ ] Implement active/deleted query helpers and all four endpoints in single transactions.
- [ ] Run focused tests and verify all pass.

### Task 3: Permanent and Scheduled Cleanup

**Files:**
- Create: `apps/api/app/product_lifecycle.py`
- Modify: `apps/api/app/main.py`
- Modify: `apps/api/app/worker.py`
- Modify: `tests/test_product_lifecycle.py`

**Interfaces:**
- Produces `purge_expired_products(session, now_at=None) -> int`, `DELETE /v1/products/{id}/permanent`, and Celery task `purge_expired_products` scheduled hourly.

- [ ] Add failing tests that reject permanent deletion of active products, delete trashed products, and purge only expired rows.
- [ ] Run focused tests and verify RED.
- [ ] Implement the reusable async purge service, guarded permanent endpoint, Celery task, and Beat schedule.
- [ ] Run focused tests and verify GREEN.

### Task 4: Frontend Reorder Helpers and API Client

**Files:**
- Modify: `apps/web/lib/navigation.ts`
- Modify: `apps/web/lib/api.ts`
- Modify: `apps/web/tests/navigation.test.ts`

**Interfaces:**
- Produces `moveProduct(ids, from, to)`, `retentionDays(purgeAfter, now)`, `getTrashedProducts()`, and mutation helpers for order/delete/restore/permanent-delete.

- [ ] Add failing tests for up/down/drag reorder boundaries and rounded-up retention days.
- [ ] Run `docker compose exec -T web npm test` and verify RED.
- [ ] Implement pure helpers and API mutation functions.
- [ ] Run tests and verify GREEN.

### Task 5: Dashboard Ordering and Trash UI

**Files:**
- Create: `apps/web/app/dashboard/ProductManager.tsx`
- Modify: `apps/web/app/dashboard/page.tsx`
- Modify: `apps/web/app/navigation.css`

**Interfaces:**
- Consumes active products, trashed products, reorder/lifecycle endpoints, and `router.refresh()`.
- Produces draggable cards, accessible up/down buttons, soft-delete confirmation, trash panel, restore, and permanent-delete confirmation.

- [ ] Implement the client manager using tested helpers; native drag/drop and buttons must call the same reorder mutation.
- [ ] Display mutation errors and rollback optimistic ordering on failures.
- [ ] Remove server-only product card rendering and pass serializable community counts to the manager.
- [ ] Run tests, ESLint, and TypeScript; fix until clean.

### Task 6: Complete Regression and Delivery

**Files:**
- Modify only files needed for verification defects.

- [ ] Run Ruff and the complete Pytest suite.
- [ ] Run frontend tests, ESLint, TypeScript, and production build.
- [ ] Browser-test reorder persistence, soft delete, restore, and switcher synchronization using disposable test products; do not permanently delete user-owned products.
- [ ] Confirm API health and web HTTP 200.
- [ ] Commit verified changes and push `main` to `origin`.
