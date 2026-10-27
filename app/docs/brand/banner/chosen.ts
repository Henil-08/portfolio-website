// The owner's LinkedIn banner (picked 2026-10-27). /docs/brand/banner draws it first, and
// `?export=chosen` draws it alone at 1584 x 396 for the JPG (linkedin-banner.jpg at the repo root).
// Re-export after any change:
//   node scripts/shoot.mjs ./linkedin-banner "wait:4000|shot:x" 1584 396 "http://localhost:3100/docs/brand/banner?export=chosen"
//   then rename linkedin-banner-x.jpg to linkedin-banner.jpg
export const CHOSEN = {
  design: "E", // Telemetry
  theme: "light", // white
  bg: "dots",
  font: "mono", // Plex Mono headline
  line: 0, // "Giving models the context to be useful."
  /** Shown under the name when filled in, e.g. ["henilgajjar.com", "github.com/Henil-08", "henil.gajjar2102@gmail.com"]. */
  contacts: [] as string[],
} as const;
