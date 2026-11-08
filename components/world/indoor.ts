// The world behind a garage bay (docs/research/performance.md, "Teardown garage"). Once the
// stand-in has parked and the camera is in the drawing view (garageView.k = 1), the bay's walls
// fill the picture: nothing outside the room can be seen, but the whole island was still drawn
// behind them, and into the shadow map, every frame. While it lasts, everything whose bounds lie
// outside the room is left out of each render (the scene's onBeforeRender hides it, and
// onAfterRender puts every flag back, so no other code ever sees it hidden), its matrices stop
// updating, and the physics stops stepping (World.tsx Stepper). Esc starts the back-out: k drops
// below 1 that frame and the world is whole again before it is drawn.
import * as THREE from "three";

export const indoor = {
  /** the world outside the bay is being left out */
  on: false,
  /** how many subtrees were left out (perf probe) */
  hidden: 0,
};

/** The room round a bay origin (garage/anim.ts frame: door at z = +3.5, back wall at z = -3.08), with a margin. */
const ROOM = { x: 3.6, y0: -0.6, y1: 8, z0: -3.8, z1: 4.6 };

const out: THREE.Object3D[] = [];
const frozen: THREE.Object3D[] = [];
let installed: THREE.Scene | null = null;
let prevBefore: THREE.Scene["onBeforeRender"] | null = null;
let prevAfter: THREE.Scene["onAfterRender"] | null = null;
const room = new THREE.Box3();
const box = new THREE.Box3();
const child = new THREE.Box3();
const m4 = new THREE.Matrix4();
const v = new THREE.Vector3();

/**
 * The world-space bounds of a subtree (post-order, one walk), and whether each node lies wholly
 * outside the room: those go in `out`, highest first. An instanced mesh spread over the island
 * counts as inside if any of its instances stands in the room.
 */
function sweep(o: THREE.Object3D, keep: THREE.Object3D, into: THREE.Box3): boolean {
  // returns true when the subtree has nothing inside the room
  into.makeEmpty();
  if (o === keep || (o as THREE.Light).isLight) {
    into.set(room.min, room.max); // kept, and it keeps its parents
    return false;
  }
  const kids: boolean[] = [];
  for (const c of o.children) {
    kids.push(sweep(c, keep, child));
    into.union(child);
  }
  let inside = false;
  const m = o as THREE.Mesh;
  if (m.geometry) {
    const im = o as THREE.InstancedMesh;
    if (im.isInstancedMesh) {
      for (let i = 0; i < im.count && !inside; i++) {
        im.getMatrixAt(i, m4);
        v.setFromMatrixPosition(m4).applyMatrix4(im.matrixWorld);
        if (room.containsPoint(v)) inside = true;
      }
    } else {
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      box.copy(m.geometry.boundingBox!).applyMatrix4(m.matrixWorld);
      // anything that follows the car or the camera (grass, weather, the sky) has bounds that
      // say nothing about where it draws: those with frustum culling off are judged by their
      // own flag below
      if (m.frustumCulled && box.intersectsBox(room)) inside = true;
      into.union(box);
    }
  }
  const allOut = !inside && kids.every(Boolean);
  if (!allOut) {
    // some of it is in the room: leave out only its children that are wholly outside
    o.children.forEach((c, i) => {
      if (kids[i] && c.visible) out.push(c);
    });
  }
  return allOut;
}

/** Works out what to leave out for the bay at `origin`, keeping `keep` (the garage) and every light. */
export function enterIndoor(scene: THREE.Scene, keep: THREE.Object3D, origin: THREE.Vector3) {
  room.min.set(origin.x - ROOM.x, origin.y + ROOM.y0, origin.z + ROOM.z0);
  room.max.set(origin.x + ROOM.x, origin.y + ROOM.y1, origin.z + ROOM.z1);
  out.length = 0;
  scene.updateMatrixWorld();
  if (sweep(scene, keep, box)) out.push(...scene.children.filter((c) => c.visible));
  // matrices: a left-out subtree's stay as they are (its own code may still move it; that lands
  // the frame it comes back, when its matrices update again)
  frozen.length = 0;
  for (const o of out)
    if (o.matrixWorldAutoUpdate) {
      o.matrixWorldAutoUpdate = false;
      frozen.push(o);
    }
  indoor.hidden = out.length;
  indoor.on = true;
  install(scene);
}

export function leaveIndoor() {
  if (!indoor.on) return;
  for (const o of frozen) o.matrixWorldAutoUpdate = true;
  frozen.length = 0;
  out.length = 0;
  indoor.on = false;
  indoor.hidden = 0;
}

const was: boolean[] = [];
function install(scene: THREE.Scene) {
  if (installed === scene) return;
  installed = scene;
  prevBefore = scene.onBeforeRender;
  prevAfter = scene.onAfterRender;
  scene.onBeforeRender = function (this: THREE.Scene, ...a: Parameters<THREE.Scene["onBeforeRender"]>) {
    prevBefore?.apply(this, a);
    was.length = 0;
    if (!indoor.on) return;
    for (const o of out) {
      was.push(o.visible);
      o.visible = false;
    }
  };
  scene.onAfterRender = function (this: THREE.Scene, ...a: Parameters<THREE.Scene["onAfterRender"]>) {
    for (let i = 0; i < was.length; i++) out[i].visible = was[i];
    was.length = 0;
    prevAfter?.apply(this, a);
  };
}
