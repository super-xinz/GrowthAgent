import Link from "next/link";
import {getAnalytics,getHealth,getProducts} from "@/lib/api";
import {zhLabel} from "@/lib/labels";

export default async function Dashboard(){
  const [products,health]=await Promise.all([getProducts(),getHealth()]);
  const selected=products[0];
  const a=selected?await getAnalytics(selected.id):null;
  return <>
    <div className="eyebrow">安全自治模式</div>
    <h1>Reddit 增长智能体</h1>
    <p>发现高意向 Reddit 对话，生成透明且有证据的回复，在严格门禁下运行，并追踪从访问到激活的完整结果。</p>
    <div className="actions">
      <Link className="button" href="/products/new">添加产品</Link>
      {selected&&<>
        <Link className="button secondary" href={`/products/${selected.id}`}>产品分析</Link>
        <Link className="button secondary" href={`/products/${selected.id}/opportunities`}>机会雷达</Link>
        <Link className="button secondary" href={`/products/${selected.id}/conversations`}>对话跟进</Link>
      </>}
    </div>
    <section className="grid">
      <div className="card"><div className="label">已扫描内容</div><div className="metric">{a?.scanned??0}</div></div>
      <div className="card"><div className="label">合格机会</div><div className="metric">{a?.qualified_opportunities??0}</div></div>
      <div className="card"><div className="label">参与对话</div><div className="metric">{a?.conversations??0}</div></div>
      <div className="card"><div className="label">风险状态</div><div className="metric" style={{fontSize:20}}>{zhLabel(a?.risk_level,"受保护")}</div></div>
      <div className="card"><div className="label">访问</div><div className="metric">{a?.visits??0}</div></div>
      <div className="card"><div className="label">注册</div><div className="metric">{a?.signups??0}</div></div>
      <div className="card"><div className="label">激活</div><div className="metric">{a?.activations??0}</div></div>
      <div className="card"><div className="label">负面互动</div><div className="metric">{a?.negative_interactions??0}</div></div>
      <div className="card wide"><div className="label">运行边界 · Reddit {zhLabel(health?.reddit_app_status,"状态未知")}</div><h2>可以自治，但不能冒进。</h2><p>每条回复都必须引用 Product Brain 证据；策略决策全部留痕。真实发布需要产品、平台批准、账号、社区规则、配额和全局停止开关同时允许。当前全局自动发布：{health?.autopublish?"已开启":"已关闭"}。</p></div>
      <div className="card wide"><div className="label">当前产品</div>{products.length?products.map((p:any)=><p key={p.id}><span className="status">{zhLabel(p.status)}</span> &nbsp;<Link href={`/products/${p.id}`}>{p.name}</Link></p>):<p>尚未添加产品。添加一个公开网站或 GitHub 仓库即可开始。</p>}</div>
    </section>
  </>;
}
