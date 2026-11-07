import type { Livery, VehicleDef } from "@/components/world/vehicles";
import type { Domain } from "@/content/projects";
import type { Item } from "@/components/world/garage/anim";

/** What the scene gets from the mock. */
export type SceneProps = {
  v: VehicleDef;
  livery: Livery;
  domain: Domain;
  list: Item[];
  /** the project on show, an index into `list` */
  sel: number;
  /** the way the last switch went: 1 next, -1 previous */
  dir: 1 | -1;
  /** true once you have driven in (Enter); Esc sets it false and the vehicle backs out */
  inside: boolean;
  /** click or tap a project in the scene */
  onPick: (i: number) => void;
};

/** What an experience's DOM overlay over the 3D cell gets from the mock. */
export type OverlayProps = {
  list: Item[];
  /** the project on show, an index into `list` */
  sel: number;
  inside: boolean;
  /** step to the next (1) or previous (-1) project */
  step: (k: -1 | 1) => void;
  /** the garage's zone code and name, Z05 · Agents */
  garage: string;
};
