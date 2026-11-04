// Garage experience in the game: what GarageShow.tsx tells the rest of the world each frame.
// The camera rig blends its chase pose through `poses` by their weights; the player's vehicle
// hides and holds still while `k` > 0 (its stand-in drives into the bay instead).
import type { Domain } from "@/content/projects";
import { newPoses, type SlideClock } from "./anim";

export const garageView = {
  /** the garage being shown (open, or still backing out), null when none */
  dom: null as Domain | null,
  /** drive-in progress, 0 driving to 1 in the seat */
  k: 0,
  /** true while the stand-in vehicle is out, so the player's own is hidden */
  car: false,
  /** the camera's poses through the move, in world space */
  poses: newPoses(),
  /** the open bay's project slide, for the eye's glance */
  slide: null as SlideClock | null,
};

/** True while a garage holds the player: its sheet is open or the stand-in is still backing out. */
export const garageBusy = (zone: string | null) => garageView.k > 0 || !!zone?.startsWith("garage-");
