import {notFound} from "next/navigation";
import {getOpportunities, getProduct} from "@/lib/api";
import OpportunityBoard from "./OpportunityBoard";

export default async function Opportunities({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const [rows, product]=await Promise.all([getOpportunities(id), getProduct(id)]);
  if(!product)notFound();
  return <>
    <header className="page-header result-header"><div><div className="eyebrow">{product.name} · DISCOVERY</div><h1>发现结果</h1><p>高匹配自动触达，其余结果可手动发布。</p></div></header>
    <OpportunityBoard rows={rows}/>
  </>;
}
