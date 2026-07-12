import Link from "next/link";
export default function NotFound(){return <section className="state-page card"><div className="state-icon">404</div><h1>没有找到这个页面</h1><p>链接可能已失效，或者对应产品已经不存在。</p><Link className="button" href="/dashboard">返回总览</Link></section>}
