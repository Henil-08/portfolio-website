"use client";

// The look=next pieces that live in the scene (look.ts): the HDRI environment, the filmic tone
// mapping with its exposure per time of day, the contact shadow under the car, the baked AO on
// the static models, and the tier hook. World.tsx mounts them only when `NEXT` is on.
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import { Environment, Lightformer } from "@react-three/drei";
import { Effect, BlendFunction } from "postprocessing";
import * as THREE from "three";
import { carState } from "./carState";
import { getState } from "./store";
import { studio } from "./bloom/state";
import { indoor } from "./indoor";
import { dayNight } from "./daynight";
import { heightAt } from "./terrain";
import { sceneParams } from "./Effects";
import { bakedLight, relook, setLookTier, type BakedLight } from "./look";
import { bakeLookAO, stepLookAO, type AoPart } from "./lookAO";
import { quality, useQuality } from "./quality";
import { garageView } from "./garage/state";
import { ownCopies } from "./instanceCull";

/** The vehicle model's name in the scene (Vehicle.tsx PLAYER_MODEL; not imported, to keep this file out of Vehicle's graph). */
const PLAYER = "player-vehicle";

/* ------------------------------------------------------------------ environment */

/**
 * Image-based light: the CC0 overcast sky (public/env) prefiltered once to a PMREM, plus two long
 * soft strips overhead so car paint and glass show their curves. Lights and reflects only; the
 * sky drawn behind the world stays the paper gradient (Rig.tsx Sky). Intensity follows the time
 * of day (Effects.tsx EnvLight).
 */
export function LookEnvironment() {
  return (
    <Environment files="/env/kloofendal_overcast_puresky_1k.hdr" resolution={256} frames={1} environmentIntensity={0.16}>
      <Lightformer form="rect" intensity={7} position={[0, 14, -4]} rotation-x={Math.PI / 2} scale={[40, 2.2, 1]} color="#ffffff" />
      <Lightformer form="rect" intensity={5} position={[0, 12, 6]} rotation-x={Math.PI / 2} scale={[40, 1.2, 1]} color="#f3f2ed" />
    </Environment>
  );
}

/* ------------------------------------------------------------------ tone mapping */

// Khronos PBR Neutral (the studio's choice, studio/StudioStage.tsx STUDIO_TONE): filmic in the
// highlights, and below the shoulder base colours come out as they went in, so paper stays paper,
// ink ink and orange orange. AgX was tried for the record: it greys and desaturates the orange.
// The exposure is ours (a uniform), so it can follow the time of day every frame, and so is how
// much of the toe is kept (`toe`, Effects.tsx SCENES_NEXT): Khronos's offset scaled, the same
// curve with the same slope where it meets the straight part, so nothing kinks.
const NEUTRAL = /* glsl */ `
uniform float exposure;
uniform float toe;
vec3 lookNeutral(vec3 color) {
  const float startCompression = 0.8 - 0.04;
  const float desaturation = 0.15;
  color *= exposure;
  float x = min(color.r, min(color.g, color.b));
  float offset = (x < 0.08 ? x - 6.25 * x * x : 0.04) * toe;
  color -= offset;
  float peak = max(color.r, max(color.g, color.b));
  if (peak < startCompression) return color;
  float d = 1.0 - startCompression;
  float newPeak = 1.0 - d * d / (peak + d - startCompression);
  color *= newPeak / peak;
  float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
  return mix(color, vec3(newPeak), g);
}
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  outputColor = vec4(lookNeutral(inputColor.rgb), inputColor.a);
}`;

export class LookToneEffect extends Effect {
  constructor() {
    super("LookToneEffect", NEUTRAL, {
      blendFunction: BlendFunction.SRC,
      uniforms: new Map([
        ["exposure", new THREE.Uniform(1)],
        ["toe", new THREE.Uniform(1)],
      ]),
    });
  }
}

/** The composer's tone mapping (World.tsx), its exposure following the time of day. */
export function LookTone() {
  const effect = useMemo(() => new LookToneEffect(), []);
  useEffect(() => () => effect.dispose(), [effect]);
  useFrame(() => {
    const p = sceneParams();
    effect.uniforms.get("exposure")!.value = p.exposure;
    effect.uniforms.get("toe")!.value = p.toe;
  });
  return <primitive object={effect} />;
}

/** Without a composer (phones' light version) the renderer tone maps; its exposure follows here. */
export function LookExposure() {
  useFrame((state) => {
    state.gl.toneMappingExposure = sceneParams().exposure;
  });
  return null;
}

/** Hands the quality tier to the materials' micro-texture switch (a uniform: nothing recompiles). */
export function LookTier() {
  const tier = useQuality((s) => s.tier);
  useEffect(() => setLookTier(tier), [tier]);
  return null;
}

/* ------------------------------------------------------------------ contact shadow */

/** A soft rounded-rectangle blob, white with the shadow in its alpha (drawn once, 128 px). */
function blobTexture() {
  const S = 128;
  const data = new Uint8Array(S * S * 4);
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) {
      const x = Math.abs((i + 0.5) / S - 0.5) * 2;
      const y = Math.abs((j + 0.5) / S - 0.5) * 2;
      // distance outside a rounded box of half-size 0.5 with corner radius 0.3, in uv
      const qx = Math.max(x - 0.5 + 0.3, 0);
      const qy = Math.max(y - 0.5 + 0.3, 0);
      const d = Math.hypot(qx, qy) - 0.3 + Math.min(Math.max(x - 0.5, y - 0.5), 0);
      const a = 1 - THREE.MathUtils.smoothstep(d, -0.32, 0.48);
      const k = (j * S + i) * 4;
      data[k] = data[k + 1] = data[k + 2] = 255;
      data[k + 3] = Math.round(a * a * 255);
    }
  const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

const _inv = new THREE.Matrix4();
const _m = new THREE.Matrix4();
const _box = new THREE.Box3();
const _b = new THREE.Box3();

/**
 * A soft dark footprint under the car, the contact the shadow map is too coarse to draw: one
 * transparent quad sized to the vehicle, on the ground found by a ray (roads, bridges, terrain),
 * turned with the heading and fading as the car leaves the ground. Lives inside <Physics>.
 */
export function ContactShadow() {
  const { world, rapier } = useRapier();
  const scene = useThree((s) => s.scene);
  const mesh = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => blobTexture(), []);
  const rayRef = useRef<InstanceType<typeof rapier.Ray> | null>(null);
  const st = useRef({ l: 3.2, w: 1.6, measured: 0, rest: -1, fade: 0, root: null as THREE.Object3D | null });
  useEffect(() => () => tex.dispose(), [tex]);

  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    const s = st.current;
    const now = performance.now();
    // the vehicle's footprint in its body's frame (+x forward), measured once a second
    if (now - s.measured > 1000) {
      s.measured = now;
      // the player's model, found again only when it has left the scene (a new vehicle)
      let at: THREE.Object3D | null = s.root;
      while (at && at !== scene) at = at.parent;
      if (!at) s.root = scene.getObjectByName(PLAYER) ?? null;
      const root = s.root;
      const body = root?.parent;
      if (root && body) {
        body.updateWorldMatrix(true, true);
        _inv.copy(body.matrixWorld).invert();
        _box.makeEmpty();
        root.traverse((o) => {
          const g = (o as THREE.Mesh).geometry;
          if (!(o as THREE.Mesh).isMesh || !o.visible || !g?.attributes.position) return;
          if (!g.boundingBox) g.computeBoundingBox();
          _box.union(_b.copy(g.boundingBox!).applyMatrix4(_m.multiplyMatrices(_inv, o.matrixWorld)));
        });
        if (!_box.isEmpty()) {
          s.l = _box.max.x - _box.min.x;
          s.w = _box.max.z - _box.min.z;
        }
      }
    }
    const p = carState.pos;
    const ray = (rayRef.current ??= new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }));
    ray.origin = { x: p.x, y: p.y + 0.5, z: p.z };
    const hit = world.castRay(ray, 12, true, undefined, undefined, undefined, undefined, (c) => {
      const b = c.parent();
      return !b || b.isFixed();
    });
    const ground = hit ? p.y + 0.5 - hit.timeOfImpact : heightAt(p.x, p.z);
    const h = p.y - ground;
    if (s.rest < 0 || (carState.grounded && h < s.rest + 0.5)) s.rest = s.rest < 0 ? h : s.rest + (h - s.rest) * Math.min(1, dt * 4);
    const g = getState();
    const want = g.phase === "world" && studio.k < 0.999 && !indoor.on ? 1 : 0;
    s.fade += (want - s.fade) * Math.min(1, dt * 3);
    const lift = 1 - THREE.MathUtils.smoothstep(h - s.rest, 0.15, 2.2);
    const mat = m.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.62 * lift * s.fade;
    m.visible = mat.opacity > 0.01;
    m.position.set(p.x, ground + 0.035, p.z);
    m.rotation.set(-Math.PI / 2, Math.atan2(-carState.forward.z, carState.forward.x), 0, "YXZ");
    m.scale.set(s.l * 1.25, s.w * 1.45, 1);
  });

  return (
    <mesh ref={mesh} visible={false} frustumCulled={false} renderOrder={1} userData={{ bloomSkip: true, noMap: true, treatAsOpaque: true, noAO: true }}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} color="#15181d" transparent opacity={0} depthWrite={false} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ the car at night */

/**
 * At night the car's own light: a warm lamp over its tail, so the car and a pool of tarmac round
 * it read under the chase camera (an ink livery on dark asphalt was lost), the rest of the night
 * untouched (it reaches ~9 m). Always in the scene, at 0 by day, so the light count never changes
 * and nothing recompiles; off in the garage studio and indoors.
 */
export function CarFill() {
  const light = useRef<THREE.PointLight>(null);
  const k = useRef(0);
  useFrame((_, dt) => {
    const l = light.current;
    if (!l) return;
    const g = getState();
    const want = g.phase === "world" && !indoor.on ? dayNight.night * (1 - studio.k) : 0;
    k.current += (want - k.current) * Math.min(1, dt * 3);
    l.intensity = k.current * 7;
    const p = carState.pos;
    const f = carState.forward;
    l.position.set(p.x - f.x * 1.4, p.y + 2.6, p.z - f.z * 1.4);
  });
  return <pointLight ref={light} color="#fff3dc" intensity={0} distance={9} decay={1.6} />;
}

/* ------------------------------------------------------------------ baked AO and baked light */

type Job = AoPart[];
/** What the bake has done (window.__lookAO in headless checks): models, vertices, main-thread ms in all, the longest one, still queued. */
export const aoStats = { models: 0, verts: 0, ms: 0, worst: 0, queued: 0 };
if (typeof window !== "undefined") (window as unknown as { __lookAO: typeof aoStats }).__lookAO = aoStats;
const MAX_VERTS = 60000;
const MAX_R = 30;

/** A static mesh whose material reads `lookAO` and asks for a bake (look.ts lookMat). */
function bakeable(o: THREE.Object3D): o is THREE.Mesh {
  const m = o as THREE.Mesh;
  if (!m.isMesh || (m as THREE.SkinnedMesh).isSkinnedMesh || Array.isArray(m.material) || !m.material) return false;
  const mat = m.material as THREE.Material;
  if (!mat.userData?.lookBake || (mat.transparent && mat.opacity < 0.6) || mat.alphaTest > 0) return false;
  const g = m.geometry;
  if (!g?.attributes.position || !g.attributes.normal || g.attributes.lookAO || g.attributes.position.count > MAX_VERTS) return false;
  if (!g.boundingSphere) g.computeBoundingSphere();
  return (g.boundingSphere?.radius ?? Infinity) < MAX_R;
}

const _s = new THREE.Sphere();
const _t = new THREE.Box3();

/**
 * Bakes per-vertex AO onto the world's static models once (lookAO.ts), and lays any baked light
 * from the Blender pipeline (look.ts `bakedLight`) over the meshes it covers. Siblings drawn as one
 * model (a kit model's paints, a built model's instanced parts over the same copies) bake together
 * in their parent's frame, so their parts shade each other; a geometry is baked once wherever it
 * is reused. The work is spread over frames: freely during the boot (the select screen), and only
 * a millisecond or so a frame once driving (lookAO.ts slices the vertex pass), so no frame pays for a model.
 */
export function StaticAO() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const st = useRef({ queue: [] as Job[], last: 0, seen: new WeakSet<THREE.BufferGeometry>(), lit: new WeakSet<THREE.Mesh>(), version: -1, busy: false });

  useFrame((_, dt) => {
    stepLookAO(dt);
    const s = st.current;
    const now = performance.now();
    const g = getState();
    const driving = g.phase === "world" && g.revealed;
    // new static meshes show up with the places as they mount: look often during the boot, rarely after
    if (now - s.last > (driving && !s.queue.length ? 8000 : 2000)) {
      s.last = now;
      const relight = bakedLight.version !== s.version;
      s.version = bakedLight.version;
      scan(scene, s.queue, s.seen, s.lit, relight);
    }
    aoStats.queued = s.queue.length;
    if (!s.queue.length || s.busy) return;
    // once driving: never on Low (it costs what the current look costs; what the boot baked stays),
    // and not while a garage is open (its room mounts then, and the bay's frames stay clean)
    if (driving && (quality.get().tier === "low" || garageView.dom)) return;
    const job = s.queue.shift()!;
    s.busy = true;
    // the vertex pass takes ~1 ms of a frame once driving, more while the boot's screens are up
    bakeLookAO(gl, job, { dirs: 36, res: 128, budget: () => (getState().revealed ? 1 : 8) })
      .then((r) => {
        aoStats.verts += r.verts;
        aoStats.models++;
        aoStats.ms += r.ms;
        aoStats.worst = Math.max(aoStats.worst, r.ms);
      })
      .catch(() => {})
      .finally(() => {
        s.busy = false;
      });
  });
  return null;
}

function scan(scene: THREE.Scene, queue: Job[], seen: WeakSet<THREE.BufferGeometry>, lit: WeakSet<THREE.Mesh>, relight: boolean) {
  const groups = new Map<string, THREE.Mesh[]>();
  const resolve = bakedLight.resolve;
  const visit = (o: THREE.Object3D) => {
    if (o.userData.noAO || o.name === PLAYER) return;
    if (resolve && (o as THREE.Mesh).isMesh && (relight || !lit.has(o as THREE.Mesh))) {
      const b = resolve(o as THREE.Mesh);
      if (b) {
        applyBaked(o as THREE.Mesh, b);
        lit.add(o as THREE.Mesh);
      }
    }
    if (bakeable(o) && !seen.has(o.geometry) && !lit.has(o)) {
      const inst = o as unknown as THREE.InstancedMesh;
      // a built model's parts are instanced siblings over the same copies (culling reorders each
      // one's buffer every frame, so the copies are read as their owner wrote them)
      const own = inst.isInstancedMesh ? ownCopies(inst) : null;
      const arr = own ? own.m : inst.isInstancedMesh ? (inst.instanceMatrix.array as Float32Array) : null;
      const key = arr ? `${o.parent?.id}|i${own ? own.n : inst.count}|${Array.from(arr.subarray(12, 15), (v) => v.toFixed(2)).join(",")}` : `${o.parent?.id}|m`;
      const list = groups.get(key) ?? [];
      list.push(o);
      groups.set(key, list);
    }
    for (const c of o.children) visit(c);
  };
  visit(scene);
  for (const list of groups.values()) {
    const parts = list.filter((m) => !seen.has(m.geometry)).map((m) => ({ geometry: m.geometry, matrix: m.matrix.clone() }));
    if (!parts.length) continue;
    // a parent that holds models spread over the island: each part on its own
    _box.makeEmpty();
    for (const p of parts) {
      if (!p.geometry.boundingBox) p.geometry.computeBoundingBox();
      _box.union(_t.copy(p.geometry.boundingBox!).applyMatrix4(p.matrix));
    }
    const together = _box.getBoundingSphere(_s).radius < MAX_R;
    for (const p of parts) seen.add(p.geometry);
    if (together) queue.push(parts);
    else for (const p of parts) queue.push([p]);
  }
}

/** Baked maps on a per-mesh clone of its material (the clone keeps the look, look.ts relook). */
function applyBaked(mesh: THREE.Mesh, b: BakedLight) {
  const base = mesh.userData.lookBase ?? mesh.material;
  if (Array.isArray(base) || !(base instanceof THREE.MeshStandardMaterial)) return;
  mesh.userData.lookBase = base;
  const m = relook(base.clone());
  if (b.aoMap) {
    m.aoMap = b.aoMap;
    m.aoMapIntensity = b.aoMapIntensity ?? 1;
    m.aoMap.channel = b.channel ?? 1;
  }
  if (b.lightMap) {
    m.lightMap = b.lightMap;
    m.lightMapIntensity = b.lightMapIntensity ?? 1;
    m.lightMap.channel = b.channel ?? 1;
  }
  mesh.material = m;
}
