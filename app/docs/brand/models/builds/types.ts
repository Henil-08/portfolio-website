import type { ComponentType } from "react";

/** A model rebuilt in code from its approved concept, shown beside that concept for review. */
export type Build = {
  /** concept id (public/models/concepts/<id>.png) */
  id: string;
  name: string;
  /** largest extent in metres and height, for framing */
  span: number;
  height: number;
  Model: ComponentType;
};
