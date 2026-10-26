"use client";

// Three brand directions, each applied to the same real content (content/*): the mark,
// the palette and type, a resume excerpt on paper, and the in-world UI (a garage spec
// sheet and a toast). Pick one; it then replaces the HUD language and the resume.
import Link from "next/link";
import { useState } from "react";
import { profile, stats } from "@/content/profile";
import { experience } from "@/content/experience";
import { projects } from "@/content/projects";

type Dir = {
  id: string;
  name: string;
  idea: string;
  why: string;
  fonts: { display: string; body: string; mono: string; names: [string, string, string]; displayCase?: "upper" };
  paper: { bg: string; ink: string; soft: string; rule: string; accent: string; accent2: string };
  ui: { bg: string; panel: string; line: string; text: string; soft: string; accent: string; good: string };
  swatches: [string, string][];
  mark: (size: number) => React.ReactNode;
};

const DIRS: Dir[] = [
  {
    id: "paddock",
    name: "Paddock",
    idea: "A race engineer's notes: precise, calm, fast to read. The F1 world grown up.",
    why: "Ties the drivable world to your story (Team Stallions, the solar car, a pit wall of projects) without the cartoon. Condensed caps for headings read like a timing screen, but the body is plain Inter, so a recruiter skims it like any good resume. Red is used once per screen, not everywhere.",
    fonts: { display: "var(--b-barlow)", body: "var(--b-inter)", mono: "var(--b-plex)", names: ["Barlow Condensed", "Inter", "IBM Plex Mono"], displayCase: "upper" },
    paper: { bg: "#F6F4F0", ink: "#14161A", soft: "#5C626C", rule: "#E2DED6", accent: "#D7262E", accent2: "#14161A" },
    ui: { bg: "#0E1013", panel: "#171A20", line: "#2A2F38", text: "#F1EEE8", soft: "#9AA3B2", accent: "#E5202E", good: "#3DDC84" },
    swatches: [
      ["Carbon", "#0E1013"],
      ["Graphite", "#171A20"],
      ["Warm white", "#F1EEE8"],
      ["Steel", "#8B95A5"],
      ["Race red", "#E5202E"],
      ["Fastest", "#A66BFF"],
    ],
    mark: (s) => (
      <svg width={s * 1.6} height={s} viewBox="0 0 64 40" aria-hidden>
        <rect x="0" y="0" width="64" height="40" rx="3" fill="#E5202E" />
        <text x="7" y="29" fontFamily="var(--b-barlow)" fontWeight="700" fontSize="27" fontStyle="italic" fill="#F1EEE8">
          HG
        </text>
        <rect x="41" y="8" width="17" height="24" rx="2" fill="#F1EEE8" />
        <text x="49.5" y="26" textAnchor="middle" fontFamily="var(--b-barlow)" fontWeight="700" fontSize="15" fill="#0E1013">
          08
        </text>
      </svg>
    ),
  },
  {
    id: "signal",
    name: "Signal",
    idea: "The way you document a system you're proud of: clean, quiet, exact.",
    why: "The most recruiter-proof: it reads like the best engineering docs (Linear, Stripe). One electric blue for links and numbers, everything else ink on paper. It says \"senior engineer\" first and lets the drivable world be the surprise.",
    fonts: { display: "var(--b-inter-tight)", body: "var(--b-inter)", mono: "var(--b-jetbrains)", names: ["Inter Tight", "Inter", "JetBrains Mono"] },
    paper: { bg: "#F8F8F6", ink: "#12151B", soft: "#5A6270", rule: "#E4E4DF", accent: "#2B59FF", accent2: "#12151B" },
    ui: { bg: "#0D1117", panel: "#151B24", line: "#263042", text: "#E8ECF2", soft: "#8B96A8", accent: "#4D7CFF", good: "#3FD69B" },
    swatches: [
      ["Paper", "#F8F8F6"],
      ["Ink", "#12151B"],
      ["Slate", "#5A6270"],
      ["Rule", "#E4E4DF"],
      ["Signal blue", "#2B59FF"],
      ["Amber", "#F5A524"],
    ],
    mark: (s) => (
      <svg width={s} height={s} viewBox="0 0 40 40" aria-hidden>
        <rect x="0" y="0" width="40" height="40" rx="9" fill="#12151B" />
        <text x="8" y="27" fontFamily="var(--b-inter-tight)" fontWeight="700" fontSize="19" fill="#F8F8F6">
          hg
        </text>
        <circle cx="31" cy="11" r="3.5" fill="#2B59FF" />
      </svg>
    ),
  },
  {
    id: "origin",
    name: "Origin",
    idea: "Ahmedabad to Boston: warm, human, a story told well.",
    why: "The most personal: an editorial serif for headings, indigo (Gujarat's dye, Boston at night) and marigold. Reads like a well-set magazine profile, very easy on the eyes, and memorable. Less \"F1\", more \"you\"; the world would keep its racing look underneath.",
    fonts: { display: "var(--b-fraunces)", body: "var(--b-inter)", mono: "var(--b-plex)", names: ["Fraunces", "Inter", "IBM Plex Mono"] },
    paper: { bg: "#F5EFE4", ink: "#1A1A1A", soft: "#5E5A52", rule: "#E2D8C6", accent: "#1D2B4F", accent2: "#C4573A" },
    ui: { bg: "#121A2E", panel: "#1B2540", line: "#2C3A5E", text: "#F5EFE4", soft: "#A8B0C4", accent: "#E3A13A", good: "#8DA38A" },
    swatches: [
      ["Paper", "#F5EFE4"],
      ["Indigo", "#1D2B4F"],
      ["Marigold", "#E3A13A"],
      ["Terracotta", "#C4573A"],
      ["Sage", "#8DA38A"],
      ["Ink", "#1A1A1A"],
    ],
    mark: (s) => (
      <svg width={s * 2.4} height={s} viewBox="0 0 96 40" aria-hidden>
        <text x="0" y="30" fontFamily="var(--b-fraunces)" fontWeight="600" fontStyle="italic" fontSize="30" fill="#1D2B4F">
          Henil
        </text>
        <circle cx="86" cy="26" r="4.5" fill="#E3A13A" />
      </svg>
    ),
  },
];

const role = experience[0];
const project = projects.find((p) => p.slug === "rtl-coverage-agents") ?? projects[0];

export default function Brand() {
  const [pick, setPick] = useState(DIRS[0].id);
  const d = DIRS.find((x) => x.id === pick)!;
  return (
    <main className="min-h-screen bg-[#ECEAE5] pb-16 text-[#14161A]" style={{ fontFamily: "var(--b-inter)" }}>
      <header className="mx-auto max-w-[1180px] px-4 pb-6 pt-10 sm:px-8">
        <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#5C626C]">Brand directions · pick one</p>
        <h1 className="mt-2 text-[34px] font-semibold leading-tight tracking-tight sm:text-[44px]" style={{ fontFamily: "var(--b-inter-tight)" }}>
          Who the site should feel like
        </h1>
        <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-[#4A4F57]">
          Same content, three identities. Each one sets the colours, type and UI for the HUD, the garage spec sheets and the resume. The 3D world keeps its
          folio-2025 look in all three. Everything below is real copy from your content files.
        </p>
        <div className="mt-6 flex flex-wrap gap-2" role="tablist">
          {DIRS.map((x, i) => (
            <button
              key={x.id}
              role="tab"
              aria-selected={x.id === pick}
              onClick={() => setPick(x.id)}
              className={`rounded-full border px-4 py-2 text-[14px] font-medium transition ${x.id === pick ? "border-[#14161A] bg-[#14161A] text-white" : "border-[#C9C5BC] bg-white/60 hover:border-[#14161A]"}`}
            >
              {i + 1}. {x.name}
              {i === 0 && <span className="ml-2 rounded-full bg-[#E5202E] px-2 py-0.5 text-[11px] text-white">my pick</span>}
            </button>
          ))}
        </div>
      </header>

      <section className="mx-auto grid max-w-[1180px] gap-5 px-4 sm:px-8 lg:grid-cols-[360px_1fr]">
        {/* identity card */}
        <aside className="space-y-5 rounded-2xl bg-white p-6 shadow-[0_1px_0_#0000000d,0_12px_40px_-24px_#00000040]">
          <div className="flex items-center justify-between">
            {d.mark(40)}
            <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#5C626C]">{d.name}</span>
          </div>
          <p className="text-[19px] font-semibold leading-snug" style={{ fontFamily: d.fonts.display, textTransform: d.fonts.displayCase === "upper" ? "uppercase" : undefined, letterSpacing: d.fonts.displayCase ? "0.02em" : undefined }}>
            {d.idea}
          </p>
          <p className="text-[14px] leading-relaxed text-[#4A4F57]">{d.why}</p>
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#5C626C]">Palette</p>
            <div className="grid grid-cols-3 gap-2">
              {d.swatches.map(([n, c]) => (
                <div key={n}>
                  <div className="h-12 rounded-lg ring-1 ring-black/5" style={{ background: c }} />
                  <p className="mt-1 text-[12px] font-medium">{n}</p>
                  <p className="text-[11px] text-[#7A7F87]" style={{ fontFamily: d.fonts.mono }}>
                    {c}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#5C626C]">Type</p>
            <div className="space-y-2 rounded-xl bg-[#F4F2EE] p-4">
              <p className="text-[28px] font-semibold leading-none" style={{ fontFamily: d.fonts.display, textTransform: d.fonts.displayCase === "upper" ? "uppercase" : undefined }}>
                {d.fonts.names[0]}
              </p>
              <p className="text-[15px]" style={{ fontFamily: d.fonts.body }}>
                {d.fonts.names[1]} for every sentence, at a size you can read.
              </p>
              <p className="text-[12.5px] text-[#5C626C]" style={{ fontFamily: d.fonts.mono }}>
                {d.fonts.names[2]} · 10/10 · p99 &lt;1s
              </p>
            </div>
          </div>
        </aside>

        <div className="space-y-5">
          <ResumeSample d={d} />
          <UISample d={d} />
        </div>
      </section>

      <footer className="mx-auto mt-10 max-w-[1180px] px-4 text-[14px] text-[#4A4F57] sm:px-8">
        Reply with 1, 2 or 3 (or a mix: &quot;Paddock, but Origin&apos;s serif on the resume&quot;). Then the HUD, the garage sheets, the map, the boot and the resume move
        over to it, and docs/DESIGN.md is rewritten. <Link href="/docs/design" className="underline">Current design language</Link>
      </footer>
    </main>
  );
}

function Display({ d, className = "", children }: { d: Dir; className?: string; children: React.ReactNode }) {
  return (
    <span className={className} style={{ fontFamily: d.fonts.display, textTransform: d.fonts.displayCase === "upper" ? "uppercase" : undefined, letterSpacing: d.fonts.displayCase ? "0.01em" : "-0.01em" }}>
      {children}
    </span>
  );
}

// A slice of the resume on paper: what a recruiter sees first.
function ResumeSample({ d }: { d: Dir }) {
  const p = d.paper;
  return (
    <div className="overflow-hidden rounded-2xl shadow-[0_1px_0_#0000000d,0_12px_40px_-24px_#00000040]" style={{ background: p.bg, color: p.ink, fontFamily: d.fonts.body }}>
      <div className="flex items-center justify-between px-7 pt-6 text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: p.soft }}>
        <span>Resume</span>
        <span className="normal-case">{d.mark(22)}</span>
      </div>
      <div className="px-7 pb-7 pt-4">
        <Display d={d} className="block text-[44px] font-semibold leading-[0.95] sm:text-[56px]">
          {profile.name}
        </Display>
        <p className="mt-3 text-[16px]" style={{ color: p.soft }}>
          {profile.role} at{" "}
          <span className="font-semibold" style={{ color: p.ink }}>
            {profile.company}
          </span>{" "}
          · {profile.location}
        </p>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed">{profile.oneLiner}</p>
        <div className="mt-5 grid grid-cols-2 border-y sm:grid-cols-5" style={{ borderColor: p.rule }}>
          {stats.map((s) => (
            <div key={s.label} className="border-r px-3 py-3 last:border-r-0" style={{ borderColor: p.rule }}>
              <Display d={d} className="block text-[26px] font-semibold leading-none" >
                <span style={{ color: p.accent }}>{s.value}</span>
              </Display>
              <p className="mt-1 text-[12px] leading-snug" style={{ color: p.soft }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <p className="mb-3 flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.14em]">
            Experience <span className="h-px flex-1" style={{ background: p.rule }} />
          </p>
          <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:gap-6">
            <p className="text-[12.5px]" style={{ color: p.soft, fontFamily: d.fonts.mono }}>
              {role.dates}
            </p>
            <div>
              <p className="text-[16px] font-semibold">
                {role.title} <span className="font-normal" style={{ color: p.soft }}>· {role.company}</span>
              </p>
              <ul className="mt-2 space-y-1.5 text-[14.5px] leading-relaxed">
                {role.points.slice(0, 3).map((x) => (
                  <li key={x} className="relative pl-4">
                    <span className="absolute left-0 top-[0.62em] h-1.5 w-1.5 rounded-full" style={{ background: p.accent }} />
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// The in-world UI: a garage spec sheet over the world, and a toast.
function UISample({ d }: { d: Dir }) {
  const u = d.ui;
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 sm:p-7" style={{ background: `linear-gradient(135deg, #a5a33e55, #eeaa6833), ${u.bg}` }}>
      <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: u.soft }}>
        In the world · garage spec sheet and a toast
      </p>
      <div className="grid gap-4 sm:grid-cols-[1fr_300px]">
        <div className="rounded-xl p-5" style={{ background: u.panel, color: u.text, fontFamily: d.fonts.body, boxShadow: `inset 0 0 0 1px ${u.line}` }}>
          <p className="text-[12px] font-medium" style={{ color: u.soft }}>
            Pit garage · AI for hardware
          </p>
          <Display d={d} className="mt-1 block text-[26px] font-semibold leading-tight">
            {project.name}
          </Display>
          <div className="mt-3 flex items-start justify-between gap-4">
            <p className="text-[14px] leading-relaxed" style={{ color: u.soft }}>
              {project.tagline}
            </p>
            <div className="shrink-0 border-l-2 pl-3" style={{ borderColor: u.accent }}>
              <p className="text-[24px] font-semibold leading-none">{project.headline.value}</p>
              <p className="mt-1 text-[12px]" style={{ color: u.soft }}>
                {project.headline.label}
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-1.5 text-[13.5px] leading-relaxed">
            {project.points.slice(0, 3).map((x) => (
              <li key={x} className="relative pl-4">
                <span className="absolute left-0 top-[0.62em] h-1.5 w-1.5 rounded-full" style={{ background: u.accent }} />
                {x}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.stack.slice(0, 5).map((x) => (
              <span key={x} className="rounded-md px-2 py-0.5 text-[12px]" style={{ background: `${u.line}`, fontFamily: d.fonts.mono }}>
                {x}
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl px-4 py-3" style={{ background: u.panel, color: u.text, boxShadow: `inset 0 0 0 1px ${u.line}` }}>
            <p className="text-[12px]" style={{ color: u.soft }}>
              Achievement · 3 of 12
            </p>
            <p className="mt-0.5 text-[15px] font-semibold" style={{ fontFamily: d.fonts.body }}>
              Back of the net
            </p>
            <div className="mt-2 h-[3px] w-2/3 rounded-full" style={{ background: u.good }} />
          </div>
          <div className="flex gap-2">
            {["Map", "Controls", "Settings"].map((x) => (
              <span key={x} className="rounded-lg px-3 py-2 text-[13px] font-medium" style={{ background: u.panel, color: u.text, boxShadow: `inset 0 0 0 1px ${u.line}` }}>
                {x}
              </span>
            ))}
          </div>
          <span className="inline-block rounded-lg px-4 py-2 text-[13px] font-semibold" style={{ background: u.accent, color: d.id === "origin" ? "#121A2E" : "#fff" }}>
            Open garage · E
          </span>
        </div>
      </div>
    </div>
  );
}
