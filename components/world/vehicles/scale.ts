/**
 * The vehicles are modelled in true metres (TH-18 5.6 m long) for the proposal's 12 m road; the
 * game's road is 8 m (layout.ts TRACK_WIDTH), so they drive at 2/3 size to keep the proposal's
 * car-to-road proportion (owner, 2026-10-26: the F1 looked too big for the world).
 */
export const VEHICLE_SCALE = 8 / 12;
