import type { VehicleCode } from "./liveries";

/**
 * The vehicles are modelled in true metres (TH-18 5.6 m long) for the proposal's 12 m road; the
 * game's road is 8 m (layout.ts TRACK_WIDTH), so they drive at 2/3 size to keep the proposal's
 * car-to-road proportion (owner, 2026-10-26: the F1 looked too big for the world).
 */
export const VEHICLE_SCALE = 8 / 12;

/**
 * In the world each vehicle is drawn (and its physics sized) at VEHICLE_SCALE times this. At 2/3 the
 * bike was a toy on the 8 m road (owner, 2026-11-04: "too small for the road"): with nobody on it
 * there is no rider to give it size, so it drives at real size, as tall as a person's hip and about
 * half the TH-18's length. E14 a touch up too, so the Baja car stands above the F1's wheels as it
 * would. The garage turntables keep their own sizes (bloom/view.ts TABLE_SCALE) and hand over at this one
 * (view.ts kOf); the garage bays' stand-in drives in at it too (garage/anim.ts S).
 */
export const VEHICLE_DISPLAY: Record<VehicleCode, number> = { V01: 1, V02: 1.12, V03: 1, V04: 1.45 };

/** World metres per model metre for this vehicle in the world. */
export const vehicleScale = (code: VehicleCode) => VEHICLE_SCALE * VEHICLE_DISPLAY[code];
