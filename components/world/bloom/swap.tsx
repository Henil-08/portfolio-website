"use client";

// The in-world vehicle swap (owner, 2026-11-05: "When already inside the world and we change
// vehicle, why does the entire animation play? Make it simple."). A new vehicle or livery while
// driving changes in place in under half a second, wherever the car stands: orange corner
// brackets round its footprint rise from the ground through a faint orange plane, the new
// vehicle is there below them, part by part, and nothing above them yet; then the brackets go.
// The camera stays on the chase view and nothing else in the world changes. It is the garage
// turntable's scan line (bloom/Opening.tsx) at the car's own size, with the brand's selection
// brackets (docs/BRAND.md I09).
//
// Vehicle.tsx remounts the vehicle when the store's choice changes; this only decides what of it
// is drawn, just before each render (Opening.tsx calls `swapBeforeRender`), so it never fights
// the vehicle's own frame code.
import * as THREE from "three";
import { getState } from "../store";
import { vehicleByCode } from "../vehicles";
import { pop } from "../sound";

/** The brackets' rise up the vehicle, then their fade (s). */
export const SWAP = { rise: 0.34, fade: 0.12 };

const ORANGE = "#ff4f00";
/** model units (the vehicle's own metres): how far the brackets stand off the body, their bar width and arm length */
const MARGIN = 0.16;
const BAR = 0.075;
const ARM = 0.26;

type Part = { o: THREE.Object3D; y: number };

const run = {
  /** the choice last drawn, "V01/Paper" */
  key: "",
  /** performance.now() when the swap began (ms), -1 when there is none */
  t0: -1,
  model: null as THREE.Object3D | null,
  parts: [] as Part[],
  top: 1,
};

const bracketMat = new THREE.MeshBasicMaterial({ color: ORANGE, toneMapped: false, transparent: true, depthWrite: false, side: THREE.DoubleSide });
const planeMat = new THREE.MeshBasicMaterial({ color: ORANGE, toneMapped: false, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide });

/** Four L brackets round a footprint half hx by hz (in the xz plane), as one flat mesh. */
function bracketGeometry(hx: number, hz: number) {
  const pos: number[] = [];
  const quad = (x0: number, z0: number, x1: number, z1: number) => pos.push(x0, 0, z0, x1, 0, z0, x1, 0, z1, x0, 0, z0, x1, 0, z1, x0, 0, z1);
  const a = Math.min(ARM, hx, hz);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      // the bar along x includes the corner, the bar along z stops short of it
      quad(sx * hx, sz * hz, sx * (hx - a), sz * (hz - BAR));
      quad(sx * hx, sz * (hz - BAR), sx * (hx - BAR), sz * (hz - a));
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

/** The scan's meshes: built once and mounted with the opening (hidden), so the boot compiles their programs. */
const scan = (() => {
  const group = new THREE.Group();
  group.name = "vehicle-swap-scan";
  group.visible = false;
  group.matrixAutoUpdate = false;
  group.userData.bloomSkip = true;
  const brackets = new THREE.Mesh(bracketGeometry(1, 2), bracketMat);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), planeMat);
  brackets.renderOrder = plane.renderOrder = 5;
  group.add(plane, brackets);
  return { group, brackets, plane };
})();

/** The scan's meshes, hidden until a swap; they follow the player's model while one runs. */
export function SwapScan() {
  return <primitive object={scan.group} />;
}

const _box = new THREE.Box3();
const _c = new THREE.Vector3();
const _inv = new THREE.Matrix4();

/** Every visible mesh of the model with its middle's height in the model's own frame, and the model's top. */
function collect(model: THREE.Object3D) {
  model.updateWorldMatrix(true, true);
  _inv.copy(model.matrixWorld).invert();
  const parts: Part[] = [];
  let top = 0.5;
  model.traverseVisible((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry) return;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    _box.copy(m.geometry.boundingBox!).applyMatrix4(m.matrixWorld).applyMatrix4(_inv);
    _box.getCenter(_c);
    parts.push({ o, y: _c.y });
    top = Math.max(top, _box.max.y);
  });
  return { parts, top };
}

function settle() {
  for (const p of run.parts) p.o.visible = true;
  run.parts = [];
}

const clamp01 = (k: number) => Math.min(1, Math.max(0, k));
const inOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

/**
 * Called just before every render once driving has started. A new choice in the store starts a
 * swap; while one runs, the parts of the player's model the brackets haven't reached are hidden
 * and the brackets stand at the rising line.
 */
export function swapBeforeRender(model: THREE.Object3D | null) {
  const s = getState();
  const key = `${s.vehicle}/${s.livery}`;
  if (!run.key) run.key = key;
  const now = performance.now();
  if (key !== run.key) {
    run.key = key;
    settle();
    run.t0 = process.env.NODE_ENV !== "production" && typeof window.__swapT === "number" ? now - window.__swapT * 1000 : now;
    run.model = null;
    pop();
    const v = vehicleByCode[s.vehicle];
    const hx = Math.max(Math.abs(v.box.min[0]), Math.abs(v.box.max[0])) + MARGIN;
    const hz = Math.max(Math.abs(v.box.min[2]), Math.abs(v.box.max[2])) + MARGIN;
    scan.brackets.geometry.dispose();
    scan.brackets.geometry = bracketGeometry(hx, hz);
    scan.plane.scale.set(2 * hx, 1, 2 * hz);
  }
  const g = scan.group;
  if (run.t0 < 0) return;
  const frozen = process.env.NODE_ENV !== "production" && typeof window.__swapT === "number" ? window.__swapT : null;
  const t = frozen ?? (now - run.t0) / 1000;
  if (!model || t > SWAP.rise + SWAP.fade) {
    settle();
    g.visible = false;
    run.t0 = frozen === null ? -1 : run.t0;
    run.model = null;
    return;
  }
  if (model !== run.model) {
    settle();
    run.model = model;
    const c = collect(model);
    run.parts = c.parts;
    run.top = c.top;
  }
  const kr = clamp01(t / SWAP.rise);
  const y = -0.04 + (run.top + 0.08) * inOut(kr);
  for (const p of run.parts) p.o.visible = p.y <= y;
  if (kr >= 1) settle();
  // the brackets ride the model's frame: its place, heading and scale
  g.visible = true;
  g.matrix.copy(model.matrixWorld);
  g.position.y = 0;
  for (const c of g.children) c.position.y = y;
  bracketMat.opacity = 1 - clamp01((t - SWAP.rise) / SWAP.fade);
  planeMat.opacity = 0.08 * bracketMat.opacity;
  g.updateMatrixWorld(true);
}
