"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {API,responseDetail} from "@/lib/api";

export default function ProductModeControls({productId,status}:{productId:string;status:string}){
  const router=useRouter();const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [failed,setFailed]=useState(false);
  async function call(path:string,progress:string){
    setBusy(true);setFailed(false);setMessage(progress);
    try{const response=await fetch(`${API}${path}`,{method:"POST"});if(!response.ok)throw new Error(await responseDetail(response));setMessage("操作完成。");router.refresh()}
    catch(error){setFailed(true);setMessage(error instanceof Error?error.message:"操作失败")}
    finally{setBusy(false)}
  }
  const running=status==="SHADOW_RUNNING";
  return <div className="mode-controls">
    <button type="button" className="button secondary" disabled={busy} onClick={()=>call(`/v1/products/${productId}/${running?"pause":"start"}`,running?"正在暂停…":"正在启动影子模式…")}>{running?"暂停影子模式":"启动影子模式"}</button>
    <button type="button" className="button secondary" disabled={busy} onClick={()=>call(`/v1/products/${productId}/discover-subreddits`,"正在生成本地社区候选…")}>生成本地社区候选</button>
    {message&&<p className={failed?"feedback-error":"feedback-message"} role={failed?"alert":"status"}>{message}</p>}
  </div>;
}
