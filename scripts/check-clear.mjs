// Lists anything placed on the road or the pit lane: tyre walls, floodlights, boards,
// marshal posts, grandstands, town buildings, bushes. Run before committing layout work:
//   node scripts/check-clear.mjs
// Loads the TypeScript layout with jiti (comes with the Next toolchain).
import { createRequire } from "node:module";
const cwd = process.cwd();
const { createJiti } = createRequire(cwd + "/package.json")("jiti");
const jiti = createJiti(cwd + "/x.js", { alias: { "@/": cwd + "/" } });
const L = await jiti.import(cwd + "/components/world/layout.ts");
const S = await jiti.import(cwd + "/components/world/street/layoutStreet.ts");
const ST = await jiti.import(cwd + "/components/world/street/standSpots.ts");
const T = await jiti.import(cwd + "/components/world/street/town.ts");
const B = await jiti.import(cwd + "/components/world/park/bushes.ts");
const TS = await jiti.import(cwd + "/components/world/districts/townStreets.ts");

const HALF = L.TRACK_WIDTH / 2;
const lanes = L.pitRoadCurves().map((c) => c.getSpacedPoints(60));
const LANE = L.PIT_LANE_WIDTH / 2;
/** Distance (m) from (x, z) to the nearest bit of tarmac, negative when on it. */
function tarmac(x, z) {
  let d = L.nearestT(x, z).dist - HALF;
  // pit lane strip (signed distance to its rectangle)
  const qx = Math.abs(x - (L.PIT.from + L.PIT.to) / 2) - (L.PIT.to - L.PIT.from + 10) / 2;
  const qz = Math.abs(z - L.PIT.z) - LANE;
  d = Math.min(d, Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0));
  for (const pts of lanes) for (const p of pts) d = Math.min(d, Math.hypot(p.x - x, p.z - z) - LANE);
  return d;
}

const bad = [];
const check = (kind, x, z, r) => {
  const d = tarmac(x, z);
  if (d < r) bad.push(`${kind.padEnd(12)} at ${x.toFixed(1)}, ${z.toFixed(1)}  ${(d - r).toFixed(2)} m into the road`);
};
for (const w of S.TYRE_WALLS) check("tyre wall", w.x, w.z, 0.5);
for (const f of S.FLOODS) check("floodlight", f.x, f.z, 0.6);
for (const b of S.BOARDS) check("board", b.x, b.z, 0.3);
for (const m of S.MARSHALS) check("marshal", m.x, m.z, 1);
for (const s of ST.STAND_SPOTS) {
  const c = Math.cos(s.yaw), sn = Math.sin(s.yaw);
  for (const [lx, lz] of [[-5.4, -2.7], [5.4, -2.7], [-5.4, 2.1], [5.4, 2.1], [0, 2.1]]) check("grandstand", s.x + lx * c + lz * sn, s.z - lx * sn + lz * c, 0);
}
for (const b of T.BUILDINGS) check("building", b.x, b.z, Math.min(b.w, b.d) / 2);
for (const b of B.BUSHES ?? []) check("bush", b.x, b.z, 0.5 * b.s);
const at = (m) => [m.elements[12], m.elements[14]];
for (const m of TS.STREETS.bollards) check("bollard", ...at(m), 0.2);
for (const m of [...TS.STREETS.tables, ...TS.STREETS.chairs]) check("cafe", ...at(m), 0.4);
for (const t of TS.STREETS.trees) check("street tree", t.x, t.z, 0.6);
for (const s of [TS.STREETS.busStop, TS.STREETS.kiosk].filter(Boolean)) check("stop/kiosk", s.x, s.z, 1.8);
console.log(bad.length ? bad.join("\n") : "clear: nothing on the road or the pit lane");
process.exit(bad.length ? 1 : 0);
