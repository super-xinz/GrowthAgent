"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {API} from "@/lib/api";

async function apiError(response:Response,step:string){
  let detail=`${response.status} ${response.statusText}`;
  try{const body=await response.json();detail=body.detail||JSON.stringify(body)}catch{const text=await response.text();if(text)detail=text}
  return new Error(`${step}失败：${detail}`);
}

export default function NewProduct(){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [step,setStep]=useState("");
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError("");
    const data=new FormData(e.currentTarget);
    const payload={name:data.get("name"),website_url:data.get("website_url")||null,github_url:data.get("github_url")||null,daily_reply_limit:3};
    try{
      setStep("正在创建产品…");
      const r=await fetch(`${API}/v1/products`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      if(!r.ok)throw await apiError(r,"创建产品");
      const p=await r.json();
      setStep("正在读取公开资料…");
      const ingest=await fetch(`${API}/v1/products/${p.id}/ingest`,{method:"POST"});
      if(!ingest.ok)throw await apiError(ingest,"抓取资料");
      setStep("正在构建带证据的 Product Brain…");
      const brain=await fetch(`${API}/v1/products/${p.id}/build-brain`,{method:"POST"});
      if(!brain.ok)throw await apiError(brain,"产品分析");
      router.push(`/products/${p.id}`);
    }catch(x){setError(x instanceof Error?x.message:"无法创建产品");setBusy(false);setStep("")}
  }
  return <>
    <div className="eyebrow">产品接入</div>
    <h1>先让智能体理解真实的产品。</h1>
    <p>系统只读取公开页面。生成的 Product Brain 会保留来源证据，并把未经验证的信息明确标记为不确定。</p>
    <form className="card" style={{maxWidth:680}} onSubmit={submit}>
      <label>产品名称<input name="name" required placeholder="例如：ThreadPilot"/></label>
      <label>产品网站<input name="website_url" type="url" placeholder="https://example.com"/></label>
      <label>GitHub 仓库地址<input name="github_url" type="url" placeholder="https://github.com/org/repo"/></label>
      {step&&<p>{step}</p>}
      {error&&<p style={{color:"var(--danger)",whiteSpace:"pre-wrap"}}>{error}</p>}
      <button className="button" disabled={busy}>{busy?"正在分析…":"创建并分析"}</button>
    </form>
  </>;
}
