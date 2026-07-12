import {notFound} from "next/navigation";
import {getAuditLog,getHealth,getProduct,getRiskEvents,getSubreddits} from "@/lib/api";
import {zhLabel} from "@/lib/labels";
import ProductBreadcrumbs from "../ProductBreadcrumbs";

export default async function Safety({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const [p,subs,risks,audit,health]=await Promise.all([getProduct(id),getSubreddits(id),getRiskEvents(id),getAuditLog(id),getHealth()]);
  if(!p)notFound();
  return <>
    <ProductBreadcrumbs product={p} section="安全"/>
    <div className="eyebrow">安全策略与审计</div>
    <h1>策略门禁</h1>
    <p>真实发布只有在环境开关、Reddit 批准状态、专用账号、社区规则、机会策略、配额和全局停止开关全部允许时才可能执行。当前 Reddit 状态：{zhLabel(health?.reddit_app_status,"未知")}；全局自动发布：{health?.autopublish?"已开启":"已关闭"}；全局停止开关：{health?.kill_switch?"已触发":"未触发"}。</p>
    <section className="grid">
      <div className="card"><div className="label">产品自动发布</div><div className="metric" style={{fontSize:20}}>{p?.autopublish_enabled?"已开启":"已关闭"}</div></div>
      <div className="card"><div className="label">每日回复上限</div><div className="metric">{p?.daily_reply_limit??0}</div></div>
      <div className="card"><div className="label">风险事件</div><div className="metric">{risks.length}</div></div>
      <div className="card"><div className="label">审计记录</div><div className="metric">{audit.length}</div></div>
      <div className="card wide"><div className="label">候选社区与权限</div>{subs.map((s:any)=><p key={s.id}><span className="status">{zhLabel(s.status)}</span> r/{s.name} · 相关度 {Math.round(s.community_score*100)} · 风险 {Math.round(s.risk_score*100)}</p>)}{!subs.length&&<p>尚未建立社区白名单。真实 Reddit API 未获批准前，社区发现结果只能用于本地验证。</p>}</div>
      <div className="card wide"><div className="label">最近风险事件</div>{risks.slice(0,8).map((r:any)=><p key={r.id}><span className="status">{zhLabel(r.severity)}</span> {zhLabel(r.event_type)} · {zhLabel(r.action_taken)}</p>)}{!risks.length&&<p>没有记录到风险事件。</p>}</div>
      <div className="card wide"><div className="label">最近策略审计</div>{audit.slice(0,8).map((x:any)=><p key={x.id}><span className="status">{zhLabel(x.decision)}</span> {(x.reason_codes||[]).map((v:string)=>zhLabel(v)).join("、")}</p>)}{!audit.length&&<p>暂时没有策略决策记录。</p>}</div>
    </section>
  </>;
}
