"use client";

import Link from "next/link";
import { offTrack, story } from "@/content/profile";
import { projects } from "@/content/projects";

export type Panel =
  | { kind: "story"; index: number }
  | { kind: "garage" }
  | { kind: "offtrack"; key: "cricket" | "football" };

type Props = {
  panel: Panel;
  collected: number;
  onClose: () => void;
};

const featured = projects.filter((p) => p.featured);

/** Broadcast-style side graphic. DOM, not 3D, so it stays sharp and readable. */
export function StoryPanel({ panel, collected, onClose }: Props) {
  return (
    <aside
      key={panel.kind === "story" ? `s${panel.index}` : panel.kind === "offtrack" ? panel.key : "garage"}
      className="pointer-events-auto flex max-h-[min(70vh,40rem)] max-sm:max-h-[48vh] w-full flex-col overflow-hidden rounded-md border border-line bg-ink/90 shadow-2xl backdrop-blur-md motion-safe:animate-[panel-in_260ms_ease-out] sm:w-[25rem]"
      aria-live="polite"
    >
      <style>{`@keyframes panel-in{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}`}</style>
      {panel.kind === "story" && <StoryBody index={panel.index} collected={collected} onClose={onClose} />}
      {panel.kind === "garage" && <GarageBody onClose={onClose} />}
      {panel.kind === "offtrack" && <OffTrackBody k={panel.key} onClose={onClose} />}
    </aside>
  );
}

function Header({
  tag,
  big,
  title,
  sub,
  onClose,
  tone = "red",
}: {
  tag: string;
  big?: string;
  title: string;
  sub?: string;
  onClose: () => void;
  tone?: "red" | "green";
}) {
  return (
    <header className="flex shrink-0 items-stretch border-b border-line">
      <div
        className={`flex w-16 shrink-0 flex-col items-center justify-center font-display font-black ${
          tone === "red" ? "bg-red text-white" : "bg-green text-ink"
        }`}
      >
        <span className="px-1 text-center text-[10px] leading-tight tracking-[0.2em] uppercase opacity-90">{tag}</span>
        {big && <span className="text-2xl leading-none">{big}</span>}
      </div>
      <div className="min-w-0 flex-1 px-4 py-3">
        {sub && <p className="font-mono text-[11px] tracking-wider text-mute uppercase">{sub}</p>}
        <h2 className="font-display text-lg leading-tight font-bold text-chalk">{title}</h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close panel"
        className="shrink-0 cursor-pointer px-3 font-mono text-mute hover:text-chalk"
      >
        ✕
      </button>
    </header>
  );
}

function StoryBody({ index, collected, onClose }: { index: number; collected: number; onClose: () => void }) {
  const ch = story[index];
  return (
    <>
      <Header tag="Lap" big={String(ch.lap)} title={ch.title} sub={`${ch.place} · ${ch.years}`} onClose={onClose} />
      <div className="space-y-3 overflow-y-auto px-4 py-4 text-sm leading-relaxed text-chalk/90">
        {ch.body.map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-line px-4 py-2.5 font-mono text-[11px] text-mute">
        {collected >= story.length ? (
          <>
            <span>That&apos;s the whole story so far.</span>
            <Link href="/resume" className="text-chalk underline-offset-4 hover:text-red hover:underline">
              Read the resume
            </Link>
          </>
        ) : (
          <>
            <span>
              Checkpoint {collected} of {story.length}
            </span>
            <span>Keep driving for the next one</span>
          </>
        )}
      </footer>
      <div className="kerb shrink-0" />
    </>
  );
}

function GarageBody({ onClose }: { onClose: () => void }) {
  return (
    <>
      <Header tag="Pit" big="08" title="Things I've built" sub="Garage" onClose={onClose} />
      <ul className="divide-y divide-line overflow-y-auto">
        {featured.map((p) => (
          <li key={p.slug} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-base font-bold text-chalk">{p.name}</h3>
              <span className="shrink-0 font-mono text-xs text-green">{p.headline.value}</span>
            </div>
            <p className="text-sm text-mute">{p.tagline}</p>
            <p className="mt-0.5 font-mono text-[10px] text-mute/80">{p.headline.label}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {p.stack.slice(0, 5).map((s) => (
                <span key={s} className="rounded-sm bg-panel px-1.5 py-0.5 font-mono text-[10px] text-chalk/80">
                  {s}
                </span>
              ))}
            </div>
            {p.links.length > 0 && (
              <div className="mt-2 flex gap-3 font-mono text-[11px]">
                {p.links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-chalk underline-offset-4 hover:text-red hover:underline"
                  >
                    {l.label} ↗
                  </a>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
      <footer className="shrink-0 border-t border-line px-4 py-2.5 font-mono text-[11px] text-mute">
        Pull out of the box to get back on track.
      </footer>
    </>
  );
}

function OffTrackBody({ k, onClose }: { k: "cricket" | "football"; onClose: () => void }) {
  const item = offTrack.find((o) => o.key === k);
  if (!item) return null;
  return (
    <>
      <Header tag="Off track" title={item.title} sub="Away from the desk" onClose={onClose} tone="green" />
      <p className="px-4 py-4 text-sm leading-relaxed text-chalk/90">{item.body}</p>
    </>
  );
}
