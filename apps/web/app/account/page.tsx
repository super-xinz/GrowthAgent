import {getXiaohongshuStatus} from "@/lib/api";
import XiaohongshuLogin from "./XiaohongshuLogin";

export default async function AccountPage(){
  let status=null;
  try{status=await getXiaohongshuStatus()}catch{}
  return <><header className="page-header account-header"><div><div className="eyebrow">ACCOUNT</div><h1>小红书账号</h1><p>连接账号，开始发现与触达。</p></div></header><XiaohongshuLogin initialStatus={status}/></>;
}
