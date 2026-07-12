import {notFound} from "next/navigation";
import {getAuditLog,getProduct,getRiskEvents,getXiaohongshuStatus} from "@/lib/api";
import {zhLabel} from "@/lib/labels";
import ProductBreadcrumbs from "../ProductBreadcrumbs";

export default async function Safety({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const [product,risks,audit]=await Promise.all([getProduct(id),getRiskEvents(id),getAuditLog(id)]);
  if(!product)notFound();
  let account=null;
  try{account=await getXiaohongshuStatus()}catch{}
  return <>
    <ProductBreadcrumbs product={product} section="操作记录"/>
    <div className="eyebrow">小红书账号与操作记录</div>
    <h1>评论控制</h1>
    <p>系统只负责搜索、分析和生成草稿。发表评论或回复前必须由你查看目标内容并逐条确认，不会自动批量操作。</p>
    <section className="grid">
      <div className="card"><div className="label">小红书账号</div><div className="metric small-metric">{account?.is_logged_in?"已连接":"未登录"}</div></div>
      <div className="card"><div className="label">每日评论上限</div><div className="metric">{product.daily_reply_limit}</div></div>
      <div className="card"><div className="label">异常记录</div><div className="metric">{risks.length}</div></div>
      <div className="card"><div className="label">操作审计</div><div className="metric">{audit.length}</div></div>
      <div className="card wide"><div className="label">最近异常</div>{risks.slice(0,8).map((risk:any)=><p key={risk.id}><span className="status">{zhLabel(risk.severity)}</span> {zhLabel(risk.event_type)} · {zhLabel(risk.action_taken)}</p>)}{!risks.length&&<p>没有记录到异常操作。</p>}</div>
      <div className="card wide"><div className="label">最近审核记录</div>{audit.slice(0,8).map((item:any)=><p key={item.id}><span className="status">{zhLabel(item.decision)}</span> {(item.reason_codes||[]).map((value:string)=>zhLabel(value)).join("、")}</p>)}{!audit.length&&<p>暂时没有评论审核记录。</p>}</div>
    </section>
  </>;
}
