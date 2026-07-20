"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { href: "/#about", label: "About Me" },
  { href: "/experience", label: "Experience" },
  { href: "/projects", label: "Projects" },
  { href: "/publications", label: "Publications" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/#about") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop / Tablet horizontal top nav */}
      <nav className="hidden md:flex items-center justify-between w-full border-b border-[#d6d6d6] px-10 py-5">
        {/* Logo pill */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="bg-[#eee] rounded-full px-4 py-2 flex flex-col items-start transition-colors group-hover:bg-[#e0e0e0]">
            <span
              className="font-bold text-[14px] leading-tight text-[#010202]"
              style={{ fontFamily: "Figtree, sans-serif" }}
            >
              Henil Gajjar
            </span>
            <span className="text-[10px] text-[#676767] font-medium leading-tight">
              ML Engineer
            </span>
          </div>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-[14px] font-medium transition-colors ${
                isActive(link.href)
                  ? "text-[#010202]"
                  : "text-[#676767] hover:text-[#010202]"
              }`}
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <a
            href="https://drive.google.com/file/d/1VfI0pMkejigWso1PqJZSfTkGSP4T95FB/view?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-medium text-[#676767] hover:text-[#010202] transition-colors"
          >
            🔖 My Resume
          </a>
          <Link
            href="/contact"
            className={`flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold rounded-full border transition-all ${
              pathname === "/contact"
                ? "bg-[#010202] text-white border-[#010202]"
                : "border-[#010202] text-[#010202] hover:bg-[#010202] hover:text-white"
            }`}
          >
            👋 Let&apos;s Talk
          </Link>
        </div>
      </nav>

      {/* Mobile top bar */}
      <div className="md:hidden border-b border-[#d6d6d6]">
        <div className="flex items-center justify-between px-5 py-3.5">
          <Link href="/" className="block">
            <div className="bg-[#eee] rounded-full px-3.5 py-1.5">
              <p
                className="font-bold text-[13px] leading-tight text-[#010202]"
                style={{ fontFamily: "Figtree, sans-serif" }}
              >
                Henil Gajjar
              </p>
              <p className="text-[9px] text-[#676767] font-medium">
                ML Engineer
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/contact"
              className="text-[12px] font-semibold px-3.5 py-1.5 rounded-full border border-[#010202] hover:bg-[#010202] hover:text-white transition-all"
            >
              👋 Let&apos;s Talk
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-[#676767] hover:text-[#010202] transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M2 2L16 16M2 16L16 2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M2 5H16M2 9H16M2 13H16"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-[#eee] bg-white">
            <nav className="flex flex-col px-5 py-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`py-3 text-[14px] font-medium border-b border-[#f5f5f5] last:border-0 transition-colors ${
                    isActive(link.href)
                      ? "text-[#010202]"
                      : "text-[#676767] hover:text-[#010202]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <a
                href="https://drive.google.com/file/d/1VfI0pMkejigWso1PqJZSfTkGSP4T95FB/view?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="py-3 text-[14px] font-medium text-[#676767] hover:text-[#010202] transition-colors"
              >
                🔖 My Resume
              </a>
            </nav>
          </div>
        )}
      </div>
    </>
  );
}
