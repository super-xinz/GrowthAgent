"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {
  permanentlyDeleteProduct,
  reorderProducts,
  restoreProduct,
  trashProduct,
} from "@/lib/api";
import {moveProduct, retentionDays, type ProductNavItem} from "@/lib/navigation";
import {zhLabel} from "@/lib/labels";

function sourceLabel(product: ProductNavItem) {
  if (product.website_url) {
    try { return new URL(product.website_url).hostname.replace(/^www\./, ""); }
    catch { return product.website_url; }
  }
  return product.github_url?.replace(/^https?:\/\/(www\.)?github\.com\//, "GitHub · ") || "尚未设置来源";
}

export default function ProductManager({
  initialProducts,
  trashedProducts,
  communityCounts,
}: {
  initialProducts: ProductNavItem[];
  trashedProducts: ProductNavItem[];
  communityCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function persistOrder(next: ProductNavItem[]) {
    const previous = products;
    setProducts(next);
    setError("");
    try { await reorderProducts(next.map((product) => product.id)); }
    catch (reason) {
      setProducts(previous);
      setError(reason instanceof Error ? reason.message : "保存顺序失败，请重试。");
    }
  }

  async function move(from: number, to: number) {
    if (busy) return;
    await persistOrder(moveProduct(products, from, to));
  }

  async function remove(product: ProductNavItem) {
    if (!window.confirm(`确定删除“${product.name}”吗？\n\n产品会立即从工作区隐藏，并在 7 天后永久删除。期间可以从回收站恢复。`)) return;
    setBusy(true); setError("");
    try { await trashProduct(product.id); router.refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "删除失败，请重试。"); }
    finally { setBusy(false); }
  }

  async function restore(product: ProductNavItem) {
    setBusy(true); setError("");
    try { await restoreProduct(product.id); router.refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "恢复失败，请重试。"); }
    finally { setBusy(false); }
  }

  async function purge(product: ProductNavItem) {
    if (!window.confirm(`永久删除“${product.name}”及其所有关联数据？此操作无法恢复。`)) return;
    setBusy(true); setError("");
    try { await permanentlyDeleteProduct(product.id); router.refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "永久删除失败，请重试。"); }
    finally { setBusy(false); }
  }

  return <>
    {error && <div className="inline-error" role="alert">{error}</div>}
    {products.length ? <section className="product-grid">
      {products.map((product, index) => <article
        className="product-card manageable"
        key={product.id}
        draggable={!busy}
        onDragStart={() => setDragIndex(index)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={() => { if (dragIndex !== null) void move(dragIndex, index); setDragIndex(null); }}
        onDragEnd={() => setDragIndex(null)}
      >
        <div className="product-card-head">
          <div className="product-identity"><span className="drag-handle" title="拖拽调整顺序" aria-hidden="true">⠿</span><div><h3>{product.name}</h3><div className="product-source">{sourceLabel(product)}</div></div></div>
          <div className="product-card-tools"><span className="status">{zhLabel(product.status)}</span><details className="product-menu"><summary aria-label={`${product.name} 更多操作`}>•••</summary><button disabled={busy} onClick={() => void remove(product)}>移到回收站</button></details></div>
        </div>
        <div className="product-meta"><span>小红书评论</span><span>每日上限 <strong>{product.daily_reply_limit ?? 0}</strong></span></div>
        <div className="product-card-actions">
          <Link className="product-open-link" href={`/products/${product.id}`}>打开产品 <span aria-hidden="true">→</span></Link>
        </div>
      </article>)}
    </section> : <section className="card empty product-empty"><h2>从第一个产品开始</h2><p>添加公开网站或 GitHub 仓库，ThreadPilot 会构建带有来源证据的 Product Brain。</p><Link className="button" href="/products/new">新建产品</Link></section>}

    <details className="trash-panel card">
      <summary>回收站 <span className="status">{trashedProducts.length}</span></summary>
      <p>产品删除后保留 7 天，随后由系统永久清理。</p>
      {trashedProducts.map((product) => <div className="trash-row" key={product.id}>
        <div><strong>{product.name}</strong><small>剩余 {product.purge_after ? retentionDays(product.purge_after) : 0} 天</small></div>
        <div className="trash-actions"><button className="button secondary compact" disabled={busy} onClick={() => void restore(product)}>恢复</button><button className="button danger compact" disabled={busy} onClick={() => void purge(product)}>立即永久删除</button></div>
      </div>)}
      {!trashedProducts.length && <div className="empty">回收站为空。</div>}
    </details>
  </>;
}
