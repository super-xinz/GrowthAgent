"use client";

import {useMemo, useState} from "react";
import {useRouter} from "next/navigation";
import {API,responseDetail} from "@/lib/api";
import {filterOpportunities, isCurrentAutoReply, summarizeOpportunityWorkflow, type OpportunityView} from "@/lib/navigation";

type Opportunity = {
  id:string;status:string;title?:string|null;body:string;permalink?:string|null;
  opportunity_score:number;risk_score:number;publish_status?:string|null;generated_reply?:string|null;
  target_type?:string|null;author_name?:string|null;score_reason?:string|null;
  match_signals?:string[];publish_error?:string|null;
};

const tabs:{id:OpportunityView;label:string}[] = [
  {id:"all",label:"全部"},{id:"qualified",label:"高意向"},
  {id:"published",label:"已触达"},{id:"attention",label:"需关注"},
];

function stateLabel(row:Opportunity){
  if(row.publish_status==="COMMENTED"||row.status==="COMMENTED")return "已自动触达";
  if(row.publish_error)return "发布状态待确认";
  if(row.generated_reply&&!isCurrentAutoReply(row.generated_reply))return "旧草稿已冻结";
  if(row.opportunity_score>=.75&&row.risk_score<=.35)return row.generated_reply?"等待安全窗口":"准备回复中";
  return "仅记录";
}

export default function OpportunityBoard({rows}:{rows:Opportunity[]}){
  const router=useRouter();
  const [view,setView]=useState<OpportunityView>("all");
  const [publishing,setPublishing]=useState<string|null>(null);
  const [actionError,setActionError]=useState<Record<string,string>>({});
  const summary=useMemo(()=>summarizeOpportunityWorkflow(rows),[rows]);
  const visible=useMemo(()=>filterOpportunities(rows,view) as Opportunity[],[rows,view]);
  const counts={all:summary.total,qualified:summary.highIntent,published:summary.published,attention:rows.filter(row=>row.publish_error).length};

  async function generateAndPublish(id:string){
    setPublishing(id);setActionError(current=>({...current,[id]:""}));
    try{
      const response=await fetch(`${API}/v1/xiaohongshu/opportunities/${id}/generate-and-publish`,{method:"POST"});
      if(!response.ok)throw new Error(await responseDetail(response));
      router.refresh();
    }catch(reason){
      setActionError(current=>({...current,[id]:reason instanceof Error?reason.message:"生成并发布失败"}));
    }finally{setPublishing(null)}
  }
  return <>
    <nav className="workflow-tabs" aria-label="结果筛选">{tabs.map(tab=><button key={tab.id} className={view===tab.id?"active":""} onClick={()=>setView(tab.id)}>{tab.label}<span>{counts[tab.id]}</span></button>)}</nav>
    <section className="result-list">
      {visible.map(row=><article className="result-card" key={row.id}>
        <div className="result-score"><strong>{Math.round(row.opportunity_score*100)}</strong><span>机会分</span></div>
        <div className="result-context">
          <div className="result-meta"><span>{row.target_type==="COMMENT"?"评论":"笔记"}</span>{row.author_name&&<span>@{row.author_name}</span>}<span>风险 {Math.round(row.risk_score*100)}</span></div>
          <h3>{row.title||"小红书讨论"}</h3><p>{row.body}</p>
          {row.score_reason&&<div className="score-reason">{row.score_reason}</div>}
          {!!row.match_signals?.length&&<div className="signal-cloud small">{row.match_signals.map(signal=><span key={signal}>{signal}</span>)}</div>}
          {row.permalink&&<a href={row.permalink} target="_blank" rel="noreferrer">查看原文 ↗</a>}
        </div>
        <div className="result-outcome">
          <span className={`status ${row.publish_error?"warning":""}`}>{stateLabel(row)}</span>
          {row.generated_reply&&(row.publish_status==="COMMENTED"||isCurrentAutoReply(row.generated_reply))?<blockquote className="sent-reply">“{row.generated_reply}”</blockquote>:row.generated_reply?<p>旧版本草稿不满足 25 字规则，不会发送；再次命中时会重写。</p>:<p>未达到自动回复条件，不会发送。</p>}
          {row.publish_status!=="COMMENTED"&&row.status!=="COMMENTED"&&!row.publish_error&&<button className="button secondary compact" disabled={publishing===row.id} onClick={()=>void generateAndPublish(row.id)}>{publishing===row.id?"正在生成并发布…":"生成回复并发布"}</button>}
          {actionError[row.id]&&<div className="compact-alert">{actionError[row.id]}</div>}
          {row.publish_error&&<div className="compact-alert">{row.publish_error}</div>}
        </div>
      </article>)}
      {!visible.length&&<div className="empty-state"><div>⌁</div><h3>{rows.length?"这个分组还没有结果":"第一轮搜索后，结果会出现在这里"}</h3><p>{rows.length?"切换其他筛选查看。":"你可以等待自动运行，或回到产品页立即运行一次。"}</p></div>}
    </section>
  </>;
}
