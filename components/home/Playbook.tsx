import { playbook, playbookIntro } from "@/content/playbook";
import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";

const tyres = {
  soft: { color: "#e10600", letter: "S", name: "Soft", note: "quick wins" },
  medium: { color: "#ffc531", letter: "M", name: "Medium", note: "saves money" },
  hard: { color: "#eceef2", letter: "H", name: "Hard", note: "saves context" },
  inter: { color: "#19d27a", letter: "I", name: "Inter", note: "keeps you safe" },
} as const;

export default function Playbook() {
  return (
    <Section
      id="ai"
      index="04"
      label="How I work"
      title={
        <>
          I ship with Claude Code and Cursor. <span className="text-mute">Here&apos;s how to do it without burning money.</span>
        </>
      }
      intro={playbookIntro}
    >
      <div className="mb-8 flex flex-wrap gap-5 font-mono text-xs text-mute">
        {Object.values(tyres).map((t) => (
          <span key={t.name} className="flex items-center gap-2">
            <Tyre color={t.color} letter={t.letter} size={22} />
            {t.name} · {t.note}
          </span>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {playbook.map((tip, i) => {
          const t = tyres[tip.compound];
          return (
            <Reveal key={tip.title} delay={(i % 4) * 0.06} className="flex">
              <article className="flex w-full flex-col rounded-2xl border border-line bg-panel/60 p-5 transition hover:-translate-y-1 hover:border-chalk/25">
                <Tyre color={t.color} letter={t.letter} size={40} />
                <h3 className="mt-5 font-display text-xl font-bold leading-snug">{tip.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-chalk/70">{tip.body}</p>
              </article>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

function Tyre({ color, letter, size }: { color: string; letter: string; size: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-[#111] font-display font-black text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        boxShadow: `inset 0 0 0 ${Math.max(2, size * 0.12)}px ${color}, inset 0 0 0 ${size * 0.2}px #111, inset 0 0 0 ${size * 0.24}px #2a2a2a`,
      }}
    >
      {letter}
    </span>
  );
}
