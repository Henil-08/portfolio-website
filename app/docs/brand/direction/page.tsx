import type { Metadata } from "next";
import Link from "next/link";
import { profile } from "@/content/profile";
import { Lockup } from "@/components/brand/mark";

export const metadata: Metadata = {
  title: "Art direction · Henil Gajjar",
  description: "Four art directions for the site, each shown in the same three shots, for the owner to pick from.",
  robots: { index: false, follow: false },
};

// Key frames made with Meshy text-to-image (scripts/meshy.mjs img kf-<dir><shot> ... --pro --wide --raw).
// Research behind them: docs/research/art-direction.md.
const DIRECTIONS = [
  { id: "A", name: "Engineering Film", line: "Overcast product-launch film. Soft reflections, clearcoat cars, 50–65 mm lens, cool grade, grain. Lowest risk." },
  { id: "B", name: "Night Race Broadcast", line: "Inky night race. Floodlight pools, wet reflective tarmac, telephoto trackside cameras. Costliest, most dramatic." },
  { id: "C", name: "Architectural Model", line: "A gallery maquette done adult. Plaster, ink and concrete, low raking light, long lens from high up. Most on-brand." },
  { id: "D", name: "Golden Hour Paddock", line: "Editorial motorsport photography. Low warm sun, haze, long shadows, warm grade, low camera." },
];
const SHOTS = ["Chase on the main straight", "Garage teardown", "The island from above"];

const TOP = [
  "Real HDR pipeline: filmic tone mapping and exposure (now none, so whites clip flat).",
  "Re-light: far less flat fill, real environment reflections, warm key and cool fill.",
  "Camera lower, longer and behind the car, with a horizon and look-ahead.",
  "Retire satin plastic: varied roughness, micro-normals, clearcoat paint, reflective glass.",
  "Grade and post with restraint: less bloom, a colour grade per time of day, grain, better anti-aliasing.",
  "Bring the studio look into the world: baked occlusion, smoothed edges, contact shadow under the car.",
  "Ground detail: less flat lawn, joints and paving, a rubbered racing line, kerb wear.",
  "Quiet HUD while driving: speed and power only, in thin frames.",
  "De-toy forms: real-size name signage, clean roofs, people and railings for scale.",
  "A real night: dark sky, floodlight pools, headlights, wet tarmac.",
];

export default function Page() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3">
          <Lockup size={16} name={profile.name} />
          <span className="font-mono text-[12px] text-graphite">HG-08 · Art direction</span>
          <nav className="ml-auto flex gap-4 font-mono text-[12px] text-graphite">
            <Link href="/docs/brand/world" className="hover:text-ink">World</Link>
            <Link href="/docs/brand/models" className="hover:text-ink">Models</Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-[1400px] px-4 pb-24">
        <p className="mt-12 font-mono text-[12px] text-graphite">HG-08 · Direction · Pick one</p>
        <h1 className="mt-3 text-[44px] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-[64px]">
          Four ways to grow up<span className="text-signal">.</span>
        </h1>
        <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-graphite">
          The palette isn&apos;t the problem; the rendering is (flat light, no tone mapping, satin plastic, a board-game camera,
          loud stickers). Each direction keeps the Datasheet brand and is shown in the same three shots. Pick one, or name a mix;
          the build starts with the changes every direction needs. These frames are photoreal targets: the real-time build
          gets the light, materials, camera and mood, not every photographic detail.
        </p>
        {DIRECTIONS.map((d) => (
          <section key={d.id} className="mt-14">
            <div className="mb-3 flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-[13px] text-signal">{d.id}</span>
              <h2 className="text-[28px] font-semibold tracking-[-0.02em]">{d.name}</h2>
              <p className="text-[14px] text-graphite">{d.line}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {SHOTS.map((s, i) => (
                <figure key={s} className="border-2 border-ink bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/models/concepts/kf-${d.id}${i + 1}.png`} alt={`${d.name}: ${s}`} className="aspect-video w-full object-cover" />
                  <figcaption className="border-t-2 border-ink px-2 py-1.5 font-mono text-[12px]">
                    {d.id}
                    {i + 1} · {s}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}
        <section className="mt-16 border-2 border-ink bg-white">
          <div className="bg-ink px-3 py-2 font-mono text-[12px] text-white">Every direction needs these first · ranked by impact</div>
          <ol className="divide-y divide-rule">
            {TOP.map((t, i) => (
              <li key={t} className="flex gap-3 px-3 py-2.5 text-[14.5px]">
                <span className="font-mono text-[12px] text-signal">{String(i + 1).padStart(2, "0")}</span>
                {t}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
