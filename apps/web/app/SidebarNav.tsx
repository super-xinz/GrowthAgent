"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {isNavActive, parseProductId, type ProductNavItem} from "@/lib/navigation";
import ProductSwitcher from "./ProductSwitcher";

type NavItem = {href: string; label: string};

export default function SidebarNav({products}: {products: ProductNavItem[]}) {
  const pathname = usePathname();
  const productId = parseProductId(pathname);
  const productItems: NavItem[] = productId
    ? [
        {href: `/products/${productId}`, label: "产品概览"},
        {href: `/products/${productId}/opportunities`, label: "机会"},
        {href: `/products/${productId}/conversations`, label: "对话"},
        {href: `/products/${productId}/safety`, label: "操作记录"},
      ]
    : [];
  const render = (item: NavItem) => {
    const active = isNavActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        className={active ? "active" : undefined}
        aria-current={active ? "page" : undefined}
        href={item.href}
      >
        {item.label}
      </Link>
    );
  };
  return (
    <aside className="side">
      <Link className="brand" href="/dashboard">Thread<span>Pilot</span></Link>
      <ProductSwitcher products={products} currentProductId={productId} />
      <nav className="side-nav" aria-label="主导航">
        {render({href: "/dashboard", label: "总览"})}
        {render({href: "/account", label: "小红书账号"})}
        {productItems.length > 0 && (
          <div className="product-context">
            <div className="nav-section">产品工作区</div>
            {productItems.map(render)}
          </div>
        )}
      </nav>
      <div className="side-footer"><span className="guard-dot" />人工确认后评论</div>
    </aside>
  );
}
