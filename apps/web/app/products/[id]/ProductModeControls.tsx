"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {API,responseDetail} from "@/lib/api";

type Product={
  id:string;autopublish_enabled:boolean;automation_status:string;automation_error?:string|null;
  auto_score_threshold:number;auto_risk_threshold:number;search_interval_hours:number;
  min_publish_interval_hours:number;daily_reply_limit:number;next_auto_search_at?:string|null;
};

function conciseError(message: string) {
  const plain = message.split(/error value:|goroutine\s+\d+|runtime\/debug/i)[0].trim();
  return plain.length > 160 ? `${plain.slice(0, 157)}…` : plain;
}

export default function ProductModeControls({product}:{product:Product}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [failed,setFailed]=useState(false);

  async function request(path:string,method="POST"){
    const response=await fetch(`${API}${path}`,{method});
    if(!response.ok)throw new Error(await responseDetail(response));
    return response.json();
  }

  async function runNow(){
    setBusy(true);setFailed(false);setMessage("正在选择需求词并搜索，本轮最多触达 1 人…");
    try{
      await request(`/v1/products/${product.id}/xiaohongshu/auto-search`);
      setMessage("本轮已完成，正在打开发现结果。");
      router.push(`/products/${product.id}/opportunities`);router.refresh();
    }catch(error){setFailed(true);setMessage(error instanceof Error?error.message:"运行失败");}
    finally{setBusy(false);}
  }

  async function toggle(){
    setBusy(true);setFailed(false);setMessage("");
    try{
      await request(`/v1/products/${product.id}/autopublish/${product.autopublish_enabled?"disable":"enable"}`);
      router.refresh();
    }catch(error){setFailed(true);setMessage(error instanceof Error?error.message:"更新失败");}
    finally{setBusy(false);}
  }

  return <section className="automation-panel">
    <div className="automation-main">
      <div className="automation-title-row"><span className={`run-indicator ${product.autopublish_enabled?"online":""}`}/><div><div className="eyebrow">自动获客</div><h2>{product.autopublish_enabled?"正在低频运行":"任务已暂停"}</h2></div></div>
      <p>{product.autopublish_enabled?`下一轮 ${product.next_auto_search_at?new Date(product.next_auto_search_at).toLocaleString("zh-CN",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Asia/Shanghai"}):"即将开始"}`:"不会搜索或发送评论"}</p>
      {product.automation_error&&<div className="compact-alert">{conciseError(product.automation_error)}</div>}
      {message&&<div className={failed?"feedback-error":"feedback-message"} role={failed?"alert":"status"}>{message}</div>}
      <div className="actions"><button className="button" disabled={busy||!product.autopublish_enabled} onClick={runNow}>{busy?"运行中…":"立即运行一次"}</button><button className="button ghost" disabled={busy} onClick={toggle}>{product.autopublish_enabled?"暂停":"重新开启"}</button></div>
    </div>
    <div className="guardrails">
      <div><span>自动门槛</span><strong>≥ {Math.round(product.auto_score_threshold*100)} 分</strong></div>
      <div><span>搜索节奏</span><strong>每 {product.search_interval_hours} 小时</strong></div>
      <div><span>发布冷却</span><strong>至少 {product.min_publish_interval_hours} 小时</strong></div>
      <div><span>每日上限</span><strong>{product.daily_reply_limit} 条</strong></div>
    </div>
  </section>;
}
