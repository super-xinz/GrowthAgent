import {getXiaohongshuStatus} from "@/lib/api";
import XiaohongshuLogin from "./XiaohongshuLogin";

export default async function AccountPage(){
  let status=null;
  try{status=await getXiaohongshuStatus()}catch{}
  return <><div className="eyebrow">平台账号</div><h1>小红书账号</h1><p>扫码登录后，ThreadPilot 可以搜索公开笔记、读取评论，并在你逐条确认后发表评论或回复。</p><XiaohongshuLogin initialStatus={status}/></>;
}
