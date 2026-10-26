// The start: in front of the name, the car is parked on the garden path that
// leads to the pit lane (garden/layout.ts PATHS), between two low concrete planters,
// with bushes, a bench and grasses round it, inside the opening circle (Reveal.tsx). Pure data,
// drawn by ./StartGarden.tsx.
export { REVEAL_AT, START_SPOT } from "./startSpot";

/** Two low square concrete planters of grasses either side of the path behind the car (nothing tall, so the car reads at spawn). */
export const START_PLANTERS: [number, number][] = [
  [9.4, 1.15],
  [9.4, 5.5],
];
export const START_BUSHES: [number, number, number][] = [
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
