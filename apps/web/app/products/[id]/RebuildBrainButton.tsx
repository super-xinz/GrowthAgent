"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {API} from "@/lib/api";

async function detail(response:Response){
  try{const body=await response.json();return body.detail||JSON.stringify(body)}
  catch{return await response.text()||`${response.status} ${response.statusText}`}
}

export default function RebuildBrainButton({productId}:{productId:string}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  async function rebuild(){
    setBusy(true);setMessage("正在重新读取公开资料…");
    try{
      const ingest=await fetch(`${API}/v1/products/${productId}/ingest`,{method:"POST"});
      if(!ingest.ok)throw new Error(`资料刷新失败：${await detail(ingest)}`);
      setMessage("正在重建带证据的 Product Brain…");
      const brain=await fetch(`${API}/v1/products/${productId}/build-brain`,{method:"POST"});
      if(!brain.ok)throw new Error(`分析失败：${await detail(brain)}`);
      setMessage("分析已更新。");router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"分析失败")}
    finally{setBusy(false)}
  }
  return <div><button className="button" type="button" disabled={busy} onClick={rebuild}>{busy?"正在分析…":"刷新资料并重新分析"}</button>{message&&<p>{message}</p>}</div>;
}
