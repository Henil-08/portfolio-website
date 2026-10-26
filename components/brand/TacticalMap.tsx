"use client";

// The tactical map (docs/BRAND.md S04), drawn from the real world data in world units: the
// coast (layout.ts coastR), sea and lakes hatched, the river, every building (street/town.ts),
// the garages, the pit lane and the track at true width, an 8x8 grid with references, sector
// labels, coded zone pins, the objective pinging, the player's arrow and view cone, a scale
// bar. `player` is either fixed (docs page) or "live", read from carState every frame.
import { useEffect, useRef, useState } from "react";
import { GARAGES, LAKES, PIT, PIT_LANE_WIDTH, RIVER, START_T, TRACK_WIDTH, coastR, trackPoint, trackTangent, zones, type ZoneId } from "@/components/world/layout";
import { BUILDINGS } from "@/components/world/street/town";
import { carState } from "@/components/world/carState";
import { d } from "./motion";
import { DS, pad } from "./tokens";

const GRID_N = 8;
const COLS = "ABCDEFGH";

/** The map's square in world units: the coast's bounding box, padded. */
export const MAP = (() => {
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (let i = 0; i < 360; i++) {
    const a = (i / 360) * Math.PI * 2;
    const r = coastR(a);
    x0 = Math.min(x0, Math.cos(a) * r);
    x1 = Math.max(x1, Math.cos(a) * r);
    z0 = Math.min(z0, Math.sin(a) * r);
    z1 = Math.max(z1, Math.sin(a) * r);
  }
  const half = Math.ceil(Math.max(x1 - x0, z1 - z0) / 2 + 9);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  return { cx, cz, half, x0: cx - half, z0: cz - half, size: half * 2, cell: (half * 2) / GRID_N };
})();

/** Grid reference for a world point, like "E4". */
export function gridRef(x: number, z: number) {
  const c = Math.max(0, Math.min(GRID_N - 1, Math.floor((x - MAP.x0) / MAP.cell)));
  const r = Math.max(0, Math.min(GRID_N - 1, Math.floor((z - MAP.z0) / MAP.cell)));
  return `${COLS[c]}${r + 1}`;
}

const coastPath = (() => {
  let p = "";
  for (let i = 0; i <= 360; i++) {
    const a = (i / 360) * Math.PI * 2;
    const r = coastR(a);
    p += `${i ? "L" : "M"}${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`;
  }
  return p + "Z";
})();
const trackPath = (() => {
  const pts = Array.from({ length: 400 }, (_, k) => trackPoint(k / 400));
  return pts.map((p, k) => `${k ? "L" : "M"}${p.x.toFixed(1)} ${p.z.toFixed(1)}`).join("") + "Z";
})();
/** A footprint's corners, turned like three.js turns it about y (map: x right, z down). */
function corners(x: number, z: number, w: number, dd: number, yaw: number) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [
    [-w / 2, -dd / 2],
    [w / 2, -dd / 2],
    [w / 2, dd / 2],
    [-w / 2, dd / 2],
  ]
    .map(([lx, lz]) => `${(x + lx * c + lz * s).toFixed(1)},${(z - lx * s + lz * c).toFixed(1)}`)
    .join(" ");
}
const start = trackPoint(START_T);
const startTan = trackTangent(START_T);
const START_DEG = (Math.atan2(startTan.z, startTan.x) * 180) / Math.PI;

export type Player = { x: number; z: number; deg: number } | "live";

export default function TacticalMap({
  player,
  found = [],
  objective,
  onPick,
  className = "",
}: {
  player: Player;
  found?: ZoneId[];
  objective?: ZoneId | null;
  onPick?: (zone: ZoneId) => void;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const me = useRef<SVGGElement>(null);
  const { x0, z0, size, cell } = MAP;

  // live: follow the car in one rAF loop, straight onto the SVG transform
  useEffect(() => {
    if (player !== "live") return;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const deg = (Math.atan2(carState.forward.z, carState.forward.x) * 180) / Math.PI;
      me.current?.setAttribute("transform", `translate(${carState.pos.x.toFixed(2)} ${carState.pos.z.toFixed(2)}) rotate(${deg.toFixed(1)})`);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [player]);

  const fixed = player === "live" ? null : player;
  return (
    <svg viewBox={`${x0} ${z0} ${size} ${size}`} preserveAspectRatio="xMidYMid meet" className={className}>
      <defs>
        <pattern id="map-sea" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="3" stroke="#cfcdc4" strokeWidth="0.7" />
        </pattern>
      </defs>
      <rect x={x0} y={z0} width={size} height={size} fill="url(#map-sea)" />
      <path d={coastPath} fill="#fbfaf7" stroke="#111" strokeWidth="0.9" className="dsa-rise" style={d(200)} />
      {LAKES.map((l, k) => (
        <ellipse key={k} cx={l.x} cy={l.z} rx={l.rx} ry={l.rz} transform={`rotate(${(-l.yaw * 180) / Math.PI} ${l.x} ${l.z})`} fill="url(#map-sea)" stroke="#111" strokeWidth="0.5" />
      ))}
      <polyline points={RIVER.pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="#d6d3ca" strokeWidth="5.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* grid: 8x8 with references along two edges */}
      {Array.from({ length: GRID_N - 1 }, (_, k) => (
        <g key={k} stroke="#111" strokeOpacity="0.14" strokeWidth="0.35">
          <line x1={x0 + (k + 1) * cell} y1={z0} x2={x0 + (k + 1) * cell} y2={z0 + size} />
          <line x1={x0} y1={z0 + (k + 1) * cell} x2={x0 + size} y2={z0 + (k + 1) * cell} />
        </g>
      ))}
      {Array.from({ length: GRID_N }, (_, k) => (
        <g key={k} fontFamily="var(--font-plex-mono)" fontSize="3.6" fill="#5d5d58">
          <text x={x0 + k * cell + cell / 2} y={z0 + 4.5} textAnchor="middle">
            {COLS[k]}
          </text>
          <text x={x0 + 2} y={z0 + k * cell + cell / 2 + 1.2}>
            {k + 1}
          </text>
        </g>
      ))}
      {/* track and pit lane: outlined roads at true width, an orange start line */}
      <path d={trackPath} fill="none" stroke="#111" strokeWidth={TRACK_WIDTH + 1.2} strokeLinejoin="round" pathLength={1} className="map-draw" style={d(250)} />
      <path d={trackPath} fill="none" stroke="#c9c6bd" strokeWidth={TRACK_WIDTH - 1} strokeLinejoin="round" className="dsa-rise" style={d(900)} />
      <rect x={PIT.from} y={PIT.z - PIT_LANE_WIDTH / 2} width={PIT.to - PIT.from} height={PIT_LANE_WIDTH} fill="#c9c6bd" stroke="#111" strokeWidth="0.6" className="dsa-rise" style={d(900)} />
      {/* an SVG transform sits on an outer group; the CSS pop on the inner one would replace it */}
      <g transform={`rotate(${START_DEG} ${start.x} ${start.z})`}>
        <rect x={start.x - 0.8} y={start.z - TRACK_WIDTH / 2} width="1.6" height={TRACK_WIDTH} fill={DS.orange} className="dsa-pop" style={d(1000)} />
      </g>
      {/* buildings (darker with more floors), then the garages */}
      {BUILDINGS.map((b, k) => (
        <polygon key={k} points={corners(b.x, b.z, b.w, b.d, b.yaw)} fill="#111" fillOpacity={0.55 + Math.min(0.4, b.floors * 0.08)} className="dsa-pop" style={d(500 + (k % 30) * 18)} />
      ))}
      {GARAGES.map((gr, k) => (
        <rect key={gr.domain} x={gr.x - 4.5} y={PIT.garageZ - 9} width="9" height="7" fill="#111" className="dsa-pop" style={d(600 + k * 40)} />
      ))}
      {zones.slice(0, 4).map((z, k) => (
        <text key={z.id} x={z.pos[0]} y={z.pos[1] - 9} textAnchor="middle" fontFamily="var(--font-plex-mono)" fontSize="4.2" fontWeight="600" fill="#5d5d58" className="dsa-rise" style={d(1100 + k * 60)}>
          S{k + 1}
        </text>
      ))}
      {objective && (
        <g transform={`translate(${zones.find((z) => z.id === objective)!.pos.join(" ")})`}>
          <circle r="6" fill="none" stroke={DS.orange} strokeWidth="0.9" className="map-ping" />
          <circle r="6" fill="none" stroke={DS.orange} strokeWidth="0.9" className="map-ping" style={{ animationDelay: "0.9s" }} />
        </g>
      )}
      {/* the player: an orange arrow and its view cone */}
      <g ref={me} transform={fixed ? `translate(${fixed.x} ${fixed.z}) rotate(${fixed.deg})` : undefined}>
        <g className="dsa-pop" style={d(1300)}>
          <path d="M0 0 L26 -11 A28 28 0 0 1 26 11 Z" fill={DS.orange} fillOpacity="0.16" />
          <path d="M5 0 L-3.5 -3.6 L-1.8 0 L-3.5 3.6 Z" fill={DS.orange} stroke="#111" strokeWidth="0.4" />
        </g>
      </g>
      {zones.map((z, k) => {
        const on = hover === k;
        const obj = z.id === objective;
        const seen = found.includes(z.id);
        return (
          <g
            key={z.id}
            transform={`translate(${z.pos[0]} ${z.pos[1]})`}
            onMouseEnter={() => setHover(k)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onPick?.(z.id)}
            className={onPick ? "cursor-pointer" : undefined}
          >
            <rect className="dsa-pop" style={d(1150 + k * 35)} x="-5.2" y="-3.1" width="10.4" height="6.2" fill={on || obj ? "#111" : "#fff"} stroke={obj ? DS.orange : "#111"} strokeWidth={obj ? 0.9 : 0.6} />
            <text y="1.25" textAnchor="middle" fontFamily="var(--font-plex-mono)" fontSize="3.3" fontWeight="600" fill={on || obj ? "#fff" : "#111"} className="dsa-rise" style={d(1200 + k * 35)}>
              Z{pad(k + 1)}
            </text>
            {seen && !on && !obj && <rect x="3.4" y="-4.6" width="2.4" height="2.4" fill="#111" />}
            {on && (
              <g transform="translate(0 -6)">
                <rect x={-(z.label.length * 1.15 + 3)} y="-6" width={z.label.length * 2.3 + 6} height="6.4" fill="#fff" stroke="#111" strokeWidth="0.6" />
                <text y="-1.6" textAnchor="middle" fontFamily="var(--font-plex)" fontSize="3.6" fontWeight="600" fill="#111">
                  {z.label}
                </text>
              </g>
            )}
          </g>
        );
      })}
      {/* scale bar, 25 m */}
      <g transform={`translate(${x0 + 6} ${z0 + size - 7})`} fontFamily="var(--font-plex-mono)" fontSize="3.2" fill="#111">
        <rect width="25" height="1.6" fill="#111" />
        <rect x="12.5" width="12.5" height="1.6" fill="#fff" stroke="#111" strokeWidth="0.3" />
        <text y="-1.6">0</text>
        <text x="25" y="-1.6" textAnchor="end">
          25 m
        </text>
      </g>
    </svg>
  );
}

/** The compass that sits in a map frame's corner. */
export function Compass() {
  return (
    <div className="absolute right-3 top-3 grid h-11 w-11 place-items-center border-2 border-ink bg-white font-mono text-[11px] font-semibold">
      <span className="absolute top-0.5">N</span>
      <span className="mt-2 block h-0 w-0 border-x-[5px] border-b-[10px] border-x-transparent border-b-ink" />
    </div>
  );
}
