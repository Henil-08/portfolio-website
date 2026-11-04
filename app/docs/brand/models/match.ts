// Matched cameras: each concept image's own view, so a model can be laid over its concept.
// `box` is the concept's silhouette in the 1024 x 1024 image as fractions [x0, y0, x1, y1]
// (measured from the pixels against the backdrop, hand-corrected where a shadow, a reflection or
// the frame edge got in). `az` is the camera's angle round the model from its front (+z) toward
// its right (+x), `el` the angle above the horizon, both in degrees, hand-tuned on the overlay.
// The page fits the distance and the aim so the model's height and centre fill `box`; the
// width then shows whether the proportions match.
export type Match = { az: number; el: number; fov: number; box: [number, number, number, number] };

const D = { az: 40, el: 20, fov: 30 };

export const MATCH: Record<string, Match> = {
  ahmedabad: { ...D, az: 38, el: 18, box: [0.047, 0.199, 0.934, 0.781] },
  bench: { ...D, az: 34, el: 24, box: [0.098, 0.199, 0.945, 0.848] },
  boat: { ...D, az: 55, el: 22, box: [0.066, 0.277, 0.918, 0.773] },
  bollard: { ...D, az: 30, el: 8, box: [0.094, 0.168, 0.82, 0.89] },
  boston: { ...D, az: 38, el: 18, box: [0.051, 0.168, 0.91, 0.82] },
  bush: { ...D, az: 30, el: 30, box: [0.109, 0.258, 0.938, 0.773] },
  busstop: { ...D, az: 35, el: 14, box: [0.164, 0.164, 0.922, 0.852] },
  cafe: { ...D, az: 40, el: 34, box: [0.047, 0.246, 0.973, 0.906] },
  driver: { ...D, az: 15, el: 4, box: [0.297, 0.086, 0.68, 0.93] },
  floodlight: { ...D, az: 30, el: 6, box: [0.23, 0.02, 0.652, 0.961] },
  gantry: { ...D, az: 25, el: 10, box: [0.03, 0.17, 0.94, 0.79] },
  github: { ...D, az: 25, el: 8, box: [0.324, 0.086, 0.84, 0.918] },
  goal: { ...D, az: 35, el: 18, box: [0.129, 0.195, 0.922, 0.824] },
  grandstand: { ...D, az: 40, el: 18, box: [0.055, 0.242, 0.938, 0.832] },
  grasses: { ...D, az: 30, el: 16, box: [0.211, 0.18, 0.922, 0.867] },
  huggingface: { ...D, az: 25, el: 8, box: [0.129, 0.086, 0.855, 0.926] },
  hyperlab: { ...D, az: 40, el: 16, box: [0.039, 0.273, 0.926, 0.785] },
  kiosk: { ...D, az: 30, el: 12, box: [0.098, 0.211, 0.879, 0.828] },
  lamp: { ...D, az: 25, el: 6, box: [0.316, 0.078, 0.605, 0.957] },
  linkedin: { ...D, az: 25, el: 8, box: [0.258, 0.082, 0.949, 0.926] },
  mail: { ...D, az: 25, el: 14, box: [0.152, 0.141, 0.777, 0.902] },
  marshal: { ...D, az: 35, el: 14, box: [0.172, 0.246, 0.816, 0.82] },
  medium: { ...D, az: 25, el: 8, box: [0.234, 0.102, 0.887, 0.914] },
  mercury: { ...D, az: 50, el: 16, box: [0.066, 0.313, 0.945, 0.77] },
  pier: { ...D, az: 50, el: 26, box: [0.051, 0.031, 1, 0.895] },
  "pit-building": { ...D, az: 30, el: 16, box: [0.039, 0.277, 0.957, 0.73] },
  pitwall: { ...D, az: 35, el: 20, box: [0.035, 0.172, 0.934, 0.824] },
  podium: { ...D, az: 35, el: 20, box: [0.07, 0.262, 0.961, 0.863] },
  resume: { ...D, az: 25, el: 8, box: [0.211, 0.094, 0.895, 0.934] },
  rocks: { ...D, az: 35, el: 22, box: [0.051, 0.336, 0.965, 0.781] },
  scholar: { ...D, az: 25, el: 8, box: [0.172, 0.105, 0.805, 0.934] },
  stumps: { ...D, az: 30, el: 12, box: [0.242, 0.125, 0.813, 0.926] },
  tecpro: { ...D, az: 40, el: 20, box: [0.047, 0.254, 0.906, 0.836] },
  "town-low": { ...D, az: 35, el: 12, box: [0.152, 0.148, 0.859, 0.836] },
  "town-mid": { ...D, az: 35, el: 12, box: [0.07, 0.109, 0.934, 0.91] },
  "town-tower": { ...D, az: 30, el: 10, box: [0.266, 0.066, 0.766, 0.949] },
  "tree-cypress": { ...D, az: 20, el: 6, box: [0.367, 0.094, 0.695, 0.91] },
  "tree-round": { ...D, az: 20, el: 6, box: [0.254, 0.098, 0.758, 0.93] },
  trophy: { ...D, az: 25, el: 14, box: [0.25, 0.156, 0.906, 0.887] },
  waters: { ...D, az: 40, el: 16, box: [0.035, 0.25, 0.922, 0.777] },
};
