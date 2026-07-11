import "./globals.css";
import SidebarNav from "./SidebarNav";
export const metadata={title:"ThreadPilot｜Reddit 增长智能体",description:"以证据和安全策略为核心的 Reddit 机会分析工具"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body><div className="shell"><SidebarNav/><main className="main">{children}</main></div></body></html>}
