import * as THREE from "three";

// Live car telemetry, written by the vehicle every frame and read by the camera, zones and HUD.
export const carState = {
  pos: new THREE.Vector3(),
  vel: new THREE.Vector3(),
  forward: new THREE.Vector3(1, 0, 0),
  speed: 0, // m/s, signed along forward
  grounded: true,
};

// Handy in the console, and used by the headless screenshot checks.
if (typeof window !== "undefined") (window as unknown as { __car: typeof carState }).__car = carState;
