"use client";

// The interaction prompt, ported from folio-2025 (MIT, public/vendor/LICENSE.md),
// sources/Game/InteractivePoints.js, as the brand's zone sticker (docs/BRAND.md I08).
//
// Every place and contact medallion has a point standing in the world with the
// original's fixed tilt (it faces our chase camera, which sits at the same angle as the
// original's). A point is HIDDEN until the opening is done, then CONCEALED: a small
// diamond. The one the car is at (store `near` / `nearLink`) OPENs: the diamond grows
// with an elastic overshoot, the E key pops in and the label slides out of the diamond,
// all drawn on top. Leaving conceals it again. E / Enter (Hud.tsx) or a click opens it.
//
// The marker is the original's square SDF with an inner outline, kept square (no diamond):
// an ink square with a paper line, the E key on it. The label is a canvas texture (Plex
// Sans, ink on white, the place's name as written) revealed by a moving UV offset. Built imperatively under
// one group so every material is mutated through refs, never through hook values.
import { useEffect, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { getState, openZone, subscribe } from "../store";
import { zones, type ZoneId } from "../layout";
import { heightAt } from "../terrain";
import { LINKS, LINK_SPOTS, openLink } from "../social";
import { paper } from "../sound";

const HIDDEN = 0;
const CONCEALED = 1;
const OPEN = 2;

const SCALE = 1.15; // the original's 0.85, for our bigger car and props
const BACK = new THREE.Color("#111111"); // ink
const FRONT = new THREE.Color("#f3f2ed"); // paper
const LABEL_BACK = new THREE.Color("#ffffff");

// gsap's eases
const back = (s: number) => (t: number) => (s + 1) * t ** 3 - s * t ** 2;
const power2In = (t: number) => t * t;
const power2Out = (t: number) => 1 - (1 - t) ** 2;
const elastic = (a: number, p: number) => {
  const s = (p / (2 * Math.PI)) * Math.asin(1 / a);
  return (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : a * 2 ** (-10 * t) * Math.sin(((t - s) * 2 * Math.PI) / p) + 1);
};

type Tween = {
  obj: Record<string, number>;
  key: string;
  from: number | null;
  to: number;
  t: number;
  dur: number;
  delay: number;
  ease: (t: number) => number;
  done?: () => void;
  dead?: boolean;
};

type Item = {
  id: string;
  open: () => void;
  x: number;
  z: number;
  state: number;
  v: { threshold: number; thick: number; offset: number; label: number; key: number };
  group: THREE.Group;
  materials: THREE.ShaderMaterial[];
  key: THREE.Mesh;
};

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const diamondFrag = /* glsl */ `
uniform float uThreshold; uniform float uThick; uniform float uOffset; uniform vec3 uBack; uniform vec3 uFront;
varying vec2 vUv;
void main() {
  float d = max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0;
  float line = step(abs(uThreshold - d - uOffset), uThick * 0.5);
  if (d > uThreshold) discard;
  gl_FragColor = vec4(mix(uBack, uFront, line), 1.0);
  #include <colorspace_fragment>
}
`;
const labelFrag = /* glsl */ `
uniform sampler2D uMap; uniform float uOffset; uniform vec3 uBack; uniform vec3 uFront;
varying vec2 vUv;
void main() {
  vec2 p = vec2(vUv.x - uOffset, vUv.y);
  if (p.x > 1.0 || p.x < 0.0) discard;
  float text = texture2D(uMap, p).r;
  gl_FragColor = vec4(mix(uBack, uFront, text), 1.0);
  #include <colorspace_fragment>
}
`;
const keyFrag = /* glsl */ `
uniform sampler2D uMap; uniform vec3 uFront;
varying vec2 vUv;
void main() {
  if (texture2D(uMap, vUv).r < 0.5) discard;
  gl_FragColor = vec4(uFront, 1.0);
  #include <colorspace_fragment>
}
`;

const fontVar = (v: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fallback;

/** The label: the name in Plex Sans (white where text, the shader maps it to ink on white), room for the marker on the left. */
function labelTexture(text: string, family: string) {
  const h = 64;
  const font = `600 40px ${family}`;
  const c = document.createElement("canvas");
  const g = c.getContext("2d")!;
  g.font = font;
  const padL = 62;
  const padR = 22;
  c.width = Math.ceil(g.measureText(text).width) + padL + padR;
  c.height = h;
  g.fillStyle = "#000";
  g.fillRect(0, 0, c.width, h);
  g.font = font;
  g.fillStyle = "#fff";
  g.textBaseline = "middle";
  g.fillText(text, padL, h / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return { t, aspect: c.width / h };
}

/** The key cap glyph: a bold E. */
function keyTexture(family: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = "#fff";
  g.font = `700 52px ${family}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("E", 32, 35);
  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = false;
  return t;
}

function points(): { id: string; label: string; x: number; z: number; y: number; open: () => void }[] {
  return [
    ...zones.map((zn) => ({ id: zn.id, label: zn.label, x: zn.pos[0], z: zn.pos[1], y: 3.2, open: () => openZone(zn.id as ZoneId) })),
    ...LINKS.map((l, i) => ({ id: `link-${l.key}`, label: l.name, x: LINK_SPOTS[i][0], z: LINK_SPOTS[i][1], y: 2.9, open: () => openLink(l.key) })),
  ];
}

export default function InteractivePoints() {
  const root = useRef<THREE.Group>(null);
  const items = useRef<Item[]>([]);
  const tweens = useRef<Tween[]>([]);
  const active = useRef<Item | null>(null);
  const coarse = useRef(false);

  useEffect(() => {
    const parent = root.current;
    if (!parent) return;
    coarse.current = window.matchMedia("(pointer: coarse)").matches;
    let disposed = false;
    const plane = new THREE.PlaneGeometry(2, 2);
    const labelGeo = new THREE.PlaneGeometry(1, 1);
    labelGeo.translate(0.5, 0, 0);
    const owned: { dispose: () => void }[] = [plane, labelGeo];
    const sans = fontVar("--font-plex", "system-ui, sans-serif");
    const mono = fontVar("--font-plex-mono", "ui-monospace, monospace");
    // canvas text needs the web fonts loaded first
    void Promise.all([document.fonts.load(`600 40px ${sans}`), document.fonts.load(`700 52px ${mono}`)]).finally(() => {
      if (disposed) return;
      const keyTex = keyTexture(mono);
      owned.push(keyTex);
      for (const p of points()) {
        const group = new THREE.Group();
        group.rotation.order = "YXZ";
        group.rotation.x = -Math.PI * 0.15;
        group.rotation.y = Math.PI * 0.25;
        group.position.set(p.x, heightAt(p.x, p.z) + p.y, p.z);
        group.scale.setScalar(SCALE);
        group.userData.id = p.id;

        const { t, aspect } = labelTexture(p.label, sans);
        const labelMat = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader: labelFrag,
          uniforms: { uMap: { value: t }, uOffset: { value: 1 }, uBack: { value: LABEL_BACK }, uFront: { value: BACK } },
        });
        const label = new THREE.Mesh(labelGeo, labelMat);
        label.renderOrder = 6;
        label.scale.set(0.75 * aspect, 0.75, 1);
        label.position.z = -0.01;

        const diamondMat = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader: diamondFrag,
          uniforms: { uThreshold: { value: 0 }, uThick: { value: 0.15 }, uOffset: { value: 0.175 }, uBack: { value: BACK }, uFront: { value: FRONT } },
        });
        const diamond = new THREE.Mesh(plane, diamondMat);
        diamond.renderOrder = 7;

        const keyMat = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader: keyFrag,
          depthTest: false,
          uniforms: { uMap: { value: keyTex }, uFront: { value: FRONT } },
        });
        const key = new THREE.Mesh(plane, keyMat);
        key.renderOrder = 8;
        key.position.z = 0.01;
        key.scale.setScalar(0);

        group.add(label, diamond, key);
        parent.add(group);
        owned.push(t, labelMat, diamondMat, keyMat);
        items.current.push({
          id: p.id,
          open: p.open,
          x: p.x,
          z: p.z,
          state: HIDDEN,
          v: { threshold: 0, thick: 0.15, offset: 0.175, label: 1, key: 0 },
          group,
          materials: [labelMat, diamondMat],
          key,
        });
      }
    });
    return () => {
      disposed = true;
      for (const it of items.current) parent.remove(it.group);
      items.current = [];
      for (const o of owned) o.dispose();
    };
  }, []);

  // a little pulse on the open diamond when its place opens (the original's interact())
  useEffect(() => {
    let last = getState().zone;
    return subscribe(() => {
      const z = getState().zone;
      if (z && z !== last && active.current) pulse(active.current);
      last = z;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function to(obj: Record<string, number>, key: string, value: number, dur: number, ease: (t: number) => number, delay = 0, done?: () => void) {
    for (const tw of tweens.current) if (tw.obj === obj && tw.key === key) tw.dead = true; // overwrite: true
    tweens.current.push({ obj, key, from: null, to: value, t: 0, dur, delay, ease, done });
  }

  function reveal(it: Item) {
    if (it.state === OPEN) return;
    it.state = OPEN;
    const e = elastic(1.3, 0.4);
    to(it.v, "threshold", 0.5, 1.5, e);
    to(it.v, "thick", 0.075, 1.5, e);
    to(it.v, "offset", 0.15, 1.5, e);
    if (!coarse.current) {
      it.v.key = 0;
      to(it.v, "key", 0.25, 1.5, elastic(1.3, 0.8), 0.6);
    }
    to(it.v, "label", 0, 0.6, power2Out, 0.2);
    for (const m of it.materials) m.depthTest = false; // drawn over everything while open
    paper(true);
  }

  function conceal(it: Item) {
    if (it.state === CONCEALED) return;
    const from = it.state;
    it.state = CONCEALED;
    const e = from === HIDDEN ? power2Out : back(4.5);
    to(it.v, "threshold", 0.25, 0.6, e, 0.2);
    to(it.v, "thick", 0.15, 0.6, e, 0.2);
    to(it.v, "offset", 0.175, 0.6, e, 0.2, () => {
      for (const m of it.materials) m.depthTest = true;
    });
    to(it.v, "key", 0, 0.6, power2In);
    to(it.v, "label", -1, 0.6, power2In);
    if (from === OPEN) paper(false);
  }

  function pulse(it: Item) {
    to(it.v, "threshold", 0.6, 0.1, power2Out, 0, () => to(it.v, "threshold", 0.5, 1.5, elastic(1.3, 0.6)));
  }

  useFrame((_, dt) => {
    const s = getState();
    const list = items.current;
    if (!list.length) return;
    // HIDDEN until the opening has swept out, then every point shows its small diamond
    if (s.revealed) for (const it of list) if (it.state === HIDDEN) conceal(it);
    // the open one: the medallion the car is at, else the place
    // a place's card is open (or the garage shot): the prompt steps back
    const want = !s.revealed || s.zone ? null : s.nearLink ? `link-${s.nearLink}` : s.near;
    const next = want ? (list.find((it) => it.id === want) ?? null) : null;
    if (next !== active.current) {
      if (active.current && active.current.state === OPEN) conceal(active.current);
      active.current = next;
    }
    if (next && next.state !== OPEN) reveal(next);

    // tweens (a finished tween's callback may start new ones)
    const step = Math.min(dt, 0.1);
    for (const tw of tweens.current.slice()) {
      if (tw.dead) continue;
      if (tw.delay > 0) {
        tw.delay -= step;
        continue;
      }
      if (tw.from === null) tw.from = tw.obj[tw.key];
      tw.t += step;
      const k = Math.min(1, tw.t / tw.dur);
      tw.obj[tw.key] = tw.from + (tw.to - tw.from) * tw.ease(k);
      if (k >= 1) {
        tw.dead = true;
        tw.done?.();
      }
    }
    tweens.current = tweens.current.filter((tw) => !tw.dead);

    for (const it of list) {
      const [labelMat, diamondMat] = it.materials;
      diamondMat.uniforms.uThreshold.value = it.v.threshold;
      diamondMat.uniforms.uThick.value = it.v.thick;
      diamondMat.uniforms.uOffset.value = it.v.offset;
      labelMat.uniforms.uOffset.value = it.v.label;
      it.key.scale.setScalar(it.v.key);
      it.group.visible = it.v.threshold > 0.001;
    }
  });

  const click = (e: ThreeEvent<MouseEvent>) => {
    let o: THREE.Object3D | null = e.object;
    while (o && !o.userData.id) o = o.parent;
    const it = items.current.find((x) => x.id === o?.userData.id);
    if (!it || it.state !== OPEN) return;
    e.stopPropagation();
    pulse(it);
    it.open();
  };

  return <group ref={root} onClick={click} userData={{ noMap: true }} />;
}
