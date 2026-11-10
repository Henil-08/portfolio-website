// Where the car starts (see ./start.ts). Only import-free modules: layout.ts reads it.
import { JOURNEY, JOURNEY_LINKED, JOURNEY_SPAWN } from "./journey/choice";

/** [x, z, heading]: in front of the name, on the garden path that leads to the circuit, facing along it.
 *  A `?journey=` link (the journey review, /docs/brand/journey) starts right before that journey instead. */
export const START_SPOT: [number, number, number] = JOURNEY_LINKED ? JOURNEY_SPAWN[JOURNEY] : [16, 3.1, -0.02];
