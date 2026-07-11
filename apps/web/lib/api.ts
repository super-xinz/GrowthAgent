export const API=typeof window==="undefined"
  ? process.env.API_URL||"http://api:8000"
  : process.env.NEXT_PUBLIC_API_URL||"http://localhost:8000";
export async function getProducts(){try{const r=await fetch(`${API}/v1/products`,{cache:"no-store"});return r.ok?await r.json():[]}catch{return []}}
export async function getProduct(id:string){try{const r=await fetch(`${API}/v1/products/${id}`,{cache:"no-store"});return r.ok?await r.json():null}catch{return null}}
export async function getBrain(id:string){try{const r=await fetch(`${API}/v1/products/${id}/brain`,{cache:"no-store"});return r.ok?await r.json():null}catch{return null}}
export async function getOpportunities(id:string){try{const r=await fetch(`${API}/v1/products/${id}/opportunities`,{cache:"no-store"});return r.ok?await r.json():[]}catch{return []}}
export async function getAnalytics(id:string){try{const r=await fetch(`${API}/v1/products/${id}/analytics/overview`,{cache:"no-store"});return r.ok?await r.json():null}catch{return null}}
export async function getSubreddits(id:string){try{const r=await fetch(`${API}/v1/products/${id}/subreddits`,{cache:"no-store"});return r.ok?await r.json():[]}catch{return []}}
export async function getConversations(id:string){try{const r=await fetch(`${API}/v1/products/${id}/conversations`,{cache:"no-store"});return r.ok?await r.json():[]}catch{return []}}
export async function getRiskEvents(id:string){try{const r=await fetch(`${API}/v1/products/${id}/risk-events`,{cache:"no-store"});return r.ok?await r.json():[]}catch{return []}}
export async function getAuditLog(id:string){try{const r=await fetch(`${API}/v1/products/${id}/audit-log`,{cache:"no-store"});return r.ok?await r.json():[]}catch{return []}}
