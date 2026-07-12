import "./globals.css";
import "./navigation.css";
import {getProducts} from "@/lib/api";
import SidebarNav from "./SidebarNav";

export const metadata = {
  title: "ThreadPilot｜Reddit 增长智能体",
  description: "以证据和安全策略为核心的 Reddit 机会分析工具",
};

export default async function Layout({children}: {children: React.ReactNode}) {
  const products = await getProducts();
  return (
    <html lang="zh-CN">
      <body>
        <div className="shell">
          <SidebarNav products={products} />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
