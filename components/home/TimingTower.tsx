"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { experience, education } from "@/content/experience";
import Section from "@/components/ui/Section";

const kindColor: Record<string, string> = {
  "Full time": "bg-red",
  Internship: "bg-cyan",
  "Founding team": "bg-purple",
  Research: "bg-amber",
  "Team lead": "bg-green",
};

const code = (company: string) => company.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();

export default function TimingTower() {
  const [open, setOpen] = useState(0);

  return (
    <Section
      id="work"
      index="02"
      label="Work"
      title="Where I've worked"
      intro="Newest at the top, the way a timing tower reads. Tap a row for what I actually did there."
    >
      <div className="overflow-hidden rounded-xl border border-line bg-panel/60">
        <div className="grid grid-cols-[40px_6px_1fr_auto] items-center gap-3 border-b border-line px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-mute sm:grid-cols-[48px_6px_70px_1fr_auto]">
          <span>Pos</span>
          <span />
          <span className="hidden sm:block">Team</span>
          <span>Role</span>
          <span>Stint</span>
        </div>

        {experience.map((r, i) => {
          const isOpen = open === i;
          return (
            <div key={r.company + r.title} className="border-b border-line last:border-0">
              <button
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className={`grid w-full grid-cols-[40px_6px_1fr_auto] items-center gap-3 px-4 py-4 text-left transition sm:grid-cols-[48px_6px_70px_1fr_auto] ${
                  isOpen ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                }`}
              >
                <span className="font-display text-xl font-black tabular-nums text-chalk/90">{i + 1}</span>
                <span className={`h-8 w-1.5 rounded-full ${kindColor[r.kind]}`} />
                <span className="hidden font-display text-lg font-bold tracking-wider sm:block">{code(r.company)}</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{r.title}</span>
                  <span className="block truncate text-sm text-mute">
                    {r.company} · {r.kind}
                  </span>
                </span>
                <span className="text-right font-mono text-xs text-mute tabular-nums sm:text-sm">{r.dates}</span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-6 sm:pl-[150px] sm:pr-8">
                      <ul className="space-y-2.5 text-[15px] leading-relaxed text-chalk/80">
                        {r.points.map((p) => (
                          <li key={p} className="flex gap-3">
                            <span className="mt-2.5 h-1 w-3 shrink-0 bg-red" />
                            {p}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {r.tags.map((t) => (
                          <span key={t} className="rounded border border-line px-2 py-0.5 font-mono text-xs text-mute">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {education.map((e) => (
          <div key={e.school} className="rounded-xl border border-line px-5 py-4">
            <p className="font-semibold">{e.degree}</p>
            <p className="text-sm text-mute">
              {e.school} · {e.detail}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}
