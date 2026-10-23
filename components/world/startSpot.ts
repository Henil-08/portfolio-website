// Where the car starts (see ./start.ts). No imports: layout.ts reads it.

/** [x, z, heading]: on the verge, turned toward the straight (heading 0 = +x, + turns toward -z). */
export const START_SPOT: [number, number, number] = [-38, 51.4, 0.55];
/** Centre of the opening circle: the car, nudged toward the tree so it's in the circle. */
export const REVEAL_AT: [number, number] = [-38.9, 51.1];
