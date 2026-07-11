"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";

type NavItem={href:string;label:string;exact?:boolean};

export default function SidebarNav(){
  const pathname=usePathname();
  const match=pathname.match(/^\/products\/([^/]+)/);
  const productId=match?.[1]!=="new"?match?.[1]:null;
  const baseItems:NavItem[]=[
    {href:"/dashboard",label:"总览",exact:true},
    {href:"/products/new",label:"添加产品",exact:true},
  ];
  const productItems:NavItem[]=productId?[
    {href:`/products/${productId}`,label:"产品分析",exact:true},
    {href:`/products/${productId}/opportunities`,label:"机会雷达",exact:true},
    {href:`/products/${productId}/conversations`,label:"对话跟进",exact:true},
    {href:`/products/${productId}/safety`,label:"安全审计",exact:true},
  ]:[];
  const render=(item:NavItem)=>{
    const active=item.exact?pathname===item.href:pathname.startsWith(item.href);
    return <Link key={item.href} className={active?"active":undefined} aria-current={active?"page":undefined} href={item.href}>{item.label}</Link>;
  };
  return <aside className="side"><Link className="brand" href="/dashboard">Thread<span>Pilot</span></Link><nav className="side-nav" aria-label="主导航">{baseItems.map(render)}{productItems.length>0&&<><div className="nav-section">当前产品</div>{productItems.map(render)}</>}</nav><div className="side-footer"><span className="guard-dot"/>受保护影子模式</div></aside>;
}
