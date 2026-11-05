// Waterfront kit (concepts boat, pier). Builders return cached Models (see ./shared).
import { cbox, hull, inset, model, prism, ring, rod, vbox, box, type Kit, type V2, type V3 } from "./shared";

/** Boat deck outline in plan (bow +X), counter-clockwise. */
const DECK: V2[] = [
  [3.55, 0],
  [3.1, 0.42],
  [2.3, 0.95],
  [0.6, 1.24],
  [-3.2, 1.14],
  [-3.2, -1.14],
  [0.6, -1.24],
  [2.2, -0.98],
  [3.0, -0.48],
];

/** Deck height, gunwale top and the waterline height to sink the boat to. */
export const BOAT = { deck: 0.95, top: 1.42, waterline: 0.4, length: 6.6, beam: 2.5 };

/** Centre-console launch: a faceted paper hull with an ink gunwale, an orange rubbing strake, a paper cabin frame with glass and an ink T-top. 6.6 m, bow +X. */
export function boatModel() {
  return model("kit-boat-v2", (k) => {
    const { deck, top } = BOAT;
    const pts: V3[] = DECK.map(([x, z]): V3 => [x, deck, z]);
    const chine: V2[] = [
      [3.2, 0],
      [2.55, 0.58],
      [0.6, 1.12],
      [-3.1, 1.06],
    ];
    for (const [x, z] of chine) pts.push([x, 0.42, z], [x, 0.42, -z]);
    pts.push([-3.0, 0, 0.3], [-3.0, 0, -0.3], [1.8, 0, 0.22], [1.8, 0, -0.22], [3.0, 0.26, 0]);
    k.add("paper", hull(pts));
    // bulwark, strake and the ink gunwale cap
    k.add("paper", ring(DECK, inset(DECK, 0.09), deck - 0.01, top));
    k.add("orange", ring(inset(DECK, -0.025), inset(DECK, 0.02), top - 0.2, top - 0.14));
    k.add("ink", ring(inset(DECK, -0.02), inset(DECK, 0.2), top, top + 0.05));
    // swim platform
    k.add("paper", cbox(0.34, 0.08, 1.9, 0.02), { p: [-3.36, 0.62, 0] });
    // seats: stern bench and a bow seat
    k.add("ink", cbox(0.5, 0.3, 1.8, 0.03), { p: [-2.7, deck + 0.15, 0] });
    k.add("ink", cbox(0.6, 0.26, 0.9, 0.03), { p: [2.1, deck + 0.13, 0] });
    // cabin frame: lower side walls, four posts, glass, console and an ink T-top
    const xb = -0.75;
    const xf = 0.55;
    const zc = 0.78;
    // an open wheelhouse: posts and a windscreen, no side walls, seats and a console inside
    for (const sz of [-1, 1]) {
      k.add("paper", box(0.08, 1.38, 0.08), { p: [xb, deck + 0.69, sz * zc] });
      k.add("paper", box(0.08, 1.38, 0.08), { p: [xf, deck + 0.69, sz * zc] });
      k.add("paper", box(xf - xb, 0.08, 0.08), { p: [(xb + xf) / 2, deck + 1.3, sz * zc] });
    }
    k.add("paper", box(0.08, 0.62, zc * 2), { p: [xf, deck + 0.31, 0] });
    k.add("glass", box(0.02, 0.66, zc * 2 - 0.1), { p: [xf + 0.08, deck + 0.98, 0], r: [0, 0, -0.25] });
    k.add("paper", cbox(0.55, 0.9, 0.6, 0.03), { p: [0.15, deck + 0.45, 0.2] });
    k.add("ink", cbox(0.4, 0.06, 0.5, 0.02), { p: [0.15, deck + 0.93, 0.2] });
    for (const sz of [-0.32, 0.36]) {
      k.add("ink", cbox(0.42, 0.12, 0.44, 0.02), { p: [-0.42, deck + 0.42, sz] });
      k.add("ink", cbox(0.08, 0.42, 0.44, 0.02), { p: [-0.64, deck + 0.68, sz] });
      k.add("paper", box(0.3, 0.36, 0.34), { p: [-0.42, deck + 0.18, sz] });
    }
    k.add("ink", prism(0.12, 0.12, 0.02, 10), { p: [0.3, deck + 1.0, 0.2], r: [0, 0, 1.1] });
    k.add("ink", cbox(1.75, 0.1, 1.8, 0.05), { p: [(xb + xf) / 2, deck + 1.43, 0] });
  });
}

/** Pier dimensions: deck top height, width and one module's length. */
export const PIER = { h: 2.0, w: 3.2, seg: 4.0 };

export type PierOpts = { h?: number; w?: number; seg?: number; rails?: [boolean, boolean] };

/** One pier module from x0 to x0 + seg along +X: concrete deck slab, ink cap beam and two ink piles, ink railings with a paper handrail. Deck top at h. */
export function addPierSegment(k: Kit, x0: number, o: PierOpts = {}) {
  const { h = PIER.h, w = PIER.w, seg = PIER.seg, rails = [true, true] } = o;
  const t = 0.36;
  k.add("concrete", cbox(seg - 0.04, t, w, 0.05), { p: [x0 + seg / 2, h - t / 2, 0] });
  const xb = x0 + 0.5;
  const capH = Math.min(0.58, (h - t) * 0.4);
  k.add("ink", cbox(0.78, capH, w - 0.1, 0.2), { p: [xb, h - t - capH / 2, 0] });
  const pile = h - t - capH;
  for (const z of [-(w / 2 - 0.6), w / 2 - 0.6]) k.add("ink", vbox(0.6, pile, 0.6, 0.1), { p: [xb, pile / 2, z] });
  rails.forEach((on, i) => {
    if (on) addPierRail(k, x0, x0 + seg, (i === 0 ? -1 : 1) * (w / 2 - 0.12), h);
  });
}

/** A railing run from xa to xb along the deck edge at z: ink posts about every 1.35 m, two ink rails, a paper handrail. */
export function addPierRail(k: Kit, xa: number, xb: number, z: number, h = PIER.h) {
  const len = xb - xa;
  const n = Math.max(1, Math.round(len / 1.35));
  for (let j = 0; j < n; j++) {
    const x = xa + 0.3 + j * ((len - 0.3) / n);
    k.add("ink", box(0.06, 1.0, 0.06), { p: [x, h + 0.5, z] });
    k.add("ink", box(0.12, 0.03, 0.12), { p: [x, h + 0.015, z] });
  }
  for (const y of [0.32, 0.62]) k.add("ink", rod([xa, h + y, z], [xb, h + y, z], 0.025, 6));
  k.add("paper", cbox(len, 0.07, 0.11, 0.015), { p: [(xa + xb) / 2, h + 1.03, z] });
}

/** A rail across the pier's end at x. */
export function addPierHead(k: Kit, x: number, o: PierOpts = {}) {
  const { h = PIER.h, w = PIER.w } = o;
  for (const z of [-(w / 2 - 0.12), 0, w / 2 - 0.12]) k.add("ink", box(0.06, 1.0, 0.06), { p: [x, h + 0.5, z] });
  for (const y of [0.32, 0.62]) k.add("ink", rod([x, h + y, -(w / 2 - 0.12)], [x, h + y, w / 2 - 0.12], 0.025, 6));
  k.add("paper", cbox(0.11, 0.07, w - 0.13, 0.015), { p: [x, h + 1.03, 0] });
}

/** The orange octagonal mooring bollard on the deck at (x, z). */
export function addPierBollard(k: Kit, x: number, z: number, h = PIER.h) {
  k.add("orange", prism(0.14, 0.14, 0.48, 8), { p: [x, h, z] });
}

/** Pier (concept "pier"): two modules, the near one with an orange mooring bollard and its near rail set back behind it. 8 m. */
export function pierModel() {
  return model("kit-pier", (k) => {
    const { seg, h, w } = PIER;
    const x0 = -seg;
    // the near rail of the first module starts behind the mooring bollard, as in the concept
    for (let i = 0; i < 2; i++) addPierSegment(k, x0 + i * seg, { rails: [true, i > 0] });
    addPierRail(k, x0 + 1.75, x0 + seg, w / 2 - 0.12, h);
    addPierBollard(k, x0 + 1.0, w / 2 - 0.42, h);
  });
}
