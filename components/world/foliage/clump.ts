// Adapted from folio-2025 (MIT, see public/vendor/LICENSE.md),
// sources/Game/World/Foliage.js `setGeometry`.
//
// One foliage clump: 80 leaf cards of 0.8 x 0.8 scattered inside a unit sphere
// (denser toward the middle), each spun randomly in its own plane. All cards lie
// in the XY plane facing +Z; the shader turns the whole clump to face the camera.
// Normals are pushed out spherically, lerp(vertex, normalize(cardCentre), 0.85),
// so the clump shades like one soft ball instead of a pile of flat cards.
import * as THREE from "three";

const CARDS = 80;
const SIZE = 0.8;

/** The original seeds its with alea('foliage'); any stable PRNG does the job. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let cached: THREE.BufferGeometry | null = null;

/** The shared clump geometry (position, normal, uv, index). Built once. */
export function clumpGeometry() {
  if (cached) return cached;
  const rnd = mulberry32(0xf011a9e);
  const pos = new Float32Array(CARDS * 4 * 3);
  const nor = new Float32Array(CARDS * 4 * 3);
  const uv = new Float32Array(CARDS * 4 * 2);
  const idx: number[] = [];
  const h = SIZE / 2;
  const corners = [
    [-h, h, 0, 1],
    [h, h, 1, 1],
    [-h, -h, 0, 0],
    [h, -h, 1, 0],
  ];
  const centre = new THREE.Vector3();
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let c = 0; c < CARDS; c++) {
    centre.setFromSpherical(new THREE.Spherical(1 - Math.pow(rnd(), 3), Math.PI * 2 * rnd(), Math.PI * rnd()));
    const spin = rnd() * 9999;
    const cs = Math.cos(spin);
    const sn = Math.sin(spin);
    n.copy(centre).normalize();
    for (let k = 0; k < 4; k++) {
      const [x, y, u, w] = corners[k];
      v.set(x * cs - y * sn, x * sn + y * cs, 0).add(centre);
      const o = (c * 4 + k) * 3;
      pos[o] = v.x;
      pos[o + 1] = v.y;
      pos[o + 2] = v.z;
      // Original: position.lerp(normal, 0.85), left unnormalised (the shader normalises)
      v.lerp(n, 0.85);
      nor[o] = v.x;
      nor[o + 1] = v.y;
      nor[o + 2] = v.z;
      uv[(c * 4 + k) * 2] = u;
      uv[(c * 4 + k) * 2 + 1] = w;
    }
    const b = c * 4;
    idx.push(b, b + 2, b + 1, b + 2, b + 3, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  cached = g;
  return g;
}
