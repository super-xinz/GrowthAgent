# ThreadPilot Multi-Product Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a persistent searchable product switcher with an embedded create action, replace the dashboard's implicit first-product view with explicit multi-product management, and remove duplicate product navigation actions.

**Architecture:** Keep product data server-fetched in the root layout and pass a small serializable product summary into a client navigation shell. Put pathname parsing, filtering, and dashboard aggregation in pure helpers so behavior can be tested before UI implementation. Product pages share a small server-rendered breadcrumb component and retain only page-specific actions.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5.7, Node built-in test runner, existing CSS, FastAPI backend unchanged.

## Global Constraints

- The product switcher must always include `＋ 新建产品` and navigate it to `/products/new`.
- Selecting a product navigates to `/products/{id}`.
- Dashboard metrics summarize all products and never silently select the first product.
- Product pages must not repeat links already present in the product context navigation.
- Reddit safety behavior and backend APIs remain unchanged.
- Desktop and viewports below 800px must remain usable.

---

### Task 1: Pure Navigation and Product Summary Rules

**Files:**
- Create: `apps/web/lib/navigation.ts`
- Create: `apps/web/tests/navigation.test.ts`
- Modify: `apps/web/package.json`

**Interfaces:**
- Produces: `ProductNavItem`, `parseProductId(pathname)`, `filterProducts(products, query)`, `summarizeProducts(products)`.
- Consumes: product objects with `id`, `name`, `status`, `website_url`, `github_url`, `daily_reply_limit`, and optional `subreddits`.

- [ ] **Step 1: Add a failing Node test script and behavior tests**

```json
"test": "node --experimental-strip-types --test tests/*.test.ts"
```

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {filterProducts, parseProductId, summarizeProducts} from "../lib/navigation.ts";

const products = [
  {id: "alpha", name: "Alpha Pilot", status: "READY"},
  {id: "beta", name: "Beta Lab", status: "ANALYSIS_FAILED"},
  {id: "gamma", name: "Gamma", status: "SHADOW_RUNNING"},
];

test("parses a real product id but excludes the new route", () => {
  assert.equal(parseProductId("/products/alpha/opportunities"), "alpha");
  assert.equal(parseProductId("/products/new"), null);
  assert.equal(parseProductId("/dashboard"), null);
});

test("filters products case-insensitively without changing source order", () => {
  assert.deepEqual(filterProducts(products, "PILOT").map((p) => p.id), ["alpha"]);
  assert.deepEqual(filterProducts(products, "").map((p) => p.id), ["alpha", "beta", "gamma"]);
});

test("summarizes all product statuses", () => {
  assert.deepEqual(summarizeProducts(products), {total: 3, ready: 1, running: 1, attention: 1});
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `docker compose exec -T web npm test`

Expected: FAIL because `../lib/navigation.ts` is not available.

- [ ] **Step 3: Implement minimal pure helpers using Node 22's built-in TypeScript stripping**

```ts
export type ProductNavItem = {
  id: string;
  name: string;
  status: string;
  website_url?: string | null;
  github_url?: string | null;
  daily_reply_limit?: number;
  subreddits?: unknown[];
};

export function parseProductId(pathname: string) {
  const match = pathname.match(/^\/products\/([^/]+)/);
  return match?.[1] && match[1] !== "new" ? match[1] : null;
}

export function filterProducts(products: ProductNavItem[], query: string) {
  const normalized = query.trim().toLocaleLowerCase("zh-CN");
  return normalized ? products.filter((product) => product.name.toLocaleLowerCase("zh-CN").includes(normalized)) : products;
}

export function summarizeProducts(products: ProductNavItem[]) {
  return {
    total: products.length,
    ready: products.filter((product) => product.status === "READY").length,
    running: products.filter((product) => product.status === "SHADOW_RUNNING").length,
    attention: products.filter((product) => ["ANALYSIS_FAILED", "INGEST_FAILED"].includes(product.status)).length,
  };
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `docker compose exec -T web npm test`

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/navigation.ts apps/web/tests/navigation.test.ts apps/web/package.json
git commit -m "test: define multi-product navigation rules"
```

### Task 2: Persistent Product Switcher and Context Navigation

**Files:**
- Create: `apps/web/app/ProductSwitcher.tsx`
- Modify: `apps/web/app/SidebarNav.tsx`
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/globals.css`

**Interfaces:**
- Consumes: `ProductNavItem[]`, `parseProductId`, `filterProducts`, `zhLabel`.
- Produces: an accessible product switcher and one active product navigation item.

- [ ] **Step 1: Extend the failing navigation test for active routes**

```ts
import {isNavActive} from "../lib/navigation";

test("marks only the exact product section active", () => {
  assert.equal(isNavActive("/products/alpha", "/products/alpha"), true);
  assert.equal(isNavActive("/products/alpha/opportunities", "/products/alpha"), false);
  assert.equal(isNavActive("/products/alpha/opportunities", "/products/alpha/opportunities"), true);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `docker compose exec -T web npm test`

Expected: FAIL because `isNavActive` is not exported.

- [ ] **Step 3: Implement `isNavActive` and the switcher**

`ProductSwitcher` must render a button with `aria-expanded`, a labeled search input when open, filtered product links, an empty-search message, and a permanent `/products/new` link. Close on Escape, outside pointer interaction, and link selection. `SidebarNav` must render only `总览` globally plus the four exact current-product links. `layout.tsx` must become async, call `getProducts()`, and pass the list into `SidebarNav`.

- [ ] **Step 4: Add focused styles**

Add `.product-switcher`, `.switcher-trigger`, `.switcher-menu`, `.switcher-search`, `.switcher-product`, `.switcher-create`, `.product-context` and mobile rules. The menu must be at least 260px wide on desktop and constrained with `max-width: calc(100vw - 36px)` on mobile.

- [ ] **Step 5: Verify tests and static checks**

Run: `docker compose exec -T web npm test && docker compose exec -T web npm run lint && docker compose exec -T web npm run typecheck`

Expected: all commands pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/ProductSwitcher.tsx apps/web/app/SidebarNav.tsx apps/web/app/layout.tsx apps/web/app/globals.css apps/web/lib/navigation.ts apps/web/tests/navigation.test.ts
git commit -m "feat: add persistent product switcher"
```

### Task 3: Global Multi-Product Dashboard

**Files:**
- Modify: `apps/web/app/dashboard/page.tsx`
- Modify: `apps/web/app/globals.css`

**Interfaces:**
- Consumes: `getProducts()`, `getHealth()`, `summarizeProducts()`, `zhLabel()`.
- Produces: global summary metrics and explicit product management cards.

- [ ] **Step 1: Add summary edge-case tests**

```ts
test("returns zero metrics for an empty product list", () => {
  assert.deepEqual(summarizeProducts([]), {total: 0, ready: 0, running: 0, attention: 0});
});
```

- [ ] **Step 2: Run and verify the test state**

Run: `docker compose exec -T web npm test`

Expected: PASS because the pure summary rule already supports an empty list; record this as characterization before replacing the dashboard consumer.

- [ ] **Step 3: Replace first-product analytics with global management UI**

Remove `getAnalytics` and `selected=products[0]`. Render four metrics from `summarizeProducts`: 产品总数, 分析完成, 影子模式运行中, 需要处理. Render a `产品管理` heading, one `/products/new` button, and product cards containing source host/repository, status text, community count, daily limit, and one `打开产品` link. Render a direct create empty state when the list is empty.

- [ ] **Step 4: Add responsive product card styles**

Add `.page-header`, `.product-grid`, `.product-card`, `.product-card-head`, `.product-source`, and `.product-meta`, using auto-fit columns and one column below 800px.

- [ ] **Step 5: Verify tests and type safety**

Run: `docker compose exec -T web npm test && docker compose exec -T web npm run typecheck`

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/dashboard/page.tsx apps/web/app/globals.css apps/web/tests/navigation.test.ts
git commit -m "feat: make dashboard manage all products"
```

### Task 4: Breadcrumbs and Duplicate Navigation Removal

**Files:**
- Create: `apps/web/app/products/[id]/ProductBreadcrumbs.tsx`
- Modify: `apps/web/app/products/[id]/page.tsx`
- Modify: `apps/web/app/products/[id]/opportunities/page.tsx`
- Modify: `apps/web/app/products/[id]/conversations/page.tsx`
- Modify: `apps/web/app/products/[id]/safety/page.tsx`
- Modify: `apps/web/app/globals.css`

**Interfaces:**
- Consumes: product `id`, product `name`, and a literal section label.
- Produces: non-duplicative location context with links only to `总览` and product overview.

- [ ] **Step 1: Add a pure breadcrumb model test**

Add `buildBreadcrumbs(product, section)` to `navigation.ts` and first test that overview has `总览 / 产品名 / 产品概览`, while opportunities has `总览 / 产品名 / 机会`.

- [ ] **Step 2: Run and verify RED**

Run: `docker compose exec -T web npm test`

Expected: FAIL because `buildBreadcrumbs` is absent.

- [ ] **Step 3: Implement the model and component**

The component renders a `nav` with `aria-label="面包屑"`; `总览` links to `/dashboard`, product name links to `/products/{id}` except on overview, and the current section uses `aria-current="page"`.

- [ ] **Step 4: Replace duplicate page links**

Remove product-page action links that point to opportunities, conversations, safety, or product overview. Keep only page-specific mutation buttons. Add `ProductBreadcrumbs` immediately above each page eyebrow/title.

- [ ] **Step 5: Verify all frontend checks**

Run: `docker compose exec -T web npm test && docker compose exec -T web npm run lint && docker compose exec -T web npm run typecheck`

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/products apps/web/app/globals.css apps/web/lib/navigation.ts apps/web/tests/navigation.test.ts
git commit -m "refactor: remove duplicate product navigation"
```

### Task 5: Full Regression and Delivery

**Files:**
- Modify only files needed for defects found during verification.

**Interfaces:**
- Consumes: completed UI and existing Docker services.
- Produces: verified desktop/mobile behavior and a pushed main branch.

- [ ] **Step 1: Run the complete automated suite**

Run:

```bash
docker compose exec -T api ruff check app /app/tests
docker compose exec -T api pytest -q /app/tests
docker compose exec -T web npm test
docker compose exec -T web npm run lint
docker compose exec -T web npm run typecheck
```

Expected: Ruff passes, 10 backend tests pass, all navigation tests pass, ESLint and TypeScript pass.

- [ ] **Step 2: Run browser desktop regression**

At `http://localhost:3000/dashboard`, verify all product cards are visible; open the switcher, search a unique product, select it, confirm overview navigation and exact highlight; reopen and select `＋ 新建产品`; visit all four product pages and confirm duplicate link buttons are absent.

- [ ] **Step 3: Run browser narrow-viewport regression**

At a viewport no wider than 800px, verify the switcher menu fits the viewport, product navigation scrolls without overlap, and product cards form one column.

- [ ] **Step 4: Verify production build without dev-directory contention**

Run:

```bash
docker compose stop web
docker compose run --rm web npm run build
docker compose up -d web
curl -fsS http://localhost:8000/health
curl -fsSI http://localhost:3000/
```

Expected: Next.js build succeeds, API health is `ok`, and web returns `HTTP/1.1 200 OK`.

- [ ] **Step 5: Final diff and commit**

Run `git diff --check` and `git status --short`. Fix any verification defects, commit them with `fix: complete multi-product navigation regression`, and push `main` to `origin`.
