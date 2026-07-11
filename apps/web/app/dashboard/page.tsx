import Link from "next/link";
import {getHealth, getProducts, getSubreddits} from "@/lib/api";
import {summarizeProducts, type ProductNavItem} from "@/lib/navigation";
import {zhLabel} from "@/lib/labels";

function sourceLabel(product: ProductNavItem) {
  if (product.website_url) {
    try {
      return new URL(product.website_url).hostname.replace(/^www\./, "");
    } catch {
      return product.website_url;
    }
  }
  return product.github_url?.replace(/^https?:\/\/(www\.)?github\.com\//, "GitHub · ") || "尚未设置来源";
}

export default async function Dashboard() {
  const [products, health] = await Promise.all([getProducts(), getHealth()]);
  const communityCounts = Object.fromEntries(
    await Promise.all(
      products.map(async (product: ProductNavItem) => [
        product.id,
        (await getSubreddits(product.id)).length,
      ]),
    ),
  );
  const summary = summarizeProducts(products);
  return (
    <>
      <div className="eyebrow">全局工作区</div>
      <div className="page-header">
        <div>
          <h1>产品总览</h1>
          <p>统一管理所有产品，随时从左侧切换器进入对应的机会、对话和安全工作区。</p>
        </div>
        <Link className="button" href="/products/new">新建产品</Link>
      </div>
      <section className="grid summary-grid">
        <div className="card"><div className="label">产品总数</div><div className="metric">{summary.total}</div></div>
        <div className="card"><div className="label">分析完成</div><div className="metric">{summary.ready}</div></div>
        <div className="card"><div className="label">影子模式运行中</div><div className="metric">{summary.running}</div></div>
        <div className="card"><div className="label">需要处理</div><div className="metric">{summary.attention}</div></div>
      </section>

      <div className="section-heading">
        <div>
          <div className="eyebrow">多产品管理</div>
          <h2>全部产品</h2>
        </div>
        <span className="status">Reddit {zhLabel(health?.reddit_app_status, "状态未知")}</span>
      </div>

      {products.length ? (
        <section className="product-grid">
          {products.map((product: ProductNavItem) => (
            <article className="product-card" key={product.id}>
              <div className="product-card-head">
                <div>
                  <h3>{product.name}</h3>
                  <div className="product-source">{sourceLabel(product)}</div>
                </div>
                <span className="status">{zhLabel(product.status)}</span>
              </div>
              <div className="product-meta">
                <span><strong>{communityCounts[product.id] || 0}</strong> 个候选社区</span>
                <span>每日上限 <strong>{product.daily_reply_limit ?? 0}</strong></span>
              </div>
              <Link className="button secondary product-open" href={`/products/${product.id}`}>打开产品</Link>
            </article>
          ))}
        </section>
      ) : (
        <section className="card empty product-empty">
          <h2>从第一个产品开始</h2>
          <p>添加公开网站或 GitHub 仓库，ThreadPilot 会构建带有来源证据的 Product Brain。</p>
          <Link className="button" href="/products/new">新建产品</Link>
        </section>
      )}

      <section className="card safety-banner">
        <div>
          <div className="label">运行边界</div>
          <h2>可以自治，但不能冒进。</h2>
          <p>真实发布需要平台批准、账号、社区规则、配额和全局停止开关同时允许。当前全局自动发布：{health?.autopublish ? "已开启" : "已关闭"}。</p>
        </div>
        <span className="status">受保护影子模式</span>
      </section>
    </>
  );
}
