import { patents, publications } from "@/content/research";
import { profile } from "@/content/profile";
import Section from "@/components/ui/Section";

export default function Research() {
  return (
    <Section
      id="research"
      index="06"
      label="Research"
      title="Papers and patents"
      intro={
        <>
          Most of these grew out of the cars and embedded systems I worked on in engineering school. The newest one, HAEE,
          is about serving RAG faster and is under review at MLSys. Full list on{" "}
          <a href={profile.links.scholar} target="_blank" rel="noreferrer" className="underline decoration-red underline-offset-4">
            Google Scholar
          </a>
          .
        </>
      }
    >
      <div className="overflow-hidden rounded-xl border border-line">
        {publications.map((p, i) => (
          <div
            key={p.title}
            className="grid grid-cols-[36px_1fr] gap-x-4 gap-y-1 border-b border-line px-4 py-4 last:border-0 sm:grid-cols-[48px_1fr_120px_110px] sm:items-center"
          >
            <span className={`font-display text-xl font-black ${i === 0 ? "text-purple" : "text-chalk/60"}`}>P{i + 1}</span>
            <span className="font-medium leading-snug">{p.title}</span>
            <span className="col-start-2 font-mono text-xs text-mute sm:col-start-auto sm:text-sm">{p.venue}</span>
            <span className="col-start-2 font-mono text-xs text-mute sm:col-start-auto sm:text-right sm:text-sm">{p.date}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {patents.map((p) => (
          <div key={p.id} className="rounded-xl border border-line bg-panel/60 px-5 py-4">
            <p className="font-mono text-xs uppercase tracking-widest text-amber">Patent · {p.status}</p>
            <p className="mt-2 font-semibold leading-snug">{p.title}</p>
            <p className="mt-1 font-mono text-xs text-mute">{p.id}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
