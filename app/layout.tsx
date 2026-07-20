import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Henil Gajjar — ML Engineer",
  description:
    "Exploring innovative AI solutions, advanced machine learning, and impactful data-driven projects.",
  openGraph: {
    title: "Henil Gajjar — ML Engineer",
    description:
      "ML Engineer from Boston, MA. 3+ years industry experience in LLMs, Agents, RAG, and production AI systems.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[#f0f0f0] antialiased">
        {/* Centered white card */}
        <div className="max-w-[1440px] mx-auto bg-white border-x border-[#c6c6c6] min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
