"use client";

// Park and podium kit (concepts goal, stumps, podium, trophy). Builders return cached Models
// (see ./shared). Fronts face +Z.
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";
import { Label } from "../models/props/Label";
import { KitModel } from "./KitModel";
import { bar, box, cbox, hull, lathe, model, prism, rod, type Kit, type V3 } from "./shared";

/** Five-a-side goal: mouth width, height, depth at the ground and at the top. */
export const GOAL = { w: 3.0, h: 2.0, d: 1.2, dTop: 0.45, post: 0.12 };

/** A net sheet: a quad a-b-c-d with uvs so one texture cell is `cell` metres. */
function netQuad(a: V3, b: V3, c: V3, d: V3, cell = 0.1) {
  const va = new THREE.Vector3(...a);
  const u = va.distanceTo(new THREE.Vector3(...b)) / cell;
  const v = va.distanceTo(new THREE.Vector3(...d)) / cell;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  g.computeVertexNormals();
  return g;
}

/** Goal: a chamfered paper front frame with an orange band, an ink back frame and a fine ink cord net. Mouth faces +Z. */
export function goalModel(dims: typeof GOAL = GOAL) {
  return model(`kit-goal-${JSON.stringify(dims)}`, (k) => {
    const { w, h, d, dTop, post } = dims;
    const x = w / 2;
    const zf = 0;
    const zb = -d;
    const zt = -dTop;
    k.add("paper", cbox(post, h, post, 0.025), { p: [-x, h / 2, zf] });
    k.add("paper", cbox(post, h, post, 0.025), { p: [x, h / 2, zf] });
    k.add("paper", cbox(w + post, post, post, 0.025), { p: [0, h - post / 2, zf] });
    k.add("orange", box(post + 0.008, 0.16, post + 0.008), { p: [x, h - 0.38, zf] });
    // ink back frame: top return bars, sloping back posts and the ground frame
    const t = 0.08;
    for (const sx of [-1, 1]) {
      k.add("ink", bar([sx * x, h - post / 2, zf - post / 2], [sx * x, h - post / 2, zt], t));
      k.add("ink", bar([sx * x, h - post / 2, zt], [sx * x, t / 2, zb], t));
      k.add("ink", bar([sx * x, t / 2, zf - post / 2], [sx * x, t / 2, zb], t));
    }
    k.add("ink", bar([-x, t / 2, zb], [x, t / 2, zb], t));
    k.add("ink", bar([-x, h - post / 2, zt], [x, h - post / 2, zt], t));
    // net: back slope, roof and two sides
    const yt = h - post / 2;
    k.add("net", netQuad([-x, 0, zb], [x, 0, zb], [x, yt, zt], [-x, yt, zt]));
    k.add("net", netQuad([-x, yt, zt], [x, yt, zt], [x, yt, zf], [-x, yt, zf]));
    for (const sx of [-1, 1]) {
      k.add("net", netQuad([sx * x, 0, zf], [sx * x, 0, zb], [sx * x, yt, zt], [sx * x, yt, zf]));
    }
  });
}

/** Wicket: stump height above the slab, centre spacing and the slab's top. */
export const WICKET = { h: 0.71, gap: 0.115, slab: 0.06 };

/** One stump at x on a foot at y0: a slender paper post `h` tall, `hw` half wide, slightly flared at its foot, with a chamfered tip and an ink pin line. */
function addStump(k: Kit, x: number, y0: number, h: number, hw = 0.025) {
  const f = hw / 0.025;
  const sq = (a: number, b: number, y: number, c = 0.008 * f): V3[] => [
    [x - a + c, y, -b],
    [x + a, y, -b],
    [x + a, y, b],
    [x - a, y, b],
    [x - a, y, -b + c],
  ];
  const yk = y0 + h * 0.28;
  const yt = y0 + h;
  k.add("paper", hull([...sq(0.03 * f, 0.026 * f, y0), ...sq(0.024 * f, 0.022 * f, yk)]));
  k.add("paper", hull([...sq(0.024 * f, 0.022 * f, yk), ...sq(0.024 * f, 0.022 * f, yt - 0.02 * f), ...sq(0.012 * f, 0.012 * f, yt, 0.004 * f)]));
  // pin line down the front face
  k.add("ink", box(0.003 * f, yt - yk - 0.03 * f, 0.002), { p: [x - 0.01 * f, (yk + yt - 0.03 * f) / 2, 0.0225 * f] });
  k.add("ink", bar([x - 0.01 * f, yk, 0.0235 * f], [x - 0.004 * f, y0, 0.0275 * f], 0.003 * f, 0.002));
}

/** A bail centred on the origin along X, `len` from spigot tip to tip: an orange hexagonal barrel on thin spigots. */
function addBail(k: Kit, cx: number, y: number, len: number, f = 1) {
  k.add("orange", prism(0.022 * f, 0.022 * f, 0.056 * f, 6), { p: [cx - 0.028 * f, y, 0], r: [0, 0, -Math.PI / 2] });
  k.add("orange", rod([cx - len / 2, y, 0], [cx + len / 2, y, 0], 0.009 * f, 6));
}

/** Stumps: three slender paper stumps on a thin concrete crease slab, two orange bails. 0.62 m wide, 0.79 m. */
export function stumpsModel() {
  return model("kit-stumps", (k) => {
    const { h, gap, slab } = WICKET;
    k.add("concrete", cbox(0.62, slab, 0.36, 0.015), { p: [0, slab / 2, 0] });
    for (const x of [-gap, 0, gap]) addStump(k, x, slab, h);
    const y = slab + h + 0.016;
    for (const sx of [-1, 1]) addBail(k, (sx * gap) / 2, y, gap + 0.032);
    k.add("orange", prism(0.004, 0.004, 0.002, 8), { p: [gap + 0.008, slab + h - 0.04, 0.022], r: [Math.PI / 2, 0, 0] });
  });
}

/** One stump on its own (origin at its foot), for wickets that fall apart. */
export function stumpModel(h = WICKET.h, hw = 0.025) {
  return model(`kit-stump-${h}-${hw}`, (k) => addStump(k, 0, 0, h, hw));
}

/** One bail on its own, centred, along X. */
export function bailModel(len = WICKET.gap + 0.032, f = 1) {
  return model(`kit-bail-${len}-${f}`, (k) => addBail(k, 0, 0, len, f));
}

/** Podium step: x centre, height. Width and depth are shared. */
export const PODIUM = { w: 1.0, d: 1.0, steps: [{ n: "2", x: -1.0, h: 0.5 }, { n: "1", x: 0, h: 0.8 }, { n: "3", x: 1.0, h: 0.36 }] };
export type PodiumDims = typeof PODIUM;

/** Podium mass: the stepped front silhouette extruded with a chamfer on every edge. */
function podiumMass(dims: PodiumDims) {
  const { w, d, steps } = dims;
  const c = Math.min(0.055, dims.w * 0.06);
  const s = new THREE.Shape();
  const l = steps[0].x - w / 2 + c;
  const r = steps[2].x + w / 2 - c;
  s.moveTo(l, c);
  s.lineTo(r, c);
  s.lineTo(r, steps[2].h - c);
  s.lineTo(steps[1].x + w / 2 - c, steps[2].h - c);
  s.lineTo(steps[1].x + w / 2 - c, steps[1].h - c);
  s.lineTo(steps[1].x - w / 2 + c, steps[1].h - c);
  s.lineTo(steps[1].x - w / 2 + c, steps[0].h - c);
  s.lineTo(l, steps[0].h - c);
  s.lineTo(l, c);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * c, bevelEnabled: true, bevelSize: c, bevelThickness: c, bevelSegments: 1, curveSegments: 1 });
  g.translate(0, 0, -(d - 2 * c) / 2);
  return g;
}

/** Podium: a stepped chamfered concrete mass with ink tops, an orange stripe across first place. 3 m wide. */
export function podiumModel(dims: PodiumDims = PODIUM) {
  return model(`kit-podium-${JSON.stringify(dims)}`, (k) => {
    const { w, d, steps } = dims;
    k.add("concrete", podiumMass(dims));
    for (const st of steps) k.add("ink", box(w - 0.07, 0.016, d - 0.07), { p: [st.x, st.h + 0.008, 0] });
    k.add("orange", box(w * 0.16, 0.018, d - 0.07), { p: [w * 0.14, steps[1].h + 0.009, 0] });
  });
}

/** Podium with its place numbers set into the ink tops. */
export function KitPodium({ dims = PODIUM, numbers = true, ...props }: ThreeElements["group"] & { dims?: PodiumDims; numbers?: boolean }) {
  return (
    <group {...props}>
      <KitModel model={podiumModel(dims)} />
      {numbers &&
        dims.steps.map((st) => (
          <Label key={st.n} position={[st.x - dims.w * 0.24, st.h + 0.018, dims.d * 0.19]} rotation={[-Math.PI / 2, 0, 0]} fontSize={dims.w * 0.26} color="#2b2c2e">
            {st.n}
          </Label>
        ))}
    </group>
  );
}

/** Trophy: a faceted paper cup with angular handles on a two-tier ink plinth with an orange band. 0.9 m. */
export function trophyModel() {
  return model("kit-trophy-v2", (k) => {
    k.add("ink", hull([...sq(0.24, 0), ...sq(0.24, 0.03), ...sq(0.2, 0.075)]));
    k.add("ink", cbox(0.36, 0.17, 0.36, 0.035), { p: [0, 0.075 + 0.085, 0] });
    k.add("orange", box(0.362, 0.022, 0.362), { p: [0, 0.165, 0] });
    const y0 = 0.245;
    k.add(
      "paper",
      lathe(
        [
          [0, y0],
          [0.11, y0],
          [0.11, y0 + 0.025],
          [0.055, y0 + 0.07],
          [0.05, y0 + 0.1],
          [0.13, y0 + 0.19],
          [0.215, y0 + 0.37],
          [0.235, y0 + 0.58],
          [0.212, y0 + 0.58],
          [0.195, y0 + 0.4],
          [0, y0 + 0.36],
        ],
        8,
      ),
    );
    for (const sx of [-1, 1]) {
      const p: V3[] = [
        [sx * 0.21, y0 + 0.53, 0],
        [sx * 0.37, y0 + 0.53, 0],
        [sx * 0.4, y0 + 0.46, 0],
        [sx * 0.36, y0 + 0.27, 0],
        [sx * 0.17, y0 + 0.2, 0],
      ];
      for (let i = 0; i < p.length - 1; i++) k.add("paper", bar(p[i], p[i + 1], 0.055, 0.04));
    }
  });
}

function sq(hw: number, y: number): V3[] {
  return [
    [-hw, y, -hw],
    [hw, y, -hw],
    [hw, y, hw],
    [-hw, y, hw],
  ];
}
