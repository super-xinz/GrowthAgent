export const API=typeof window==="undefined"
  ? process.env.API_URL||"http://api:8000"
  : process.env.NEXT_PUBLIC_API_URL||"http://localhost:8000";

export async function responseDetail(response:Response){
  const text=await response.text();
  if(!text)return `${response.status} ${response.statusText}`;
  try{const body=JSON.parse(text);return body.detail||body.message||JSON.stringify(body)}
  catch{return text}
}

async function apiJson(path:string,{allow404=false}:{allow404?:boolean}={}){
  const response=await fetch(`${API}${path}`,{cache:"no-store"});
  if(allow404&&response.status===404)return null;
  if(!response.ok)throw new Error(await responseDetail(response));
  return response.json();
}

export const getHealth=()=>apiJson("/health");
export const getProducts=()=>apiJson("/v1/products");
export const getProduct=(id:string)=>apiJson(`/v1/products/${id}`,{allow404:true});
export const getBrain=(id:string)=>apiJson(`/v1/products/${id}/brain`,{allow404:true});
export const getOpportunities=(id:string)=>apiJson(`/v1/products/${id}/opportunities`);
export const getAnalytics=(id:string)=>apiJson(`/v1/products/${id}/analytics/overview`);
export const getSubreddits=(id:string)=>apiJson(`/v1/products/${id}/subreddits`);
export const getConversations=(id:string)=>apiJson(`/v1/products/${id}/conversations`);
export const getRiskEvents=(id:string)=>apiJson(`/v1/products/${id}/risk-events`);
export const getAuditLog=(id:string)=>apiJson(`/v1/products/${id}/audit-log`);
