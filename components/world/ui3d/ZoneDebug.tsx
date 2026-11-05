"use client";

// Dev only: a top-down debug view of every interactable place. In the console or a headless
// check, `window.__zones = true` draws over everything:
//   - each zone's hotspot as Rig.tsx `inside` tests it (red), with its code,
//   - its E prompt marker (orange diamond) and the spawn the map and the agent teleport to
//     (green arrow, pointing the way the car faces),
//   - the contact medallions' reach (social LINK_SPOTS, SOCIAL.reach) and the timeline terrace,
//   - each sector set's footprint (SCENE_FOOT, violet) and every collider the car can hit,
//     read from the physics world itself (fixed in ink, knock-about props in blue).
// `window.__zoneReport()` checks each place: the spawn is in its hotspot, clear of walls and
// reachable by car from the start; how much of the hotspot is road or wall; where its marker stands.
// Fog is pushed away while it shows (a top view stands far off). Mounted inside <Physics>.
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import * as THREE from "three";
import { LAKES, SCENE_FOOT, SECTORS, SPAWN, TIMELINE, TRACK_WIDTH, lakeDepthDist, nearestT3, shoreDist, trackPoint, zoneMarker, zones, type Zone } from "../layout";
import { heightAt } from "../terrain";
import { LINK_SPOTS, SOCIAL } from "../social";

type P2 = [number, number];
type Foot = { poly: P2[]; fixed: boolean };
type Dbg = { __zones?: boolean; __zoneReport?: () => unknown };

const CAR_HALF = 1.0; // a car's half width, for what it can squeeze past

/** A zone's corners, the inverse of Rig.tsx `inside`. */
export function zoneCorners(z: Zone, pad = 0): P2[] {
  const r = -(z.rotY ?? 0);
  const hx = z.size[0] / 2 + pad;
  const hz = z.size[1] / 2 + pad;
  return ([[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]] as P2[]).map(([lx, lz]) => [z.pos[0] + lx * Math.cos(r) + lz * Math.sin(r), z.pos[1] - lx * Math.sin(r) + lz * Math.cos(r)]);
}

/** Rig.tsx `inside`, copied so the report tests exactly what the game tests. */
function inZone(z: Zone, x: number, y: number, pad = 0) {
  const dx = x - z.pos[0];
  const dz = y - z.pos[1];
  const r = -(z.rotY ?? 0);
  const lx = dx * Math.cos(r) - dz * Math.sin(r);
  const lz = dx * Math.sin(r) + dz * Math.cos(r);
  return Math.abs(lx) <= z.size[0] / 2 + pad && Math.abs(lz) <= z.size[1] / 2 + pad;
}

function hull(pts: P2[]): P2[] {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: P2, a: P2, b: P2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: P2[] = [];
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up: P2[] = [];
  for (const q of p.slice().reverse()) {
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

function inPoly(poly: P2[], x: number, z: number) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

function distPoly(poly: P2[], x: number, z: number) {
  if (inPoly(poly, x, z)) return 0;
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j];
    const [bx, bz] = poly[i];
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}

const circle = (x: number, z: number, r: number, n = 20): P2[] => Array.from({ length: n }, (_, i) => [x + Math.cos((i / n) * Math.PI * 2) * r, z + Math.sin((i / n) * Math.PI * 2) * r]);

/** Every collider a car's body can hit, as a footprint on the ground: from just above the ground to roof height. */
function footprints(world: ReturnType<typeof useRapier>["world"], rapier: ReturnType<typeof useRapier>["rapier"]): Foot[] {
  const out: Foot[] = [];
  const S = rapier.ShapeType;
  const v = new THREE.Vector3();
  const q = new THREE.Quaternion();
  world.forEachCollider((c) => {
    if (c.isSensor()) return;
    const body = c.parent();
    if (!body || body.isKinematic()) return;
    // the car's own colliders move with it: skip anything dynamic heavier than a prop
    if (body.isDynamic() && body.mass() > 50) return;
    const t = c.translation();
    const r = c.rotation();
    q.set(r.x, r.y, r.z, r.w);
    const type = c.shapeType();
    let corners: THREE.Vector3[] = [];
    let flat: P2[] | null = null;
    let y0 = 0;
    let y1 = 0;
    if (type === S.Cuboid || type === S.RoundCuboid) {
      const h = c.halfExtents();
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) corners.push(v.set(sx * h.x, sy * h.y, sz * h.z).applyQuaternion(q).add(t as THREE.Vector3).clone());
    } else if (type === S.Ball) {
      const rad = c.radius();
      flat = circle(t.x, t.z, rad);
      y0 = t.y - rad;
      y1 = t.y + rad;
    } else if (type === S.Cylinder || type === S.Cone || type === S.Capsule) {
      const rad = c.radius();
      const hh = c.halfHeight() + (type === S.Capsule ? rad : 0);
      flat = circle(t.x, t.z, rad);
      y0 = t.y - hh;
      y1 = t.y + hh;
    } else if (type === S.ConvexPolyhedron) {
      const vs = c.vertices();
      for (let i = 0; i < vs.length; i += 3) corners.push(v.set(vs[i], vs[i + 1], vs[i + 2]).applyQuaternion(q).add(t as THREE.Vector3).clone());
    } else return; // ground meshes and height fields are the ground itself
    if (corners.length) {
      y0 = Math.min(...corners.map((p) => p.y));
      y1 = Math.max(...corners.map((p) => p.y));
      flat = hull(corners.map((p) => [p.x, p.z]));
      corners = [];
    }
    if (!flat || flat.length < 3) return;
    const [cx, cz] = [flat.reduce((s, p) => s + p[0], 0) / flat.length, flat.reduce((s, p) => s + p[1], 0) / flat.length];
    const g = heightAt(cx, cz);
    // a car's body spans about 0.3 to 1.6 m above the ground it drives on
    if (y1 < g + 0.3 || y0 > g + 1.6) return;
    // nothing the size of the island (a ground slab)
    const w = Math.max(...flat.map((p) => p[0])) - Math.min(...flat.map((p) => p[0]));
    const d = Math.max(...flat.map((p) => p[1])) - Math.min(...flat.map((p) => p[1]));
    if (w > 120 || d > 120) return;
    out.push({ poly: flat, fixed: body.isFixed() });
  });
  return out;
}

// ------------------------------------------------------------ drawing

function ribbons(segs: [P2, P2][], w: number, lift = 0.25) {
  const pos: number[] = [];
  for (const [[x0, z0], [x1, z1]] of segs) {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const L = Math.hypot(dx, dz) || 1;
    const nx = (-dz / L) * (w / 2);
    const nz = (dx / L) * (w / 2);
    const y0 = heightAt(x0, z0) + lift;
    const y1 = heightAt(x1, z1) + lift;
    pos.push(x0 + nx, y0, z0 + nz, x1 + nx, y1, z1 + nz, x1 - nx, y1, z1 - nz, x0 + nx, y0, z0 + nz, x1 - nx, y1, z1 - nz, x0 - nx, y0, z0 - nz);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

const loop = (poly: P2[]): [P2, P2][] => poly.map((p, i) => [p, poly[(i + 1) % poly.length]]);

/** A filled convex polygon, flat on the ground. */
function fill(polys: P2[][], lift = 0.2) {
  const pos: number[] = [];
  for (const poly of polys)
    for (let i = 1; i < poly.length - 1; i++)
      for (const [x, z] of [poly[0], poly[i], poly[i + 1]]) pos.push(x, heightAt(x, z) + lift, z);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

function textPlane(text: string, h: number, color: string, back: string | null) {
  const c = document.createElement("canvas");
  const g = c.getContext("2d")!;
  const px = 48;
  g.font = `600 ${px}px ui-monospace, monospace`;
  c.width = Math.ceil(g.measureText(text).width) + 16;
  c.height = px + 12;
  if (back) {
    g.fillStyle = back;
    g.fillRect(0, 0, c.width, c.height);
  }
  g.font = `600 ${px}px ui-monospace, monospace`;
  g.fillStyle = color;
  g.textBaseline = "middle";
  g.fillText(text, 8, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry((h * c.width) / c.height, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false, fog: false }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1003;
  return m;
}

function basic(color: string, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false, side: THREE.DoubleSide, fog: false });
}

function build(feet: Foot[]) {
  const group = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, order: number) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.renderOrder = order;
    mesh.frustumCulled = false;
    group.add(mesh);
  };
  // colliders
  add(fill(feet.filter((f) => f.fixed).map((f) => f.poly)), basic("#111111", 0.35), 999);
  add(ribbons(feet.filter((f) => f.fixed).flatMap((f) => loop(f.poly)), 0.12), basic("#111111"), 1000);
  add(ribbons(feet.filter((f) => !f.fixed).flatMap((f) => loop(f.poly)), 0.12), basic("#2a6fdb"), 1000);
  // sector sets: their declared footprint and the line of their front
  const scene: [P2, P2][] = [];
  for (const s of SECTORS) {
    const c = Math.cos(s.sceneRot);
    const sn = Math.sin(s.sceneRot);
    const w = (lx: number, lz: number): P2 => [s.scene[0] + lx * c + lz * sn, s.scene[1] - lx * sn + lz * c];
    const { hx, back, front } = SCENE_FOOT;
    scene.push(...loop([w(-hx, -back), w(hx, -back), w(hx, front), w(-hx, front)]), [w(-hx, 0), w(hx, 0)]);
  }
  add(ribbons(scene, 0.18), basic("#7a3cff"), 1001);
  // hotspots, anchors, spawns
  add(fill(zones.map((z) => zoneCorners(z))), basic("#ff2a2a", 0.16), 1001);
  add(ribbons(zones.flatMap((z) => loop(zoneCorners(z))), 0.3), basic("#ff2a2a"), 1002);
  add(fill(zones.map((z) => circle(zoneMarker(z)[0], zoneMarker(z)[1], 0.9, 4))), basic("#ff4f00"), 1003);
  const arrows: [P2, P2][] = [];
  for (const z of zones) {
    const [sx, sz, h] = z.spawn;
    const f: P2 = [Math.cos(h), -Math.sin(h)];
    const tip: P2 = [sx + f[0] * 4, sz + f[1] * 4];
    const l: P2 = [-f[1], f[0]];
    arrows.push([[sx, sz], tip], [tip, [tip[0] - f[0] * 1.4 + l[0] * 1, tip[1] - f[1] * 1.4 + l[1] * 1]], [tip, [tip[0] - f[0] * 1.4 - l[0] * 1, tip[1] - f[1] * 1.4 - l[1] * 1]]);
  }
  add(ribbons(arrows, 0.35), basic("#00a35a"), 1003);
  add(fill(zones.map((z) => circle(z.spawn[0], z.spawn[1], 0.55, 10))), basic("#00a35a"), 1003);
  // contact medallions and the timeline terrace
  add(ribbons(LINK_SPOTS.flatMap(([x, z]) => loop(circle(x, z, SOCIAL.reach, 24))), 0.15), basic("#ff2a2a", 0.8), 1002);
  add(fill(LINK_SPOTS.map(([x, z]) => circle(x, z, 0.45, 4))), basic("#ff4f00"), 1003);
  const [tx, tz] = TIMELINE.pos;
  add(ribbons(loop([[tx - TIMELINE.hx, tz - TIMELINE.hz], [tx + TIMELINE.hx, tz - TIMELINE.hz], [tx + TIMELINE.hx, tz + TIMELINE.hz], [tx - TIMELINE.hx, tz + TIMELINE.hz]]), 0.2), basic("#00a19c"), 1002);
  // labels: the zone code beside each hotspot
  zones.forEach((z, i) => {
    const m = textPlane(`Z${String(i + 1).padStart(2, "0")}`, 1.6, "#ffffff", "#ff2a2a");
    const top = zoneCorners(z).reduce((b, p) => (p[1] < b[1] ? p : b));
    m.position.set(top[0], heightAt(top[0], top[1]) + 0.4, top[1] - 1.2);
    group.add(m);
  });
  LINK_SPOTS.forEach(([x, z], i) => {
    const m = textPlane(`C${String(i + 1).padStart(2, "0")}`, 0.9, "#ffffff", "#111111");
    m.position.set(x, heightAt(x, z) + 0.4, z + 1.1);
    group.add(m);
  });
  const tl = textPlane("TL", 1.4, "#ffffff", "#00a19c");
  tl.position.set(tx - TIMELINE.hx + 1, heightAt(tx, tz) + 0.4, tz - TIMELINE.hz - 1);
  group.add(tl);
  return group;
}

// ------------------------------------------------------------ the report

function report(feet: Foot[]) {
  // only fixed things are walls: the car pushes knock-about props out of its way
  const blocking = feet.filter((f) => f.fixed).map((f) => f.poly);
  const wallAt = (x: number, z: number, pad = 0) => blocking.some((p) => distPoly(p, x, z) <= pad);
  const onRoad = (x: number, z: number) => {
    // the road at ground level (the bridge deck passes over some places: compare in 3D)
    const g = heightAt(x, z);
    const t = nearestT3(x, g, z);
    const p = trackPoint(t);
    return Math.abs(p.y - g) < 1.5 && Math.hypot(p.x - x, p.z - z) < TRACK_WIDTH / 2;
  };
  // flood fill by car from the start over a 0.5 m grid: land, clear of walls by a car's half width
  const R = 135;
  const C = 0.5;
  const N = Math.round((R * 2) / C);
  const free = new Uint8Array(N * N);
  const cell = (x: number, z: number) => [Math.round((x + R) / C), Math.round((z + R) / C)];
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const x = -R + i * C;
      const z = -R + j * C;
      free[j * N + i] = shoreDist(x, z) > 0.5 && LAKES.every((l) => lakeDepthDist(l, x, z) < -0.5) ? 1 : 0;
    }
  for (const p of blocking) {
    const xs = p.map((q) => q[0]);
    const zs = p.map((q) => q[1]);
    const [i0, j0] = cell(Math.min(...xs) - CAR_HALF, Math.min(...zs) - CAR_HALF);
    const [i1, j1] = cell(Math.max(...xs) + CAR_HALF, Math.max(...zs) + CAR_HALF);
    for (let j = Math.max(0, j0); j <= Math.min(N - 1, j1); j++)
      for (let i = Math.max(0, i0); i <= Math.min(N - 1, i1); i++) if (free[j * N + i] && distPoly(p, -R + i * C, -R + j * C) < CAR_HALF) free[j * N + i] = 0;
  }
  const seen = new Uint8Array(N * N);
  const [si, sj] = cell(SPAWN[0], SPAWN[1]);
  const queue = [sj * N + si];
  seen[sj * N + si] = 1;
  for (let k = 0; k < queue.length; k++) {
    const c = queue[k];
    const i = c % N;
    const j = (c - i) / N;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di;
      const nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue;
      const n = nj * N + ni;
      if (seen[n] || !free[n]) continue;
      seen[n] = 1;
      queue.push(n);
    }
  }
  const reached = (x: number, z: number) => {
    const [i, j] = cell(x, z);
    return i >= 0 && j >= 0 && i < N && j < N && seen[j * N + i] === 1;
  };
  return zones.map((z, k) => {
    let n = 0;
    let road = 0;
    let wall = 0;
    let reach = 0;
    const [x0, z0] = zoneCorners(z).reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1])], [Infinity, Infinity]);
    const [x1, z1] = zoneCorners(z).reduce((b, p) => [Math.max(b[0], p[0]), Math.max(b[1], p[1])], [-Infinity, -Infinity]);
    for (let x = x0; x <= x1; x += 0.5)
      for (let zz = z0; zz <= z1; zz += 0.5) {
        if (!inZone(z, x, zz)) continue;
        n++;
        if (onRoad(x, zz)) road++;
        if (wallAt(x, zz)) wall++;
        if (reached(x, zz)) reach++;
      }
    const [sx, sz] = z.spawn;
    const a = zoneMarker(z);
    const r2 = (v: number) => Math.round(v * 100) / 100;
    return {
      code: `Z${String(k + 1).padStart(2, "0")}`,
      id: z.id,
      spawnInside: inZone(z, sx, sz),
      spawnClear: r2(Math.min(...blocking.map((p) => distPoly(p, sx, sz)))),
      spawnReached: reached(sx, sz),
      spawnOnRoad: onRoad(sx, sz),
      roadPct: Math.round((100 * road) / Math.max(1, n)),
      wallPct: Math.round((100 * wall) / Math.max(1, n)),
      reachPct: Math.round((100 * reach) / Math.max(1, n)),
      marker: [r2(a[0]), r2(a[1])],
      markerInWall: wallAt(a[0], a[1]),
    };
  });
}

export default function ZoneDebug() {
  const { world, rapier } = useRapier();
  const root = useRef<THREE.Group>(null);
  const on = useRef(false);
  const fog = useRef<[number, number] | null>(null);

  useEffect(() => {
    const w = window as unknown as Dbg;
    w.__zoneReport = () => report(footprints(world, rapier));
    return () => {
      delete w.__zoneReport;
    };
  }, [world, rapier]);

  useFrame(({ scene }) => {
    const want = !!(window as unknown as Dbg).__zones;
    const g = root.current;
    if (!g || want === on.current) return;
    on.current = want;
    for (const c of g.children.slice()) {
      g.remove(c);
      c.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.MeshBasicMaterial).map?.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
    }
    const f = scene.fog as THREE.Fog | null;
    if (want) {
      g.add(build(footprints(world, rapier)));
      if (f) {
        fog.current = [f.near, f.far];
        f.near = 1e5;
        f.far = 2e5;
      }
    } else if (f && fog.current) [f.near, f.far] = fog.current;
  });

  return <group ref={root} userData={{ noMap: true }} />;
}
