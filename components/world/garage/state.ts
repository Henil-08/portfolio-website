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

/**
 * The garage's sheet, a reading panel (Hud.tsx `Sheet`), for a W x H viewport in CSS px, and the
 * part of the screen it leaves the bay (`free`, from `y` down; Rig.tsx frames the driver's view
 * there). On a landscape screen from 640 px wide it stands on the right, under the tabs: about
 * half the width, 620 to 820 px, narrower only to leave the bay 480 px. Otherwise it's a bottom
 * sheet, 70 % of the height on a phone and 58 % on a tablet (standing above the team radio tab
 * there, Ask.tsx), and the bay is the strip between the tabs (Hud.tsx TopBar) and the sheet.
 */
export function garageSheet(W: number, H: number) {
  if (W >= 640 && W > H) {
    const width = Math.round(Math.min(820, Math.max(Math.min(620, W - 512), W * 0.48)));
    return { box: { top: 72, right: 20, bottom: 20, width }, free: { w: W - width - 20 - 12, h: H, y: 0 } };
  }
  const phone = W < 640;
  const height = Math.round(H * (phone ? 0.7 : 0.58));
  const bottom = phone ? 12 : 70;
  const tabs = phone ? 56 : 64;
  return { box: { left: 12, right: 12, bottom, height }, free: { w: W, h: H - height - bottom - 8 - tabs, y: tabs } };
}
