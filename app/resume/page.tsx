import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { profile, stats } from "@/content/profile";
import { experience, education } from "@/content/experience";
import { DOMAINS, projects } from "@/content/projects";
import { patents, publications, toolbox } from "@/content/research";
import Tailored from "./Tailored";

export const metadata: Metadata = {
  title: "Resume · Henil Gajjar",
  description: "The one-page version. No car required.",
};

export default function Resume() {
  return (
    <main className="min-h-screen bg-cream px-3 py-6 text-ink sm:px-6 sm:py-12 print:bg-white print:p-0">
      <nav className="mx-auto mb-5 flex max-w-[860px] items-center justify-between text-sm print:hidden">
        <Link href="/" className="rounded-full px-3 py-1.5 text-ink-soft transition hover:bg-white hover:text-ink">
          ← Back to the island
        </Link>
        <div className="flex items-center gap-2">
          <a
            href={profile.resume}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-line bg-white px-4 py-1.5 font-medium transition hover:border-ink/30"
          >
            PDF
          </a>
          <a
            href={`mailto:${profile.email}`}
            className="rounded-full bg-ink px-4 py-1.5 font-medium text-white transition hover:bg-red"
          >
            Email me
          </a>
        </div>
      </nav>

      <article className="mx-auto max-w-[860px] rounded-[28px] border border-line bg-paper px-6 py-9 shadow-[0_30px_80px_-40px_rgba(31,33,51,0.25)] sm:px-12 sm:py-12 print:rounded-none print:border-0 print:shadow-none">
        <header className="flex flex-col-reverse gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-[40px] font-semibold leading-none tracking-tight sm:text-5xl">
              {profile.name}
            </h1>
            <p className="mt-3 text-lg text-ink-soft">
              {profile.role} at <span className="font-medium text-ink">{profile.company}</span> · {profile.location}
            </p>
            <p className="mt-4 max-w-xl leading-relaxed text-ink-soft">{profile.oneLiner}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-[13px]">
              {(
                [
                  [profile.email, `mailto:${profile.email}`],
                  ["LinkedIn", profile.links.linkedin],
                  ["GitHub", profile.links.github],
                  ["Scholar", profile.links.scholar],
                  ["Hugging Face", profile.links.huggingface],
                ] as const
              ).map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="rounded-full bg-cream px-3 py-1 text-ink transition hover:bg-line print:bg-transparent print:px-0 print:pr-3"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-3xl bg-gradient-to-b from-[#f6b2ac] to-[#ee7d76] sm:h-32 sm:w-32 print:hidden">
            <Image
              src="/img/henil-3d.png"
              alt="Henil as a little racing driver"
              width={320}
              height={320}
              className="absolute inset-x-0 -bottom-2 h-[118%] w-full object-cover object-top"
              priority
            />
          </div>
        </header>

        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="bg-paper px-4 py-3 last:col-span-2 sm:last:col-span-1">
              <p className="font-display text-2xl font-semibold leading-none">{s.value}</p>
              <p className="mt-1.5 text-[12px] leading-tight text-ink-soft">{s.label}</p>
            </div>
          ))}
        </div>

        <Tailored />

        <Block title="Experience">
          <ol className="relative space-y-7 border-l border-line pl-6 sm:border-0 sm:pl-0">
            {experience.map((r, i) => (
              <li key={r.company + r.title} className="relative break-inside-avoid sm:grid sm:grid-cols-[140px_1fr] sm:gap-6">
                <span
                  className={`absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-paper sm:hidden ${
                    i === 0 ? "bg-red" : "bg-ink/25"
                  }`}
                />
                <p className="font-mono text-[12px] leading-6 text-ink-soft tabular-nums">{r.dates}</p>
                <div>
                  <h3 className="font-semibold leading-6">
                    {r.title} <span className="font-normal text-ink-soft">· {r.company}</span>
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-[14.5px] leading-relaxed text-ink-soft">
                    {r.points.map((p) => (
                      <li key={p} className="relative pl-4 before:absolute before:left-0 before:top-[0.7em] before:h-1 before:w-1 before:rounded-full before:bg-red/70">
                        {p}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 font-mono text-[11px] text-ink-soft/70">{r.tags.join(" · ")}</p>
                </div>
              </li>
            ))}
          </ol>
        </Block>

        <Block title="Education">
          <div className="grid gap-3 sm:grid-cols-2">
            {education.map((e) => (
              <div key={e.school} className="rounded-2xl bg-cream px-4 py-3 print:bg-transparent print:px-0">
                <p className="font-semibold">{e.degree}</p>
                <p className="text-[14px] text-ink-soft">
                  {e.school} · {e.detail}
                </p>
              </div>
            ))}
          </div>
        </Block>

        <Block title="Projects">
          <div className="space-y-7">
            {DOMAINS.map((d) => {
              const list = projects.filter((p) => p.domain === d.id);
              if (!list.length) return null;
              return (
                <div key={d.id}>
                  <h3 className="mb-3 text-[13px] font-semibold text-ink">
                    {d.label} <span className="font-normal text-ink-soft">· {list.length}</span>
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {list.map((p) => (
                      <div
                        key={p.slug}
                        className="break-inside-avoid rounded-2xl border border-line px-4 py-3.5 transition hover:border-ink/20 hover:bg-cream/50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold leading-snug">{p.name}</p>
                            <p className="text-[13.5px] text-ink-soft">{p.tagline}</p>
                          </div>
                          <p className="shrink-0 text-right">
                            <span className="block font-display text-[16px] font-semibold leading-none text-red">{p.headline.value}</span>
                            <span className="mt-1 block max-w-[110px] text-[10.5px] leading-tight text-ink-soft">{p.headline.label}</span>
                          </p>
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-mono text-[11px] text-ink-soft/80">{p.stack.slice(0, 4).join(" · ")}</span>
                          {p.links.map((l) => (
                            <a key={l.href} href={l.href} className="text-[12px] font-medium text-red hover:underline print:hidden">
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

        <Block title="Publications and patents">
          <ul className="divide-y divide-line">
            {publications.map((p) => (
              <li key={p.title} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <span className="text-[14.5px] leading-snug">{p.title}</span>
                <span className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-ink-soft">
                  <span className="rounded-full bg-purple/10 px-2 py-0.5 text-[#6a45c9]">{p.venue}</span>
                  {p.date}
                </span>
              </li>
            ))}
            {patents.map((p) => (
              <li key={p.id} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <span className="text-[14.5px] leading-snug">{p.title}</span>
                <span className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-ink-soft">
                  <span className="rounded-full bg-yellow/25 px-2 py-0.5 text-[#8a6a00]">Patent</span>
                  {p.id} · {p.status}
                </span>
              </li>
            ))}
          </ul>
        </Block>

        <Block title="Skills">
          <div className="space-y-2.5">
            {toolbox.map((t) => (
              <div key={t.group} className="flex flex-col gap-1.5 sm:flex-row sm:gap-6">
                <span className="w-[140px] shrink-0 pt-0.5 text-[13px] font-medium text-ink">{t.group}</span>
                <div className="flex flex-wrap gap-1.5">
                  {t.items.map((x) => (
                    <span key={x} className="rounded-md bg-cream px-2 py-0.5 text-[13px] text-ink-soft print:bg-transparent print:px-0 print:pr-2">
                      {x}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Block>

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-[13px] text-ink-soft print:hidden">
          <span>{profile.coords}</span>
          <Link href="/" className="font-medium text-red hover:underline">
            Want the fun version? Take the car for a spin →
          </Link>
        </footer>
      </article>
    </main>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-11">
      <h2 className="mb-5 flex items-center gap-3 font-display text-[13px] font-semibold uppercase tracking-[0.18em] text-ink">
        <span className="h-3.5 w-1 rounded-full bg-red" />
        {title}
        <span className="h-px flex-1 bg-line" />
      </h2>
      {children}
    </section>
  );
}
