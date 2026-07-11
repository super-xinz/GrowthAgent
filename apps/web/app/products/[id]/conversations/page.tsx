import Link from "next/link";
import {getConversations} from "@/lib/api";
import {zhLabel} from "@/lib/labels";

export default async function Conversations({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const rows=await getConversations(id);
  return <>
    <div className="eyebrow">持续对话状态机</div>
    <h1>对话跟进</h1>
    <p>影子发布或模拟发布会创建对话记录，用于跟踪追问意图、链接请求、转化状态、下次检查时间和停止原因。</p>
    <div className="actions"><Link className="button secondary" href={`/products/${id}`}>产品分析</Link><Link className="button secondary" href={`/products/${id}/opportunities`}>机会雷达</Link></div>
    <div className="card"><table className="table"><thead><tr><th>对话状态</th><th>转化状态</th><th>跟进次数</th><th>最后活动</th><th>下次检查</th><th>关闭原因</th></tr></thead><tbody>
      {rows.map((x:any)=><tr key={x.id}><td><span className="status">{zhLabel(x.state)}</span></td><td>{zhLabel(x.conversion_state,"无")}</td><td>{x.followup_count}</td><td>{new Date(x.last_activity_at).toLocaleString("zh-CN")}</td><td>{x.next_check_at?new Date(x.next_check_at).toLocaleString("zh-CN"):"—"}</td><td>{zhLabel(x.closed_reason,"—")}</td></tr>)}
      {!rows.length&&<tr><td className="empty" colSpan={6}>暂无对话。先对一个机会执行影子发布，系统才会建立对话记录。</td></tr>}
    </tbody></table></div>
  </>;
}
