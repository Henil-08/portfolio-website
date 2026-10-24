"use client";

// A live specimen of docs/DESIGN.md: the same HUD drawn in option A (pit wall broadcast)
// and option B (cream toy cards) over real frames of the world, plus the tokens, type,
// pieces and motion. Copy comes from content/ so nothing here is made up.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { projects, DOMAINS } from "@/content/projects";

type Variant = "A" | "B";
const project = projects.find((p) => p.featured) ?? projects[0];
const domain = DOMAINS.find((d) => d.id === project.domain)!;

export default function Specimen() {
  const [time, setTime] = useState<"day" | "night">("day");
  const [focus, setFocus] = useState<Variant | "both">("both");
  return (
    <main className="min-h-screen bg-[#11121c] pb-4 text-cream">
      {/* header */}
      <header className="mx-auto max-w-[1400px] px-4 pb-6 pt-10 sm:px-8 sm:pt-14">
        <div className="flex flex-wrap items-center gap-3">
          <span className="bg-red px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white">Proposal</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-cream/50">docs/DESIGN.md · waiting for your call</span>
        </div>
        <h1 className="mt-4 font-racing text-[40px] uppercase leading-none tracking-wide sm:text-[64px]">Design language</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-cream/70">
          The world stays folio-2025&apos;s look. This is only for what sits on top of it: HUD, panels, map, toasts and the E prompt. Same
          screen, two languages. Pick one and I&apos;ll move every component over, one commit each.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Seg value={focus} set={setFocus} options={[["both", "Side by side"], ["A", "A only"], ["B", "B only"]]} />
          <Seg value={time} set={setTime} options={[["day", "Day"], ["night", "Night"]]} />
        </div>
      </header>

      {/* the two screens */}
      <section className={`mx-auto grid max-w-[1400px] gap-6 px-4 sm:px-8 ${focus === "both" ? "lg:grid-cols-2" : ""}`}>
        {(focus === "both" ? (["A", "B"] as const) : [focus]).map((v) => (
          <figure key={v}>
            <figcaption className="mb-2 flex items-baseline justify-between">
              <span className="font-mono text-[12px] uppercase tracking-[0.16em]">
                <span className={v === "A" ? "text-red" : "text-cream"}>Option {v}</span>
                <span className="text-cream/50"> · {v === "A" ? "pit wall broadcast" : "cream toy cards"}</span>
              </span>
              {v === "A" && <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-cream/50">recommended</span>}
            </figcaption>
            <Screen v={v} time={time} />
          </figure>
        ))}
      </section>

      {/* tokens etc. */}
      <section className="mx-auto mt-16 max-w-[1400px] px-4 sm:px-8">
        <H2 n="01">Colour</H2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Ink", "#1f2133", "panels, text on cream"],
            ["Ink deep", "#171928", "labels, inactive tabs"],
            ["Cream", "#fff8ec", "text on ink, hairlines"],
            ["Red", "#ff4b3e", "the one accent"],
            ["Red deep", "#a3241c", "tab gradient"],
            ["Sector", "#9b6bff #45c46b #ffd23f", "timing only"],
          ].map(([name, hex, use]) => (
            <div key={name} className="border border-cream/15">
              <div className="flex h-20">
                {hex.split(" ").map((h) => (
                  <span key={h} className="flex-1" style={{ background: h }} />
                ))}
              </div>
              <div className="p-3">
                <p className="text-[14px] font-semibold">{name}</p>
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-cream/50">{hex}</p>
                <p className="mt-1 text-[12.5px] text-cream/60">{use}</p>
              </div>
            </div>
          ))}
        </div>

        <H2 n="02">Type</H2>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <TypeCard role="Title · Racero" note="one per panel, uppercase, 22-28 px">
            <p className="font-racing text-[30px] uppercase leading-none tracking-wide">{project.name}</p>
          </TypeCard>
          <TypeCard role="Body · Geist" note="14-15 px, sentence case">
            <p className="text-[15px] leading-relaxed text-cream/85">{project.tagline}.</p>
          </TypeCard>
          <TypeCard role="Labels · Geist Mono" note="11-12.5 px, caps, wide tracking">
            <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-cream/70">Pit garage · {domain.label}</p>
          </TypeCard>
        </div>

        <H2 n="03">Pieces · option A</H2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Piece name="Panel" note="ink gradient, square, 3 px cream hairline inset">
            <div className="map-frame relative h-28 w-full" />
          </Piece>
          <Piece name="Edge tabs" note="red = close / main action, ink = navigation; slide 4 px on hover">
            <div className="flex items-end gap-1 border-b border-cream/20 pt-6">
              <TabA active>Map</TabA>
              <TabA>Achievements 3/12</TabA>
              <span className="map-tab group relative ml-auto grid h-11 w-[50px] place-items-center overflow-hidden">
                <span className="absolute inset-x-0 top-0 h-[calc(100%+4px)] bg-[radial-gradient(ellipse_at_top_right,#ff4b3e,#a3241c)] transition-transform duration-150 group-hover:-translate-y-1" />
                <span className="relative text-[18px] leading-none">✕</span>
              </span>
            </div>
          </Piece>
          <Piece name="Buttons" note="primary red, secondary cream, quiet hairline; square">
            <div className="grid gap-2">
              <button className="bg-red px-3 py-2.5 text-[13px] font-semibold text-white">Hiring? Check the fit</button>
              <div className="grid grid-cols-2 gap-2">
                <button className="bg-cream px-3 py-2.5 text-[13px] font-semibold text-ink">Resume</button>
                <button className="border border-cream/40 px-3 py-2.5 text-[13px] font-semibold transition hover:border-cream">Close</button>
              </div>
            </div>
          </Piece>
          <Piece name="Pins, chips, key caps" note="hover the pins: folio-2025's springy pop">
            <div className="relative flex h-28 items-center justify-around">
              {["Podium", "Agents", "Mailbox"].map((l, i) => (
                <span key={l} className="map-pin group relative h-10 w-10 cursor-pointer">
                  <span className={`absolute left-1/2 top-1/2 -ml-2.5 -mt-2.5 h-5 w-5 rotate-45 border-4 border-ink shadow-[0_0_4px_#1f213377] ${i === 1 ? "bg-red" : "bg-cream"}`} />
                  <span className="pointer-events-none absolute bottom-[calc(100%-6px)] left-1/2 flex w-0 justify-center">
                    <span className="map-pin-name whitespace-nowrap bg-[#171928] px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-cream shadow-[0_0_4px_#0007]">
                      {l}
                    </span>
                  </span>
                </span>
              ))}
              <span className="flex gap-1">
                {["E", "M", "R"].map((k) => (
                  <Key key={k}>{k}</Key>
                ))}
              </span>
            </div>
          </Piece>
        </div>

        <H2 n="04">Motion</H2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Motion name="Pop in / out" curve="cubic-bezier(0.49, 2.2, 0.53, 0.75) · (0.65, -1, 0.45, 1) · 0.3 s" />
          <Motion name="Toast" curve="drop (0.4, 1.6, 0.65, 1) 0.6 s · leave (0.42, 0, 0.47, -0.55) 0.45 s" />
          <Motion name="Teleport wipe" curve="diagonal pattern wipe, 2 s in, 4 s out (world/Overlay.tsx)" />
        </div>

        <H2 n="05">What changes if you pick A</H2>
        <div className="mt-5 overflow-x-auto border border-cream/15">
          <table className="w-full min-w-[640px] text-left text-[13.5px]">
            <thead className="font-mono text-[11px] uppercase tracking-[0.12em] text-cream/50">
              <tr className="border-b border-cream/15">
                <th className="p-3 font-normal">Part</th>
                <th className="p-3 font-normal">Today</th>
                <th className="p-3 font-normal">After</th>
              </tr>
            </thead>
            <tbody className="text-cream/80">
              {[
                ["Top bar", "cream rounded cards", "ink edge tabs on the right edge"],
                ["Toast", "big tilted Racero pill", "one ink toast at a time, countdown bar"],
                ["Place panel", "cream rounded card", "ink panel, Racero title, mono labels"],
                ["Picks, fit check, lap chip", "cream cards and pills", "ink panels, square buttons"],
                ["Settings", "inside Controls", "small ink panel behind a gear tab"],
                ["Key hints, joystick, gas/brake", "cream pills", "key caps and square ink buttons"],
                ["Map", "already A", "—"],
                ["/resume", "cream paper", "stays (it prints)"],
              ].map(([a, b, c]) => (
                <tr key={a} className="border-b border-cream/10 last:border-0">
                  <td className="p-3 font-semibold text-cream">{a}</td>
                  <td className="p-3">{b}</td>
                  <td className="p-3">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="my-16 flex flex-wrap items-center justify-between gap-4 border-t border-cream/15 pt-6">
          <p className="max-w-xl text-[14px] text-cream/60">Reply with A or B (or what to change) and I&apos;ll move the HUD over and mark docs/DESIGN.md approved.</p>
          <Link href="/" className="bg-cream px-4 py-2.5 text-[13px] font-semibold text-ink">
            Back to the world
          </Link>
        </div>
      </section>
    </main>
  );
}

// ------------------------------------------------------------ the mock screen

// The HUD is drawn at 900 x 562 and scaled to the frame, so both options keep their proportions.
function Screen({ v, time }: { v: Variant; time: "day" | "night" }) {
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setK(el.clientWidth / 900));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="relative aspect-[16/10] w-full overflow-hidden bg-[#0b0b10]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/img/design/${time}.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: 900, height: 562, transform: `scale(${k})` }}>
        {v === "A" ? <HudA /> : <HudB />}
      </div>
    </div>
  );
}

function HudA() {
  return (
    <>
      {/* top-right edge tabs */}
      <div className="absolute right-0 top-4 flex flex-col gap-1.5">
        {["⌨", "▦", "♪"].map((g) => (
          <span key={g} className="map-tab relative grid h-10 w-11 place-items-center bg-[radial-gradient(ellipse_at_top_left,#1f2133,#171928)] text-[15px]">
            {g}
          </span>
        ))}
        <span className="relative grid h-10 w-11 place-items-center bg-[radial-gradient(ellipse_at_top_right,#ff4b3e,#a3241c)] text-[15px]">▤</span>
      </div>
      {/* toast */}
      <div className="absolute left-1/2 top-4 w-[300px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top_left,#1f2133,#171928)] px-4 pb-3 pt-3 shadow-[0_0_4px_#0007]">
        <span className="absolute inset-x-0 top-0 h-[2px] origin-right scale-x-[0.6] bg-red" />
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-cream/55">Achievement · 3/12</p>
        <p className="mt-0.5 text-[14px] font-semibold">Back of the net</p>
      </div>
      {/* place panel */}
      <div className="map-frame absolute bottom-4 left-4 w-[330px] p-5">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-cream/55">Pit garage · {domain.label}</p>
        <p className="mt-1.5 font-racing text-[24px] uppercase leading-none tracking-wide">{project.name}</p>
        <p className="mt-2 text-[13.5px] leading-snug text-cream/80">{project.tagline}.</p>
        <div className="mt-3 flex items-baseline gap-2 border-t border-cream/15 pt-3">
          <span className="font-racing text-[22px] text-red">{project.headline.value}</span>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-cream/55">{project.headline.label}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {project.stack.slice(0, 4).map((s) => (
            <span key={s} className="bg-[#171928] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-cream/75">
              {s}
            </span>
          ))}
        </div>
      </div>
      {/* E prompt */}
      <div className="absolute left-[58%] top-[40%] flex items-center">
        <span className="relative grid h-9 w-9 rotate-45 place-items-center border-[3px] border-cream bg-[#1f2133]">
          <span className="-rotate-45 font-mono text-[13px] font-semibold">E</span>
        </span>
        <span className="-ml-1 bg-[#171928] py-1 pl-3 pr-2 font-mono text-[11px] uppercase tracking-[0.12em]">Open garage</span>
      </div>
      {/* key hints + speed */}
      <div className="absolute bottom-4 right-4 flex items-end gap-3">
        <div className="flex gap-1">
          {["W", "A", "S", "D"].map((k) => (
            <Key key={k}>{k}</Key>
          ))}
        </div>
        <div className="map-frame relative px-3 py-2 text-right">
          <span className="font-racing text-[26px] leading-none">212</span>
          <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.12em] text-cream/55">km/h</span>
        </div>
      </div>
    </>
  );
}

function HudB() {
  return (
    <>
      <div className="absolute right-4 top-4 flex gap-2">
        {["⌨", "▦", "♪"].map((g) => (
          <span key={g} className="toy-card grid h-10 w-10 place-items-center rounded-2xl text-[15px] text-ink">
            {g}
          </span>
        ))}
        <span className="toy-card grid h-10 place-items-center rounded-2xl px-3 text-[13px] font-semibold text-ink">Resume</span>
      </div>
      <div className="absolute left-1/2 top-16 -translate-x-1/2 -rotate-3">
        <span className="block rounded-xl bg-red px-5 py-2 font-racing text-[22px] tracking-wider text-white shadow-xl">Back of the net</span>
      </div>
      <div className="toy-card absolute bottom-4 left-4 w-[330px] rounded-[26px] p-5 text-ink">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">Pit garage · {domain.label}</p>
        <p className="mt-1.5 font-racing text-[24px] uppercase leading-none tracking-wide">{project.name}</p>
        <p className="mt-2 text-[13.5px] leading-snug text-ink-soft">{project.tagline}.</p>
        <div className="mt-3 flex items-baseline gap-2 rounded-2xl bg-cream px-3 py-2">
          <span className="font-racing text-[22px] text-red">{project.headline.value}</span>
          <span className="text-[12px] text-ink-soft">{project.headline.label}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {project.stack.slice(0, 4).map((s) => (
            <span key={s} className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">
              {s}
            </span>
          ))}
        </div>
      </div>
      <div className="absolute left-[58%] top-[40%] flex items-center gap-2 rounded-full bg-white/95 py-1.5 pl-1.5 pr-4 text-ink shadow-xl">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[12px] font-bold text-white">E</span>
        <span className="text-[13px] font-semibold">Open garage</span>
      </div>
      <div className="absolute bottom-4 right-4 flex items-end gap-3">
        <div className="flex gap-1">
          {["W", "A", "S", "D"].map((k) => (
            <span key={k} className="toy-card grid h-8 w-8 place-items-center rounded-lg text-[12px] font-bold text-ink">
              {k}
            </span>
          ))}
        </div>
        <div className="toy-card rounded-2xl px-3 py-2 text-right text-ink">
          <span className="font-racing text-[26px] leading-none">212</span>
          <span className="ml-1 text-[11px] text-ink-soft">km/h</span>
        </div>
      </div>
    </>
  );
}

// ------------------------------------------------------------ bits

function Seg<T extends string>({ value, set, options }: { value: T; set: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="flex border border-cream/20">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => set(v)}
          className={`px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition ${value === v ? "bg-cream text-ink" : "text-cream/60 hover:text-cream"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function H2({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <h2 className="mt-14 flex items-baseline gap-3 border-b border-cream/15 pb-3 first:mt-0">
      <span className="font-mono text-[12px] text-red">{n}</span>
      <span className="font-racing text-[26px] uppercase tracking-wide">{children}</span>
    </h2>
  );
}

function TypeCard({ role, note, children }: { role: string; note: string; children: React.ReactNode }) {
  return (
    <div className="map-frame relative p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-cream/50">{role}</p>
      <div className="mt-4 min-h-[56px]">{children}</div>
      <p className="mt-4 text-[12.5px] text-cream/50">{note}</p>
    </div>
  );
}

function Piece({ name, note, children }: { name: string; note: string; children: React.ReactNode }) {
  return (
    <div className="border border-cream/15 p-4">
      <div className="min-h-[120px]">{children}</div>
      <p className="mt-3 text-[14px] font-semibold">{name}</p>
      <p className="text-[12.5px] text-cream/55">{note}</p>
    </div>
  );
}

function TabA({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`map-tab relative px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] ${active ? "bg-[#1f2133] text-cream" : "bg-[#171928]/80 text-cream/55"}`}
    >
      {children}
    </span>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return <span className="grid h-7 w-7 place-items-center bg-cream font-mono text-[12px] font-semibold text-ink shadow-[0_2px_0_#0006]">{children}</span>;
}

function Motion({ name, curve }: { name: string; curve: string }) {
  return (
    <div className="group border border-cream/15 p-4">
      <div className="relative h-20 overflow-hidden">
        <span className="absolute left-2 top-1/2 h-6 w-6 -translate-y-1/2 rotate-45 border-4 border-ink bg-cream transition-[left] duration-700 [transition-timing-function:cubic-bezier(0.49,2.2,0.53,0.75)] group-hover:left-[calc(100%-2rem)]" />
      </div>
      <p className="text-[14px] font-semibold">{name}</p>
      <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-cream/50">{curve}</p>
      <p className="mt-1 text-[11.5px] text-cream/40">hover to play</p>
    </div>
  );
}
