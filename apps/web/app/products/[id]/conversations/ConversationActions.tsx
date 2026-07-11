"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {API,responseDetail} from "@/lib/api";

export default function ConversationActions({conversationId,closed}:{conversationId:string;closed:boolean}){
  const router=useRouter();const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [failed,setFailed]=useState(false);
  async function simulate(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();const form=e.currentTarget;const body=String(new FormData(form).get("body")||"").trim();if(!body)return;
    setBusy(true);setFailed(false);setMessage("正在处理模拟追问…");
    try{const response=await fetch(`${API}/v1/conversations/${conversationId}/followup`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({body})});if(!response.ok)throw new Error(await responseDetail(response));form.reset();setMessage("模拟追问已处理。");router.refresh()}
    catch(error){setFailed(true);setMessage(error instanceof Error?error.message:"处理失败")}
    finally{setBusy(false)}
  }
  async function stop(){
    setBusy(true);setFailed(false);setMessage("正在停止对话…");
    try{const response=await fetch(`${API}/v1/conversations/${conversationId}/stop`,{method:"POST"});if(!response.ok)throw new Error(await responseDetail(response));setMessage("对话已停止。");router.refresh()}
    catch(error){setFailed(true);setMessage(error instanceof Error?error.message:"停止失败")}
    finally{setBusy(false)}
  }
  return <div className="conversation-actions">{!closed&&<form onSubmit={simulate}><input name="body" aria-label="模拟用户追问" placeholder="输入本地测试追问，例如：Can you send the link?" disabled={busy}/><button className="button secondary compact" disabled={busy}>模拟追问</button></form>}<button type="button" className="button compact danger" disabled={busy||closed} onClick={stop}>{closed?"已关闭":"停止对话"}</button>{message&&<span className={failed?"feedback-error":"feedback-message"} role={failed?"alert":"status"}>{message}</span>}</div>;
}
