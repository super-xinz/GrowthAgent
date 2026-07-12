import Link from "next/link";
import {getProducts, getTrashedProducts, getXiaohongshuStatus} from "@/lib/api";
import {summarizeProducts, type ProductNavItem} from "@/lib/navigation";
import ProductManager from "./ProductManager";

export default async function Dashboard() {
  const [products, trashedProducts] = await Promise.all([getProducts(), getTrashedProducts()]);
  let xhsStatus=null;
  try{xhsStatus=await getXiaohongshuStatus()}catch{}
  const communityCounts={};
  const summary = summarizeProducts(products);
  return (
    <>
      <div className="eyebrow">全局工作区</div>
      <div className="page-header">
        <div>
          <h1>产品总览</h1>
          <p>管理产品资料，搜索小红书真实需求，审核评论草稿并跟进用户回复。</p>
        </div>
        <Link className="button" href="/products/new">新建产品</Link>
      </div>
      <section className="grid summary-grid">
        <div className="card"><div className="label">产品总数</div><div className="metric">{summary.total}</div></div>
        <div className="card"><div className="label">分析完成</div><div className="metric">{summary.ready}</div></div>
        <div className="card"><div className="label">小红书账号</div><div className="metric small-metric">{xhsStatus?.is_logged_in?"已连接":"未登录"}</div></div>
        <div className="card"><div className="label">需要处理</div><div className="metric">{summary.attention}</div></div>
      </section>

      <div className="section-heading">
        <div>
          <div className="eyebrow">多产品管理</div>
          <h2>全部产品</h2>
        </div>
        <span className="status">{xhsStatus?.is_logged_in?"可以搜索小红书":"请先扫码登录"}</span>
      </div>

      <ProductManager initialProducts={products} trashedProducts={trashedProducts} communityCounts={communityCounts}/>

      <section className="card safety-banner">
        <div>
          <div className="label">评论规则</div>
          <h2>每条评论都由你最后确认。</h2>
          <p>系统负责搜索、分析和生成草稿；没有你的逐条确认，不会在小红书发表评论或回复用户。</p>
        </div>
        <span className="status">人工确认后执行</span>
      </section>
    </>
  );
}
