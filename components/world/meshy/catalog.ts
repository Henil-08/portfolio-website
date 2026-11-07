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
  /** the GLB carries animations: play the first one on a loop */
  animated?: boolean;
};

export const MESHY: MeshyModel[] = [
  { id: "mail", name: "C01 · Email monument", height: 3.2, base: 0, body: "#f3f2ed", plinth: "#b8b4a9", textured: true, span: 3.2 },
  { id: "linkedin", name: "C02 · LinkedIn monument", height: 3.2, base: 0, body: "#f3f2ed", plinth: "#b8b4a9", textured: true, span: 3.2 },
  { id: "github", name: "C03 · GitHub monument", height: 3.2, base: 0, body: "#f3f2ed", plinth: "#b8b4a9", textured: true, span: 3.2 },
  { id: "resume", name: "C04 · Résumé monument", height: 3.2, base: 0, body: "#f3f2ed", plinth: "#b8b4a9", textured: true, span: 3.2 },
  { id: "scholar", name: "C05 · Scholar monument", height: 3.2, base: 0, body: "#f3f2ed", plinth: "#b8b4a9", textured: true, span: 3.2 },
  { id: "huggingface", name: "C06 · Hugging Face monument", height: 3.2, base: 0, body: "#f3f2ed", plinth: "#b8b4a9", textured: true, span: 3.2 },
  { id: "medium", name: "C07 · Medium monument", height: 3.2, base: 0, body: "#f3f2ed", plinth: "#b8b4a9", textured: true, span: 3.2 },
  { id: "driver-wave", name: "Driver · wave (rigged)", height: 1.78, base: 0, body: "#151515", plinth: "#151515", textured: true, animated: true },
  { id: "driver-idle", name: "Driver · idle (rigged)", height: 1.78, base: 0, body: "#151515", plinth: "#151515", textured: true, animated: true },
  { id: "trophy", name: "Trophy", height: 0.9, base: 0.3, body: "#f3f2ed", plinth: "#151515" },
  { id: "mercury", name: "Mercury solar car", height: 1.1, base: 0.0, body: "#f3f2ed", plinth: "#151515", top: { above: 0.55, color: "#1d2129" }, span: 4.6 },
  { id: "v01", name: "TH-18 test (Meshy, from our renders)", height: 1.0, base: 0, body: "#f3f2ed", plinth: "#151515", textured: true, span: 5.6 },
];

/** Concept images (public/models/concepts/<id>.png): designed first, meshed once approved. */
export const CONCEPTS: { id: string; name: string; group: string }[] = [
  { id: "garage-a", name: "A · Working gallery", group: "Garage interior" },
  { id: "garage-b", name: "B · Paper workshop", group: "Garage interior" },
  { id: "garage-c", name: "C · Data wall", group: "Garage interior" },
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
  { id: "tree-cypress", name: "Cypress tree", group: "Nature" },
  { id: "tree-round", name: "Round-crown tree", group: "Nature" },
  { id: "bush", name: "Bush cluster", group: "Nature" },
  { id: "grasses", name: "Ornamental grasses", group: "Nature" },
  { id: "rocks", name: "Rock set", group: "Nature" },
  { id: "town-low", name: "Town block, low", group: "Buildings" },
  { id: "town-mid", name: "Town block, mid", group: "Buildings" },
  { id: "town-tower", name: "Landmark tower", group: "Buildings" },
  { id: "pit-building", name: "Pit building", group: "Buildings" },
  { id: "boston", name: "Boston sector building", group: "Buildings" },
  { id: "ahmedabad", name: "Ahmedabad sector building", group: "Buildings" },
  { id: "hyperlab", name: "Hyperlab studio", group: "Buildings" },
  { id: "waters", name: "Waters lab building", group: "Buildings" },
  { id: "grandstand", name: "Grandstand", group: "Trackside" },
  { id: "floodlight", name: "Floodlight tower", group: "Trackside" },
  { id: "gantry", name: "Start gantry", group: "Trackside" },
  { id: "tecpro", name: "TecPro barrier", group: "Trackside" },
  { id: "marshal", name: "Marshal post", group: "Trackside" },
  { id: "pitwall", name: "Pit wall", group: "Trackside" },
  { id: "lamp", name: "Street lamp", group: "Street" },
  { id: "bench", name: "Bench", group: "Street" },
  { id: "bollard", name: "Bollard", group: "Street" },
  { id: "kiosk", name: "Kiosk", group: "Street" },
  { id: "busstop", name: "Bus stop", group: "Street" },
  { id: "cafe", name: "Café set", group: "Street" },
  { id: "boat", name: "Boat", group: "Street" },
  { id: "pier", name: "Pier section", group: "Street" },
  { id: "goal", name: "Football goal", group: "Park" },
  { id: "stumps", name: "Cricket stumps", group: "Park" },
  { id: "podium", name: "Podium", group: "Park" },
];
