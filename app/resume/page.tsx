import type { Metadata } from "next";
import Link from "next/link";
import { profile, stats } from "@/content/profile";
import { experience, education } from "@/content/experience";
import { projects } from "@/content/projects";
import { patents, publications, toolbox } from "@/content/research";

export const metadata: Metadata = {
  title: "Resume · Henil Gajjar",
  description: "The one-page version. No animations.",
};

export default function Resume() {
  return (
    <main className="min-h-screen bg-[#f6f6f4] text-[#111] print:bg-white">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
        <div className="mb-10 flex items-center justify-between text-sm print:hidden">
          <Link href="/" className="text-[#555] hover:text-black">
            ← Back to the fun version
          </Link>
          <a href={profile.resume} target="_blank" rel="noreferrer" className="font-semibold text-[#c10500] hover:underline">
            PDF resume ↗
          </a>
        </div>

        <header>
          <h1 className="font-display text-4xl font-black tracking-tight">{profile.name}</h1>
          <p className="mt-1 text-lg">
            {profile.role}, {profile.company} · {profile.location}
          </p>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#444]">
            <a href={`mailto:${profile.email}`} className="underline">
              {profile.email}
            </a>
            <a href={profile.links.linkedin} className="underline">LinkedIn</a>
            <a href={profile.links.github} className="underline">GitHub</a>
            <a href={profile.links.scholar} className="underline">Scholar</a>
          </p>
          <p className="mt-5 leading-relaxed text-[#333]">{profile.oneLiner}</p>
          <p className="mt-3 text-sm text-[#555]">{stats.map((s) => `${s.value} ${s.label}`).join(" · ")}</p>
        </header>

        <Block title="Experience">
          {experience.map((r) => (
            <div key={r.company + r.title} className="mb-6 break-inside-avoid">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <h3 className="font-semibold">
                  {r.title}, {r.company}
                </h3>
                <span className="text-sm tabular-nums text-[#555]">{r.dates}</span>
              </div>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-[#333]">
                {r.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </Block>

        <Block title="Education">
          {education.map((e) => (
            <p key={e.school} className="mb-1">
              <span className="font-semibold">{e.degree}</span>, {e.school}{" "}
              <span className="text-sm text-[#555]">· {e.detail}</span>
            </p>
          ))}
        </Block>

        <Block title="Selected projects">
          {projects.map((p) => (
            <div key={p.slug} className="mb-3 break-inside-avoid">
              <p>
                <span className="font-semibold">{p.name}</span>
                <span className="text-[#555]">
                  {" "}
                  · {p.tagline} · {p.headline.value} {p.headline.label}
                </span>
                {p.links[0] && (
                  <a href={p.links[0].href} className="ml-2 text-sm text-[#c10500] underline print:hidden">
                    {p.links[0].label}
                  </a>
                )}
              </p>
              <p className="text-sm text-[#555]">{p.stack.join(", ")}</p>
            </div>
          ))}
        </Block>

        <Block title="Publications and patents">
          <ul className="list-disc space-y-1 pl-5 text-[15px] text-[#333]">
            {publications.map((p) => (
              <li key={p.title}>
                {p.title} <span className="text-[#555]">({p.venue}, {p.date})</span>
              </li>
            ))}
            {patents.map((p) => (
              <li key={p.id}>
                Patent: {p.title} <span className="text-[#555]">({p.id}, {p.status})</span>
              </li>
            ))}
          </ul>
        </Block>

        <Block title="Skills">
          {toolbox.map((t) => (
            <p key={t.group} className="mb-1 text-[15px]">
              <span className="font-semibold">{t.group}:</span> <span className="text-[#333]">{t.items.join(", ")}</span>
            </p>
          ))}
        </Block>
      </div>
    </main>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 border-b-2 border-[#c10500] pb-1 font-display text-sm font-bold uppercase tracking-[0.2em]">
        {title}
      </h2>
      {children}
    </section>
  );
}
