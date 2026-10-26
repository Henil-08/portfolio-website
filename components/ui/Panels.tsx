"use client";

// What each place shows when you open it (E), in the brand language (docs/BRAND.md): ink text
// on white, mono codes, rows that invert, one orange. The frame around it is Hud.tsx `Sheet`.
import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import { SECTORS, garageLabel, zones, type ZoneId } from "@/components/world/layout";
import { setState, useWorld } from "@/components/world/store";
import { profile, story, offTrack } from "@/content/profile";
import { experience, education } from "@/content/experience";
import { DOMAINS, projects, type Domain } from "@/content/projects";
import { patents, publications, toolbox } from "@/content/research";
import { playbook, playbookIntro } from "@/content/playbook";
import { DsCard } from "@/components/brand/sheets";
import { Figures, pad } from "@/components/brand/tokens";

// Which roles belong to each place, matched by company and title.
const SECTOR_ROLES: Record<number, (r: (typeof experience)[number]) => boolean> = {
  1: (r) => ["Team Stallions", "SAE Nirma Collegiate Club", "Nirma University"].includes(r.company),
  2: (r) => r.company === "Hyperlab Sportech",
  3: (r) => ["Northeastern University", "Edlight, PBC", "Impacter AI"].includes(r.company) || r.kind === "Internship",
  4: (r) => r.company === "Waters Corporation" && r.kind === "Full time",
};

/** A place's code on the map and in its sheet: Z01, Z02… in zone order (layout.ts `zones`). */
export const zoneCode = (zone: ZoneId) => `Z${pad(zones.findIndex((z) => z.id === zone) + 1)}`;

export const zoneMeta = {
  ...Object.fromEntries(SECTORS.map((s, i) => [`sector-${s.n}`, { kicker: `Sector ${s.n} · ${s.name} · ${s.year}`, title: story[i].title }])),
  ...Object.fromEntries(DOMAINS.map((d) => [`garage-${d.id}`, { kicker: `Garage · ${garageLabel[d.id]}`, title: d.label }])),
  playbook: { kicker: "Tyre wall", title: "How I work with AI" },
  podium: { kicker: "Podium", title: "Papers and patents" },
  cricket: { kicker: "Off the clock", title: "Cricket" },
  football: { kicker: "Off the clock", title: "Football" },
  contact: { kicker: "Mailbox", title: "Say hi" },
} as Record<ZoneId, { kicker: string; title: string }>;

const storyPhotos: Partial<Record<number, { src: string; alt: string }>> = {
  1: { src: "/img/mercury.jpg", alt: "Mercury, the Team Stallions solar car" },
  3: { src: "/img/henil-boston.jpg", alt: "Henil in Boston" },
};

/** A numbered section head, as in the datasheet: orange number, caps label, ink rule. */
function Head({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <h3 className="mb-2 flex items-baseline gap-3 border-b border-ink pb-1.5 text-[12.5px] font-semibold uppercase tracking-[0.06em]">
      <span className="font-mono text-signal">{n}</span>
      {children}
    </h3>
  );
}

export function PanelBody({ zone }: { zone: ZoneId }) {
  if (zone.startsWith("sector-")) {
    const n = Number(zone.split("-")[1]);
    const s = story[n - 1];
    const photo = storyPhotos[n];
    return (
      <div className="space-y-5">
        {photo && <Image src={photo.src} alt={photo.alt} width={800} height={500} className="h-44 w-full border-2 border-ink object-cover" sizes="420px" />}
        <div className="space-y-3">
          {s.body.map((p) => (
            <p key={p.slice(0, 20)} className="text-[15px] leading-relaxed">
              {p}
            </p>
          ))}
        </div>
        <div>
          <Head n="1">Roles</Head>
          {experience.map((r, i) => (SECTOR_ROLES[n](r) ? <Role key={i} i={i} /> : null))}
          {n === 3 && (
            <p className="border-b border-rule py-2.5 text-[13.5px]">
              <span className="font-semibold">{education[0].degree}</span>, {education[0].school} · <span className="font-mono text-[12px] text-graphite">{education[0].detail}</span>
            </p>
          )}
        </div>
        <p className="font-mono text-[12px] text-graphite">{n < 4 ? `Next: Sector ${n + 1} · ${SECTORS[n].name}` : "That's the story so far. The garages have the projects."}</p>
      </div>
    );
  }

  if (zone.startsWith("garage-")) {
    return <GarageSheet domain={zone.replace("garage-", "") as Domain} />;
  }

  switch (zone) {
    case "playbook":
      return (
        <div className="space-y-5">
          <p className="text-[15px] leading-relaxed">{playbookIntro}</p>
          <div>
            <Head n="1">Stints</Head>
            {playbook.map((t) => (
              <div key={t.title} className="grid grid-cols-[30px_1fr] gap-3 border-b border-rule py-3">
                <Compound c={t.compound} />
                <div>
                  <p className="font-semibold">{t.title}</p>
                  <p className="mt-0.5 text-[14px] leading-relaxed text-graphite">{t.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div>
            <Head n="2">Toolbox</Head>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {toolbox.flatMap((t) => t.items).map((x) => (
                <span key={x} className="x-chip">
                  {x}
                </span>
              ))}
            </div>
          </div>
        </div>
      );
    case "podium":
      return (
        <div className="space-y-5">
          <div>
            <Head n="1">Papers</Head>
            {publications.map((p, i) => (
              <div key={p.title} className="grid grid-cols-[34px_1fr] gap-2 border-b border-rule py-2.5">
                <span className="font-mono text-[12px] text-signal">P{pad(i + 1)}</span>
                <div>
                  <p className="text-[14px] font-medium leading-snug">{p.title}</p>
                  <p className="mt-0.5 font-mono text-[11.5px] text-graphite">
                    {p.venue} · {p.date}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div>
            <Head n="2">Patents</Head>
            {patents.map((p) => (
              <div key={p.id} className="border-b border-rule py-2.5">
                <p className="font-mono text-[11.5px] text-graphite">
                  {p.id} · {p.status}
                </p>
                <p className="mt-0.5 text-[14px] font-medium leading-snug">{p.title}</p>
              </div>
            ))}
          </div>
          <a href={profile.links.scholar} target="_blank" rel="noreferrer" className="x-link text-[14px] font-semibold">
            Google Scholar ↗
          </a>
        </div>
      );
    case "cricket":
    case "football": {
      const o = offTrack.find((x) => x.key === zone)!;
      const rest = offTrack.filter((x) => x.key !== zone);
      return (
        <div className="space-y-5">
          <p className="text-[15px] leading-relaxed">{o.body}</p>
          <p className="border-2 border-dashed border-ink px-4 py-3 font-mono text-[12.5px]">
            {zone === "cricket" ? "Hit the stumps. You know you want to." : "Push the ball into the goal."}
          </p>
          <div>
            <Head n="1">Also off the clock</Head>
            {rest.map((r) => (
              <p key={r.key} className="border-b border-rule py-2.5 text-[14px] leading-relaxed">
                <span className="font-semibold">{r.title}.</span> <span className="text-graphite">{r.body}</span>
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

/** One role as a row that opens (I05): dates in mono, the points with their figures picked out. */
function Role({ i }: { i: number }) {
  const [open, setOpen] = useState(false);
  const r = experience[i];
  return (
    <div className="border-b border-rule">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="x-row grid w-full grid-cols-[1fr_auto_14px] items-center gap-3 px-1 py-2.5 text-left">
        <span className="min-w-0">
          <span className="block truncate font-semibold">{r.title}</span>
          <span className="x-mute block truncate text-[13px] text-graphite">{r.company}</span>
        </span>
        <span className="x-mute font-mono text-[11.5px] text-graphite">{r.dates}</span>
        <span className="font-mono text-[13px]">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <ul className="space-y-1.5 px-1 pb-3 text-[13.5px] leading-relaxed">
          {r.points.map((p) => (
            <li key={p} className="grid grid-cols-[12px_1fr] gap-1.5">
              <span className="mt-[0.6em] h-[5px] w-[5px] bg-ink" />
              <span>
                <Figures text={p} className="font-semibold" />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Tyre compound as a code square: soft is the orange one. */
function Compound({ c }: { c: string }) {
  const soft = c === "soft";
  return <span className={`grid h-[30px] w-[30px] place-items-center border-2 border-ink font-mono text-[12px] font-semibold ${soft ? "border-signal bg-signal text-white" : c === "hard" ? "bg-white" : "bg-ink text-white"}`}>{c[0].toUpperCase()}</span>;
}

// Garage: the camera dollies in to one project at a time (world/Rig.tsx) and this is its
// datasheet card (components/brand/sheets.tsx). ← → or the card's footer move along the plinths.
function GarageSheet({ domain }: { domain: Domain }) {
  const list = projects.map((p, i) => [p, i] as const).filter(([p]) => p.domain === domain);
  const sel = Math.min(useWorld((s) => s.garageSel), list.length - 1);
  const go = (dir: -1 | 1) => setState({ garageSel: (sel + dir + list.length) % list.length });
  return (
    <div className="space-y-4">
      {domain === "hardware" && (
        <p className="text-[14px] leading-relaxed text-graphite">
          I started in electronics, writing Verilog and Embedded C before I ever trained a model. Chip verification eats most of a hardware team&apos;s time and looks a lot like the agent problems I solve at
          work, so I&apos;m building agents that write testbenches and small models that write RTL.
        </p>
      )}
      <DsCard
        key={list[sel][1]}
        index={list[sel][1]}
        motion
        onNav={list.length > 1 ? go : undefined}
        list={list.map(([, i]) => i)}
      />
    </div>
  );
}

/** A project in a list (the engineer's picks): code and figure, name, three points, stack. */
export function ProjectItem({ p }: { p: (typeof projects)[number] }) {
  return (
    <div className="border-2 border-ink">
      <div className="flex items-center justify-between gap-3 bg-ink px-3 py-1.5 font-mono text-[11.5px] text-white">
        <span>P{pad(projects.indexOf(p) + 1)}</span>
        <span className="truncate">
          <span className="text-signal">{p.headline.value}</span> {p.headline.label}
        </span>
      </div>
      <div className="p-3.5">
        <p className="text-[16px] font-semibold leading-tight">{p.name}</p>
        <p className="text-[13px] text-graphite">{p.tagline}</p>
        <ul className="mt-2.5 space-y-1 text-[13px] leading-relaxed">
          {p.points.slice(0, 3).map((x) => (
            <li key={x} className="grid grid-cols-[12px_1fr] gap-1.5">
              <span className="mt-[0.6em] h-[5px] w-[5px] bg-ink" />
              <span>
                <Figures text={x} className="font-semibold" />
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {p.stack.slice(0, 5).map((s) => (
            <span key={s} className="x-chip">
              {s}
            </span>
          ))}
          {p.links.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="x-link ml-1 text-[12.5px] font-semibold">
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
    <div className="space-y-5">
      <p className="text-[15px] leading-relaxed">
        Hiring for ML or AI engineering, want to swap notes on agents, or argue about last Sunday&apos;s race. My inbox is open.
      </p>
      <a href={`mailto:${profile.email}`} className="x-btn x-primary w-full justify-between normal-case tracking-normal">
        {profile.email} <span className="x-arrow">→</span>
      </a>
      <div>
        <Head n="1">Elsewhere</Head>
        {(
          [
            ["LinkedIn", profile.links.linkedin],
            ["GitHub", profile.links.github],
            ["Scholar", profile.links.scholar],
            ["Resume", profile.resume],
          ] as const
        ).map(([l, h]) => (
          <a key={l} href={h} target="_blank" rel="noreferrer" className="x-row grid grid-cols-[1fr_18px] items-center border-b border-rule px-1 py-2.5 text-[14.5px] font-medium">
            {l}
            <span className="x-arrow">↗</span>
          </a>
        ))}
      </div>
      <div>
        <Head n="2">Ask your own AI about me</Head>
        <p className="text-[13.5px] text-graphite">This site is an MCP server. Add it to Claude Code or Cursor:</p>
        <button onClick={() => copy("mcp", cmd)} className="mt-2 w-full truncate border-2 border-ink bg-paper px-3 py-2 text-left font-mono text-[11.5px] transition hover:bg-ink hover:text-white">
          {copied === "mcp" ? "Copied ✓" : `$ ${cmd}`}
        </button>
      </div>
    </div>
  );
}
