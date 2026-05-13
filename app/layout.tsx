import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Saved Lists Cleaner",
  description: "把吃灰的知乎收藏夹，变成今天能清空的待办列表。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
