import * as THREE from "three";

// SPLIT's ghost look, shared by the game and the /docs/brand/world mock: every mesh of the
// vehicle swaps to a see-through copy of its material with orange edges on top, and back.

type Entry = { mesh: THREE.Mesh; orig: THREE.Material | THREE.Material[]; copy: THREE.Material; edges: THREE.LineSegments; shadow: boolean };

export function ghostLook(orange: THREE.ColorRepresentation) {
  const edgeMat = new THREE.LineBasicMaterial({ color: orange, transparent: true, toneMapped: false });
  let list: Entry[] | null = null;
  let on = false;
  return {
    /** 0 is solid, 1 fully ghost; the copies are made the first time it turns ghost. */
    set(model: THREE.Object3D, ghost: number) {
      const want = ghost > 0.001;
      if (want && !list) {
        const made: Entry[] = [];
        model.traverse((x) => {
          if (!(x instanceof THREE.Mesh) || Array.isArray(x.material)) return;
          const copy = (x.material as THREE.Material).clone();
          copy.transparent = true;
          copy.depthWrite = false;
          const edges = new THREE.LineSegments(new THREE.EdgesGeometry(x.geometry, 28), edgeMat);
          edges.visible = false;
          made.push({ mesh: x, orig: x.material, copy, edges, shadow: x.castShadow });
        });
        for (const g of made) g.mesh.add(g.edges);
        list = made;
      }
      if (list && want !== on) {
        on = want;
        for (const g of list) {
          g.mesh.material = want ? g.copy : g.orig;
          g.mesh.castShadow = want ? false : g.shadow;
          g.edges.visible = want;
        }
      }
      if (want && list) {
        for (const g of list) g.copy.opacity = 1 - 0.85 * ghost;
        edgeMat.opacity = ghost;
      }
    },
    /** Puts the materials back and drops the copies (a livery change or unmount). */
    drop() {
      for (const g of list ?? []) {
        g.mesh.material = g.orig;
        g.mesh.castShadow = g.shadow;
        g.mesh.remove(g.edges);
        g.edges.geometry.dispose();
        g.copy.dispose();
      }
      list = null;
      on = false;
    },
  };
}
export type GhostLook = ReturnType<typeof ghostLook>;
