"use client";import {useState} from "react";import {useRouter} from "next/navigation";import {API} from "@/lib/api";

async function apiError(response:Response, step:string){
  let detail=`${response.status} ${response.statusText}`;
  try{const body=await response.json();detail=body.detail||JSON.stringify(body)}catch{const text=await response.text();if(text)detail=text}
  return new Error(`${step} failed: ${detail}`);
}

export default function NewProduct(){const router=useRouter();const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [step,setStep]=useState("");async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");const data=new FormData(e.currentTarget);const payload={name:data.get("name"),website_url:data.get("website_url")||null,github_url:data.get("github_url")||null,daily_reply_limit:3};try{
  setStep("Creating product…");const r=await fetch(`${API}/v1/products`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});if(!r.ok)throw await apiError(r,"Product creation");const p=await r.json();
  setStep("Reading public sources…");const ingest=await fetch(`${API}/v1/products/${p.id}/ingest`,{method:"POST"});if(!ingest.ok)throw await apiError(ingest,"Source ingestion");
  setStep("Building Product Brain…");const brain=await fetch(`${API}/v1/products/${p.id}/build-brain`,{method:"POST"});if(!brain.ok)throw await apiError(brain,"Product Brain");
  router.push(`/products/${p.id}/opportunities`)
}catch(x){setError(x instanceof Error?x.message:"Unable to create product");setBusy(false);setStep("")}}return <><div className="eyebrow">Product onboarding</div><h1>Teach the agent what is true.</h1><p>We read public pages only. The generated Product Brain keeps source evidence and marks unverified details as uncertain.</p><form className="card" style={{maxWidth:680}} onSubmit={submit}><label>Product name<input name="name" required placeholder="Acme"/></label><label>Website URL<input name="website_url" type="url" placeholder="https://acme.com"/></label><label>GitHub repository URL<input name="github_url" type="url" placeholder="https://github.com/org/repo"/></label>{step&&<p>{step}</p>}{error&&<p style={{color:"var(--danger)",whiteSpace:"pre-wrap"}}>{error}</p>}<button className="button" disabled={busy}>{busy?"Working…":"Create and analyze"}</button></form></>}
