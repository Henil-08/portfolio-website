"use client";

import type { Project } from "@/content/projects";

// Card with a cursor-following spotlight, like a product shot under stage lights.
export default function ProjectCard({ p, big = false }: { p: Project; big?: boolean }) {
  return (
    <article
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
      }}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-panel/70 p-6 transition hover:border-chalk/30 ${
        big ? "sm:p-8" : ""
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(420px circle at var(--x) var(--y), rgba(225,6,0,0.14), transparent 60%)",
        }}
      />
      <p className="relative font-mono text-xs uppercase tracking-[0.2em] text-mute">{p.tagline}</p>
      <h3 className={`relative mt-2 font-display font-bold ${big ? "text-3xl sm:text-4xl" : "text-2xl"}`}>
        {p.name}
      </h3>

      <div className="relative mt-6">
        <p
          className={`bg-gradient-to-br from-white to-white/50 bg-clip-text font-display font-black leading-none text-transparent tabular-nums ${
            big ? "text-6xl sm:text-7xl" : "text-4xl"
          }`}
        >
          {p.headline.value}
        </p>
        <p className="mt-1 text-sm text-mute">{p.headline.label}</p>
      </div>

      {big && (
        <ul className="relative mt-6 space-y-2 text-[15px] leading-relaxed text-chalk/75">
          {p.points.slice(0, 3).map((pt) => (
            <li key={pt} className="flex gap-3">
              <span className="mt-2.5 h-px w-3 shrink-0 bg-red" />
              {pt}
            </li>
          ))}
        </ul>
      )}

      <div className="relative mt-auto pt-6">
        <div className="flex flex-wrap gap-1.5">
          {p.stack.slice(0, big ? 6 : 4).map((t) => (
            <span key={t} className="rounded border border-line px-2 py-0.5 font-mono text-[11px] text-mute">
              {t}
            </span>
          ))}
        </div>
        {p.links.length > 0 && (
          <div className="mt-4 flex gap-4 text-sm">
            {p.links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="text-chalk underline decoration-red decoration-2 underline-offset-4 transition hover:text-white"
              >
                {l.label} ↗
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
