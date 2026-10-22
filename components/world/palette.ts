// One palette for the whole toy world. Bright, warm, slightly desaturated,
// like painted wooden toys under afternoon sun.

export const C = {
  // ground
  grass: "#8fd16a",
  grassDark: "#6fb64f",
  sand: "#f3dca4",
  water: "#5cc6e8",
  waterDeep: "#3aa2d6",
  rock: "#b9b2a6",
  asphalt: "#4a4e5a",
  asphaltLine: "#f5f3ea",

  // brand
  red: "#ff4b3e", // car, accents
  redDark: "#d93429",
  cream: "#fff6e6",
  white: "#ffffff",
  ink: "#2b2d42",

  // accents
  yellow: "#ffd23f",
  orange: "#ff8c42",
  blue: "#3d8bff",
  teal: "#2ec4b6",
  green: "#45c46b",
  purple: "#9b6bff",
  pink: "#ff8fab",

  // wood / buildings
  wood: "#c98b5a",
  woodDark: "#9c6640",
  roof: "#ff6b5b",
  wall: "#fff1dc",
  metal: "#c9ced8",
  glass: "#a8e0ff",

  // people
  skin: "#c98a64",
  skinShade: "#b0744f",
  hair: "#1d1a1a",
  jacketBlack: "#22252c",
  jacketWhite: "#eef1f5",
  hoodie: "#d9c3a5",
  jeans: "#3e5c8a",
} as const;

export type ColorName = keyof typeof C;
