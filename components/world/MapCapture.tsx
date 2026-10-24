"use client";

// The map's picture: when the map opens (and again if day turns to night or back while
// it is open), an orthographic camera straight above the island renders the real scene
// once into a square of the canvas, which is copied out as an image before the frame
// is drawn over it. folio-2025 ships a pre-rendered map instead; this one is always the
// world as it is. Things that follow the car (grass field, rain, trails) are hidden for
// the shot; objects opt out with `userData.noMap`.
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { dayNight } from "./daynight";
import { coastR } from "./layout";
import { seeUniforms } from "./seeThrough";
import { getState, setState, subscribe } from "./store";

/** The square the map shows: the island's bounding box plus a strip of sea, centred on it. */
export const MAP = (() => {
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (let i = 0; i < 360; i++) {
    const a = (i / 360) * Math.PI * 2;
    const r = coastR(a);
    x0 = Math.min(x0, Math.cos(a) * r);
    x1 = Math.max(x1, Math.cos(a) * r);
    z0 = Math.min(z0, Math.sin(a) * r);
    z1 = Math.max(z1, Math.sin(a) * r);
  }
  return { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, half: Math.ceil(Math.max(x1 - x0, z1 - z0) / 2 + 9) };
})();
const OUT = 1024; // px

/** World (x, z) -> map (0..1, 0..1), +x right, +z down. */
export function worldToMap(x: number, z: number) {
  return {
    x: THREE.MathUtils.clamp((x - MAP.cx) / (MAP.half * 2) + 0.5, 0, 1),
    y: THREE.MathUtils.clamp((z - MAP.cz) / (MAP.half * 2) + 0.5, 0, 1),
  };
}

export default function MapCapture() {
  const want = useRef(false);
  const cam = useRef<THREE.OrthographicCamera | null>(null);
  const out = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let open = getState().menuOpen;
    if (open) want.current = true;
    return subscribe(() => {
      const now = getState().menuOpen;
      if (now && !open) want.current = true;
      open = now;
    });
  }, []);

  useFrame(({ gl, scene }) => {
    const s = getState();
    const night = dayNight.night > 0.5;
    if (s.menuOpen && s.mapShot && s.mapShot.night !== night) want.current = true;
    if (!want.current) return;
    want.current = false;

    if (!cam.current) {
      const c = new THREE.OrthographicCamera(-MAP.half, MAP.half, MAP.half, -MAP.half, 1, 900);
      c.position.set(MAP.cx, 400, MAP.cz);
      c.up.set(0, 0, -1);
      c.lookAt(MAP.cx, 0, MAP.cz);
      c.updateMatrixWorld();
      cam.current = c;
    }
    const canvas = (out.current ??= Object.assign(document.createElement("canvas"), { width: OUT, height: OUT }));
    capture(gl, scene, cam.current, canvas);
    setState({ mapShot: { url: canvas.toDataURL("image/jpeg", 0.9), night } });
  });

  return null;
}

function capture(gl: THREE.WebGLRenderer, scene: THREE.Scene, cam: THREE.Camera, canvas: HTMLCanvasElement) {
  // hide what follows the car, switch off fog and the see-through circle
  const hidden: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if (o.userData.noMap && o.visible) {
      o.visible = false;
      hidden.push(o);
    }
  });
  const fog = scene.fog;
  scene.fog = null;
  const depth = seeUniforms.uSeeDepth.value;
  seeUniforms.uSeeDepth.value = -1e9;

  const buf = gl.getDrawingBufferSize(new THREE.Vector2());
  const side = Math.min(buf.x, buf.y);
  const vp = gl.getViewport(new THREE.Vector4());
  const scissor = gl.getScissorTest();
  const target = gl.getRenderTarget();
  const ratio = gl.getPixelRatio();
  gl.setRenderTarget(null);
  gl.setViewport(0, 0, side / ratio, side / ratio);
  gl.setScissor(0, 0, side / ratio, side / ratio);
  gl.setScissorTest(true);
  gl.clear();
  gl.render(scene, cam);
  // WebGL's origin is bottom-left: the square sits at the bottom of the drawing buffer
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(gl.domElement, 0, buf.y - side, side, side, 0, 0, OUT, OUT);

  gl.setScissorTest(scissor);
  gl.setViewport(vp);
  gl.setRenderTarget(target);
  scene.fog = fog;
  seeUniforms.uSeeDepth.value = depth;
  for (const o of hidden) o.visible = true;
}
