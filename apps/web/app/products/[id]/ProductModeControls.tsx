"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {API,responseDetail} from "@/lib/api";

export default function ProductModeControls({productId,status,productName}:{productId:string;status:string;productName:string}){
  const router=useRouter();const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [failed,setFailed]=useState(false);const [keyword,setKeyword]=useState(productName);
  async function call(path:string,progress:string){
    setBusy(true);setFailed(false);setMessage(progress);
    try{const response=await fetch(`${API}${path}`,{method:"POST"});if(!response.ok)throw new Error(await responseDetail(response));setMessage("操作完成。");router.refresh()}
    catch(error){setFailed(true);setMessage(error instanceof Error?error.message:"操作失败")}
    finally{setBusy(false)}
  }
  async function search(){
    if(!keyword.trim()){setFailed(true);setMessage("请输入搜索关键词。");return}
    setBusy(true);setFailed(false);setMessage("正在搜索小红书笔记并读取公开评论…");
    try{const response=await fetch(`${API}/v1/products/${productId}/xiaohongshu/search`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({keyword:keyword.trim(),detail_limit:3})});if(!response.ok)throw new Error(await responseDetail(response));const rows=await response.json();setMessage(`已导入 ${rows.length} 条机会。`);router.push(`/products/${productId}/opportunities`);router.refresh()}
    catch(error){setFailed(true);setMessage(error instanceof Error?error.message:"搜索失败")}
    finally{setBusy(false)}
  }
  const running=status==="SHADOW_RUNNING";
  return <div className="mode-controls">
    <button type="button" className="button secondary" disabled={busy} onClick={()=>call(`/v1/products/${productId}/${running?"pause":"start"}`,running?"正在暂停…":"正在启动安全模拟…")}>{running?"暂停安全模拟":"启动安全模拟"}</button>
    <div className="xhs-search-control"><input value={keyword} onChange={event=>setKeyword(event.target.value)} placeholder="例如：用户研究工具" aria-label="小红书搜索关键词"/><button type="button" className="button" disabled={busy} onClick={search}>搜索小红书机会</button></div>
    {message&&<p className={failed?"feedback-error":"feedback-message"} role={failed?"alert":"status"}>{message}</p>}
  </div>;
}
