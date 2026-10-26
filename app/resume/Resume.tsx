"use client";

// The whole resume in the datasheet style of DsResume (components/brand/sheets.tsx): one white
// sheet, numbered heads, dates and codes in mono down a left column. The header builds once on
// load; every row below is its own Stage, so it builds the first time it scrolls into view.
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { profile, stats } from "@/content/profile";
import { experience, education } from "@/content/experience";
import { DOMAINS, projects } from "@/content/projects";
import { patents, publications, toolbox } from "@/content/research";
import { Count, Decode, Stage, d } from "@/components/brand/motion";
import { Figures, LINKS, pad } from "@/components/brand/tokens";
import { Lockup } from "@/components/brand/mark";
import Tailored from "./Tailored";
import PrintButton from "./PrintButton";

const CONTACTS = [...LINKS, ["Hugging Face", "henil08", profile.links.huggingface]] as const;

// One grid for every row, so dates, codes and labels line up down the whole sheet.
const ROW = "relative grid gap-x-6 gap-y-1 py-4 sm:grid-cols-[160px_1fr] break-inside-avoid";

export default function Resume() {
  return (
    <main className="resume min-h-screen bg-paper pb-16 text-ink">
      <nav className="z-30 border-b-2 border-ink bg-paper sm:sticky sm:top-0 print:hidden">
        <div className="mx-auto flex max-w-[980px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <Link href="/" className="group flex items-center gap-4">
            <Lockup size={17} name={profile.name} motion />
            <span className="font-mono text-[13px] text-graphite transition-colors group-hover:text-ink">
              <span className="inline-block transition-transform group-hover:-translate-x-1">←</span> Back to the island
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <PrintButton />
            <a href={profile.resume} target="_blank" rel="noreferrer" className="x-btn x-secondary font-mono">
              PDF <span className="x-arrow">↗</span>
            </a>
            <a href={`mailto:${profile.email}`} className="x-btn x-primary font-mono">
              Email me <span className="x-arrow">→</span>
            </a>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-[980px] px-4 pt-6 sm:px-6 sm:pt-10 print:max-w-none print:p-0">
        <article className="border-2 border-ink bg-white shadow-[4px_4px_0_#111] print:border-0">
          <Header />

          <div className="px-5 pb-8 sm:px-8">
            <Tailored />

            {/* ------------------------------------------------ 01 experience */}
            <Section n="01" title="Experience">
              {experience.map((r) => (
                <Stage key={r.company + r.title} motion className={ROW}>
                  {(run) => (
                    <>
                      <Rule />
                      <div className="flex flex-wrap gap-x-3 font-mono text-[13px] leading-6 text-graphite sm:block">
                        <p className="dsa-wipe flex items-center gap-2" style={d(0)}>
                          {r.dates.includes("Present") && <span className="dsa-blink h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />}
                          {r.dates}
                        </p>
                        <p className="dsa-wipe text-[12px]" style={d(60)}>
                          {r.kind}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[16px] font-semibold leading-6">
                          <Decode text={r.title} run={run} delay={40} dur={350} /> <span className="font-normal text-graphite">· {r.company}</span>
                        </h3>
                        <Points items={r.points} at={120} />
                        <Chips items={r.tags} at={160 + r.points.length * 70} className="mt-3" />
                      </div>
                    </>
                  )}
                </Stage>
              ))}
            </Section>

            {/* ------------------------------------------------ 02 education */}
            <Section n="02" title="Education">
              {education.map((e) => (
                <Stage key={e.degree} motion className={ROW}>
                  {(run) => (
                    <>
                      <Rule />
                      <p className="dsa-wipe font-mono text-[13px] leading-6 text-graphite" style={d(0)}>
                        {e.dates}
                      </p>
                      <div className="min-w-0">
                        <h3 className="text-[16px] font-semibold leading-6">
                          <Decode text={e.degree} run={run} delay={40} dur={350} />
                        </h3>
                        <p className="dsa-wipe text-[15px] text-graphite" style={d(120)}>
                          {e.school} · {e.detail}
                        </p>
                      </div>
                    </>
                  )}
                </Stage>
              ))}
            </Section>

            {/* ------------------------------------------------ 03 projects, by domain */}
            <Section n="03" title="Projects">
              {DOMAINS.map((dm, k) => {
                const list = projects.filter((p) => p.domain === dm.id);
                if (!list.length) return null;
                return (
                  <div key={dm.id}>
                    <h3 className="mt-6 flex items-baseline gap-3 border-b border-ink pb-1.5 text-[16px] font-semibold first:mt-2">
                      <span className="font-mono text-[13px] text-graphite">3.{k + 1}</span>
                      {dm.label}
                      <span className="ml-auto font-mono text-[13px] font-normal text-graphite">{pad(list.length)}</span>
                    </h3>
                    {list.map((p) => (
                      <div key={p.slug} id={p.slug} className="scroll-mt-24">
                        <Stage motion className={ROW}>
                          {(run) => (
                            <>
                              <Rule />
                              <div className="flex flex-wrap items-baseline gap-x-4 sm:block">
                                <p className="dsa-wipe font-mono text-[13px] leading-6 text-graphite" style={d(0)}>
                                  P{pad(projects.indexOf(p) + 1)}
                                </p>
                                <p className="whitespace-nowrap font-mono text-[18px] font-semibold leading-6 sm:mt-1">
                                  <Count value={p.headline.value} run={run} delay={120} />
                                </p>
                                <p className="dsa-rise text-[13px] leading-snug text-graphite" style={d(200)}>
                                  {p.headline.label}
                                </p>
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-[16px] font-semibold leading-6">
                                  <Decode text={p.name} run={run} delay={40} dur={350} />
                                </h4>
                                <p className="dsa-wipe text-[15px] leading-relaxed text-graphite" style={d(100)}>
                                  {p.tagline}
                                </p>
                                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                  {p.stack.map((x, i) => (
                                    <span key={x} className="x-chip dsa-rise font-mono" style={d(160 + i * 40)}>
                                      {x}
                                    </span>
                                  ))}
                                  {p.links.map((l) => (
                                    <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="x-link dsa-rise mx-1 font-mono text-[13px] font-medium" style={d(300)}>
                                      {l.label} ↗
                                    </a>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </Stage>
                      </div>
                    ))}
                  </div>
                );
              })}
            </Section>

            {/* ------------------------------------------------ 04 publications and patents */}
            <Section n="04" title="Publications and patents">
              <h3 className="mt-2 border-b border-ink pb-1.5 text-[16px] font-semibold">
                <span className="mr-3 font-mono text-[13px] text-graphite">4.1</span>Publications
              </h3>
              {publications.map((p, i) => (
                <Stage key={p.title} motion className={ROW}>
                  {() => (
                    <>
                      <Rule />
                      <p className="dsa-wipe font-mono text-[13px] leading-6 text-graphite" style={d(0)}>
                        P{pad(i + 1)}
                      </p>
                      <div className="min-w-0">
                        <p className="dsa-wipe text-[15px] leading-6" style={d(60)}>
                          {p.title}
                        </p>
                        <p className="dsa-wipe mt-0.5 font-mono text-[13px] text-graphite" style={d(140)}>
                          <span className="font-semibold text-ink">{p.venue}</span> · {p.date}
                        </p>
                      </div>
                    </>
                  )}
                </Stage>
              ))}
              <h3 className="mt-6 border-b border-ink pb-1.5 text-[16px] font-semibold">
                <span className="mr-3 font-mono text-[13px] text-graphite">4.2</span>Patents
              </h3>
              {patents.map((p) => (
                <Stage key={p.id} motion className={ROW}>
                  {() => (
                    <>
                      <Rule />
                      <p className="dsa-wipe font-mono text-[13px] leading-6 text-graphite" style={d(0)}>
                        {p.id}
                      </p>
                      <div className="min-w-0">
                        <p className="dsa-wipe text-[15px] leading-6" style={d(60)}>
                          {p.title}
                        </p>
                        {/* status dots: filled ink once granted, an outline while pending */}
                        <p className="dsa-wipe mt-0.5 flex items-center gap-2 font-mono text-[13px] text-graphite" style={d(140)}>
                          <span className={`h-2 w-2 shrink-0 rounded-full border border-ink ${p.status.startsWith("Granted") ? "bg-ink" : ""}`} />
                          {p.status}
                        </p>
                      </div>
                    </>
                  )}
                </Stage>
              ))}
            </Section>

            {/* ------------------------------------------------ 05 skills */}
            <Section n="05" title="Skills">
              {toolbox.map((t) => (
                <Stage key={t.group} motion className={ROW}>
                  {() => (
                    <>
                      <Rule />
                      <p className="dsa-wipe text-[15px] font-semibold leading-7" style={d(0)}>
                        {t.group}
                      </p>
                      <Chips items={t.items} at={60} className="mt-1 sm:mt-0.5" />
                    </>
                  )}
                </Stage>
              ))}
            </Section>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t-2 border-ink px-5 py-3 font-mono text-[13px] text-graphite sm:px-8 print:hidden">
            <span>{profile.coords}</span>
            <Link href="/" className="x-link group text-ink">
              Want the fun version? Take the car for a spin <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </footer>
        </article>
      </div>
    </main>
  );
}

/** The sheet's head, the same build as DsResume: bar, name, contacts, then the figures. */
function Header() {
  return (
    <Stage motion>
      {(run) => (
        <header className="dsa-frame" style={d(0)}>
          <div className="relative flex flex-wrap justify-between gap-x-6 gap-y-1 px-5 py-2 font-mono text-[12px] text-paper sm:px-8">
            <span className="dsa-x ds-bar absolute inset-0 bg-ink" style={d(150)} />
            <span className="relative">
              <Decode text="HG-08 / Resume" run={run} delay={300} />
            </span>
            <span className="relative hidden text-paper/60 sm:inline">
              <Decode text={profile.coords} run={run} delay={400} />
            </span>
            <span className="relative">
              <Decode text={profile.location} run={run} delay={500} />
            </span>
          </div>

          <div className="px-5 pt-6 sm:px-8 sm:pt-8">
            <div className="relative grid gap-x-10 gap-y-5 pb-6 md:grid-cols-[1fr_auto]">
              <span className="dsa-x absolute inset-x-0 bottom-0 h-[3px] bg-ink" style={d(200)} />
              <div className="flex min-w-0 gap-5">
                <div className="dsa-rise relative hidden h-[104px] w-[104px] shrink-0 overflow-hidden border-2 border-ink bg-paper sm:block print:hidden" style={d(450)}>
                  <Image src="/img/henil-3d.png" alt="Henil as a little racing driver" width={208} height={208} className="absolute inset-x-0 -bottom-1 h-[115%] w-full object-cover object-top" priority />
                </div>
                <div className="min-w-0">
                  <h1 className="text-[36px] font-semibold leading-none tracking-[-0.02em] sm:text-[44px]">
                    <Decode text={profile.name} run={run} delay={250} />
                  </h1>
                  <p className="dsa-rise mt-3 text-[16px]" style={d(500)}>
                    {profile.role}, <span className="font-semibold">{profile.company}</span>
                  </p>
                  <p className="dsa-rise mt-2 text-[15px] leading-relaxed text-graphite" style={d(600)}>
                    {profile.oneLiner}
                  </p>
                </div>
              </div>
              <dl className="grid h-max grid-cols-[auto_1fr] gap-x-4 font-mono text-[13px] leading-[1.8]">
                {CONTACTS.map(([k, v, h], i) => (
                  <div key={k} className="contents">
                    <dt className="dsa-wipe text-graphite" style={d(400 + i * 70)}>
                      {k}
                    </dt>
                    <dd className="dsa-wipe min-w-0 break-all" style={d(440 + i * 70)}>
                      <a href={h} target={h.startsWith("mailto") ? undefined : "_blank"} rel="noreferrer" className="x-link">
                        {v}
                      </a>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* the figures strip: 2 across on a phone, the last one spanning */}
            <div className="relative grid grid-cols-2 sm:grid-cols-5">
              <span className="dsa-x absolute inset-x-0 bottom-0 h-px bg-ink" style={d(500)} />
              {stats.map((s, i) => (
                <div key={s.label} className="border-b border-rule py-4 pr-3 last:col-span-2 sm:border-b-0 sm:last:col-span-1">
                  <p className="font-mono text-[24px] font-semibold leading-none">
                    <Count value={s.value} run={run} delay={550 + i * 90} />
                  </p>
                  <p className="dsa-rise mt-1.5 text-[14px] leading-snug text-graphite" style={d(600 + i * 90)}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </header>
      )}
    </Stage>
  );
}

/** A numbered head: orange number, caps label, a 2px ink rule that wipes in. */
function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <Stage motion>
        {(run) => (
          <h2 className="relative flex items-baseline gap-3 pb-2 text-[15px] font-semibold uppercase tracking-[0.06em] break-after-avoid">
            <span className="dsa-pop inline-block font-mono text-signal" style={d(0)}>
              {n}
            </span>
            <Decode text={title} run={run} delay={60} dur={300} />
            <span className="dsa-x absolute inset-x-0 bottom-0 h-[2px] bg-ink" style={d(0)} />
          </h2>
        )}
      </Stage>
      {children}
    </section>
  );
}

/** The hairline under a row, wiping in with it. */
function Rule() {
  return <span className="dsa-x absolute inset-x-0 bottom-0 h-px bg-rule" style={d(0)} />;
}

/** Bullets with ink square markers; figures in each line are picked out so a skim finds them. */
function Points({ items, at }: { items: string[]; at: number }) {
  return (
    <ul className="mt-2 space-y-1.5 text-[15px] leading-relaxed">
      {items.map((t, i) => (
        <li key={t} className="grid grid-cols-[14px_1fr] gap-1.5">
          <span className="dsa-pop mt-[0.62em] h-[6px] w-[6px] bg-ink" style={d(at + i * 70)} />
          <span className="dsa-wipe" style={d(at + 20 + i * 70)}>
            <Figures text={t} className="font-semibold" />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Chips({ items, at, className }: { items: string[]; at: number; className: string }) {
  return (
    <div className={`flex flex-wrap content-start items-start gap-1.5 ${className}`}>
      {items.map((x, i) => (
        <span key={x} className="x-chip dsa-rise font-mono" style={d(at + i * 35)}>
          {x}
        </span>
      ))}
    </div>
  );
}
