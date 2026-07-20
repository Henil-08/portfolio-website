import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[#d6d6d6] bg-[#282833]">
      <div className="w-[80%] mx-auto py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          {/* Left: contact */}
          <div className="flex flex-col gap-1">
            <p className="text-[12px] text-[#676767] font-medium">
              Get in touch with me at
            </p>
            <a
              href="mailto:henil.gajjar2102@gmail.com"
              className="text-[14px] text-white font-medium hover:text-[#2dca72] transition-colors"
            >
              henil.gajjar2102@gmail.com
            </a>
            <p className="text-[12px] text-[#676767] mt-1">
              42.3555° N, 71.0565° W
            </p>
          </div>

          {/* Right: nav links */}
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {[
              { href: "/#about", label: "About Me" },
              { href: "/experience", label: "Experience" },
              { href: "/projects", label: "Projects" },
              { href: "/publications", label: "Publications" },
              { href: "/contact", label: "Contact" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[13px] text-[#676767] hover:text-white transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
