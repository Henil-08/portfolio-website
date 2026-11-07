"use client";

// 02 · Teardown: one project on a turntable in the middle of the bay, taken apart like an
// engineering drawing. Once it has landed it explodes into its parts, each pushed out along the
// line from the centre, and the five biggest get callouts: a leader line from the part to a
// label with a part number (P03-01) and a spec or a piece of the stack. ← → puts it back
// together, drops it through the scan line, brings the next one up whole and takes that apart.
// The camera circles slowly, the way you would walk round a drawing on a table.
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { ShowCar } from "@/components/world/garage/ShowCar";
import { ScanSquare, Spot } from "@/components/world/garage/Bay";
import { OUT_Z, useDrive, type Item } from "@/components/world/garage/anim";
import { ProjectObject } from "@/components/world/models/projects";
import { CI } from "@/components/world/buildings/concrete";
import { pad } from "@/components/brand/tokens";
import { BayScene, OUTSIDE } from "./common";
import { blendIn, chaseOf, inOut, lerp, overlay, pose, project, seg, setPose, useSwitch } from "./shared";
import type { SceneProps } from "./types";

const STAGE_Z = -1.05;
const TOP = 0.36;
const SCALE = 1.45;
const PARK_Z = 2.75;
const LABELS = 5;

type Part = { mesh: THREE.Object3D; base: THREE.Vector3; off: THREE.Vector3; anchor: THREE.Vector3; size: number };

/** Every mesh in the object with where it sits and where it goes when the object comes apart. */
function analyse(root: THREE.Object3D): Part[] {
  root.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) return [];
  const c = box.getCenter(new THREE.Vector3());
  const r = box.getSize(new THREE.Vector3()).length() / 2;
  const out: Part[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.parent) return;
    const b = new THREE.Box3().setFromObject(m);
    if (b.isEmpty()) return;
    const mc = b.getCenter(new THREE.Vector3());
    const d = mc.clone().sub(c);
    let len = d.length();
    if (len < r * 0.08) {
      d.set(0, 1, 0.35);
      len = r * 0.1;
    }
    const w = d.normalize().multiplyScalar(r * 0.22 + len * 0.55);
    w.y += r * 0.08;
    const a = m.parent.worldToLocal(mc.clone());
    const z = m.parent.worldToLocal(mc.clone().add(w));
    out.push({ mesh: m, base: m.position.clone(), off: z.sub(a), anchor: m.worldToLocal(mc.clone()), size: b.getSize(new THREE.Vector3()).length() });
  });
  return out;
}

/** What the overlay shows: the callouts' text, and how far out the drawing is (0 whole, 1 apart). */
export const teardown = { labels: [] as { code: string; text: string }[], show: 0 };

/** Callout text for a project: part numbers with its specs, then its stack. */
function calloutsOf(it: Item) {
  const specs = it.p.specs ?? [[it.p.headline.label, it.p.headline.value]];
  const lines = [...specs.map(([k, v]) => `${k} · ${v}`), ...it.p.stack.map((s) => s)];
  return Array.from({ length: LABELS }, (_, j) => ({ code: `P${pad(it.index + 1)}-${pad(j + 1)}`, text: lines[j % lines.length] }));
}

export default function Teardown({ v, livery, domain, list, sel, dir, inside }: SceneProps) {
  const cam = useRef<THREE.PerspectiveCamera>(null!);
  const drive = useDrive(inside);
  const sw = useSwitch(sel, dir, 1.7);
  const car = useRef<THREE.Group>(null);
  const inCab = useRef(false);
  const objs = useRef<(THREE.Group | null)[]>([]);
  const parts = useRef<(Part[] | null)[]>([]);
  const scan = useRef<THREE.Group>(null!);
  const table = useRef<THREE.Group>(null!);
  const [anchors] = useState(() => Array.from({ length: LABELS }, () => new THREE.Vector3()));
  const t = useRef({ chase: pose([0, 0, 0], [0, 0, 0], 46), view: pose([0, 0, 0], [0, 0, 0], 40), out: pose([0, 0, 0], [0, 0, 0], 40) });

  useEffect(() => () => void (teardown.show = 0), []);

  useFrame((s) => {
    const c = t.current;
    const k = drive.current;
    const { from, to, k: sk } = sw.current;
    const first = from === to;
    const g = car.current!;
    g.position.set(0, 0, lerp(OUT_Z, PARK_Z, inOut(seg(k, 0, 0.75))));
    g.rotation.y = Math.PI;
    chaseOf(g.position, Math.PI, c.chase);
    // walking round the drawing
    const th = -0.62 + Math.sin(s.clock.elapsedTime * 0.22) * 0.16;
    c.view.pos.set(Math.sin(th) * 4.1, 2.05, STAGE_Z + Math.cos(th) * 4.1);
    c.view.look.set(0, 1.02, STAGE_Z);
    c.view.fov = 40;
    setPose(cam.current, blendIn(k, c.chase, c.view, c.out, 0.5, 0.4));

    // the old one goes back together and drops through the scan line, the new one comes up whole and comes apart
    const apartOld = first ? 0 : 1 - inOut(seg(sk, 0, 0.3));
    const sink = first ? 1 : 1 - inOut(seg(sk, 0.3, 0.45));
    const rise = first ? inOut(seg(k, 0.6, 0.8)) : inOut(seg(sk, 0.45, 0.6));
    const apartNew = (first ? inOut(seg(k, 0.78, 1)) : inOut(seg(sk, 0.62, 1))) * (0.96 + 0.04 * Math.sin(s.clock.elapsedTime * 1.3));
    table.current.rotation.y = s.clock.elapsedTime * 0.15;
    list.forEach((_, i) => {
      const o = objs.current[i];
      if (!o) return;
      const isNew = i === to;
      const isOld = !first && i === from;
      o.visible = isNew ? rise > 0.001 : isOld ? sink > 0.001 : false;
      if (!o.visible) return;
      o.scale.set(SCALE, SCALE * Math.max(0.02, isNew ? rise : sink), SCALE);
      if (!parts.current[i]) {
        const keep = o.scale.y;
        o.scale.y = SCALE;
        parts.current[i] = analyse(o);
        o.scale.y = keep;
      }
      const e = isNew ? apartNew : apartOld;
      for (const p of parts.current[i]!) p.mesh.position.copy(p.base).addScaledVector(p.off, e);
    });
    // scan line: down through the old one, up through the new
    const sc = first ? seg(k, 0.6, 0.8) : sk < 0.45 ? 1 - seg(sk, 0.3, 0.45) : seg(sk, 0.45, 0.6);
    scan.current.visible = sc > 0 && sc < 1;
    scan.current.position.y = TOP + 1.5 * sc;

    // callouts on the five biggest parts of the one on show
    const shown = parts.current[to];
    const out = apartNew;
    teardown.show = shown && shown.length ? out : 0;
    if (shown && shown.length) {
      const big = [...shown].sort((a, b) => b.size - a.size).slice(0, LABELS);
      big.forEach((p, j) => p.mesh.localToWorld(anchors[j].copy(p.anchor)));
      for (let j = big.length; j < LABELS; j++) anchors[j].set(0, -100, 0);
      project(cam.current, anchors);
    }
  });

  // the labels follow the project on show
  const it = list[Math.min(sel, list.length - 1)];
  useEffect(() => void (teardown.labels = calloutsOf(it)), [it]);

  return (
    <>
      <PerspectiveCamera ref={cam} makeDefault position={OUTSIDE.pos.toArray()} fov={OUTSIDE.fov} near={0.03} far={160} />
      <BayScene domain={domain} lamp={10} />
      <Spot position={[1.2, 3.8, STAGE_Z + 1.8]} target={[0, 0.6, STAGE_Z]} angle={0.5} intensity={18} />
      {/* the drawing table: a paper drum on an ink base, a turntable with an ink scale ring */}
      <group position={[0, 0, STAGE_Z]}>
        <mesh position={[0, 0.15, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[0.95, 1.0, 0.3, 48]} />
          <meshStandardMaterial color={CI.paper} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[1.02, 1.02, 0.04, 48]} />
          <meshStandardMaterial color={CI.ink} roughness={0.6} />
        </mesh>
        <group ref={table} position={[0, 0.305, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.8, 0.825, 64]} />
            <meshBasicMaterial color={CI.ink} />
          </mesh>
          {Array.from({ length: 24 }, (_, i) => (
            <mesh key={i} position={[Math.cos((i / 24) * Math.PI * 2) * 0.88, 0.001, Math.sin((i / 24) * Math.PI * 2) * 0.88]} rotation={[-Math.PI / 2, 0, -(i / 24) * Math.PI * 2]}>
              <planeGeometry args={[i % 6 === 0 ? 0.14 : 0.07, 0.012]} />
              <meshBasicMaterial color={i === 0 ? CI.orange : CI.ink} />
            </mesh>
          ))}
        </group>
      </group>
      {list.map((it, i) => (
        <group key={it.p.slug} ref={(g) => void (objs.current[i] = g)} position={[0, TOP, STAGE_Z]} visible={false}>
          <ProjectObject slug={it.p.slug} active />
        </group>
      ))}
      <group ref={scan} position={[0, TOP, STAGE_Z]} visible={false}>
        <ScanSquare size={1.6} />
      </group>
      <group ref={car} position={[0, 0, OUT_Z]} rotation={[0, Math.PI, 0]}>
        <ShowCar key={`${v.code}-${livery.name}`} v={v} livery={livery} root={car} inCab={inCab} />
      </group>
    </>
  );
}

/**
 * The callouts over the 3D cell: from each part a leader runs out to a label in a column on the
 * part's side of the drawing, labels kept apart top to bottom; they draw in as the object comes
 * apart and go as it goes back together.
 */
export function TeardownOverlay() {
  const svg = useRef<SVGSVGElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const tags = useRef<(HTMLDivElement | null)[]>([]);
  const [labels, setLabels] = useState(teardown.labels);
  useEffect(() => {
    let raf = 0;
    let last = "";
    const run = () => {
      raf = requestAnimationFrame(run);
      const key = teardown.labels.map((l) => l.code + l.text).join();
      if (key !== last) {
        last = key;
        setLabels(teardown.labels);
      }
      const el = box.current;
      const s = svg.current;
      if (!el || !s) return;
      const W = el.clientWidth;
      const H = el.clientHeight;
      // a narrow cell (a phone) gets part numbers only
      const LW = W < 560 ? 64 : 168;
      const show = teardown.show;
      const pts = overlay.pts.slice(0, LABELS).map((p, j) => ({ ...p, j }));
      // two columns, each sorted top to bottom and spread so labels never overlap
      const cols: Record<string, typeof pts> = { l: [], r: [] };
      for (const p of pts) if (p.on && p.y > -1) (p.x < 0.5 ? cols.l : cols.r).push(p);
      let d = "";
      const placed: { j: number; x: number; y: number; side: string }[] = [];
      for (const side of ["l", "r"] as const) {
        const list = cols[side].sort((a, b) => a.y - b.y);
        let y = 0.1 * H;
        for (const p of list) {
          y = Math.max(y, Math.min(H - 60, p.y * H - 18));
          placed.push({ j: p.j, x: side === "l" ? 14 : W - 14, y, side });
          const ax = p.x * W;
          const ay = p.y * H;
          const lx = side === "l" ? 14 + LW : W - 14 - LW;
          const ex = side === "l" ? Math.min(ax - 30, lx + 40) : Math.max(ax + 30, lx - 40);
          d += `M${ax.toFixed(1)} ${ay.toFixed(1)}L${ex.toFixed(1)} ${(y + 18).toFixed(1)}L${lx.toFixed(1)} ${(y + 18).toFixed(1)}`;
          y += 46;
        }
      }
      const path = s.querySelector("path")!;
      path.setAttribute("d", d);
      path.style.strokeDashoffset = String(2000 * (1 - Math.min(1, Math.max(0, (show - 0.55) / 0.4))));
      const dots = s.querySelectorAll("circle");
      pts.forEach((p, j) => {
        const c = dots[j];
        if (!c) return;
        c.setAttribute("cx", String(p.x * W));
        c.setAttribute("cy", String(p.y * H));
        c.style.opacity = p.on && show > 0.55 ? "1" : "0";
      });
      tags.current.forEach((t, j) => {
        if (!t) return;
        const q = placed.find((z) => z.j === j);
        const on = !!q && show > 0.75;
        t.style.opacity = on ? "1" : "0";
        t.style.clipPath = on ? "inset(0 0 0 0)" : q?.side === "r" ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)";
        if (q) t.style.transform = `translate(${q.side === "l" ? q.x : q.x - LW}px, ${q.y}px)`;
        t.style.width = `${LW}px`;
        (t.lastElementChild as HTMLElement).style.display = LW < 100 ? "none" : "";
      });
    };
    run();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div ref={box} className="pointer-events-none absolute inset-0 z-[24] overflow-hidden">
      <svg ref={svg} className="absolute inset-0 h-full w-full">
        <path fill="none" stroke="#111" strokeWidth="1.25" strokeDasharray="2000" style={{ transition: "stroke-dashoffset 120ms linear" }} />
        {Array.from({ length: LABELS }, (_, j) => (
          <circle key={j} r="3.5" fill="#ff4f00" stroke="#111" strokeWidth="1" />
        ))}
      </svg>
      {Array.from({ length: LABELS }, (_, j) => (
        <div
          key={j}
          ref={(el) => void (tags.current[j] = el)}
          className="absolute left-0 top-0 border-2 border-[#111] bg-white px-2 py-1 opacity-0 shadow-[3px_3px_0_#111] transition-[clip-path,opacity] duration-300"
        >
          <span className="font-mono block text-[10.5px] leading-tight text-[#ff4f00]">{labels[j]?.code}</span>
          <span className="block truncate text-[12px] font-semibold leading-tight">{labels[j]?.text}</span>
        </div>
      ))}
    </div>
  );
}
