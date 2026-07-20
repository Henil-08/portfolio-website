"use client";

import { motion } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

const socials = [
  {
    label: "GitHub",
    handle: "Henil-08",
    href: "https://github.com/Henil-08",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    handle: "henil-gajjar",
    href: "https://linkedin.com/in/henil-gajjar",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: "Medium",
    handle: "@henilgajjar08",
    href: "https://medium.com/@henilgajjar08",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
      </svg>
    ),
  },
];

export default function ContactPage() {
  return (
    <section className="w-[85%] mx-auto py-16">
      <motion.div
        variants={stagger}
        initial="initial"
        animate="animate"
        className="max-w-[600px]"
      >
        <motion.div variants={fadeUp} className="flex items-center gap-3 mb-12">
          <h1
            className="text-[20px] font-bold text-[#010202] whitespace-nowrap"
            style={{ fontFamily: "Figtree, sans-serif" }}
          >
            Let&apos;s Talk
          </h1>
          <div className="h-px flex-1 bg-[#eeeeee]" />
        </motion.div>

        {/* Primary contact */}
        <motion.div variants={fadeUp} className="mb-10">
          <p
            className="text-[13px] font-medium text-[#676767] mb-2"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Get in touch with me at
          </p>
          <a
            href="mailto:henil.gajjar2102@gmail.com"
            className="text-[24px] md:text-[28px] font-bold text-[#010202] hover:text-[#2dca72] transition-colors"
            style={{ fontFamily: "Figtree, sans-serif" }}
          >
            henil.gajjar2102@gmail.com
          </a>
        </motion.div>

        {/* Location */}
        <motion.div variants={fadeUp} className="mb-12">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-[#676767]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="9" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span
              className="text-[14px] font-medium text-[#676767]"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Boston, MA · 42.3555° N, 71.0565° W
            </span>
          </div>
        </motion.div>

        {/* Socials */}
        <motion.div variants={fadeUp}>
          <p
            className="text-[12px] font-semibold text-[#676767] uppercase tracking-wider mb-4"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Find me on
          </p>
          <div className="flex flex-col gap-3">
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl border border-[#eeeeee] hover:border-[#d6d6d6] hover:shadow-sm transition-all group"
              >
                <span className="text-[#676767] group-hover:text-[#010202] transition-colors">
                  {social.icon}
                </span>
                <div>
                  <p
                    className="text-[14px] font-semibold text-[#010202]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {social.label}
                  </p>
                  <p
                    className="text-[12px] text-[#676767]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {social.handle}
                  </p>
                </div>
                <svg
                  className="ml-auto text-[#d6d6d6] group-hover:text-[#010202] transition-colors"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M3 13L13 3M13 3H6M13 3V10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            ))}
          </div>
        </motion.div>

        {/* Resume CTA */}
        <motion.div variants={fadeUp} className="mt-10 pt-8 border-t border-[#eeeeee]">
          <a
            href="https://drive.google.com/file/d/1VfI0pMkejigWso1PqJZSfTkGSP4T95FB/view?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold border border-[#d6d6d6] rounded-full text-[#010202] hover:border-[#010202] hover:bg-[#010202] hover:text-white transition-all"
          >
            🔖 View My Resume
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}
