// One palette for the whole world: a premium designer-toy diorama, like
// collectible figures and architectural models shot in a studio.
// Glossy white, warm off-white, one signature racing red, charcoal and soft
// greys. Everything else is muted and used sparingly (teal = side-quest lab,
// gold = trophies). Key names are shared by the whole codebase: retune values,
// never rename.

export const C = {
  // ground
  grass: "#9cae88", // soft muted sage
  grassDark: "#849672",
  sand: "#e3d8c6", // warm stone
  water: "#4d8590", // deep muted teal-blue
  waterDeep: "#36636f",
  rock: "#bfb8ad",
  asphalt: "#3c3f45", // charcoal tarmac
  asphaltLine: "#f3f1ec",

  // brand
  red: "#d42a2f", // signature racing red
  redDark: "#a01d23",
  cream: "#f1ece3", // warm off-white
  white: "#f8f7f4", // glossy white (never pure #fff, it clips under the sun)
  ink: "#25272c", // charcoal

  // accents (muted, use sparingly)
  yellow: "#d4b062", // soft gold
  orange: "#dc7a45",
  blue: "#5d7891", // steel blue
  teal: "#2fa79c", // side-quest lab signature
  green: "#6f9677",
  purple: "#7a7391", // muted lilac grey
  pink: "#d7a6a0",

  // neutrals
  grey: "#8c8f95",
  greyLight: "#d3d2ce",
  greyDark: "#55585e",
  charcoal: "#2f3238",
  black: "#17181b", // tyre rubber, screens

  // trophies
  gold: "#c9a047",
  silver: "#c4c7cc",
  bronze: "#b07650",

  // foliage
  leaf: "#7f9670",
  leafDark: "#5f7757",
  leafPalm: "#6f8c63",

  // wood / buildings
  wood: "#b89574",
  woodDark: "#7e6553",
  roof: "#e6e2db",
  wall: "#f0ece5",
  metal: "#b8bbc1", // brushed aluminium
  glass: "#8fa9b3",

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
