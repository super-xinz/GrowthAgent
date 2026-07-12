export type ProductNavItem = {
  id: string;
  name: string;
  status: string;
  website_url?: string | null;
  github_url?: string | null;
  daily_reply_limit?: number;
  sort_order?: number;
  deleted_at?: string | null;
  purge_after?: string | null;
};

export function parseProductId(pathname: string) {
  const match = pathname.match(/^\/products\/([^/]+)/);
  return match?.[1] && match[1] !== "new" ? match[1] : null;
}

export function filterProducts(products: ProductNavItem[], query: string) {
  const normalized = query.trim().toLocaleLowerCase("zh-CN");
  return normalized
    ? products.filter((product) =>
        product.name.toLocaleLowerCase("zh-CN").includes(normalized),
      )
    : products;
}

export function summarizeProducts(products: ProductNavItem[]) {
  return {
    total: products.length,
    ready: products.filter((product) => product.status === "READY").length,
    running: products.filter((product) => product.status === "SHADOW_RUNNING")
      .length,
    attention: products.filter((product) =>
      ["ANALYSIS_FAILED", "INGEST_FAILED"].includes(product.status),
    ).length,
  };
}

export function isNavActive(pathname: string, href: string) {
  return pathname === href;
}

export function buildBreadcrumbs(
  product: {id: string; name: string},
  section: string,
) {
  return [
    {label: "总览", href: "/dashboard"},
    {
      label: product.name,
      href: section === "产品概览" ? null : `/products/${product.id}`,
    },
    {label: section, href: null},
  ];
}

export function moveProduct<T>(items: T[], from: number, to: number) {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) {
    return items.slice();
  }
  const reordered = items.slice();
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);
  return reordered;
}

export function retentionDays(purgeAfter: string, now = new Date()) {
  return Math.max(0, Math.ceil((new Date(purgeAfter).getTime() - now.getTime()) / 86_400_000));
}
