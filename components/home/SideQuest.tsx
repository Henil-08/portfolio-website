import { projects } from "@/content/projects";
import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";

export default function SideQuest() {
  const quests = projects.filter((p) => p.sideQuest);

  return (
    <Section
      id="side-quest"
      index="05"
      label="Side quest"
      className="relative overflow-hidden border-y border-line bg-[#06080b]"
      title={
        <>
          After hours, I&apos;m teaching AI to <span className="text-cyan">design chips</span>.
        </>
      }
      intro={
        <>
          <p>
            I started out in electronics, writing Verilog and Embedded C before I ever trained a model. Now the two worlds
            are colliding. Chip verification eats most of a hardware team&apos;s time, and it looks a lot like the agent
            problems I solve at work.
          </p>
          <p className="mt-4">
            So on nights and weekends I&apos;m building agents that write and run testbenches, and fine-tuning small
            models to write RTL. It&apos;s early. It&apos;s also the most fun I&apos;ve had in a while.
          </p>
        </>
      }
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(#36d6ff 1px, transparent 1px), linear-gradient(90deg, #36d6ff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse at 70% 40%, black, transparent 70%)",
        }}
      />
      <div className="relative grid gap-5 lg:grid-cols-2">
        {quests.map((p, i) => (
          <Reveal key={p.slug} delay={i * 0.1} className="flex">
            <article className="flex w-full flex-col rounded-2xl border border-cyan/25 bg-[#0a1016]/80 p-6 sm:p-8">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan/80">{p.tagline}</p>
              <h3 className="mt-2 font-display text-3xl font-bold">{p.name}</h3>
              <p className="mt-6 font-display text-5xl font-black tabular-nums text-cyan">{p.headline.value}</p>
              <p className="mt-1 text-sm text-mute">{p.headline.label}</p>
              <ul className="mt-6 space-y-2 text-[15px] leading-relaxed text-chalk/75">
                {p.points.map((pt) => (
                  <li key={pt} className="flex gap-3">
                    <span className="mt-2.5 h-px w-3 shrink-0 bg-cyan" />
                    {pt}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-wrap items-center gap-4 pt-6 text-sm">
                {p.links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-cyan decoration-2 underline-offset-4 hover:text-white"
                  >
                    {l.label} ↗
                  </a>
                ))}
                <span className="ml-auto font-mono text-[11px] text-mute">{p.stack.slice(0, 4).join(" · ")}</span>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
