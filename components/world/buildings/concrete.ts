// Concrete & Ink for buildings (docs/BRAND.md, World, approved 2026-10-26): the garages (W02)
// and the town blocks (W09). Local to the buildings so they keep their look while palette.ts
// `C` is retuned; the values are the brand's.

export const CI = {
  concrete: "#d9d6ce",
  concreteDark: "#b8b4a9",
  ink: "#151515",
  graphite: "#2b2c2e",
  paper: "#f3f2ed",
  orange: "#ff4f00",
  glass: "#1f262b",
  lamp: "#fff3dc",
};

/** A box part: full size `s`, centre `p`, both in the parent's frame. */
export type Part = [s: [number, number, number], p: [number, number, number]];
