import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { profile, stats } from "@/content/profile";
import { experience, education } from "@/content/experience";
import { DOMAINS, projects } from "@/content/projects";
import { patents, publications, toolbox } from "@/content/research";
import Tailored from "./Tailored";
import PrintButton from "./PrintButton";

export const metadata: Metadata = {
  title: "Resume · Henil Gajjar",
  description: "The one-page version. No car required.",
};

// The one-page resume in the HUD's pit wall language (docs/DESIGN.md): ink panels, cream
// hairlines, red as the one accent, Racero for the name and big numbers, Geist for the
// words, Geist Mono for labels. Printing drops to plain ink on white (globals.css .resume).
export default function Resume() {
  return (
    <main className="resume min-h-screen bg-[#11121c] px-3 pb-14 pt-5 text-cream sm:px-6 sm:pt-8">
      <nav className="mx-auto mb-5 flex max-w-[980px] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/" className="group flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-cream/60 transition hover:text-cream">
          <span className="transition group-hover:-translate-x-1">←</span> Back to the island
        </Link>
        <div className="flex items-center gap-2">
          <PrintButton />
          <a href={profile.resume} target="_blank" rel="noreferrer" className="r-btn">
            PDF ↗
          </a>
          <a href={`mailto:${profile.email}`} className="r-btn r-btn-red">
            Email me
          </a>
        </div>
      </nav>

      <article className="mx-auto max-w-[980px] space-y-4">
        {/* ------------------------------------------------ header */}
        <header className="hud-panel r-rise grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:p-9">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cream/55">
              <span className="text-red">●</span> {profile.coords}
            </p>
            <h1 className="mt-3 font-racing text-[44px] uppercase leading-[0.95] tracking-wide sm:text-[68px]">{profile.name}</h1>
            <p className="mt-3 text-[17px] text-cream/80">
              {profile.role} at <span className="font-semibold text-cream">{profile.company}</span> · {profile.location}
            </p>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-cream/70">{profile.oneLiner}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {(
                [
                  [profile.email, `mailto:${profile.email}`],
                  ["LinkedIn", profile.links.linkedin],
                  ["GitHub", profile.links.github],
                  ["Scholar", profile.links.scholar],
                  ["Hugging Face", profile.links.huggingface],
                ] as const
              ).map(([label, href]) => (
                <a key={label} href={href} target={href.startsWith("mailto") ? undefined : "_blank"} rel="noreferrer" className="r-link">
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div className="relative hidden h-40 w-40 shrink-0 self-start overflow-hidden bg-[radial-gradient(ellipse_at_top_right,#ff4b3e,#a3241c)] sm:block print:hidden">
            <span className="pointer-events-none absolute inset-[3px] z-10 border border-cream/35" />
            <Image src="/img/henil-3d.png" alt="Henil as a little racing driver" width={320} height={320} className="absolute inset-x-0 -bottom-2 h-[118%] w-full object-cover object-top" priority />
          </div>
        </header>

        {/* ------------------------------------------------ stats: a timing strip */}
        <div className="r-rise grid grid-cols-2 gap-px bg-cream/10 sm:grid-cols-5 [animation-delay:60ms]">
          {stats.map((s, i) => (
            <div key={s.label} className="r-stat group relative bg-[#1f2133] px-4 py-4 last:col-span-2 sm:last:col-span-1">
              <span className="absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-red transition-transform duration-300 group-hover:scale-x-100" />
              <p className="font-mono text-[10px] text-red">{String(i + 1).padStart(2, "0")}</p>
              <p className="mt-1 font-racing text-[30px] leading-none">{s.value}</p>
              <p className="mt-2 font-mono text-[10.5px] uppercase leading-tight tracking-[0.1em] text-cream/55">{s.label}</p>
            </div>
          ))}
        </div>

        <Tailored />

        {/* ------------------------------------------------ experience */}
        <Block n="01" title="Experience">
          <ol className="space-y-1">
            {experience.map((r, i) => (
              <li key={r.company + r.title} className="r-row group relative grid gap-2 px-4 py-4 sm:grid-cols-[150px_1fr] sm:gap-6 sm:px-5">
                <span className={`absolute left-0 top-0 h-full w-[2px] transition-all duration-300 ${i === 0 ? "bg-red" : "bg-cream/10 group-hover:bg-red"}`} />
                <p className="font-mono text-[11.5px] uppercase leading-6 tracking-[0.06em] text-cream/55 tabular-nums">{r.dates}</p>
                <div>
                  <h3 className="text-[16px] font-semibold leading-6">
                    {r.title} <span className="font-normal text-cream/55">· {r.company}</span>
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-[14.5px] leading-relaxed text-cream/75">
                    {r.points.map((p) => (
                      <li key={p} className="relative pl-4 before:absolute before:left-0 before:top-[0.62em] before:h-1.5 before:w-1.5 before:rotate-45 before:bg-red/80">
                        {p}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {r.tags.map((t) => (
                      <span key={t} className="hud-chip r-chip">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Block>

        {/* ------------------------------------------------ education */}
        <Block n="02" title="Education">
          <div className="grid gap-3 sm:grid-cols-2">
            {education.map((e) => (
              <div key={e.degree} className="r-card group p-4">
                <p className="font-semibold">{e.degree}</p>
                <p className="mt-1 text-[14px] text-cream/65">
                  {e.school} · {e.detail}
                </p>
              </div>
            ))}
          </div>
        </Block>

        {/* ------------------------------------------------ projects */}
        <Block n="03" title="Projects">
          <div className="space-y-7">
            {DOMAINS.map((d) => {
              const list = projects.filter((p) => p.domain === d.id);
              if (!list.length) return null;
              return (
                <div key={d.id}>
                  <h3 className="mb-3 flex items-baseline gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-cream/55">
                    <span className="text-cream">{d.label}</span> · {list.length}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {list.map((p) => (
                      <div key={p.slug} className="r-card group flex flex-col p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold leading-snug transition group-hover:text-white">{p.name}</p>
                            <p className="mt-0.5 text-[13.5px] text-cream/65">{p.tagline}</p>
                          </div>
                          <p className="shrink-0 text-right">
                            <span className="block font-racing text-[22px] leading-none text-red">{p.headline.value}</span>
                            <span className="mt-1 block max-w-[120px] font-mono text-[9.5px] uppercase leading-tight tracking-[0.08em] text-cream/50">{p.headline.label}</span>
                          </p>
                        </div>
                        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                          {p.stack.slice(0, 4).map((x) => (
                            <span key={x} className="hud-chip r-chip">
                              {x}
                            </span>
                          ))}
                          {p.links.map((l) => (
                            <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="ml-1 text-[12px] font-semibold text-red underline-offset-4 hover:underline print:hidden">
                              {l.label} ↗
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Block>

        {/* ------------------------------------------------ research */}
        <Block n="04" title="Publications and patents">
          <ul className="divide-y divide-cream/10">
            {publications.map((p) => (
              <li key={p.title} className="r-row flex flex-col gap-1.5 px-3 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <span className="text-[14.5px] leading-snug">{p.title}</span>
                <span className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-cream/55">
                  <span className="bg-purple/20 px-2 py-0.5 uppercase tracking-[0.08em] text-[#c9b2ff]">{p.venue}</span>
                  {p.date}
                </span>
              </li>
            ))}
            {patents.map((p) => (
              <li key={p.id} className="r-row flex flex-col gap-1.5 px-3 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <span className="text-[14.5px] leading-snug">{p.title}</span>
                <span className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-cream/55">
                  <span className="bg-yellow/15 px-2 py-0.5 uppercase tracking-[0.08em] text-yellow">Patent</span>
                  {p.id} · {p.status}
                </span>
              </li>
            ))}
          </ul>
        </Block>

        {/* ------------------------------------------------ skills */}
        <Block n="05" title="Skills">
          <div className="space-y-3">
            {toolbox.map((t) => (
              <div key={t.group} className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                <span className="w-[150px] shrink-0 pt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-cream/60">{t.group}</span>
                <div className="flex flex-wrap gap-1.5">
                  {t.items.map((x) => (
                    <span key={x} className="r-skill">
                      {x}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Block>

        <footer className="flex flex-wrap items-center justify-between gap-3 px-1 pt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-cream/50 print:hidden">
          <span>{profile.coords}</span>
          <Link href="/" className="group text-red transition hover:text-cream">
            Want the fun version? Take the car for a spin <span className="inline-block transition group-hover:translate-x-1">→</span>
          </Link>
        </footer>
      </article>
    </main>
  );
}

function Block({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="hud-panel r-rise break-inside-avoid-page p-5 sm:p-7">
      <h2 className="mb-5 flex items-center gap-3">
        <span className="font-mono text-[11px] text-red">{n}</span>
        <span className="font-racing text-[22px] uppercase tracking-wide">{title}</span>
        <span className="h-px flex-1 bg-cream/15" />
      </h2>
      {children}
    </section>
  );
}
