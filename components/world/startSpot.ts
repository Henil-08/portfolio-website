// Where the car starts (see ./start.ts). No imports: layout.ts reads it.

/** [x, z, heading]: in front of the name, at the head of the lane to the circuit (./access.ts), facing along it. */
export const START_SPOT: [number, number, number] = [16, 3.1, -0.02];
/** Centre of the opening circle: the car, nudged toward the shade tree. */
export const REVEAL_AT: [number, number] = [14.6, 2.6];
