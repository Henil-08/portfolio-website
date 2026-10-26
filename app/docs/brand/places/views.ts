// The live views on the places page: each card registers a DOM box and where to look,
// and Scene.tsx draws the one shared world into every box that is on screen, with its
// own camera and orbit controls (created the first time the box comes into view).
import type { PerspectiveCamera } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/** Where a card looks: the target on the ground at (x, z) raised by `lift`, the camera at target + off. */
export type ViewSpec = { x: number; z: number; lift: number; off: [number, number, number] };

export type ViewEntry = { el: HTMLElement; spec: ViewSpec; camera?: PerspectiveCamera; controls?: OrbitControls };

export const views = new Map<string, ViewEntry>();

export function registerView(id: string, el: HTMLElement, spec: ViewSpec) {
  views.set(id, { el, spec });
  return () => {
    views.get(id)?.controls?.dispose();
    views.delete(id);
  };
}
