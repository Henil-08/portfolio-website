"use client";

// Side profiles of the four garage vehicles for the loadout cards: viewBox 0 0 64 28,
// fill="currentColor" from the parent <svg>, nose to the right, ground at y = 26.
// Each body is masked clear of its wheels so the tyres read as crisp rings.
import { useId, type ReactNode } from "react";

type Wheel = { x: number; y: number; r: number };

/** A tyre ring with a hub: outer circle, the rim cut out, a hub dot (even-odd). */
function ring({ x, y, r }: Wheel, rim = 0.5, hub = 0.2) {
  const c = (cr: number) => `M${x - cr} ${y}a${cr} ${cr} 0 1 0 ${cr * 2} 0a${cr} ${cr} 0 1 0 ${-cr * 2} 0`;
  return `${c(r)}${c(r * rim)}${c(r * hub)}`;
}

/** A knobby tyre: a toothed outline, the rim cut out, a hub dot (even-odd). */
function knobby({ x, y, r }: Wheel, n = 14) {
  let d = "";
  for (let i = 0; i < n * 2; i++) {
    const a0 = (i / (n * 2)) * Math.PI * 2;
    const a1 = ((i + 1) / (n * 2)) * Math.PI * 2;
    const rr = i % 2 ? r - 0.9 : r;
    const p = (a: number) => `${(x + Math.cos(a) * rr).toFixed(2)} ${(y + Math.sin(a) * rr).toFixed(2)}`;
    d += `${i ? "L" : "M"}${p(a0)}L${p(a1)}`;
  }
  const c = (cr: number) => `M${x - cr} ${y}a${cr} ${cr} 0 1 0 ${cr * 2} 0a${cr} ${cr} 0 1 0 ${-cr * 2} 0`;
  return `${d}Z${c(r * 0.52)}${c(r * 0.2)}`;
}

function Icon({ body, wheels, gap = 1.1, knobs = false, extra, cuts }: { body: string; wheels: Wheel[]; gap?: number; knobs?: boolean; extra?: ReactNode; cuts?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <g>
      <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="28">
        <rect width="64" height="28" fill="#fff" />
        {wheels.map((w, i) => (
          <circle key={i} cx={w.x} cy={w.y} r={w.r + gap} fill="#000" />
        ))}
        {/* hairline cuts that split panels: canopy from body, a headlight */}
        {cuts && <path d={cuts} fill="none" stroke="#000" strokeWidth="0.85" strokeLinecap="round" />}
      </mask>
      <g mask={`url(#${id})`}>
        <path d={body} />
        {extra}
      </g>
      <path fillRule="evenodd" d={wheels.map((w) => (knobs ? knobby(w) : ring(w))).join("")} />
    </g>
  );
}

/* F1: tall rear wing, engine cover rising to the airbox, halo, long low nose, front wing. */
const F1 = () => (
  <Icon
    wheels={[
      { x: 13, y: 20.5, r: 5.5 },
      { x: 49, y: 20.8, r: 5.2 },
    ]}
    body={[
      // rear wing: endplate and main plane
      "M1.5 6.5H9.6V8.6L8.4 9V16.2H3.2L1.5 13.5Z",
      // engine cover up to the airbox, halo, nose down to the front wing
      "M8 17.4V14.2C13 13.8 18 12.2 22.5 9.8L24.4 8.7H27.6L28.6 11.2H30.6C32 10.4 34 10.4 35.4 11.4L37.4 13C44 13.8 51 15.6 57.8 18.2V19.6H44.5V22H17.5V19.2Z",
      // front wing and endplate
      "M50.8 21.4H62.6V24H50.8ZM58.6 18H62.6V24H58.6Z",
    ].join("")}
  />
);

/* E14 Baja buggy: the triangular firewall at the back, a tall level-roofed cage dropping to the
   bumper, a boxy side panel high off the ground, big knobby tyres. */
const Baja = () => (
  <Icon
    knobs
    gap={1}
    wheels={[
      { x: 12.5, y: 19.3, r: 6.7 },
      { x: 51, y: 19.3, r: 6.7 },
    ]}
    body={[
      // the firewall tent: apex on the hoop top, down to the back of the bay
      "M7.6 13L20.2 1.6H22.2V12.6Z",
      // side panel, the angled front corner with the plate
      "M7.6 12.2H46.8L50.4 13.2V17.4L45.2 18.3H17.6L7.6 17.2Z",
    ].join("")}
    cuts="M46.6 12.6V18"
    extra={
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
        {/* level roof, front bracing to the bumper, the pillar to the dash, the bumper bar */}
        <path d="M21.4 2.4H38.2L48.8 12.6M38.2 2.4L42 12.4M47 12.6H53" />
        {/* coilovers to the hubs */}
        <path d="M12.6 18.2L18.4 8.4M50.8 18.4L46.2 10.8" strokeWidth="1.1" />
      </g>
    }
  />
);

/* Roadster: very low and long, a dark canopy from the windscreen over the roof, a sharp nose,
   a wide wing high on two struts. */
const Roadster = () => (
  <Icon
    wheels={[
      { x: 14, y: 21.3, r: 4.8 },
      { x: 50.4, y: 21.3, r: 4.8 },
    ]}
    body={[
      // tail, rear deck, canopy over the roof, windscreen, long hood, the nose's knife edge, sill
      "M3 22.8L2.6 16.4L8.6 15.4L14 14.8C20 12 25 10.8 30 10.8C34 10.8 38.6 12.4 42.4 14.4L55.8 17.2L62.6 18.6L62.2 21.2L58.6 22.8L5.6 23.2Z",
      // the wing, wider than the tail
      "M0.6 9.8L12.2 9.2V10.8L1 11.4Z",
    ].join("")}
    cuts="M14.6 15.2C24 14 34 13.8 42 14.6M56 17.6L62 18.9"
    extra={<path d="M8.4 15.4L6.6 10.8M11.4 15.1L10 10.6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />}
  />
);

/* Sport bike: beak nose and screen, tank, dipped seat, high pointed tail, swingarm, raked fork. */
const Bike = () => (
  <Icon
    gap={1}
    wheels={[
      { x: 14, y: 20.3, r: 6.2 },
      { x: 49.2, y: 20.3, r: 6.2 },
    ]}
    body={[
      // tail tip, seat, tank, screen, beak, lower fairing, belly, under the tail
      "M6.4 8.2L8.4 8.6L17 12.2L25.6 13L29.6 9.8L35.6 8.4L37 4.2L44 7.6L48 10.4L45.6 11.8L42.4 13.6L40.2 21.6H29L26.2 17.6L22 16L17 14.6L8.6 10.6Z",
      // swingarm to the rear axle
      "M27.6 16.6L28.6 19L14.2 21.6L14 19.2Z",
      // fork from the top clamp to the axle
      "M41.4 8.4L43.4 7.4L50.2 19.8L48.2 20.8Z",
    ].join("")}
    cuts="M42.6 9.4L45.4 10.2"
  />
);

export const VEHICLE_ICONS: Record<"V01" | "V02" | "V03" | "V04", ReactNode> = {
  V01: <F1 />,
  V02: <Baja />,
  V03: <Roadster />,
  V04: <Bike />,
};
