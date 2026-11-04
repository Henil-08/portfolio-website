"use client";

// Garage experience · Cockpit + pit wall: what stands in a bay, in the bay frame (anim.ts).
// The back wall is a pit wall of datasheet screens, one per project in the garage; in front of
// it a low stage holds one project on a plinth. The screen for the project on the stage lights
// and steps out in an orange frame; a slide moves the stage object off and the next one on, and
// the frame rides along the wall in step. Driven by two clocks: the drive-in and the slide.
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Plinth } from "../buildings/PitBuilding";
import { CI } from "../buildings/concrete";
import { ProjectObject } from "../models/projects";
import { DOMAINS } from "@/content/projects";
import { pad } from "@/components/brand/tokens";
import { BACK_Z, GAP, OBJ, OFF, PLINTH_H, POP, ROW1, SH, STAGE, STAGE_Y, STAGE_Z, SW, inOut, lerp, seg, slots, type Item, type SlideClock, type V3 } from "./anim";

/* ------------------------------------------------------------------ canvas text */

/** Plex Mono / Sans families for canvas text. */
export function fonts() {
  const cs = getComputedStyle(document.body);
  const mono = cs.getPropertyValue("--font-plex-mono").trim() || "monospace";
  const sans = cs.getPropertyValue("--font-plex").trim() || "sans-serif";
  return { mono: `${mono}, monospace`, sans: `${sans}, sans-serif` };
}

/** A canvas texture drawn now and again once the fonts arrive, disposed on unmount. */
export function useCanvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, key: string) {
  const pair = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const run = () => {
      const g = c.getContext("2d")!;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, w, h);
      draw(g);
      tex.needsUpdate = true;
    };
    run();
    return { tex, run };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, w, h]);
  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => live && pair.run());
    return () => {
      live = false;
      pair.tex.dispose();
    };
  }, [pair]);
  return pair.tex;
}

/* ------------------------------------------------------------------ pieces */

/** The scan line: an orange square round a footprint with a faint fill. Callers move it. */
export function ScanSquare({ size }: { size: number }) {
  const t = 0.018;
  return (
    <group>
      {[size / 2, -size / 2].map((pz, i) => (
        <mesh key={`h${i}`} position={[0, 0, pz]}>
          <boxGeometry args={[size + t, t, t]} />
          <meshBasicMaterial color={CI.orange} toneMapped={false} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`v${s}`} position={[(s * size) / 2, 0, 0]}>
          <boxGeometry args={[t, t, size + t]} />
          <meshBasicMaterial color={CI.orange} toneMapped={false} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial color={CI.orange} transparent opacity={0.07} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** A spotlight aimed at a point in the same frame (its target joins the scene, so it follows). */
export function Spot({ position, target, intensity, angle = 0.5, distance = 8 }: { position: V3; target: V3; intensity: number; angle?: number; distance?: number }) {
  const [t] = useState(() => new THREE.Object3D());
  return (
    <>
      <primitive object={t} position={target} />
      <spotLight position={position} target={t} angle={angle} penumbra={0.65} intensity={intensity} distance={distance} decay={1.5} color={CI.lamp} />
    </>
  );
}

// The screen's face is drawn at 1200 × 750 and stored at 768 × 480: sharp from the seat, light
// enough for five garages' worth.
const FW = 1200;
const FH = 750;
const TEX = 0.64;

/** One screen's face: the datasheet in miniature, code, name, the figure in orange, the stack. */
function Face({ it, matRef }: { it: Item; matRef: (m: THREE.MeshBasicMaterial | null) => void }) {
  const p = it.p;
  const tex = useCanvasTexture(
    FW * TEX,
    FH * TEX,
    (g) => {
      g.scale(TEX, TEX);
      const f = fonts();
      const code = `P${pad(it.index + 1)}`;
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, FW, FH);
      g.fillStyle = CI.ink;
      g.fillRect(0, 0, FW, 84);
      g.font = `500 34px ${f.mono}`;
      g.textBaseline = "middle";
      g.fillStyle = CI.orange;
      g.fillText(code, 40, 43);
      g.fillStyle = CI.paper;
      g.fillText(" / HG-08", 40 + g.measureText(code).width, 43);
      g.textAlign = "right";
      g.fillStyle = "rgba(243,242,237,0.6)";
      g.fillText(DOMAINS.find((x) => x.id === p.domain)!.label, FW - 40, 43);
      g.textAlign = "left";
      g.textBaseline = "alphabetic";
      g.fillStyle = CI.ink;
      let size = 84;
      g.font = `600 ${size}px ${f.sans}`;
      while (g.measureText(p.name).width > FW - 80 && size > 52) g.font = `600 ${(size -= 4)}px ${f.sans}`;
      g.fillText(p.name, 40, 200);
      g.fillRect(40, 250, FW - 80, 4);
      let fig = 170;
      g.font = `600 ${fig}px ${f.mono}`;
      while (g.measureText(p.headline.value).width > FW - 80 && fig > 80) g.font = `600 ${(fig -= 10)}px ${f.mono}`;
      g.fillStyle = CI.orange;
      g.fillText(p.headline.value, 32, 430);
      g.fillStyle = "#5d5d58";
      g.font = `600 34px ${f.sans}`;
      g.fillText(p.headline.label.toUpperCase(), 40, 492);
      g.fillStyle = CI.ink;
      g.fillRect(40, 566, FW - 80, 4);
      g.font = `500 32px ${f.mono}`;
      let x = 40;
      for (const s of p.stack) {
        const w = g.measureText(s).width + 32;
        if (x + w > FW - 40) break;
        g.fillRect(x + w / 2, 570, 3, 24);
        g.strokeStyle = CI.ink;
        g.lineWidth = 3;
        g.strokeRect(x, 594, w, 60);
        g.fillText(s, x + 16, 636);
        x += w + 16;
      }
    },
    p.slug,
  );
  return (
    <mesh position={[0, 0, 0.03]}>
      <planeGeometry args={[SW, SH]} />
      <meshBasicMaterial ref={matRef} map={tex} toneMapped={false} />
    </mesh>
  );
}

/** An orange frame of four bars, open in the middle. */
function Frame({ w, h, t = 0.035 }: { w: number; h: number; t?: number }) {
  return (
    <group>
      {[1, -1].map((s) => (
        <mesh key={`h${s}`} position={[0, (s * (h + t)) / 2, 0]}>
          <boxGeometry args={[w + 2 * t, t, 0.02]} />
          <meshBasicMaterial color={CI.orange} toneMapped={false} />
        </mesh>
      ))}
      {[1, -1].map((s) => (
        <mesh key={`v${s}`} position={[(s * (w + t)) / 2, 0, 0]}>
          <boxGeometry args={[t, h, 0.02]} />
          <meshBasicMaterial color={CI.orange} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** The low paper riser with an ink lip and one orange mark at its front edge. */
function Riser() {
  return (
    <group position={[0, 0, STAGE_Z]}>
      <mesh position={[0, STAGE_Y / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={STAGE} />
        <meshStandardMaterial color={CI.paper} roughness={0.7} />
      </mesh>
      <mesh position={[0, STAGE_Y / 2, STAGE[2] / 2 + 0.005]}>
        <boxGeometry args={[STAGE[0] + 0.02, STAGE_Y, 0.02]} />
        <meshStandardMaterial color={CI.ink} roughness={0.6} />
      </mesh>
      <mesh position={[0, STAGE_Y + 0.002, STAGE[2] / 2 - 0.07]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.24, 0.05]} />
        <meshBasicMaterial color={CI.orange} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** One project on its cut-down plinth; the carriage slides it on or off the stage. */
function Carriage({ slug, groupRef }: { slug: string; groupRef: (g: THREE.Group | null) => void }) {
  return (
    <group ref={groupRef} visible={false}>
      <group scale={[1, PLINTH_H, 1]}>
        <Plinth />
      </group>
      <group position={[0, PLINTH_H, 0]} scale={OBJ}>
        <ProjectObject slug={slug} active />
      </group>
    </group>
  );
}

/** The stage's and wall's own lights, for a scene without the game's (the docs mock). */
export function BayLights() {
  return (
    <>
      <Spot position={[0.9, 3.4, STAGE_Z + 1.8]} target={[0, 1.0, STAGE_Z]} angle={0.5} intensity={26} />
      <pointLight position={[-1.6, 2.2, STAGE_Z + 0.4]} intensity={3} distance={5} decay={1.5} color="#ffffff" />
      <Spot position={[0, 4.2, 0.6]} target={[0, 2.4, BACK_Z]} angle={0.7} intensity={10} distance={7} />
    </>
  );
}

/* ------------------------------------------------------------------ the bay */

/**
 * The wall, the stage and the projects. `drive` is the drive-in's progress (the wall lights and
 * the frame shows as you arrive); `slide` the project slide; `onPick` a click on a screen.
 */
export function GarageBay({ list, drive, slide, onPick }: { list: Item[]; drive: { readonly current: number }; slide: { readonly current: SlideClock }; onPick?: (i: number) => void }) {
  const items = useRef<(THREE.Group | null)[]>([]);
  const screens = useRef<(THREE.Group | null)[]>([]);
  const faces = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const cursor = useRef<THREE.Group>(null!);
  const scan = useRef<THREE.Group>(null!);
  const at = useMemo(() => slots(list.length), [list.length]);
  const scratch = useRef({ v: new THREE.Vector3(), c: new THREE.Color() });
  const two = list.length > 4;
  const cols = two ? Math.ceil(list.length / 2) : list.length;

  useFrame((s) => {
    const tmp = scratch.current;
    const k = drive.current;
    const { from, to, dir: d, k: sk } = slide.current;
    const first = from === to;
    const es = inOut(sk);

    // the stage: the old project leaves the way you pressed, the new one comes on from the other side
    items.current.forEach((g, i) => {
      if (!g) return;
      const leaving = i === from && !first && sk < 1;
      const arriving = i === to;
      g.visible = leaving || arriving;
      if (arriving) g.position.set(first ? 0 : d * OFF * (1 - es), STAGE_Y, STAGE_Z);
      if (leaving) g.position.set(-d * OFF * es, STAGE_Y, STAGE_Z);
      g.rotation.z = arriving && !first ? Math.sin(sk * Math.PI) * 0.04 * d : 0;
      g.rotation.y = arriving ? Math.sin(s.clock.elapsedTime * 0.5) * 0.2 : 0;
    });

    // the wall lights as you arrive; then the lit screen follows the stage
    const on = inOut(seg(k, 0.72, 0.95));
    let fTo = 0;
    let fFrom = 0;
    screens.current.forEach((g, i) => {
      if (!g) return;
      let f = 0;
      if (i === to) f = fTo = (first ? 1 : inOut(seg(sk, 0.25, 1))) * on;
      else if (i === from && !first) f = fFrom = (1 - inOut(seg(sk, 0, 0.5))) * on;
      g.position.set(at[i].x, at[i].y, at[i].z + POP * f);
      g.scale.setScalar(1 + 0.06 * f);
      const m = faces.current[i];
      if (m) m.color.copy(tmp.c.setScalar(lerp(0.62, 1, Math.max(f, 1 - on))));
    });
    // the orange frame rides along the wall from the old screen to the new one, at their depth
    const fp = first ? at[to] : tmp.v.lerpVectors(at[from], at[to], es);
    const pop = first ? fTo : lerp(fFrom, fTo, es);
    cursor.current.position.set(fp.x, fp.y, fp.z + POP * pop + 0.02);
    cursor.current.scale.setScalar((1 + 0.06 * pop) * lerp(0.6, 1, on));
    cursor.current.visible = on > 0.01;

    // the scan square climbs the new object as it lands
    const ks = first ? seg(k, 0.86, 1) : seg(sk, 0.6, 1);
    scan.current.visible = ks > 0 && ks < 1;
    scan.current.position.y = STAGE_Y + PLINTH_H + 1.3 * inOut(ks);
  });

  return (
    <>
      {/* the pit wall: a graphite board behind the screens, one screen per project */}
      <mesh position={[0, two ? 2.46 : ROW1, BACK_Z + 0.02]}>
        <boxGeometry args={[Math.min(7.6, cols * (SW + GAP) + 0.3), two ? 2 * SH + GAP + 0.3 : SH + 0.3, 0.03]} />
        <meshStandardMaterial color={CI.graphite} roughness={0.9} />
      </mesh>
      {list.map((it, i) => (
        <group
          key={it.p.slug}
          ref={(g) => void (screens.current[i] = g)}
          position={at[i].toArray()}
          onClick={
            onPick &&
            ((ev) => {
              ev.stopPropagation();
              onPick(i);
            })
          }
        >
          <mesh>
            <boxGeometry args={[SW + 0.05, SH + 0.05, 0.05]} />
            <meshStandardMaterial color={CI.ink} roughness={0.5} metalness={0.2} />
          </mesh>
          <Face it={it} matRef={(m) => void (faces.current[i] = m)} />
        </group>
      ))}
      <group ref={cursor} visible={false}>
        <Frame w={SW + 0.08} h={SH + 0.08} />
      </group>

      <Riser />
      {list.map((it, i) => (
        <Carriage key={it.p.slug} slug={it.p.slug} groupRef={(g) => void (items.current[i] = g)} />
      ))}
      <group ref={scan} position={[0, 0, STAGE_Z]} visible={false}>
        <ScanSquare size={1.15} />
      </group>
    </>
  );
}
