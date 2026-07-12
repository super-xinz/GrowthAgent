import {notFound} from "next/navigation";
import {getOpportunities, getProduct} from "@/lib/api";
import {zhLabel} from "@/lib/labels";
import OpportunityActions from "./OpportunityActions";
import ProductBreadcrumbs from "../ProductBreadcrumbs";

export default async function Opportunities({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const [rows, product]=await Promise.all([getOpportunities(id), getProduct(id)]);
  if(!product)notFound();
  return <>
    <ProductBreadcrumbs product={product} section="机会"/>
    <div className="eyebrow">小红书需求发现</div>
    <h1>评论机会</h1>
    <p>查看相关笔记和用户评论，判断真实需求，生成有帮助的中文回复草稿。每条真实评论都需要你人工确认。</p>
    <div className="card"><table className="table"><thead><tr><th>笔记或评论</th><th>来源</th><th>用户意图</th><th>评分</th><th>处理状态</th><th>评论草稿</th><th>操作</th></tr></thead><tbody>
      {rows.map((x:any)=><tr key={x.id}>
        <td><strong>{x.title||"评论"}</strong><br/><span className="label">{x.body.slice(0,150)}</span>{x.permalink&&<><br/><a href={x.permalink} target="_blank" rel="noreferrer">查看来源</a></>}</td>
        <td>小红书</td>
        <td>{zhLabel(x.intent_label)}</td>
        <td className="score">机会 {Math.round(x.opportunity_score*100)}<br/><span className="label">风险 {Math.round(x.risk_score*100)}</span></td>
        <td><span className="status">{zhLabel(x.policy_decision)}</span><br/><span className="label">{zhLabel(x.publish_status,"尚未发布")}</span></td>
        <td className="reply">{x.generated_reply?x.generated_reply.slice(0,320):"尚未生成回复草稿。"}</td>
        <td><OpportunityActions candidateId={x.id} published={Boolean(x.publish_status)} targetTitle={x.title||"小红书评论"} targetBody={x.body}/></td>
      </tr>)}
      {!rows.length&&<tr><td className="empty" colSpan={7}>暂无小红书机会。请先连接小红书账号，然后从产品概览搜索相关笔记。</td></tr>}
    </tbody></table></div>
  </>;
}
