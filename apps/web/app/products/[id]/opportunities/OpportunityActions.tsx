"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {API,responseDetail} from "@/lib/api";

type Props={candidateId:string;published:boolean;targetTitle:string;targetBody:string};

export default function OpportunityActions({candidateId,published,targetTitle,targetBody}:Props){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [failed,setFailed]=useState(false);
  const [draft,setDraft]=useState("");
  const [token,setToken]=useState("");

  async function request(path:string,body?:unknown){
    const response=await fetch(`${API}${path}`,{
      method:"POST",
      headers:body?{"Content-Type":"application/json"}:undefined,
      body:body?JSON.stringify(body):undefined,
    });
    if(!response.ok)throw new Error(await responseDetail(response));
    return response.json();
  }

  async function generate(){
    setBusy(true);setFailed(false);setMessage("正在生成有依据的中文草稿…");
    try{const result=await request(`/v1/xiaohongshu/opportunities/${candidateId}/draft`);setDraft(result.body);setToken("");setMessage("草稿已生成，请检查并编辑。")}
    catch(error){setFailed(true);setMessage(error instanceof Error?error.message:"生成失败")}
    finally{setBusy(false)}
  }

  async function prepareConfirmation(){
    if(!draft.trim()){setFailed(true);setMessage("请先生成或填写评论草稿。");return}
    setBusy(true);setFailed(false);
    try{const result=await request(`/v1/xiaohongshu/opportunities/${candidateId}/confirm`,{body:draft.trim()});setToken(result.token);setMessage("")}
    catch(error){setFailed(true);setMessage(error instanceof Error?error.message:"创建确认失败")}
    finally{setBusy(false)}
  }

  async function execute(){
    setBusy(true);setFailed(false);
    try{await request(`/v1/xiaohongshu/opportunities/${candidateId}/execute`,{token,body:draft.trim()});setToken("");setMessage("评论已发布到小红书。");router.refresh()}
    catch(error){setToken("");setFailed(true);setMessage(error instanceof Error?error.message:"发布失败，请重新确认")}
    finally{setBusy(false)}
  }

  if(published)return <span className="status">已评论</span>;
  return <div className="opportunity-editor">
    <button className="button secondary compact" disabled={busy} onClick={generate}>{draft?"重新生成":"生成草稿"}</button>
    {draft&&<>
      <textarea value={draft} maxLength={500} onChange={event=>{setDraft(event.target.value);setToken("")}} aria-label="评论草稿"/>
      <div className="draft-footer"><span>{draft.length}/500</span><button className="button compact" disabled={busy} onClick={prepareConfirmation}>检查并确认</button></div>
    </>}
    {message&&<span className={failed?"feedback-error":"feedback-message"} role={failed?"alert":"status"}>{message}</span>}
    {token&&<div className="confirm-backdrop" role="presentation"><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby={`confirm-${candidateId}`}>
      <div className="eyebrow">最后确认</div><h2 id={`confirm-${candidateId}`}>确认发布这条评论？</h2>
      <p><strong>目标：</strong>{targetTitle}</p><blockquote>{targetBody}</blockquote>
      <p><strong>将要发布：</strong></p><div className="confirm-draft">{draft}</div>
      <p className="label">确认令牌十分钟内有效且只能使用一次。发布后无法由 ThreadPilot 自动撤回。</p>
      <div className="dialog-actions"><button className="button secondary" disabled={busy} onClick={()=>setToken("")}>取消</button><button className="button danger" disabled={busy} onClick={execute}>{busy?"正在发布…":"确认并发布评论"}</button></div>
    </div></div>}
  </div>;
}
