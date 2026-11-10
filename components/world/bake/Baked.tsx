"use client";

// The baked light (scripts/bake/run.mjs) in the world. Lives inside <Physics>: the dev export asks
// the physics world which instanced copies are knock-about props. Under ?look=next (look.ts) it
// lays the bake over the static meshes (apply.ts) once the opening has landed, on High and
// Balanced (Low keeps the current look's cost: no bake is loaded); everywhere else it does nothing.
//
// It plugs into look.ts's `bakedLight` hook: `resolve` hands lookWorld.tsx's StaticAO the aoMap
// of every mesh baked here, so it skips its per-vertex AO there. Whoever clones the material
// last, this keeps the bake's patch (the far sun shadow and the bounce) on it.
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import * as THREE from "three";
import { NEXT, bakedLight, relook } from "../look";
import { useWorld } from "../store";
import { useQuality } from "../quality";
import { carState } from "../carState";
import { dayNight } from "../daynight";
import { AO_INTENSITY, bakeUniforms, isBakeMaterial, loadChunks, loadManifest, match, patchBake, type Baked as Entry } from "./apply";

/** `?bake=off`: look=next without the bake, for side-by-side checks. */
const OFF = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("bake") === "off";

export default function Baked() {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const { world } = useRapier();
  const revealed = useWorld((s) => s.revealed);
  const tier = useQuality((s) => s.tier);
  const go = NEXT && !OFF && revealed && tier !== "low";
  const done = useRef<Entry[] | null>(null);
  const sun = useRef<THREE.DirectionalLight | null>(null);
  const tick = useRef(0);
  const ref = useRef({ scale: 3.1 });
  const cam = useRef(camera);
  useEffect(() => {
    cam.current = camera;
  }, [camera]);

  // Dev: window.__bake.export() writes the static world out (export.ts), read chunk by chunk.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __bake?: object };
    let last: { chunks: { glb: string }[] } | null = null;
    w.__bake = {
      export: async () => {
        const bodies: number[] = [];
        world.forEachRigidBody((b) => {
          if (!b.isDynamic()) return;
          const t = b.translation();
          bodies.push(t.x, t.z, t.y);
        });
        const { exportStatic } = await import("./export");
        const r = await exportStatic(scene, new Float32Array(bodies));
        last = r;
        return { stats: r.stats, chunks: r.chunks.map((c) => ({ ...c, glb: c.glb.length })) };
      },
      chunk: (i: number) => last?.chunks[i].glb ?? null,
      stats: () => ({ baked: done.current?.length ?? 0, matchMs: Math.round(timing.match) }),
      ids: async () => [...(await import("./ids")).receivers(scene).keys()],
      // meshes (and instanced copies) whose world box holds a point
      at: (x: number, y: number, z: number) => {
        const p = new THREE.Vector3(x, y, z);
        const b = new THREE.Box3();
        const m4 = new THREE.Matrix4();
        const out: unknown[] = [];
        scene.traverse((o) => {
          const m = o as THREE.InstancedMesh;
          if (!m.isMesh) return;
          if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
          const n = m.isInstancedMesh ? m.count : 1;
          for (let i = 0; i < n; i++) {
            if (m.isInstancedMesh) m.getMatrixAt(i, m4).premultiply(m.matrixWorld);
            else m4.copy(m.matrixWorld);
            b.copy(m.geometry.boundingBox!).applyMatrix4(m4);
            if (b.containsPoint(p)) out.push([m.name || m.parent?.name || m.type, m.isInstancedMesh ? `copy ${i}/${n}` : "", m.geometry.attributes.position.count, b.min.toArray().map((v) => +v.toFixed(2)), b.max.toArray().map((v) => +v.toFixed(2)), (m.material as THREE.Material).type, m.visible]);
          }
        });
        return out;
      },
      // what is under a screen point (pixels): world point, mesh, whether it carries the bake
      pick: (x: number, y: number) => {
        const rc = new THREE.Raycaster();
        rc.setFromCamera(new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), cam.current);
        const h = rc.intersectObjects(scene.children, true).find((i) => (i.object as THREE.Mesh).isMesh && i.object.visible);
        if (!h) return null;
        const m = h.object as THREE.Mesh;
        return { p: h.point.toArray().map((v) => +v.toFixed(2)), name: m.name || m.parent?.name || m.type, verts: m.geometry.attributes.position.count, baked: owned.has(m), uv1: h.uv1?.toArray() };
      },
    };
    return () => {
      delete w.__bake;
    };
  }, [scene, world]);

  // look=next: load, match, compile off the main path, then swap in. Meshes that aren't in place
  // yet (the start's lettering drops in) are looked for again a little later, twice.
  useEffect(() => {
    if (!go || done.current) return;
    let dead = false;
    (async () => {
      const manifest = await loadManifest();
      if (!manifest || dead) return;
      const chunks = await loadChunks(manifest);
      // the maps go up to the GPU one a frame now, not all in the frame that first draws them
      for (const c of chunks) {
        if (dead) return;
        gl.initTexture(c.tex);
        await nextFrame();
      }
      bakeUniforms.uBakeSun.value.fromArray(manifest.sun).normalize();
      ref.current.scale = manifest.light.sun;
      const list: Entry[] = [];
      let want: Set<string> | undefined;
      for (let pass = 0; pass < 3 && !dead; pass++) {
        await sleep(pass === 0 ? 1500 : pass === 1 ? 5000 : 15000);
        if (dead) return;
        scene.updateMatrixWorld(true);
        const t0 = performance.now();
        const { baked, missing } = match(scene, chunks, want);
        timing.match += performance.now() - t0;
        await install(baked, gl, camera, scene, () => dead);
        list.push(...baked);
        done.current = list;
        if (!missing.length) break;
        want = new Set(missing);
        if (pass === 2 && process.env.NODE_ENV !== "production") {
          console.warn(`bake: ${missing.length} baked meshes not found in the world (rebake: node scripts/bake/run.mjs)`);
          (window as unknown as { __bakeMissing?: string[] }).__bakeMissing = missing;
        }
      }
    })();
    return () => {
      dead = true;
    };
  }, [go, scene, gl, camera]);

  useFrame(() => {
    const list = done.current;
    if (!list) return;
    if (!sun.current?.parent) sun.current = findSun(scene);
    const s = sun.current;
    const u = bakeUniforms;
    u.uBakeDay.value = 1 - dayNight.night;
    u.uBakeCenter.value.copy(s ? s.target.position : carState.pos);
    if (s) {
      const half = (s.shadow.camera as THREE.OrthographicCamera).right || 34;
      u.uBakeFar.value.set(half * 0.62, half * 0.9);
      u.uBakeTint.value.copy(s.color).multiplyScalar(s.intensity / ref.current.scale);
    }
    // a later clone of the material (StaticAO, a livery of the look) drops the patch: put it back
    if (++tick.current % 30 === 0) keepPatched(list);
  });

  return null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const nextFrame = () => new Promise((r) => requestAnimationFrame(r));
const timing = { match: 0 };
const owned = new Map<THREE.Mesh, Entry>();

/** Compiles the baked materials in parallel (KHR_parallel_shader_compile), then swaps them in. */
async function install(baked: Entry[], gl: THREE.WebGLRenderer, camera: THREE.Camera, scene: THREE.Scene, dead: () => boolean) {
  if (!baked.length) return;
  const mats = baked.map((b) => bakedMaterial(b.mesh.material as THREE.Material, b));
  const stage = new THREE.Scene();
  baked.forEach((b, i) => stage.add(new THREE.Mesh(b.geometry, mats[i])));
  try {
    await gl.compileAsync(stage, camera, scene);
  } catch {}
  stage.clear();
  if (dead()) return;
  baked.forEach((b, i) => {
    b.mesh.geometry = b.geometry;
    b.mesh.material = mats[i];
    owned.set(b.mesh, b);
  });
  // look.ts's hook: StaticAO gets these meshes' aoMap and skips its per-vertex AO on them
  bakedLight.resolve = (mesh) => {
    const b = owned.get(mesh);
    return b ? { aoMap: b.tex, aoMapIntensity: AO_INTENSITY, channel: 1 } : null;
  };
  bakedLight.version++;
}

/** Puts the bake back on any mesh whose material was swapped for one without it (kept out of the hook). */
function keepPatched(list: Entry[]) {
  for (const b of list) {
    const m = b.mesh.material as THREE.Material;
    if (!isBakeMaterial(m)) b.mesh.material = bakedMaterial(m, b);
  }
}

/** The mesh's own material (cloned unless it already carries this bake) with the bake on it. */
function bakedMaterial(m: THREE.Material, b: Entry) {
  let out = m as THREE.MeshStandardMaterial;
  if (out.aoMap !== b.tex) {
    out = relook(out.clone());
    out.aoMap = b.tex;
    out.aoMapIntensity = AO_INTENSITY;
  }
  patchBake(out, b.bounce);
  return out;
}

const findSun = (scene: THREE.Scene) => {
  let l: THREE.DirectionalLight | null = null;
  scene.traverse((o) => {
    if (!l && (o as THREE.DirectionalLight).isDirectionalLight && o.castShadow) l = o as THREE.DirectionalLight;
  });
  return l;
};
