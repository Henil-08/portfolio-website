// One palette for the whole world: "Concrete & Ink" (docs/BRAND.md, World,
// approved 2026-10-26), a modern circuit instead of a toy town. Concrete,
// muted grass, gravel and dark asphalt on the ground; ink and paper for the
// objects, and one orange accent per object (`red` is that accent now).
// Everything else is muted and used sparingly (teal = side-quest lab,
// gold = trophies). Key names are shared by the whole codebase: retune values,
// never rename.

export const C = {
  // ground
  grass: "#7a8462", // muted grass
  grassDark: "#5f6a4c",
  sand: "#cdc4b0", // gravel: shores, dunes and run-off are gravel and concrete, no sand
  water: "#3e5a63",
  waterDeep: "#2c4148",
  rock: "#b8b4a9", // concrete dark
  asphalt: "#3a3b3e",
  asphaltLine: "#f3f2ed", // paper edge line
  concrete: "#d9d6ce",
  concreteDark: "#b8b4a9",
  gravel: "#cdc4b0",

  // brand
  red: "#ff4f00", // the one orange accent per object
  redDark: "#c73e00",
  cream: "#e9e7e0", // paper in shade
  white: "#f3f2ed", // paper (never pure #fff, it clips under the sun)
  ink: "#151515",
  paper: "#f3f2ed",

  // accents (muted, use sparingly)
  yellow: "#d4b062", // soft gold
  orange: "#ff4f00",
  blue: "#5d7891", // steel blue
  teal: "#2fa79c", // side-quest lab signature
  green: "#6f9677",
  purple: "#7a7391", // muted lilac grey
  pink: "#d7a6a0",

  // neutrals
  grey: "#8c8f95",
  greyLight: "#d3d2ce",
  greyDark: "#55585e",
  charcoal: "#2b2c2e", // graphite
  black: "#151515", // tyre rubber, screens

  // trophies
  gold: "#c9a047",
  silver: "#c4c7cc",
  bronze: "#b07650",

  // foliage
  leaf: "#73805c", // with the grass
  leafDark: "#5c6a4b",

  // wood / buildings
  wood: "#b89574",
  woodDark: "#7e6553",
  roof: "#151515", // thin ink roofs
  wall: "#d9d6ce", // concrete
  metal: "#b8bbc1", // brushed aluminium
  glass: "#1f262b",

  // people
  skin: "#c98a64",
  skinShade: "#b0744f",
  hair: "#1d1a1a",
  jacketBlack: "#22252c",
  jacketWhite: "#eef1f5",
  hoodie: "#d9c3a5",
  jeans: "#3e4f66",
} as const;

export type ColorName = keyof typeof C;
