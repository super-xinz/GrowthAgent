import Link from "next/link";
import {getOpportunities, getProducts, getTrashedProducts} from "@/lib/api";
import {summarizeOpportunityWorkflow} from "@/lib/navigation";
import ProductManager from "./ProductManager";

export default async function Dashboard() {
  const [products, trashedProducts] = await Promise.all([getProducts(), getTrashedProducts()]);
  const opportunitySets = await Promise.all(products.map(async (product:any) => {
    try { return [product.id, await getOpportunities(product.id)] as const; }
    catch { return [product.id, []] as const; }
  }));
  const workflowByProduct = Object.fromEntries(opportunitySets.map(([id, rows]) => [id, summarizeOpportunityWorkflow(rows)]));
  const workflow = summarizeOpportunityWorkflow(opportunitySets.flatMap(([, rows]) => rows));
  const running=products.filter((product:any)=>product.autopublish_enabled).length;

  return (
    <div className="workspace-page">
      <header className="workspace-header">
        <div>
          <div className="eyebrow">WORKSPACE</div>
          <h1>增长工作台</h1>
          <p>查看产品运行状态，处理高意向需求。</p>
        </div>
        <Link className="button" href="/products/new">添加产品</Link>
      </header>

      <section className="workspace-content">
          <div className="dashboard-metrics">
            <div className="dashboard-metric">
              <span>自动运行</span>
              <strong>{running}</strong>
              <small>个产品</small>
            </div>
            <div className="dashboard-metric">
              <span>高意向</span>
              <strong>{workflow.highIntent}</strong>
              <small>条需求</small>
            </div>
            <div className="dashboard-metric">
              <span>已触达</span>
              <strong>{workflow.published}</strong>
              <small>条回复</small>
            </div>
          </div>

          <div className="section-intro">
            <div>
              <div className="eyebrow">PRODUCTS</div>
            <h2 className="heading-lg">产品</h2>
            </div>
          </div>

          <ProductManager initialProducts={products} trashedProducts={trashedProducts} workflowByProduct={workflowByProduct}/>
      </section>
    </div>
  );
}
