"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {API,responseDetail} from "@/lib/api";

type ProductSettings={id:string;name:string;website_url:string|null;github_url:string|null;daily_reply_limit:number;disclosure_template:string};

export default function ProductSettingsForm({product}:{product:ProductSettings}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [failed,setFailed]=useState(false);
  async function save(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();const data=new FormData(e.currentTarget);
    const website=String(data.get("website_url")||"").trim();const github=String(data.get("github_url")||"").trim();
    if(!website&&!github){setFailed(true);setMessage("请至少保留产品网站或 GitHub 仓库地址。");return}
    setBusy(true);setFailed(false);setMessage("正在保存…");
    const payload={name:data.get("name"),website_url:website||null,github_url:github||null,daily_reply_limit:Number(data.get("daily_reply_limit")),disclosure_template:data.get("disclosure_template")};
    try{
      const response=await fetch(`${API}/v1/products/${product.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      if(!response.ok)throw new Error(await responseDetail(response));
      setMessage("产品设置已保存。需要时请重新分析，以更新 Product Brain。");router.refresh();
    }catch(error){setFailed(true);setMessage(error instanceof Error?error.message:"保存失败")}
    finally{setBusy(false)}
  }
  return <form onSubmit={save} className="settings-form">
    <label>产品名称<input name="name" required disabled={busy} defaultValue={product.name}/></label>
    <label>产品网站<input name="website_url" type="url" disabled={busy} defaultValue={product.website_url||""}/></label>
    <label>GitHub 仓库<input name="github_url" type="url" disabled={busy} defaultValue={product.github_url||""}/></label>
    <label>每日回复上限<input name="daily_reply_limit" type="number" min={1} max={5} disabled={busy} defaultValue={product.daily_reply_limit}/></label>
    <label>关系披露模板<input name="disclosure_template" maxLength={500} disabled={busy} defaultValue={product.disclosure_template}/></label>
    {message&&<p className={failed?"feedback-error":"feedback-message"} role={failed?"alert":"status"}>{message}</p>}
    <button className="button secondary" disabled={busy}>{busy?"正在保存…":"保存产品设置"}</button>
  </form>;
}
