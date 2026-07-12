import "./globals.css";
import "./navigation.css";
import {getProducts} from "@/lib/api";
import SidebarNav from "./SidebarNav";

export const metadata = {
  title: "ThreadPilot｜小红书评论增长助手",
  description: "发现小红书真实需求，生成有依据的评论，并在人工确认后执行",
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
