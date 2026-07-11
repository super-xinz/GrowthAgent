"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {API,responseDetail} from "@/lib/api";

export default function OpportunityActions({candidateId,published}:{candidateId:string;published:boolean}){
  const router=useRouter();const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [failed,setFailed]=useState(false);
  async function generate(){
    setBusy(true);setFailed(false);setMessage("正在运行策略与回复生成…");
    try{for(const path of [`/v1/opportunities/${candidateId}/decision`,`/v1/opportunities/${candidateId}/generated-reply`]){const response=await fetch(`${API}${path}`);if(!response.ok)throw new Error(await responseDetail(response))}setMessage("策略与草稿已更新。");router.refresh()}
    catch(error){setFailed(true);setMessage(error instanceof Error?error.message:"生成失败")}
    finally{setBusy(false)}
  }
  async function shadow(){
    setBusy(true);setFailed(false);setMessage("正在写入影子发布记录…");
    try{const response=await fetch(`${API}/v1/opportunities/${candidateId}/publish?force_shadow=true`,{method:"POST"});if(!response.ok)throw new Error(await responseDetail(response));setMessage("影子记录已写入，不会发送到 Reddit。");router.refresh()}
    catch(error){setFailed(true);setMessage(error instanceof Error?error.message:"影子发布失败")}
    finally{setBusy(false)}
  }
  return <div className="row-actions"><button className="button secondary compact" disabled={busy} onClick={generate}>更新策略与草稿</button><button className="button compact" disabled={busy||published} onClick={shadow}>{published?"已记录":"写入影子记录"}</button>{message&&<span className={failed?"feedback-error":"feedback-message"} role={failed?"alert":"status"}>{message}</span>}</div>;
}
