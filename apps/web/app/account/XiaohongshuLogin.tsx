"use client";

import Image from "next/image";
import {useCallback, useEffect, useState} from "react";
import {API, responseDetail} from "@/lib/api";

type Status={is_logged_in?:boolean;username?:string};
type Qrcode={img?:string;timeout?:string;is_logged_in?:boolean};

export default function XiaohongshuLogin({initialStatus}:{initialStatus:Status|null}){
  const [status,setStatus]=useState(initialStatus);
  const [qr,setQr]=useState<Qrcode|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  const request=useCallback(async(path:string,method="GET")=>{
    const response=await fetch(`${API}${path}`,{method});
    if(!response.ok)throw new Error(await responseDetail(response));
    return response.json();
  },[]);
  const refreshStatus=useCallback(async()=>{
    try{const next=await request("/v1/xiaohongshu/status");setStatus(next);setError("");return Boolean(next.is_logged_in)}
    catch(reason){setError(reason instanceof Error?reason.message:"无法连接小红书服务");return false}
  },[request]);
  async function showQr(){
    setBusy(true);setError("");
    try{setQr(await request("/v1/xiaohongshu/login/qrcode"))}
    catch(reason){setError(reason instanceof Error?reason.message:"二维码获取失败")}
    finally{setBusy(false)}
  }
  async function logout(){
    if(!window.confirm("确定清除当前小红书登录状态吗？"))return;
    setBusy(true);
    try{await request("/v1/xiaohongshu/login","DELETE");setStatus({is_logged_in:false});setQr(null)}
    catch(reason){setError(reason instanceof Error?reason.message:"退出失败")}
    finally{setBusy(false)}
  }
  useEffect(()=>{
    if(status?.is_logged_in||!qr)return;
    const timer=window.setInterval(async()=>{if(await refreshStatus())setQr(null)},3000);
    return()=>window.clearInterval(timer);
  },[qr,status?.is_logged_in,refreshStatus]);

  return <section className="card account-card">
    <div className="account-status"><span className={`account-dot ${status?.is_logged_in?"online":""}`}/><div><strong>{status?.is_logged_in?"已连接小红书":"尚未登录"}</strong><p>{status?.is_logged_in?(status.username||"当前账号可用于搜索和人工确认评论"):"使用小红书 App 扫码登录，不需要 API Key。"}</p></div></div>
    {error&&<div className="inline-error" role="alert">{error}</div>}
    {qr?.img&&<div className="qr-panel"><Image src={qr.img} alt="小红书登录二维码" width={220} height={220} unoptimized/><p>请使用小红书 App 扫码。二维码约 {qr.timeout||"300"} 秒后过期。</p></div>}
    <div className="actions">{status?.is_logged_in?<button className="button secondary" disabled={busy} onClick={logout}>重新登录</button>:<button className="button" disabled={busy} onClick={showQr}>{qr?"刷新二维码":"显示登录二维码"}</button>}<button className="button secondary" disabled={busy} onClick={()=>void refreshStatus()}>检查登录状态</button></div>
  </section>;
}
