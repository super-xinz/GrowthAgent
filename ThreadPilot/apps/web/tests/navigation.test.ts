import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBreadcrumbs,
  filterProducts,
  isNavActive,
  parseProductId,
  summarizeProducts,
} from "../lib/navigation.ts";

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

test("builds location breadcrumbs for product sections", () => {
  assert.deepEqual(buildBreadcrumbs({id: "alpha", name: "Alpha"}, "产品概览"), [
    {label: "总览", href: "/dashboard"},
    {label: "Alpha", href: null},
    {label: "产品概览", href: null},
  ]);
  assert.deepEqual(buildBreadcrumbs({id: "alpha", name: "Alpha"}, "机会"), [
    {label: "总览", href: "/dashboard"},
    {label: "Alpha", href: "/products/alpha"},
    {label: "机会", href: null},
  ]);
});

test("filters products case-insensitively without changing source order", () => {
  assert.deepEqual(
    filterProducts(products, "PILOT").map((product) => product.id),
    ["alpha"],
  );
  assert.deepEqual(
    filterProducts(products, "").map((product) => product.id),
    ["alpha", "beta", "gamma"],
  );
});

test("summarizes all product statuses", () => {
  assert.deepEqual(summarizeProducts(products), {
    total: 3,
    ready: 1,
    running: 1,
    attention: 1,
  });
});

test("marks only the exact product section active", () => {
  assert.equal(isNavActive("/products/alpha", "/products/alpha"), true);
  assert.equal(
    isNavActive("/products/alpha/opportunities", "/products/alpha"),
    false,
  );
  assert.equal(
    isNavActive(
      "/products/alpha/opportunities",
      "/products/alpha/opportunities",
    ),
    true,
  );
});

test("returns zero metrics for an empty product list", () => {
  assert.deepEqual(summarizeProducts([]), {
    total: 0,
    ready: 0,
    running: 0,
    attention: 0,
  });
});
