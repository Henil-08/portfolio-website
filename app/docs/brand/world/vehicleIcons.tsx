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

/* Baja buggy: a sloped tube cage over a single seat, coilovers, big knobby tyres. */
const Baja = () => (
  <Icon
    knobs
    gap={1}
    wheels={[
      { x: 12, y: 19.5, r: 6.5 },
      { x: 51.5, y: 19.5, r: 6.5 },
    ]}
    body={[
      // floor, side panel and motor bay
      "M6.5 15.2H21L22.6 10.4H40L46.6 14.2L56.6 15.2V17.4L46 18.2H18L6.5 17.6Z",
    ].join("")}
    extra={
      <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
        {/* rear hoop, roof, sloped front bracing, front bulkhead */}
        <path d="M22 15.5L23.6 3.4H37L45.4 12.6L47.8 15.4" />
        {/* side impact member and rear bay */}
        <path d="M23 10.5L44 10.8M22.6 8.6L9 13.4" />
        {/* coilovers to the hubs */}
        <path d="M14.5 18L20.5 6.5M48.5 18L41.8 8.4" strokeWidth="1.1" />
      </g>
    }
  />
);

/* Roadster: a low faceted wedge, canopy to the tail, swan-neck wing on struts. */
const Roadster = () => (
  <Icon
    wheels={[
      { x: 14.5, y: 20.4, r: 5.1 },
      { x: 50, y: 20.4, r: 5.1 },
    ]}
    body={[
      // tail, ducktail, rear deck, canopy, windscreen, long flat nose, chin, sill
      "M2.8 21.8L2.5 15.8L4.2 14.4L13 13.6L18.5 12.4L26.6 9.8H31L40.2 13.4L61.4 18.4L62.2 20.2L58.8 22.2L5 22.6Z",
      // swan-neck wing: the plane, struts hooked over its top
      "M1.4 8.8L10.6 8.2V9.6L1.8 10.2Z",
    ].join("")}
    cuts="M17.2 13.4L40.4 14.4M52.8 18.6L60.2 20"
    extra={<path d="M9.6 14C9.8 11 9.4 8.2 7.2 7.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />}
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
