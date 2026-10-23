import * as THREE from "three";

// Live car telemetry, written by the vehicle every frame and read by the camera, zones and HUD.
export const carState = {
  pos: new THREE.Vector3(),
  vel: new THREE.Vector3(),
  forward: new THREE.Vector3(1, 0, 0),
  speed: 0, // m/s, signed along forward
  grounded: true,
};

// Bruno's ticker: real delta capped at 1/30 s, simulation runs at 2x.
export const ticker = { delta: 1 / 60, deltaScaled: 1 / 30, scale: 2 };

// Leader of the autopilot run, so the camera can watch it while you're hands-off.
export const ghostLeader = { pos: new THREE.Vector3(), active: false };

// Handy in the console, and used by the headless screenshot checks.
if (typeof window !== "undefined") (window as unknown as { __car: typeof carState }).__car = carState;
