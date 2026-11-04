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
};

export const MESHY: MeshyModel[] = [
  { id: "contact-mail", name: "C01 · Email statue", height: 3.2, base: 0.1, body: "#f3f2ed", plinth: "#b8b4a9" },
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
