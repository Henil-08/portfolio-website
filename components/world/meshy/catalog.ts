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
