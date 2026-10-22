import Image from "next/image";
import { offTrack } from "@/content/profile";
import { toolbox } from "@/content/research";
import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";

const icons: Record<string, string> = { f1: "🏎️", cricket: "🏏", football: "⚽", gadgets: "📱" };

export default function OffTrack() {
  return (
    <Section id="off-track" index="07" label="Off the clock" title="When I'm not working">
      <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
        <Reveal>
          <div className="overflow-hidden rounded-2xl border border-line">
            <Image
              src="/img/henil-smile.jpg"
              alt="Henil Gajjar"
              width={900}
              height={1180}
              className="aspect-[4/5] w-full object-cover object-top"
              sizes="(min-width: 1024px) 320px, 100vw"
            />
          </div>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2">
          {offTrack.map((o, i) => (
            <Reveal key={o.key} delay={i * 0.06} className="flex">
              <article className="w-full rounded-2xl border border-line bg-panel/60 p-5">
                <span className="text-3xl" aria-hidden>
                  {icons[o.key]}
                </span>
                <h3 className="mt-3 font-display text-xl font-bold">{o.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-chalk/70">{o.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>

      <div className="mt-20">
        <h3 className="font-display text-2xl font-bold">What&apos;s in the toolbox</h3>
        <div className="mt-6 divide-y divide-line rounded-xl border border-line">
          {toolbox.map((t) => (
            <div key={t.group} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
              <span className="w-48 shrink-0 font-mono text-xs uppercase tracking-widest text-mute">{t.group}</span>
              <div className="flex flex-wrap gap-1.5">
                {t.items.map((x) => (
                  <span key={x} className="rounded-full border border-line px-2.5 py-0.5 text-sm text-chalk/85">
                    {x}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
