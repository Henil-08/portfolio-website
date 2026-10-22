"use client";

import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import type { ZoneId } from "@/components/world/layout";
import { profile, story, offTrack } from "@/content/profile";
import { experience, education } from "@/content/experience";
import { projects } from "@/content/projects";
import { patents, publications, toolbox } from "@/content/research";
import { playbook, playbookIntro } from "@/content/playbook";

export const zoneMeta: Record<ZoneId, { kicker: string; title: string; color: string }> = {
  "story-1": { kicker: "Lap 1 · 2021", title: story[0].title, color: "#ff4b3e" },
  "story-2": { kicker: "Lap 2 · 2022 to 2023", title: story[1].title, color: "#ff8c42" },
  "story-3": { kicker: "Lap 3 · 2023 to 2025", title: story[2].title, color: "#3d8bff" },
  "story-4": { kicker: "Lap 4 · now", title: story[3].title, color: "#45c46b" },
  work: { kicker: "Pit wall", title: "Where I've worked", color: "#1f2133" },
  garage: { kicker: "Garage", title: "Things I've built", color: "#ff4b3e" },
  sidequest: { kicker: "Side quest", title: "Teaching AI to design chips", color: "#2ec4b6" },
  playbook: { kicker: "Tyre wall", title: "How I work with AI", color: "#ffd23f" },
  podium: { kicker: "Podium", title: "Papers and patents", color: "#9b6bff" },
  cricket: { kicker: "Off the clock", title: "Cricket", color: "#45c46b" },
  football: { kicker: "Off the clock", title: "Football", color: "#3d8bff" },
  contact: { kicker: "Mailbox", title: "Say hi", color: "#ff4b3e" },
};

const storyPhotos: Partial<Record<number, { src: string; alt: string }>> = {
  1: { src: "/img/mercury.jpg", alt: "Mercury, the Team Stallions solar car" },
  3: { src: "/img/henil-boston.jpg", alt: "Henil in Boston" },
};

export function PanelBody({ zone }: { zone: ZoneId }) {
  if (zone.startsWith("story-")) {
    const n = Number(zone.split("-")[1]);
    const s = story[n - 1];
    const photo = storyPhotos[n];
    return (
      <div className="space-y-4">
        {photo && (
          <Image
            src={photo.src}
            alt={photo.alt}
            width={800}
            height={500}
            className="h-44 w-full rounded-2xl object-cover"
            sizes="420px"
          />
        )}
        {s.body.map((p) => (
          <p key={p.slice(0, 20)} className="text-[15px] leading-relaxed text-ink-soft">
            {p}
          </p>
        ))}
        <p className="pt-1 text-sm text-ink-soft/70">
          {n < 4 ? "Keep driving, the next board is down the track." : "That's the story so far. Go find the garage."}
        </p>
      </div>
    );
  }

  switch (zone) {
    case "work":
      return <Work />;
    case "garage":
      return <ProjectList side={false} />;
    case "sidequest":
      return (
        <div className="space-y-4">
          <p className="text-[15px] leading-relaxed text-ink-soft">
            I started in electronics, writing Verilog and Embedded C before I ever trained a model. Chip verification
            eats most of a hardware team&apos;s time and looks a lot like the agent problems I solve at work. So on
            nights and weekends I build agents that write testbenches and small models that write RTL.
          </p>
          <ProjectList side />
        </div>
      );
    case "playbook":
      return (
        <div className="space-y-4">
          <p className="text-[15px] leading-relaxed text-ink-soft">{playbookIntro}</p>
          {playbook.map((t) => (
            <div key={t.title} className="flex gap-3">
              <Compound c={t.compound} />
              <div>
                <p className="font-display font-semibold text-ink">{t.title}</p>
                <p className="mt-0.5 text-[14px] leading-relaxed text-ink-soft">{t.body}</p>
              </div>
            </div>
          ))}
        </div>
      );
    case "podium":
      return (
        <div className="space-y-3">
          {publications.map((p, i) => (
            <div key={p.title} className="flex gap-3 rounded-2xl bg-cream px-4 py-3">
              <span className="font-display text-lg font-bold text-purple">P{i + 1}</span>
              <div>
                <p className="text-[14px] font-medium leading-snug text-ink">{p.title}</p>
                <p className="mt-0.5 font-mono text-[11px] text-ink-soft">
                  {p.venue} · {p.date}
                </p>
              </div>
            </div>
          ))}
          {patents.map((p) => (
            <div key={p.id} className="rounded-2xl border-2 border-yellow/70 px-4 py-3">
              <p className="font-mono text-[11px] uppercase tracking-wider text-[#b38900]">
                Patent · {p.status}
              </p>
              <p className="mt-1 text-[14px] font-medium leading-snug text-ink">{p.title}</p>
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
          <p className="text-[15px] leading-relaxed text-ink-soft">{o.body}</p>
          <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-ink-soft">
            {zone === "cricket" ? "Hit the stumps. You know you want to." : "Push the ball into the goal."}
          </p>
          <div className="space-y-2 pt-2">
            {rest.map((r) => (
              <p key={r.key} className="text-[14px] leading-relaxed text-ink-soft">
                <span className="font-semibold text-ink">{r.title}.</span> {r.body}
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

function Compound({ c }: { c: string }) {
  const color = { soft: "#ff4b3e", medium: "#ffd23f", hard: "#d9dbe3", inter: "#45c46b" }[c] ?? "#ccc";
  return (
    <span
      className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink font-display text-xs font-bold text-white"
      style={{ boxShadow: `inset 0 0 0 4px ${color}` }}
    >
      {c[0].toUpperCase()}
    </span>
  );
}

function Work() {
  const [open, setOpen] = useState(0);
  return (
    <div className="space-y-2">
      {experience.map((r, i) => (
        <div key={r.company + r.title} className="overflow-hidden rounded-2xl bg-cream">
          <button onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
            <span className="w-5 font-display text-lg font-bold text-ink/40">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-ink">{r.company}</span>
              <span className="block truncate text-[13px] text-ink-soft">{r.title}</span>
            </span>
            <span className="shrink-0 font-mono text-[11px] text-ink-soft">{r.dates.split(" – ")[0]}</span>
          </button>
          {open === i && (
            <ul className="space-y-1.5 px-4 pb-4 pl-12 text-[13.5px] leading-relaxed text-ink-soft">
              {r.points.map((p) => (
                <li key={p} className="list-disc">
                  {p}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
      <div className="pt-2 text-[13px] text-ink-soft">
        {education.map((e) => (
          <p key={e.school}>
            <span className="font-semibold text-ink">{e.degree}</span>, {e.school}. {e.detail}
          </p>
        ))}
      </div>
    </div>
  );
}

function ProjectList({ side }: { side: boolean }) {
  const list = projects.filter((p) => (p.domain === "hardware") === side);
  return (
    <div className="space-y-3">
      {list.map((p) => (
        <div key={p.slug} className="rounded-2xl bg-cream p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg font-semibold leading-tight text-ink">{p.name}</p>
              <p className="text-[13px] text-ink-soft">{p.tagline}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-xl font-bold leading-none text-red">{p.headline.value}</p>
              <p className="mt-1 max-w-[110px] text-[10px] leading-tight text-ink-soft">{p.headline.label}</p>
            </div>
          </div>
          <ul className="mt-2.5 space-y-1 text-[13px] leading-relaxed text-ink-soft">
            {p.points.slice(0, side ? 5 : 2).map((x) => (
              <li key={x}>· {x}</li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {p.stack.slice(0, 5).map((s) => (
              <span key={s} className="rounded-full bg-white px-2 py-0.5 font-mono text-[10.5px] text-ink-soft">
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
      ))}
      {!side && (
        <div className="pt-2">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-ink-soft">Toolbox</p>
          <div className="flex flex-wrap gap-1.5">
            {toolbox.flatMap((t) => t.items).map((x) => (
              <span key={x} className="rounded-full border border-line px-2 py-0.5 text-[12px] text-ink-soft">
                {x}
              </span>
            ))}
          </div>
        </div>
      )}
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
      <p className="text-[15px] leading-relaxed text-ink-soft">
        Hiring for ML or AI engineering, want to swap notes on agents, or argue about last Sunday&apos;s race. My inbox
        is open.
      </p>
      <a
        href={`mailto:${profile.email}`}
        className="toy-btn block rounded-2xl bg-red px-4 py-3 text-center font-display font-semibold text-white"
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
          <a key={l} href={h} target="_blank" rel="noreferrer" className="rounded-xl bg-cream px-3 py-2 font-medium text-ink hover:bg-line">
            {l} ↗
          </a>
        ))}
      </div>
      <div className="rounded-2xl bg-ink p-4 text-white">
        <p className="font-display font-semibold">Ask your own AI about me</p>
        <p className="mt-1 text-[13px] text-white/60">This site is an MCP server. Add it to Claude Code or Cursor:</p>
        <button
          onClick={() => copy("mcp", cmd)}
          className="mt-3 w-full truncate rounded-lg bg-white/10 px-3 py-2 text-left font-mono text-[11px] text-white/90"
        >
          {copied === "mcp" ? "copied ✓" : `$ ${cmd}`}
        </button>
      </div>
    </div>
  );
}
