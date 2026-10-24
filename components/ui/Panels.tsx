"use client";

import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import { SECTORS, garageLabel, type ZoneId } from "@/components/world/layout";
import { profile, story, offTrack } from "@/content/profile";
import { experience, education } from "@/content/experience";
import { DOMAINS, projects, type Domain } from "@/content/projects";
import { patents, publications, toolbox } from "@/content/research";
import { playbook, playbookIntro } from "@/content/playbook";

// Which roles belong to each place, matched by company and title.
const SECTOR_ROLES: Record<number, (r: (typeof experience)[number]) => boolean> = {
  1: (r) => ["Team Stallions", "SAE Nirma Collegiate Club", "Nirma University"].includes(r.company),
  2: (r) => r.company === "Hyperlab Sportech",
  3: (r) => ["Northeastern University", "Edlight, PBC", "Impacter AI"].includes(r.company) || r.kind === "Internship",
  4: (r) => r.company === "Waters Corporation" && r.kind === "Full time",
};
const SECTOR_COLOR = ["#d42a2f", "#dc7a45", "#5d7891", "#2fa79c"];

export const zoneMeta = {
  ...Object.fromEntries(
    SECTORS.map((s, i) => [
      `sector-${s.n}`,
      { kicker: `Sector ${s.n} · ${s.name} · ${s.year}`, title: story[i].title, color: SECTOR_COLOR[i] },
    ])
  ),
  ...Object.fromEntries(
    DOMAINS.map((d) => [`garage-${d.id}`, { kicker: `Pit garage · ${garageLabel[d.id]}`, title: d.label, color: "#d42a2f" }])
  ),
  playbook: { kicker: "Tyre wall", title: "How I work with AI", color: "#d4b062" },
  podium: { kicker: "Podium", title: "Papers and patents", color: "#7a7391" },
  cricket: { kicker: "Off the clock", title: "Cricket", color: "#6f9677" },
  football: { kicker: "Off the clock", title: "Football", color: "#5d7891" },
  contact: { kicker: "Mailbox", title: "Say hi", color: "#d42a2f" },
} as Record<ZoneId, { kicker: string; title: string; color: string }>;

const storyPhotos: Partial<Record<number, { src: string; alt: string }>> = {
  1: { src: "/img/mercury.jpg", alt: "Mercury, the Team Stallions solar car" },
  3: { src: "/img/henil-boston.jpg", alt: "Henil in Boston" },
};

export function PanelBody({ zone }: { zone: ZoneId }) {
  if (zone.startsWith("sector-")) {
    const n = Number(zone.split("-")[1]);
    const s = story[n - 1];
    const photo = storyPhotos[n];
    return (
      <div className="space-y-4">
        {photo && (
          <Image src={photo.src} alt={photo.alt} width={800} height={500} className="h-44 w-full object-cover" sizes="420px" />
        )}
        {s.body.map((p) => (
          <p key={p.slice(0, 20)} className="text-[15px] leading-relaxed text-cream/70">
            {p}
          </p>
        ))}
        <div className="space-y-2 pt-1">
          {experience.map((r, i) => (SECTOR_ROLES[n](r) ? <Role key={i} i={i} /> : null))}
          {n === 3 && (
            <p className="px-1 text-[13px] text-cream/70">
              <span className="font-semibold text-cream">{education[0].degree}</span>, {education[0].school} · {education[0].detail}
            </p>
          )}
        </div>
        <p className="pt-1 text-sm text-cream/50">
          {n < 4 ? `Next up: Sector ${n + 1}, ${SECTORS[n].name}.` : "That's the story so far. The pit garages have the projects."}
        </p>
      </div>
    );
  }

  if (zone.startsWith("garage-")) {
    return <ProjectList domain={zone.replace("garage-", "") as Domain} />;
  }

  switch (zone) {
    case "playbook":
      return (
        <div className="space-y-4">
          <p className="text-[15px] leading-relaxed text-cream/70">{playbookIntro}</p>
          {playbook.map((t) => (
            <div key={t.title} className="flex gap-3">
              <Compound c={t.compound} />
              <div>
                <p className="font-display font-semibold text-cream">{t.title}</p>
                <p className="mt-0.5 text-[14px] leading-relaxed text-cream/70">{t.body}</p>
              </div>
            </div>
          ))}
          <div className="pt-2">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-cream/70">Toolbox</p>
            <div className="flex flex-wrap gap-1.5">
              {toolbox.flatMap((t) => t.items).map((x) => (
                <span key={x} className="border border-cream/20 px-2 py-0.5 text-[12px] text-cream/70">
                  {x}
                </span>
              ))}
            </div>
          </div>
        </div>
      );
    case "podium":
      return (
        <div className="space-y-3">
          {publications.map((p, i) => (
            <div key={p.title} className="flex gap-3 bg-cream/[0.06] px-4 py-3">
              <span className="font-racing text-lg text-[#7a7391]">P{i + 1}</span>
              <div>
                <p className="text-[14px] font-medium leading-snug text-cream">{p.title}</p>
                <p className="mt-0.5 font-mono text-[11px] text-cream/70">
                  {p.venue} · {p.date}
                </p>
              </div>
            </div>
          ))}
          {patents.map((p) => (
            <div key={p.id} className="border border-[#d4b062]/70 px-4 py-3">
              <p className="font-mono text-[11px] uppercase tracking-wider text-yellow">Patent · {p.status}</p>
              <p className="mt-1 text-[14px] font-medium leading-snug text-cream">{p.title}</p>
            </div>
          ))}
          <a href={profile.links.scholar} target="_blank" rel="noreferrer" className="inline-block text-sm font-semibold text-red">
            Google Scholar ↗
          </a>
        </div>
      );
    case "cricket":
    case "football": {
      const o = offTrack.find((x) => x.key === zone)!;
      const rest = offTrack.filter((x) => x.key !== zone);
      return (
        <div className="space-y-4">
          <p className="text-[15px] leading-relaxed text-cream/70">{o.body}</p>
          <p className="bg-cream/[0.06] px-4 py-3 text-sm text-cream/70">
            {zone === "cricket" ? "Hit the stumps. You know you want to." : "Push the ball into the goal."}
          </p>
          <div className="space-y-2 pt-2">
            {rest.map((r) => (
              <p key={r.key} className="text-[14px] leading-relaxed text-cream/70">
                <span className="font-semibold text-cream">{r.title}.</span> {r.body}
              </p>
            ))}
          </div>
        </div>
      );
    }
    case "contact":
      return <Contact />;
  }
  return null;
}

function Role({ i }: { i: number }) {
  const [open, setOpen] = useState(false);
  const r = experience[i];
  return (
    <div className="overflow-hidden bg-cream/[0.06]">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="h-7 w-1 shrink-0 bg-red" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-cream">{r.title}</span>
          <span className="block truncate text-[13px] text-cream/70">{r.company}</span>
        </span>
        <span className="shrink-0 font-mono text-[11px] text-cream/70">{r.dates}</span>
      </button>
      {open && (
        <ul className="space-y-1.5 px-4 pb-4 pl-8 text-[13.5px] leading-relaxed text-cream/70">
          {r.points.map((p) => (
            <li key={p} className="list-disc">
              {p}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Compound({ c }: { c: string }) {
  const color = { soft: "#ff4b3e", medium: "#ffd23f", hard: "#d9dbe3", inter: "#45c46b" }[c] ?? "#ccc";
  return (
    <span
      className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#171928] font-mono text-xs font-bold text-cream"
      style={{ boxShadow: `inset 0 0 0 4px ${color}` }}
    >
      {c[0].toUpperCase()}
    </span>
  );
}

// Projects as broadcast-style telemetry: one big number, then the detail.
function ProjectList({ domain }: { domain: Domain }) {
  const list = projects.filter((p) => p.domain === domain);
  return (
    <div className="space-y-3">
      {domain === "hardware" && (
        <p className="text-[15px] leading-relaxed text-cream/70">
          I started in electronics, writing Verilog and Embedded C before I ever trained a model. Chip verification eats
          most of a hardware team&apos;s time and looks a lot like the agent problems I solve at work, so I&apos;m building
          agents that write testbenches and small models that write RTL.
        </p>
      )}
      {list.map((p) => (
        <ProjectItem key={p.slug} p={p} />
      ))}
    </div>
  );
}

export function ProjectItem({ p }: { p: (typeof projects)[number] }) {
  return (
        <div className="overflow-hidden bg-cream/[0.06]">
          <div className="flex items-stretch">
            <div className="flex w-[108px] shrink-0 flex-col justify-center bg-[#171928] px-3 py-3 text-cream">
              <span className="font-racing text-[19px] leading-none text-red">{p.headline.value}</span>
              <span className="mt-1.5 font-mono text-[9.5px] uppercase leading-tight tracking-[0.08em] text-cream/55">{p.headline.label}</span>
            </div>
            <div className="min-w-0 flex-1 px-4 py-3">
              <p className="font-display text-[16px] font-semibold leading-tight text-cream">{p.name}</p>
              <p className="text-[12.5px] text-cream/70">{p.tagline}</p>
            </div>
          </div>
          <div className="px-4 pb-3.5 pt-2.5">
            <ul className="space-y-1 text-[13px] leading-relaxed text-cream/70">
              {p.points.slice(0, 3).map((x) => (
                <li key={x}>· {x}</li>
              ))}
            </ul>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {p.stack.slice(0, 5).map((s) => (
                <span key={s} className="hud-chip">
                  {s}
                </span>
              ))}
              {p.links.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="ml-1 text-[12px] font-semibold text-red">
                  {l.label} ↗
                </a>
              ))}
            </div>
          </div>
        </div>
  );
}

const noop = () => () => {};

export function Contact() {
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const [copied, setCopied] = useState("");
  const cmd = `claude mcp add --transport http henil ${origin}/mcp`;
  const copy = async (k: string, v: string) => {
    try {
      await navigator.clipboard.writeText(v);
      setCopied(k);
      setTimeout(() => setCopied(""), 1500);
    } catch {}
  };
  return (
    <div className="space-y-4">
      <p className="text-[15px] leading-relaxed text-cream/70">
        Hiring for ML or AI engineering, want to swap notes on agents, or argue about last Sunday&apos;s race. My inbox
        is open.
      </p>
      <a
        href={`mailto:${profile.email}`}
        className="block bg-red px-4 py-3 text-center font-semibold text-white"
      >
        {profile.email}
      </a>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {(
          [
            ["LinkedIn", profile.links.linkedin],
            ["GitHub", profile.links.github],
            ["Scholar", profile.links.scholar],
            ["Resume", profile.resume],
          ] as const
        ).map(([l, h]) => (
          <a key={l} href={h} target="_blank" rel="noreferrer" className="border border-cream/20 px-3 py-2 font-medium text-cream transition hover:border-cream/60">
            {l} ↗
          </a>
        ))}
      </div>
      <div className="border border-cream/20 p-4 text-cream">
        <p className="font-display font-semibold">Ask your own AI about me</p>
        <p className="mt-1 text-[13px] text-cream/60">This site is an MCP server. Add it to Claude Code or Cursor:</p>
        <button
          onClick={() => copy("mcp", cmd)}
          className="mt-3 w-full truncate bg-cream/10 px-3 py-2 text-left font-mono text-[11px] text-cream/90"
        >
          {copied === "mcp" ? "copied ✓" : `$ ${cmd}`}
        </button>
      </div>
    </div>
  );
}
