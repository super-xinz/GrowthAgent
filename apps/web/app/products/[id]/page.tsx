import Link from "next/link";
import {getAnalytics,getBrain,getProduct,getSubreddits} from "@/lib/api";
import {zhLabel} from "@/lib/labels";
import RebuildBrainButton from "./RebuildBrainButton";

function Items({items}:{items?:string[]}){return items?.length?<ul>{items.map((item,i)=><li key={i}>{item}</li>)}</ul>:<p>暂未识别。</p>}

export default async function ProductPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const [p,brain,a,subs]=await Promise.all([getProduct(id),getBrain(id),getAnalytics(id),getSubreddits(id)]);
  if(!p)return <p>没有找到这个产品。</p>;
  const b=brain?.brain||{};
  return <>
    <div className="eyebrow">产品分析 · Brain v{brain?.version||"—"}</div>
    <h1>{p.name}</h1>
    <p>{b.one_liner||"Product Brain 尚未构建。"}</p>
    <div className="actions">
      <Link className="button secondary" href={`/products/${id}/opportunities`}>机会雷达</Link>
      <Link className="button secondary" href={`/products/${id}/conversations`}>对话跟进</Link>
      <Link className="button secondary" href={`/products/${id}/safety`}>安全审计</Link>
      <RebuildBrainButton productId={id}/>
    </div>
    <section className="grid">
      <div className="card"><div className="label">产品状态</div><div className="metric" style={{fontSize:20}}>{zhLabel(p.status)}</div></div>
      <div className="card"><div className="label">自动发布</div><div className="metric" style={{fontSize:20}}>{p.autopublish_enabled?"产品侧已开启":"产品侧已关闭"}</div></div>
      <div className="card"><div className="label">每日回复上限</div><div className="metric">{p.daily_reply_limit}</div></div>
      <div className="card"><div className="label">候选社区</div><div className="metric">{subs.length}</div></div>
      <div className="card wide"><div className="label">Product Brain</div><h2>{b.category||"尚未识别品类"}</h2><p><strong>关系披露：</strong> {p.disclosure_template||b.disclosure_identity||"未设置"}</p><p><strong>价格信息：</strong> {b.pricing_summary||"尚未验证"}</p><p><strong>目标用户：</strong> {(b.target_users||[]).join("、")||"未设置"}</p></div>
      <div className="card wide"><div className="label">用户要完成的任务</div><Items items={b.jobs_to_be_done}/></div>
      <div className="card wide"><div className="label">核心痛点</div><Items items={b.pain_points}/></div>
      <div className="card wide"><div className="label">使用场景</div><Items items={b.use_cases}/></div>
      <div className="card wide"><div className="label">适合推荐</div><Items items={b.recommend_when}/></div>
      <div className="card wide"><div className="label">不应推荐</div><Items items={b.do_not_recommend_when}/></div>
      <div className="card wide"><div className="label">有来源支持的能力声明</div>{(b.supported_claims||[]).map((c:any,i:number)=><div key={i}><p><span className="status">证据置信度 {Math.round((c.confidence||0)*100)}%</span> {c.claim}</p><blockquote>{c.source_quote}</blockquote></div>)}{!(b.supported_claims||[]).length&&<p>暂时没有通过证据校验的声明。</p>}</div>
      <div className="card wide"><div className="label">不确定或缺少证据</div><Items items={b.unsupported_or_uncertain_claims}/></div>
      <div className="card wide"><div className="label">高意向检索信号</div><p><strong>直接需求：</strong> {(b.query_graph?.direct_terms||[]).join(" · ")||"未设置"}</p><p><strong>痛点表达：</strong> {(b.query_graph?.pain_phrases||[]).join(" · ")||"未设置"}</p><p><strong>意图表达：</strong> {(b.query_graph?.intent_patterns||[]).join(" · ")||"未设置"}</p></div>
      <div className="card wide"><div className="label">网站追踪 SDK</div><pre>{`<script src="${process.env.NEXT_PUBLIC_API_URL||"http://localhost:8000"}/v1/tracking/sdk.js" data-project="${p.id}"></script>`}</pre></div>
      <div className="card wide"><div className="label">当前漏斗</div><p>已扫描 {a?.scanned??0}，合格机会 {a?.qualified_opportunities??0}，访问 {a?.visits??0}，注册 {a?.signups??0}，激活 {a?.activations??0}。</p></div>
    </section>
  </>;
}
