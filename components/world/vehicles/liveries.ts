// Vehicle paint schemes: the same five on every vehicle, in this order, picked in the garage
// (and in settings) and remembered per browser (store.ts).

/** A paint scheme: body is the main colour, trim the second, accent the one highlight. */
export type Livery = {
  name: LiveryName;
  body: string;
  trim: string;
  accent: string;
  /** body finish as [roughness, metalness], over the vehicle's own default */
  finish?: [number, number];
  /** tube frame (ATV) */
  frame?: string;
  /** coilovers (ATV) */
  spring?: string;
  /** tail lamp */
  lamp?: string;
};

export const LIVERY_NAMES = ["Paper", "Ink", "Graphite", "Orange", "Silver Arrows"] as const;
export type LiveryName = (typeof LIVERY_NAMES)[number];
export const DEFAULT_LIVERY: LiveryName = "Paper";

export const VEHICLE_CODES = ["V01", "V02", "V03", "V04"] as const;
/** V01 TH-18, V02 E14, V03 Atlas, V04 Apollo. */
export type VehicleCode = (typeof VEHICLE_CODES)[number];
/** What you drive until you pick another in the garage. */
export const DEFAULT_VEHICLE: VehicleCode = "V01";

const INK = "#151515";
const PAPER = "#f3f2ed";
const ORANGE = "#ff4f00";
/** Silver Arrows: a silver metallic body, teal accents, black trim. */
const SILVER = "#c9ccce";
const TEAL = "#00a19c";
const BLACK = "#0e0e0e";
const SILVER_FINISH: [number, number] = [0.35, 0.6];

export const LIVERIES: Record<VehicleCode, Livery[]> = {
  V01: [
    { name: "Paper", body: PAPER, trim: INK, accent: ORANGE },
    { name: "Ink", body: INK, trim: PAPER, accent: ORANGE },
    { name: "Graphite", body: "#3d3e40", trim: PAPER, accent: ORANGE },
    { name: "Orange", body: ORANGE, trim: INK, accent: PAPER },
    { name: "Silver Arrows", body: SILVER, trim: BLACK, accent: TEAL, finish: SILVER_FINISH },
  ],
  V02: [
    { name: "Paper", body: PAPER, trim: INK, accent: ORANGE, frame: INK, spring: INK },
    { name: "Ink", body: INK, trim: PAPER, accent: ORANGE, frame: INK, spring: ORANGE },
    { name: "Graphite", body: "#3d3e40", trim: PAPER, accent: ORANGE, frame: INK, spring: PAPER },
    { name: "Orange", body: ORANGE, trim: PAPER, accent: INK, frame: INK, spring: INK },
    { name: "Silver Arrows", body: SILVER, trim: BLACK, accent: TEAL, finish: SILVER_FINISH, frame: BLACK, spring: TEAL, lamp: ORANGE },
  ],
  V03: [
    { name: "Paper", body: "#e3e2dc", trim: INK, accent: ORANGE },
    { name: "Ink", body: "#2f3032", trim: "#0e0e0e", accent: ORANGE },
    { name: "Graphite", body: "#6b6b67", trim: INK, accent: ORANGE },
    { name: "Orange", body: ORANGE, trim: INK, accent: PAPER },
    { name: "Silver Arrows", body: SILVER, trim: BLACK, accent: TEAL, finish: SILVER_FINISH, lamp: ORANGE },
  ],
  V04: [
    { name: "Paper", body: PAPER, trim: INK, accent: ORANGE },
    { name: "Ink", body: "#1b1b1c", trim: "#3d3e40", accent: ORANGE },
    { name: "Graphite", body: "#5d5d58", trim: INK, accent: PAPER },
    { name: "Orange", body: ORANGE, trim: INK, accent: PAPER },
    { name: "Silver Arrows", body: SILVER, trim: BLACK, accent: TEAL, finish: SILVER_FINISH },
  ],
};

/** A vehicle's livery by name. */
export const liveryOf = (code: VehicleCode, name: LiveryName) => LIVERIES[code].find((l) => l.name === name) ?? LIVERIES[code][0];
