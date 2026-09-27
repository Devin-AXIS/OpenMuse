import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import { ConfigProvider } from "@/lib/future-lens/config-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenMuse — 你的个人 AI 助手",
  description: "一个能持续记住上下文、帮你推进目标的个人 AI 助手。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f8f9fb",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh" className="light" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Script
          id="theme-before-paint"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('app-theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.classList.toggle('light',!d)}catch(e){}})();`,
          }}
        />
        <ConfigProvider>{children}</ConfigProvider>
        <div id="app-portal-container" />
      </body>
    </html>
  );
}
