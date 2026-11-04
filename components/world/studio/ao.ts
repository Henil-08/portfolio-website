// Baked ambient occlusion, per vertex, free at draw time. The model (and a ground plane under
// it) is rendered as depth from many directions over the sky hemisphere, like a dome of soft
// lights; each vertex counts the directions it can see, weighted by how much it faces them.
// The result goes in a `studioAO` float attribute that materials.ts reads. Runs once on the
// GPU of the canvas it is given (no second WebGL context), a few hundred ms per model.
import * as THREE from "three";

export type AoOpts = {
  /** directions over the hemisphere */
  dirs?: number;
  /** depth map size per direction */
  res?: number;
  /** 0..1: how dark full occlusion gets */
  strength?: number;
  /** gamma on visibility (<1 lifts the mids, keeps contact dark) */
  curve?: number;
  /** a ground plane at the model's foot occludes (contact shadow in the AO) */
  ground?: boolean;
};

const depthMat = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  vertexShader: /* glsl */ `
    void main() {
      vec4 p = vec4(position, 1.0);
      #ifdef USE_INSTANCING
        p = instanceMatrix * p;
      #endif
      gl_Position = projectionMatrix * modelViewMatrix * p;
    }`,
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
    const y = 1 - (i + 0.5) / n * 1.08; // to ~ -0.08
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    out.push(new THREE.Vector3(Math.cos(i * ga) * r, y, Math.sin(i * ga) * r));
  }
  return out;
}

/** Meshes that occlude and receive: visible, opaque enough, not alpha-cut wire. */
function bakeable(o: THREE.Object3D): o is THREE.Mesh {
  if (!(o instanceof THREE.Mesh) || !o.visible) return false;
  const m = (Array.isArray(o.material) ? o.material[0] : o.material) as THREE.Material;
  if (m.transparent && m.opacity < 0.6) return false;
  if (m.alphaTest > 0) return false;
  return true;
}

/**
 * Bakes `studioAO` onto every bakeable non-instanced mesh under `root` (their geometries
 * must be their own: the attribute is written on them). Returns the meshes it baked.
 */
export function bakeAO(gl: THREE.WebGLRenderer, root: THREE.Object3D, o: AoOpts = {}) {
  const dirs = hemisphere(o.dirs ?? 96);
  const res = o.res ?? 384;
  const strength = o.strength ?? 0.85;
  const curve = o.curve ?? 0.8;
  root.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = [];
  const scene = new THREE.Scene();
  root.traverse((x) => {
    if (!bakeable(x)) return;
    const c = x instanceof THREE.InstancedMesh ? new THREE.InstancedMesh(x.geometry, depthMat, x.count) : new THREE.Mesh(x.geometry, depthMat);
    if (c instanceof THREE.InstancedMesh) c.instanceMatrix = (x as THREE.InstancedMesh).instanceMatrix;
    c.matrixAutoUpdate = false;
    c.matrix.copy(x.matrixWorld);
    c.matrixWorld.copy(x.matrixWorld);
    c.frustumCulled = false;
    scene.add(c);
    if (!(x instanceof THREE.InstancedMesh)) meshes.push(x);
  });
  if (!meshes.length) return meshes;
  const box = new THREE.Box3().setFromObject(scene);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const R = sphere.radius * 1.02;
  let floor: THREE.Mesh | null = null;
  if (o.ground !== false) {
    const g = (floor = new THREE.Mesh(new THREE.PlaneGeometry(R * 6, R * 6).rotateX(-Math.PI / 2), depthMat));
    g.position.set(sphere.center.x, box.min.y - R * 0.002, sphere.center.z);
    g.updateMatrixWorld(true);
    g.matrixAutoUpdate = false;
    scene.add(g);
  }
  const rt = new THREE.WebGLRenderTarget(res, res, { depthBuffer: true, type: THREE.UnsignedByteType });
  const cam = new THREE.OrthographicCamera(-R, R, R, -R, R * 0.01, R * 4);
  const prev = { rt: gl.getRenderTarget(), color: gl.getClearColor(new THREE.Color()), alpha: gl.getClearAlpha(), auto: gl.autoClear, shadow: gl.shadowMap.autoUpdate };
  gl.shadowMap.autoUpdate = false;
  gl.autoClear = true;
  gl.setClearColor(0xffffff, 1);
  const maps: { px: Uint8Array; vp: THREE.Matrix4 }[] = [];
  for (const d of dirs) {
    cam.position.copy(sphere.center).addScaledVector(d, R * 2);
    cam.up.set(Math.abs(d.y) > 0.99 ? 1 : 0, Math.abs(d.y) > 0.99 ? 0 : 1, 0);
    cam.lookAt(sphere.center);
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
    gl.setRenderTarget(rt);
    gl.render(scene, cam);
    const px = new Uint8Array(res * res * 4);
    gl.readRenderTargetPixels(rt, 0, 0, res, res, px);
    maps.push({ px, vp: new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse) });
  }
  gl.setRenderTarget(prev.rt);
  gl.setClearColor(prev.color, prev.alpha);
  gl.autoClear = prev.auto;
  gl.shadowMap.autoUpdate = prev.shadow;
  rt.dispose();
  floor?.geometry.dispose();

  // depth bias: a couple of texels of the map, in NDC depth (range 4R mapped to 0..1)
  const texel = (2 * R) / res;
  const eps = texel * 1.5;
  const bias = (texel * 2) / (R * 4);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const nm = new THREE.Matrix3();
  const v = new THREE.Vector4();
  for (const mesh of meshes) {
    const g = mesh.geometry;
    const pos = g.attributes.position as THREE.BufferAttribute;
    const nor = g.attributes.normal as THREE.BufferAttribute | undefined;
    nm.getNormalMatrix(mesh.matrixWorld);
    const ao = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      if (nor) n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
      else n.set(0, 1, 0);
      p.addScaledVector(n, eps);
      let seen = 0;
      let total = 0;
      for (let k = 0; k < dirs.length; k++) {
        const w = n.dot(dirs[k]);
        if (w <= 0) continue;
        total += w;
        const { px, vp } = maps[k];
        v.set(p.x, p.y, p.z, 1).applyMatrix4(vp);
        const x = Math.floor((v.x * 0.5 + 0.5) * res);
        const y = Math.floor((v.y * 0.5 + 0.5) * res);
        if (x < 0 || y < 0 || x >= res || y >= res) {
          seen += w;
          continue;
        }
        const j = (y * res + x) * 4;
        const depth = px[j] / 255 + px[j + 1] / (255 * 255) + px[j + 2] / (255 * 65025);
        const z = v.z * 0.5 + 0.5;
        if (z <= depth + bias) seen += w;
      }
      const vis = total > 0 ? seen / total : 1;
      ao[i] = 1 - strength * (1 - Math.pow(vis, curve));
    }
    g.setAttribute("studioAO", new THREE.BufferAttribute(ao, 1));
  }
  return meshes;
}
