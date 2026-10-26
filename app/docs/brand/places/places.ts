// Every place you can interact with in the game, read from the game's own data: the zones in
// layout.ts (`zones`, the E prompt and a sheet each), the contact medallions (social `LINKS`,
// store `nearLink`), the career terrace (Timeline.tsx, driven by the car's position) and the
// start by the name (startSpot.ts, the knockable letters in Places.tsx).
import { GARAGES, LETTERS, PIT, SECTORS, TIMELINE, garageLabel, zoneById, type ZoneId } from "@/components/world/layout";
import { START_SPOT } from "@/components/world/startSpot";
import { zoneCode, zoneMeta } from "@/components/ui/Panels";
import type { ViewSpec } from "./views";

export type Place = {
  slug: string;
  code: string;
  name: string;
  kicker: string;
  zone?: ZoneId;
  /** the real components drawing it in the game (and here) */
  parts: string;
  view: ViewSpec;
  /** how you set it off */
  trigger: string;
  /** what happens */
  interact: string[];
};

const hotspot = (id: ZoneId) => {
  const z = zoneById[id];
  return `${z.size[0]} × ${z.size[1]} m hotspot at ${z.pos[0].toFixed(0)}, ${z.pos[1].toFixed(0)}`;
};

const zonePlace = (id: ZoneId, p: Omit<Place, "slug" | "code" | "name" | "kicker" | "zone" | "trigger"> & { trigger?: string }): Place => ({
  slug: id,
  code: zoneCode(id),
  name: zoneById[id].label,
  kicker: zoneMeta[id].kicker,
  zone: id,
  trigger: p.trigger ?? `Park in the ${hotspot(id)}. The E prompt opens with the place's name; E, Enter or a click on the prompt opens the sheet.`,
  ...p,
});

const SECTOR_PARTS = ["AhmedabadSector", "HyperlabSector", "BostonSector", "WatersSector"];

export const SECTOR_PLACES: Place[] = SECTORS.map((s, i) => {
  const [cx, cz] = s.scene;
  // the scene's local +Z faces the track; the camera stands out on the road side, a little off axis
  const fx = Math.sin(s.sceneRot);
  const fz = Math.cos(s.sceneRot);
  const sx = Math.cos(s.sceneRot);
  const sz = -Math.sin(s.sceneRot);
  return zonePlace(`sector-${s.n}` as ZoneId, {
    parts: `models/sectors/${SECTOR_PARTS[i].replace("Sector", "")}.tsx ${SECTOR_PARTS[i]}, Places.tsx Sectors`,
    view: { x: cx - fx * 4, z: cz - fz * 4, lift: 3, off: [fx * 26 + sx * 10, 14, fz * 26 + sz * 10] },
    trigger: `Drive onto the 16 × 16 m stretch of track beside the scenery (track t ${s.t.toFixed(3)}). The E prompt names the place; E, Enter or a click opens the sheet.`,
    interact: [
      `Chapter ${s.n} of the story: ${s.name}, ${s.year}.`,
      "The sheet shows the story text, a photo where there is one, and the roles from that chapter; each role row opens its points.",
    ],
  });
});

export const GARAGE_PLACES: Place[] = GARAGES.map((g) =>
  zonePlace(`garage-${g.domain}` as ZoneId, {
    parts: "buildings/PitBuilding.tsx PitBuilding + Plinth, Places.tsx GarageCarousel, models/projects ProjectObject",
    view: { x: g.x, z: PIT.garageZ - 2.4, lift: 1.1, off: [3, 2.6, 13] },
    trigger: `Park on the apron in front of the ${garageLabel[g.domain]} bay (${hotspot(`garage-${g.domain}` as ZoneId)}). E, Enter or a click opens the garage.`,
    interact: [
      "The camera dollies in through the open door (garageShots.ts garageShot).",
      "The project on show slides to the centre plinth, scales up and glows: a halo, a showroom beam and an orange rim.",
      "← → step along the plinths; the others slide along and the one that wraps shrinks out and grows back in.",
      "The wide sheet (640 px) is the project's datasheet card: features, key specs, built with, source.",
    ],
  })
);

export const PARK_PLACES: Place[] = [
  zonePlace("playbook", {
    parts: "Places.tsx TyreWall (models/props Tyre), Signposts",
    view: { x: 36, z: -20, lift: 1, off: [6, 5, 10] },
    interact: ["Four stacks of four tyres, one stack per compound (soft, medium, hard, inter). Each tyre is its own body, so the stacks topple when you hit them.", "The sheet: how I work with AI, as stints with a compound each, and the toolbox."],
  }),
  zonePlace("podium", {
    parts: "models/props Podium, Places.tsx Buildings",
    view: { x: 5, z: -10.5, lift: 1, off: [6, 5, 10] },
    interact: ["A fixed podium you can bump into.", "The sheet: papers and patents, with a Google Scholar link."],
  }),
  zonePlace("cricket", {
    parts: "Places.tsx Cricket (models/props CricketPitch, Stump, Bail)",
    view: { x: -25, z: -10, lift: 0.5, off: [3, 13, 27] },
    interact: [
      "Stumps and bails at both ends are loose bodies. Knock any of them: HOWZAT! toast, a pop, and the Howzat achievement.",
      "Three wickets unlock Hat-trick. The wicket resets itself 4.5 s later.",
      "The sheet: the cricket note and the other off-the-clock things.",
    ],
  }),
  zonePlace("football", {
    parts: "Places.tsx FootballPitch (models/props Goal, Football)",
    view: { x: 15, z: -22, lift: 0.5, off: [12, 12, 16] },
    interact: [
      "Push the ball into the goal: GOAL! toast, the crowd cheers, Back of the net achievement. Three goals unlock Hat-trick.",
      "The ball goes back to the spot 1.5 s after a goal, or at once if it leaves the island.",
      "The sheet: the football note and the other off-the-clock things.",
    ],
  }),
  zonePlace("contact", {
    parts: "social/index.tsx Social (medallions, waving Avatar), ui3d/InteractivePoints",
    view: { x: 34, z: -35.5, lift: 1.2, off: [5, 7, 15] },
    interact: [
      "The mailbox hotspot opens the Say hi sheet: email, links, and the MCP command to copy.",
      "Each medallion in the ring is an interactable of its own (store nearLink): drive up to it, the prompt names the link, E opens it in a new tab.",
    ],
  }),
];

const TL_CX = TIMELINE.pos[0];
const TL_CZ = TIMELINE.pos[1];

export const OTHER_PLACES: Place[] = [
  {
    slug: "timeline",
    code: "TL",
    name: "Career timeline",
    kicker: "Terrace · no prompt",
    parts: "Timeline.tsx (timeline/data.ts LANES)",
    view: { x: TL_CX, z: TL_CZ, lift: 0.8, off: [8, 9, 12] },
    trigger: "No prompt and no sheet: just drive across the stone terrace. Time runs west, one lane per role.",
    interact: [
      "While the car is inside a role's dates, that role's stone rises out of the ground, floats with a slow bob, travels along with the car and its label wipes in.",
      "Past the end it settles back; a role that is still going keeps its stone up. Stones that are up stack so labels never overlap.",
      "Use the slider beside the view to move a stand-in car along the terrace.",
    ],
  },
  {
    slug: "start",
    code: "ST",
    name: "Start and the name",
    kicker: "Spawn · no prompt",
    parts: "startSpot.ts START_SPOT, StartGarden.tsx, Places.tsx Letters",
    view: { x: (START_SPOT[0] + LETTERS.center[0]) / 2, z: (START_SPOT[1] + LETTERS.center[1]) / 2, lift: 1, off: [9, 8, 18] },
    trigger: "Where every drive begins: the car spawns on the garden path in front of the name, facing the pit lane.",
    interact: ["HENIL GAJJAR stands in loose letters; drive into them and they topple (they drift back home later).", "The bench is a knock-about prop too. No sheet opens here."],
  },
];

export const SECTIONS: { n: string; title: string; note: string; places: Place[] }[] = [
  { n: "01", title: "Sectors", note: "The story, one chapter per sector, in the order you drive the circuit.", places: SECTOR_PLACES },
  { n: "02", title: "Garages", note: "One bay per project domain in the pit building, the projects on plinths inside.", places: GARAGE_PLACES },
  { n: "03", title: "Park", note: "The infield islands: playbook, podium, the two pitches and contact.", places: PARK_PLACES },
  { n: "04", title: "Without a prompt", note: "Places that react to the car but open no sheet.", places: OTHER_PLACES },
];

export const ALL_PLACES = SECTIONS.flatMap((s) => s.places);
