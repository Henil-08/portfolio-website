import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Titillium_Web } from "next/font/google";
import "./globals.css";

const titillium = Titillium_Web({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-titillium",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Henil Gajjar · AI / ML Engineer",
  description:
    "ML engineer at Waters Corporation. I build agents and give AI the context and tools to be useful.",
  openGraph: {
    title: "Henil Gajjar · AI / ML Engineer",
    description: "Ask Claude who Henil is. Then take the car out for a lap.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#07080a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${titillium.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body className="min-h-screen bg-ink text-chalk">{children}</body>
    </html>
  );
}
