// Which career journey the world draws (owner review, /docs/brand/journey). `?journey=a|b|c`
// swaps the current terrace (components/world/Timeline.tsx) for one of the three redesigns in
// this folder; `?journey=current` keeps it. Nothing is remembered: without the parameter every
// visitor gets the current terrace. With the parameter the car also starts right before that
// journey (startSpot.ts reads JOURNEY_SPAWN), so "Drive it" links drop you at its start.
// No imports: startSpot.ts and layout.ts read this at module load.

export type JourneyId = "current" | "a" | "b" | "c";

const param = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("journey");

/** The journey drawn in the world (`current` unless the URL asks for another). */
export const JOURNEY: JourneyId = param === "a" || param === "b" || param === "c" ? param : "current";

/** The URL names a journey, so the car starts at it. */
export const JOURNEY_LINKED = param === "a" || param === "b" || param === "c" || param === "current";

/**
 * [x, z, heading] (heading 0 faces +x, east) just before each journey's first date. The three
 * redesigns run west to east, left to right on screen under the chase camera, so they start on
 * the west garden path; the current terrace runs east to west and starts at its east end.
 */
export const JOURNEY_SPAWN: Record<JourneyId, [number, number, number]> = {
  current: [5, 3, Math.PI],
  a: [-21, 3, 0],
  b: [-21, 3.1, 0],
  c: [-19, 3, 0],
};
