import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "维界",
  description: "连接真实生活的另一维度",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/brand/weijie-icon-20260520.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-icon-20260520.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "维界",
    description: "连接真实生活的另一维度",
    images: [{ url: "/brand/weijie-logo-20260520.png", width: 1818, height: 382 }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hans">
      <body>{children}</body>
    </html>
  );
}
