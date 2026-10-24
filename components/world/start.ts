// The start: in front of the name, the car is parked at the head of the lane
// that leads to the circuit (./access.ts), under a shade tree with bushes, a
// bench and flowers round it, inside the opening circle (Reveal.tsx). Pure data,
// drawn by ./StartGarden.tsx.
export { REVEAL_AT, START_SPOT } from "./startSpot";

export const START_TREE = { x: 9.4, z: 1.3, seed: 11, s: 1.15 };
export const START_BUSHES: [number, number, number][] = [
  [9.2, 5.6, 0.95],
  [7.2, 1.2, 0.8],
  [19.6, -0.4, 0.7],
];
/** Bench in the tree's shade, facing the lane. */
export const START_BENCH = { x: 11.6, z: 0.4, yaw: 0 };
export const START_FLOWERS: [number, number][] = [
  [13.5, 0.4],
  [18, 0.8],
  [11.2, 5.6],
];
