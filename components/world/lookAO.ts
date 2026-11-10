// Per-vertex ambient occlusion for the world's static models, baked once at load (look=next,
// look.ts). The method is studio/ao.ts's (the model and a ground plane at its foot drawn as depth
// from many directions over the sky; each vertex counts the directions it can see, weighted by
// how much it faces them), with every direction drawn into one atlas, so a model costs a single
// read-back from the GPU instead of one per direction, and that read-back is asynchronous (a
// fence, not a stall: during the boot the GPU is busy compiling, and a synchronous read waited
// seconds for it). The result goes in the geometry's
// `lookAO` attribute, which every looked material reads (1 where there is none), so a bake
// recompiles nothing: the attribute appears and the next frame draws with it.
import * as THREE from "three";

/** One part of a model: its geometry and where it sits in the model's frame. */
export type AoPart = { geometry: THREE.BufferGeometry; matrix: THREE.Matrix4 };
export type LookAoOpts = {
  dirs?: number;
  res?: number;
  strength?: number;
  curve?: number;
  /** main-thread ms the vertex pass may take per frame before it waits for the next (asked as it goes) */
  budget?: () => number;
};

const depthMat = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  vertexShader: /* glsl */ `
    void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    void main() {
      float d = gl_FragCoord.z;
      vec3 e = fract(d * vec3(1.0, 255.0, 65025.0));
      e -= e.yzz * vec3(1.0 / 255.0, 1.0 / 255.0, 0.0);
      gl_FragColor = vec4(e, 1.0);
    }`,
});

/** Fibonacci points on the upper hemisphere, a little below the horizon too. */
function hemisphere(n: number) {
  const out: THREE.Vector3[] = [];
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) / n) * 1.08;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    out.push(new THREE.Vector3(Math.cos(i * ga) * r, y, Math.sin(i * ga) * r));
  }
  return out;
}

let rt: THREE.WebGLRenderTarget | null = null;
let px: Uint8Array | null = null;

/**
 * Bakes `lookAO` onto every part's geometry (in place). Draws now; the attribute lands when the
 * GPU has handed the atlas back. Resolves with the vertices it baked and the main thread's time on it (ms). The vertex pass is
 * sliced over frames by `o.budget`, so a big model never stalls one. One at a time: the atlas is shared.
 */
export async function bakeLookAO(gl: THREE.WebGLRenderer, parts: AoPart[], o: LookAoOpts = {}): Promise<{ verts: number; ms: number }> {
  const t0 = performance.now();
  const dirs = hemisphere(o.dirs ?? 36);
  const res = o.res ?? 128;
  const strength = o.strength ?? 0.8;
  const curve = o.curve ?? 0.8;
  const cols = Math.ceil(Math.sqrt(dirs.length));
  const W = cols * res;
  if (!rt || rt.width !== W) {
    rt?.dispose();
    rt = new THREE.WebGLRenderTarget(W, W, { depthBuffer: true, type: THREE.UnsignedByteType, generateMipmaps: false });
    px = new Uint8Array(W * W * 4);
  }

  const scene = new THREE.Scene();
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  for (const p of parts) {
    const m = new THREE.Mesh(p.geometry, depthMat);
    m.matrixAutoUpdate = false;
    m.matrix.copy(p.matrix);
    m.matrixWorld.copy(p.matrix);
    m.frustumCulled = false;
    scene.add(m);
    if (!p.geometry.boundingBox) p.geometry.computeBoundingBox();
    box.union(tmp.copy(p.geometry.boundingBox!).applyMatrix4(p.matrix));
  }
  if (box.isEmpty()) return { verts: 0, ms: 0 };
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const R = Math.max(0.05, sphere.radius * 1.02);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(R * 6, R * 6).rotateX(-Math.PI / 2), depthMat);
  floor.position.set(sphere.center.x, box.min.y - R * 0.002, sphere.center.z);
  floor.updateMatrixWorld(true);
  floor.matrixAutoUpdate = false;
  scene.add(floor);

  const cam = new THREE.OrthographicCamera(-R, R, R, -R, R * 0.01, R * 4);
  const prev = { rt: gl.getRenderTarget(), color: gl.getClearColor(new THREE.Color()), alpha: gl.getClearAlpha(), auto: gl.autoClear, shadow: gl.shadowMap.autoUpdate };
  gl.shadowMap.autoUpdate = false;
  gl.setClearColor(0xffffff, 1);
  gl.setRenderTarget(rt);
  rt.scissorTest = false;
  rt.viewport.set(0, 0, W, W);
  gl.clear(true, true, false);
  gl.autoClear = false;
  rt.scissorTest = true;
  const vps: THREE.Matrix4[] = [];
  dirs.forEach((d, k) => {
    cam.position.copy(sphere.center).addScaledVector(d, R * 2);
    cam.up.set(Math.abs(d.y) > 0.99 ? 1 : 0, Math.abs(d.y) > 0.99 ? 0 : 1, 0);
    cam.lookAt(sphere.center);
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
    const x = (k % cols) * res;
    const y = Math.floor(k / cols) * res;
    rt!.viewport.set(x, y, res, res);
    rt!.scissor.set(x, y, res, res);
    gl.setRenderTarget(rt);
    gl.render(scene, cam);
    vps.push(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  });
  rt.scissorTest = false;
  rt.viewport.set(0, 0, W, W);
  gl.setRenderTarget(prev.rt);
  gl.setClearColor(prev.color, prev.alpha);
  gl.autoClear = prev.auto;
  gl.shadowMap.autoUpdate = prev.shadow;
  floor.geometry.dispose();
  let ms = performance.now() - t0;
  await gl.readRenderTargetPixelsAsync(rt, 0, 0, W, W, px!);

  // depth bias: a couple of texels of the map, in NDC depth (range 4R mapped to 0..1)
  const texel = (2 * R) / res;
  const eps = texel * 1.5;
  const bias = (texel * 2) / (R * 4);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const nm = new THREE.Matrix3();
  const buf = px!;
  // the views as flat rows (orthographic: no divide), the directions as flat xyz
  const E = new Float32Array(dirs.length * 12);
  const D = new Float32Array(dirs.length * 3);
  dirs.forEach((d, k) => {
    const e = vps[k].elements;
    E.set([e[0], e[4], e[8], e[12], e[1], e[5], e[9], e[13], e[2], e[6], e[10], e[14]], k * 12);
    D.set([d.x, d.y, d.z], k * 3);
  });
  let count = 0;
  let slice = performance.now();
  for (const part of parts) {
    const g = part.geometry;
    const pos = g.attributes.position as THREE.BufferAttribute;
    const nor = g.attributes.normal as THREE.BufferAttribute | undefined;
    nm.getNormalMatrix(part.matrix);
    const ao = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      // a slice of the main thread per frame (`o.budget`), then wait for the next one
      if ((i & 127) === 0 && performance.now() - slice > (o.budget?.() ?? Infinity)) {
        ms += performance.now() - slice;
        await new Promise((r) => requestAnimationFrame(r));
        slice = performance.now();
      }
      p.fromBufferAttribute(pos, i).applyMatrix4(part.matrix);
      if (nor) n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
      else n.set(0, 1, 0);
      p.addScaledVector(n, eps);
      let seen = 0;
      let total = 0;
      for (let k = 0; k < dirs.length; k++) {
        const w = n.x * D[k * 3] + n.y * D[k * 3 + 1] + n.z * D[k * 3 + 2];
        if (w <= 0) continue;
        total += w;
        const b = k * 12;
        const vx = E[b] * p.x + E[b + 1] * p.y + E[b + 2] * p.z + E[b + 3];
        const vy = E[b + 4] * p.x + E[b + 5] * p.y + E[b + 6] * p.z + E[b + 7];
        const vz = E[b + 8] * p.x + E[b + 9] * p.y + E[b + 10] * p.z + E[b + 11];
        const x = Math.floor((vx * 0.5 + 0.5) * res);
        const y = Math.floor((vy * 0.5 + 0.5) * res);
        if (x < 0 || y < 0 || x >= res || y >= res) {
          seen += w;
          continue;
        }
        const j = ((Math.floor(k / cols) * res + y) * W + (k % cols) * res + x) * 4;
        const depth = buf[j] / 255 + buf[j + 1] / (255 * 255) + buf[j + 2] / (255 * 65025);
        if (vz * 0.5 + 0.5 <= depth + bias) seen += w;
      }
      const vis = total > 0 ? seen / total : 1;
      ao[i] = 1 - strength * (1 - Math.pow(vis, curve));
    }
    g.setAttribute("lookAO", new THREE.BufferAttribute(ao, 1));
    count += pos.count;
  }
  ms += performance.now() - slice;
  return { verts: count, ms };
}
