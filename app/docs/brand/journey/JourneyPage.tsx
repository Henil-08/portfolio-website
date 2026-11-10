"use client";

// The career journey review (owner, 2026-11-09: "the path track design is bad, we need to redesign
// it ... 2-3 versions"): the current terrace and three redesigns, each at the same four poses, with
// what it is like to drive, what ground it takes and what it costs. Every version runs in the real
// world behind ?journey=a|b|c (components/world/journey/choice.ts); "Drive it" starts the car right
// before it. Stills: public/journey/<version>-<pose>.webp, taken with scripts/shoot.mjs on the GPU.
import { useState } from "react";
import Link from "next/link";
import { profile } from "@/content/profile";
import { Lockup } from "@/components/brand/mark";
import Corners from "@/components/brand/Corners";

const POSES = [
  { id: "approach", name: "Approach" },
  { id: "mid", name: "Mid-journey" },
  { id: "top", name: "Top view" },
  { id: "night", name: "Night" },
] as const;

type Version = {
  id: "current" | "a" | "b" | "c";
  code: string;
  name: string;
  tag: string;
  drive: string[];
  ground: string;
  room: string;
  cost: string;
};

const VERSIONS: Version[] = [
  {
    id: "a",
    code: "A",
    name: "Pit straight",
    tag: "A timed straight. Fast, and every date is a line you cross.",
    drive: [
      "One asphalt lane, west to east, left to right on screen. A start line at June 2019, a chequered line at today, the years as distance marks along the near edge.",
      "Every role is a timing line across the lane with its code. Cross it and the line turns orange and the role's pit board comes up out of a slot behind the pit wall. It goes back down when the role ends, so the boards that are out are always what was going on at that date. Roles that overlap stack up like a timing tower. The Waters board stays out, framed in orange.",
      "The four chapters (S1 Ahmedabad, S2 Hyperlab, S3 Boston, S4 Waters, the same as the circuit's sectors and the story's laps) are gantries over the lane; the one you're in has an orange bar.",
      "A split sticker rides beside the car: the month, and the code, name and role of the last line crossed.",
    ],
    ground: "Lane 21.2 m long, 3.6 m wide (2.4 m a year). With the pit wall and apron: 22 × 6.2 m on the garden's east-west path.",
    room: "Needs 4.6 m more to the west and 3.8 m more to the east than today's pad, over the garden path (its two ends move to the lane's ends). Uses less than half the pad's depth, so the ground south of it goes back to grass.",
    cost: "14 meshes, 12 draw calls at the mid pose. The sticker is HTML, no draw calls.",
  },
  {
    id: "b",
    code: "B",
    name: "The road so far",
    tag: "A short road with a hairpin. Slower, and the road itself tells the story.",
    drive: [
      "The first leg runs east through the Ahmedabad years. The hairpin is the move to Boston: the MS stands at its apex (lap 3 of the story, “Moved countries, then GenAI happened”). The back leg runs west through Boston and Waters to a chequered line at today.",
      "Every role is a painted lane on the road from its start to its end, side by side with whatever else was going on, so school and work run in parallel. The lanes light orange behind the car.",
      "At each start a low concrete station stands beside the road with its card folded shut. As you arrive it lifts like a lectern, square to the camera, and the datasheet wipes in. They stay open behind you. Stations alternate sides, low enough not to hide the car.",
      "Chapters are painted on the near verge, years on the road, ink and paper kerbs only in the hairpin. Spacing is half true time and half one step per milestone, so the busy 2021-22 and 2024 stretches still have room for each station.",
    ],
    ground: "Road 36 m long (a 12.5 m leg, a 4.6 m radius hairpin, a 9 m leg), 3.2 m wide with 1.3 m concrete verges. Bounds 19.7 × 15.3 m.",
    room: "Needs 4.5 m more to the west and 1.6 m to the east, and 5.5 m more to the north (the back leg runs between the cricket ground and the podium; nothing stands there). Frees the south 4 m of today's pad. The grass only gives way along the road.",
    cost: "12 meshes, 7 draw calls at the mid pose.",
  },
  {
    id: "c",
    code: "C",
    name: "The datasheet",
    tag: "A Gantt table cast into a slab. No road: the car is the cursor.",
    drive: [
      "Rows are the roles and degrees, earliest at the top; columns are the years, left to right. Each role is an ink bar from its start to its end, like the resume.",
      "Your x is a playhead: an orange line across every row, with the month in the header. Every bar that's going on at that date lights orange up to it, so what ran in parallel reads at a glance; finished ones keep a thin orange line.",
      "The row under the car inverts its label (ink, like a datasheet row on hover) and a card with a hard ink shadow stands up beside the car with that role's dates and lines. Change rows and it drops and comes back with the new one.",
      "Drive along a row to follow one role through its years, or across the rows to scan a single date.",
    ],
    ground: "One slab, 15.8 × 15.2 m (1.3 m a year), on today's terrace site.",
    room: "Fits today's pad: 1.2 m wider at the west, 1 m at the east, 0.9 m deeper at each end.",
    cost: "13 meshes, 9 draw calls at the mid pose, plus one text for the month.",
  },
  {
    id: "current",
    code: "00",
    name: "Current terrace",
    tag: "For comparison: what's in the world today.",
    drive: [
      "A 13.6 × 13.5 m concrete terrace, time running east to west. One groove per role 0.9 m apart; when the car is inside a role's dates its concrete block rises, floats and its label wipes in.",
      "At car scale the lanes are narrower than the car, and the whole timeline goes by in about a second.",
    ],
    ground: "13.6 × 13.5 m pad at the middle of the garden.",
    room: "—",
    cost: "119 meshes, 179 draw calls at the mid pose (each line of text is its own draw).",
  },
];

export default function JourneyPage() {
  const [big, setBig] = useState<string | null>(null);
  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-4 py-3">
          <Link href="/docs/brand/system">
            <Lockup size={16} name={profile.name} />
          </Link>
          <span className="font-mono text-[12px] text-graphite">HG-08 · Journey review</span>
          <nav className="ml-auto flex gap-4 font-mono text-[12px] text-graphite">
            {VERSIONS.map((v) => (
              <a key={v.id} href={`#${v.id}`} className="hover:text-ink">
                {v.code}
              </a>
            ))}
            <Link href="/docs/brand/places" className="hover:text-ink">
              Places
            </Link>
            <Link href="/docs/brand/system" className="hover:text-ink">
              System
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-[1400px] px-4 pb-24">
        <p className="mt-12 font-mono text-[12px] text-graphite">HG-08 · Career journey · For approval</p>
        <h1 className="mt-3 text-[44px] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-[64px]">
          Three ways to drive the journey<span className="text-signal">.</span>
        </h1>
        <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-graphite">
          Same identity, same facts: paper, ink, concrete and one orange, Plex type, and every label from the experience file. What changes is how you drive
          through it. Each one runs in the real world at its real spot. Drive it, then pick one.
        </p>

        <section className="mt-10 grid gap-3 md:grid-cols-2">
          <div className="border-2 border-ink bg-white">
            <div className="bg-ink px-3 py-2 font-mono text-[12px] text-white">Drive each one</div>
            <ul className="divide-y divide-rule font-mono text-[13px]">
              {VERSIONS.map((v) => (
                <li key={v.id} className="flex flex-wrap items-baseline gap-x-3 px-3 py-2.5">
                  {/* a full page load: the world reads ?journey once, when it loads */}
                  <a href={`/?journey=${v.id}&skip`} className="x-link font-semibold">
                    /?journey={v.id}&amp;skip
                  </a>
                  <span className="text-graphite">{v.name}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-2 border-ink bg-white px-3 py-3 text-[14px] leading-relaxed">
            <p>
              Each link starts the car right before that journey (A, B and C on the west garden path, facing east; the current one at the terrace&apos;s east end).
              Nothing is remembered: without <span className="font-mono text-[12.5px]">?journey</span> every visitor still gets the current terrace.
            </p>
            <p className="mt-2 text-graphite">
              Stills: the default chase camera, the same four poses for each. Draw calls are each journey&apos;s own (shown minus hidden, same frame), Chrome on an M4
              Pro.
            </p>
          </div>
        </section>

        {VERSIONS.map((v) => (
          <section key={v.id} id={v.id} className="mt-16 scroll-mt-20">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 border-b-2 border-ink pb-3">
              <span className="font-mono text-[15px] font-semibold text-signal">{v.code}</span>
              <h2 className="text-[30px] font-semibold tracking-[-0.02em]">{v.name}</h2>
              <span className="text-[15px] text-graphite">{v.tag}</span>
              <a href={`/?journey=${v.id}&skip`} className="x-sel x-btn x-primary relative ml-auto">
                <Corners />
                Drive it <span className="x-arrow">→</span>
              </a>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {POSES.map((p) => {
                const src = `/journey/${v.id}-${p.id}.webp`;
                return (
                  <figure key={p.id} className="border-2 border-ink bg-white">
                    <button type="button" onClick={() => setBig(src)} className="block w-full" aria-label={`${v.name}, ${p.name}, larger`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`${v.name}, ${p.name}`} loading="lazy" className="aspect-[8/5] w-full object-cover" />
                    </button>
                    <figcaption className="border-t-2 border-ink px-2 py-1.5 font-mono text-[12px]">
                      {v.code} · {p.name}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-[1.6fr_1fr]">
              <div className="border-2 border-ink bg-white">
                <div className="bg-ink px-3 py-2 font-mono text-[12px] text-white">01 · The drive</div>
                <ol className="divide-y divide-rule">
                  {v.drive.map((t, i) => (
                    <li key={i} className="flex gap-3 px-3 py-2.5 text-[15px] leading-relaxed">
                      <span className="pt-0.5 font-mono text-[12px] text-signal">{String(i + 1).padStart(2, "0")}</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="border-2 border-ink bg-white">
                <div className="bg-ink px-3 py-2 font-mono text-[12px] text-white">02 · Ground and cost</div>
                <dl className="divide-y divide-rule text-[14px] leading-relaxed">
                  {(
                    [
                      ["Footprint", v.ground],
                      ["Extra room", v.room],
                      ["Cost", v.cost],
                    ] as const
                  ).map(([k, t]) => (
                    <div key={k} className="px-3 py-2.5">
                      <dt className="font-mono text-[12px] text-graphite">{k}</dt>
                      <dd className="mt-0.5">{t}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </section>
        ))}

        <section className="mt-16 border-2 border-ink bg-white px-3 py-3 text-[14px] leading-relaxed">
          <p className="font-mono text-[12px] text-graphite">Shared by all three</p>
          <p className="mt-1">
            Every label is drawn once into one texture after Plex loads, and every board, card and painted year is an instance of one mesh, so a whole journey is a
            dozen draws instead of 180. Colliders follow what you see: the car rides on the asphalt and slab, and walls, gantry legs and plinths are solid. Layers
            stand at least 4 mm apart, so nothing flickers. Cards glow a little at night; orange stays lit.
          </p>
        </section>
      </div>
      {big && (
        <button type="button" onClick={() => setBig(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4" aria-label="Close">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={big} alt="" className="max-h-full max-w-full border-2 border-paper" />
        </button>
      )}
    </main>
  );
}
