// Models made with Meshy (scripts/meshy.mjs, docs/research/meshy-models.md). Meshy gives the shape
// only; the paint is ours: every vertex below `base` (fraction of the model's height) is the
// plinth colour, the rest the body colour, flat shaded. Codes, labels and the one orange accent are
// added by the component that places the model.
export type MeshyModel = {
  id: string;
  name: string;
  /** height in metres in the world */
  height: number;
  /** fraction of the height that is plinth */
  base: number;
  body: string;
  plinth: string;
  /** upward-facing faces above this fraction of the height take this colour (a solar deck, a cap) */
  top?: { above: number; color: string };
  /** largest extent in metres, for framing (defaults to height) */
  span?: number;
  /** show Meshy's own texture instead of our paint (tests only) */
  textured?: boolean;
};

export const MESHY: MeshyModel[] = [
  { id: "trophy", name: "Trophy", height: 0.9, base: 0.3, body: "#f3f2ed", plinth: "#151515" },
  { id: "mercury", name: "Mercury solar car", height: 1.1, base: 0.0, body: "#f3f2ed", plinth: "#151515", top: { above: 0.55, color: "#1d2129" }, span: 4.6 },
  { id: "v01", name: "TH-18 test (Meshy, from our renders)", height: 1.0, base: 0, body: "#f3f2ed", plinth: "#151515", textured: true, span: 5.6 },
];

/** Concept images (public/models/concepts/<id>.png): designed first, meshed once approved. */
export const CONCEPTS: { id: string; name: string; group: string }[] = [
  { id: "mail", name: "C01 · Email", group: "Contact monuments" },
  { id: "linkedin", name: "C02 · LinkedIn", group: "Contact monuments" },
  { id: "github", name: "C03 · GitHub", group: "Contact monuments" },
  { id: "resume", name: "C04 · Résumé", group: "Contact monuments" },
  { id: "scholar", name: "C05 · Scholar", group: "Contact monuments" },
  { id: "huggingface", name: "C06 · Hugging Face", group: "Contact monuments" },
  { id: "medium", name: "C07 · Medium", group: "Contact monuments" },
  { id: "driver", name: "Driver", group: "Heroes" },
  { id: "trophy", name: "Trophy", group: "Heroes" },
  { id: "mercury", name: "Mercury solar car", group: "Heroes" },
];
