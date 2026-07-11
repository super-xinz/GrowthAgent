import Link from "next/link";
import {getOpportunities} from "@/lib/api";
import {zhLabel} from "@/lib/labels";
import OpportunityActions from "./OpportunityActions";

export default async function Opportunities({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const rows=await getOpportunities(id);
  return <>
    <div className="eyebrow">对话机会雷达</div>
    <h1>机会列表</h1>
    <p>集中查看候选内容、用户意图、机会与风险评分、策略决策、回复草稿和影子发布状态。真实 Reddit API 尚未批准时，这里只展示本地测试或影子数据。</p>
    <div className="actions"><Link className="button secondary" href={`/products/${id}`}>产品分析</Link><Link className="button secondary" href={`/products/${id}/safety`}>安全审计</Link></div>
    <div className="card"><table className="table"><thead><tr><th>对话内容</th><th>社区</th><th>用户意图</th><th>评分</th><th>策略与状态</th><th>回复草稿</th><th>本地操作</th></tr></thead><tbody>
      {rows.map((x:any)=><tr key={x.id}>
        <td><strong>{x.title||"评论"}</strong><br/><span className="label">{x.body.slice(0,150)}</span>{x.permalink&&<><br/><a href={x.permalink} target="_blank" rel="noreferrer">查看来源</a></>}</td>
        <td>r/{x.subreddit}</td>
        <td>{zhLabel(x.intent_label)}</td>
        <td className="score">机会 {Math.round(x.opportunity_score*100)}<br/><span className="label">风险 {Math.round(x.risk_score*100)}</span></td>
        <td><span className="status">{zhLabel(x.policy_decision)}</span><br/><span className="label">{zhLabel(x.publish_status,"尚未发布")}</span></td>
        <td className="reply">{x.generated_reply?x.generated_reply.slice(0,320):"尚未生成回复草稿。"}</td>
        <td><OpportunityActions candidateId={x.id} published={Boolean(x.publish_status)}/></td>
      </tr>)}
      {!rows.length&&<tr><td className="empty" colSpan={7}>暂无机会数据。构建 Product Brain 后可运行 <code>make seed PRODUCT_ID={id}</code> 导入本地测试数据。</td></tr>}
    </tbody></table></div>
  </>;
}
