// One rule for the size of everything in the world (docs/research/model-fidelity.md, "World
// scale"). The road is 8 m (layout.ts TRACK_WIDTH) and stands for a real 12 m street circuit, so
// the whole world is built at 2/3 of real size: the vehicles drive at that scale (vehicles/
// scale.ts), and every model drawn in real metres (the kit, components/world/kit/*) goes into the
// world multiplied by WORLD_SCALE where it is placed. Buildings are sized by their storeys, so a
// three-storey block is about 10 m real, 6.7 m in the world. Never pick a size by eye: put the
// real size in the table and multiply.
import { VEHICLE_SCALE } from "./vehicles/scale";

/** World metres per real metre (2/3). */
export const WORLD_SCALE = VEHICLE_SCALE;

/** A real storey, floor to floor (m). */
export const STOREY = 3.3;

/** A real size (m) in world metres. */
export const real = (m: number) => m * WORLD_SCALE;

/** World scale for a building model whose storeys are `modelStorey` m apart: a real storey at the world's scale. */
export const storeyScale = (modelStorey: number) => (STOREY / modelStorey) * WORLD_SCALE;
