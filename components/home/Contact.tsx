"use client";

import { useState, useSyncExternalStore } from "react";
import { profile } from "@/content/profile";

const noop = () => () => {};

export default function Contact() {
  const origin = useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => process.env.NEXT_PUBLIC_SITE_URL ?? ""
  );
  const [copied, setCopied] = useState<string | null>(null);

  const mcpCmd = `claude mcp add --transport http henil ${origin}/mcp`;

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1600);
    } catch {}
  };

  const links = [
    ["LinkedIn", profile.links.linkedin],
    ["GitHub", profile.links.github],
    ["Scholar", profile.links.scholar],
    ["Hugging Face", profile.links.huggingface],
    ["Resume", profile.resume],
  ] as const;

  return (
    <section id="contact" className="relative scroll-mt-16 overflow-hidden px-4 pb-16 pt-28 sm:px-8">
      <div aria-hidden className="absolute inset-x-0 top-0 kerb" />
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-mute">
          <span className="text-red">08</span> · Contact
        </p>
        <h2 className="mt-4 font-display text-6xl font-black leading-[0.95] tracking-tight sm:text-8xl">
          Box, box.
          <br />
          <span className="text-mute">Let&apos;s talk.</span>
        </h2>
        <p className="mt-6 max-w-xl text-lg text-chalk/75">
          Hiring for ML or AI engineering, want to compare notes on agents, or just want to argue about last
          Sunday&apos;s race. My inbox is open.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <a
            href={`mailto:${profile.email}`}
            className="rounded-full bg-red px-6 py-3 font-semibold text-white transition hover:bg-[#ff1f17]"
          >
            {profile.email}
          </a>
          <button
            onClick={() => copy("email", profile.email)}
            className="rounded-full border border-line px-5 py-3 text-sm transition hover:border-chalk"
          >
            {copied === "email" ? "Copied" : "Copy email"}
          </button>
        </div>

        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
          {links.map(([label, href]) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-chalk/80 underline decoration-line decoration-2 underline-offset-4 transition hover:text-white hover:decoration-red"
            >
              {label} ↗
            </a>
          ))}
        </div>

        <div className="mt-16 max-w-3xl rounded-2xl border border-line bg-panel/60 p-6">
          <p className="font-display text-xl font-bold">Or skip the site and ask your own AI.</p>
          <p className="mt-2 text-chalk/70">
            This site is also an MCP server. Add it to Claude Code, Cursor or any MCP client and ask about my work from
            wherever you are. Context is the whole job, so it felt wrong not to.
          </p>
          <button
            onClick={() => copy("mcp", mcpCmd)}
            className="mt-4 flex w-full items-center justify-between gap-4 rounded-lg border border-line bg-ink px-4 py-3 text-left font-mono text-xs text-chalk/90 transition hover:border-chalk/40 sm:text-sm"
          >
            <span className="truncate">
              <span className="text-red">$ </span>
              {mcpCmd}
            </span>
            <span className="shrink-0 text-mute">{copied === "mcp" ? "copied" : "copy"}</span>
          </button>
        </div>

        <footer className="mt-24 flex flex-col gap-2 border-t border-line pt-6 font-mono text-xs text-mute sm:flex-row sm:justify-between">
          <span>
            {profile.name} · {profile.coords}
          </span>
          <span>Built with Claude Code. Every line reviewed by me.</span>
        </footer>
      </div>
    </section>
  );
}
