"use client";

import Link from "next/link";
import {ArrowUpRight, Trash2} from "lucide-react";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {
  permanentlyDeleteProduct,
  restoreProduct,
  trashProduct,
} from "@/lib/api";
import {retentionDays, type ProductNavItem} from "@/lib/navigation";

function sourceLabel(product: ProductNavItem) {
  if (product.website_url) {
    try { return new URL(product.website_url).hostname.replace(/^www\./, ""); }
    catch { return product.website_url; }
  }
  return product.github_url?.replace(/^https?:\/\/(www\.)?github\.com\//, "GitHub · ") || "尚未设置来源";
}

function conciseError(message: string) {
  const plain = message.split(/error value:|goroutine\s+\d+|runtime\/debug/i)[0].trim();
  return plain.length > 120 ? `${plain.slice(0, 117)}…` : plain;
}

export default function ProductManager({
  initialProducts,
  trashedProducts,
  workflowByProduct,
}: {
  initialProducts: ProductNavItem[];
  trashedProducts: ProductNavItem[];
  workflowByProduct: Record<string, {highIntent:number;ready:number;published:number}>;
}) {
  const router = useRouter();
  const products = initialProducts;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function automationLabel(product: ProductNavItem) {
    if (!product.autopublish_enabled) return {label: "已暂停", tone: "muted"};
    if (product.automation_status === "PAUSED_SAFETY") return {label: "安全暂停", tone: "warning"};
    if (product.automation_error || product.automation_status === "ATTENTION") return {label: "需处理", tone: "warning"};
    return {label: "自动运行", tone: ""};
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

    {products.length ? (
      <section className="product-grid">
        {products.map((product) => (
          <article className="product-card" key={product.id}>
              <div className="product-card-head">
                <div>
                  <h3>{product.name}</h3>
                  <div className="product-card-source">{sourceLabel(product)}</div>
                </div>
                <div className="flex-row" style={{ gap: "8px" }}>
                  <span className={`status ${automationLabel(product).tone}`}>
                    <i className="status-dot" />
                    {automationLabel(product).label}
                  </span>

                  <button
                    disabled={busy}
                    onClick={() => void remove(product)}
                    className="icon-button"
                    aria-label={`${product.name} 移到回收站`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {product.automation_error && (
                <div className="compact-alert" style={{marginTop: "18px"}}>
                  {conciseError(product.automation_error)}
                </div>
              )}

              <div className="product-card-metrics">
                <div>
                  <strong>{workflowByProduct[product.id]?.highIntent ?? 0}</strong>
                  <span>高意向</span>
                </div>
                <div>
                  <strong>{workflowByProduct[product.id]?.ready ?? 0}</strong>
                  <span>待触达</span>
                </div>
                <div>
                  <strong>{workflowByProduct[product.id]?.published ?? 0}</strong>
                  <span>已触达</span>
                </div>
              </div>

              <div className="product-card-foot">
                <span className="product-card-next">下次搜索
                <strong>
                  {product.next_auto_search_at ? new Date(product.next_auto_search_at).toLocaleString("zh-CN",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Shanghai"}) : "即将开始"}
                </strong></span>
                <Link className="button secondary compact" href={`/products/${product.id}`}>查看详情 <ArrowUpRight size={15}/></Link>
              </div>
          </article>
        ))}
      </section>
    ) : (
      <section className="empty-state">
        <h2 className="heading-lg">添加第一个产品</h2>
        <p>GrowthAgent 会自动理解产品并寻找真实需求。</p>
        <Link className="btn-pill btn-primary" href="/products/new">添加产品</Link>
      </section>
    )}

    <details className="trash-panel">
      <summary>
        回收站
        <span className="badge-chip">{trashedProducts.length}</span>
      </summary>

      {trashedProducts.length > 0 ? (
        <div style={{marginTop: "18px"}}>
          {trashedProducts.map((product) => (
            <div className="trash-row" key={product.id}>
              <div>
                <strong style={{ display: "block", fontSize: "16px" }}>{product.name}</strong>
                <small className="body-sm">剩余 {product.purge_after ? retentionDays(product.purge_after) : 0} 天</small>
              </div>
              <div className="flex-row">
                <button className="btn-pill btn-outline-dark" style={{ height: "40px", padding: "0 20px" }} disabled={busy} onClick={() => void restore(product)}>恢复</button>
                <button className="btn-pill btn-primary" style={{ height: "40px", padding: "0 20px" }} disabled={busy} onClick={() => void purge(product)}>立即永久删除</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: "32px 0", color: "var(--body)" }}>回收站为空。</div>
      )}
    </details>
  </>;
}
