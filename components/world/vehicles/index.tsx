"use client";

// The four vehicles in the garage: what the select screen shows (name, line, stats, icon,
// liveries) and what the game needs to drive them (wheels, size, trail anchors).
import type { ComponentType, ReactNode } from "react";
import { Atv, ATV_WHEELS } from "./Atv";
import { Bike, BIKE_STEER_AXIS, BIKE_WHEELS } from "./Bike";
import { Formula, FORMULA_WHEELS } from "./Formula";
import { Roadster, ROADSTER_WHEELS } from "./Roadster";
import { VEHICLE_ICONS } from "./icons";
import { LIVERIES, type Livery, type VehicleCode } from "./liveries";
import type { V3, WheelSpec } from "./kit";

export { Atv, Bike, Formula, Roadster, VEHICLE_ICONS };
export { RigContext, type VehicleRig } from "./kit";
export * from "./liveries";

export type VehicleDef = {
  code: VehicleCode;
  name: string;
  kind: string;
  line: string;
  /** Speed, grip, handling (0..100): game stats only, not facts about anything real. */
  stats: [number, number, number];
  /** overall length, m */
  len: number;
  liveries: Livery[];
  Model: ComponentType<{ livery?: Livery }>;
  icon: ReactNode;
  /** Model space (nose +z, ground y = 0): the wheels, the steering axis, the body's bounding box, boost trail anchors. */
  wheels: WheelSpec[];
  steerAxis: V3;
  box: { min: V3; max: V3 };
  tips: V3[];
};

const VERTICAL: V3 = [0, 1, 0];

export const VEHICLES: VehicleDef[] = [
  {
    code: "V01",
    kind: "Formula",
    name: "TH-18",
    line: "The open-wheeler the world was built around. Fastest on the straight, nervous on the grass.",
    stats: [96, 90, 82],
    len: 5.6,
    liveries: LIVERIES.V01,
    Model: Formula,
    icon: VEHICLE_ICONS.V01,
    wheels: FORMULA_WHEELS,
    steerAxis: VERTICAL,
    box: { min: [-1.0, 0, -2.62], max: [1.0, 1.0, 2.86] },
    // the rear wing endplates' top corners
    tips: [
      [0.53, 0.98, -2.6],
      [-0.53, 0.98, -2.6],
    ],
  },
  {
    code: "V02",
    kind: "ATV",
    name: "E14",
    line: "Like E14, the electric ATV I led at SAE e-BAJA (5th of 47, Best Acceleration). Slow on tarmac, happy off it.",
    stats: [58, 94, 74],
    len: 2.4,
    liveries: LIVERIES.V02,
    Model: Atv,
    icon: VEHICLE_ICONS.V02,
    wheels: ATV_WHEELS,
    steerAxis: VERTICAL,
    box: { min: [-0.82, 0, -1.06], max: [0.82, 1.5, 1.06] },
    // the roll hoop's top corners
    tips: [
      [0.19, 1.5, -0.5],
      [-0.19, 1.5, -0.5],
    ],
  },
  {
    code: "V03",
    kind: "Road car",
    name: "Atlas",
    line: "Long, low and pale, with crisp creases, a dark glass canopy and a tall wing on two struts. The easy one to start with.",
    stats: [92, 80, 82],
    len: 4.6,
    liveries: LIVERIES.V03,
    Model: Roadster,
    icon: VEHICLE_ICONS.V03,
    wheels: ROADSTER_WHEELS,
    steerAxis: VERTICAL,
    box: { min: [-1.0, 0, -2.38], max: [1.0, 1.16, 2.31] },
    // the wing's endplates
    tips: [
      [0.93, 1.14, -2.34],
      [-0.93, 1.14, -2.34],
    ],
  },
  {
    code: "V04",
    kind: "Bike",
    name: "Apollo",
    line: "A sport bike, light and quick to turn. Two wheels, so it forgives nothing.",
    stats: [84, 62, 95],
    len: 2.1,
    liveries: LIVERIES.V04,
    Model: Bike,
    icon: VEHICLE_ICONS.V04,
    wheels: BIKE_WHEELS,
    steerAxis: BIKE_STEER_AXIS,
    box: { min: [-0.3, 0, -1.01], max: [0.3, 1.12, 1.03] },
    // the tail's corners
    tips: [
      [0.06, 0.95, -0.6],
      [-0.06, 0.95, -0.6],
    ],
  },
];

export const vehicleByCode = Object.fromEntries(VEHICLES.map((v) => [v.code, v])) as Record<VehicleCode, VehicleDef>;
export const DEFAULT_VEHICLE: VehicleCode = "V01";
