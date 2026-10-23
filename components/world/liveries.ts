// Car paint palettes. Pickable in settings; the choice is remembered per browser.
/** body = main paint, low = lower body / undersides, accent = pinstripes and small marks, number = race number. */
export type Palette = { body: string; low: string; accent: string; number: string; label: string };
export const LIVERIES = {
  rosso: { label: "Rosso", body: "#d3121c", low: "#1a1b1f", accent: "#ffc20e", number: "#f7f5ef" },
  papaya: { label: "Papaya", body: "#ff7a1a", low: "#1d2733", accent: "#4fb3ff", number: "#ffffff" },
  green: { label: "Racing green", body: "#0f5a3d", low: "#16181b", accent: "#d9b45c", number: "#f4ecd8" },
  midnight: { label: "Midnight", body: "#1c2b4d", low: "#121318", accent: "#ff6a4d", number: "#ffffff" },
  silver: { label: "Silver arrow", body: "#c9ced5", low: "#17191d", accent: "#22b8a7", number: "#17191d" },
  cream: { label: "Cream & red", body: "#efe5d0", low: "#c8161f", accent: "#1c1d21", number: "#c8161f" },
} satisfies Record<string, Palette>;
export type LiveryName = keyof typeof LIVERIES;
/** What the player's car wears until they pick another in settings. */
export const DEFAULT_LIVERY: LiveryName = "cream";

export const LIVERY_NAMES = Object.keys(LIVERIES) as LiveryName[];
