import "./globals.css";
import Link from "next/link";
export const metadata={title:"ThreadPilot",description:"Transparent Reddit opportunity intelligence"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body><div className="shell"><aside className="side"><div className="brand">Thread<span>Pilot</span></div><nav><Link className="active" href="/dashboard">Overview</Link><Link href="/products/new">Add product</Link><Link href="/dashboard">Opportunities</Link><Link href="/dashboard">Safety</Link></nav></aside><main className="main">{children}</main></div></body></html>}

