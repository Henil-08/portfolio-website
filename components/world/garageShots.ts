// The garage experience: where each garage's projects stand (their plinths) and the
// camera shot that frames one of them through the open door. Shared by Places.tsx (the
// plinths), Rig.tsx (the dolly-in) and the HUD's spec sheets.
import * as THREE from "three";
import { projects, type Domain } from "@/content/projects";
import { GARAGES, PIT } from "./layout";
import { heightAt } from "./terrain";

/** A garage's projects in display order, with each plinth's world position. */
export function garagePlinths(domain: Domain) {
  const g = GARAGES.find((q) => q.domain === domain)!;
  const list = projects.filter((p) => p.domain === domain);
  const span = Math.min(7, list.length * 1.8);
  const y = heightAt((PIT.from + PIT.to) / 2, PIT.z);
  return list.map((p, i) => ({
    project: p,
    /** local x inside the garage group */
    lx: list.length === 1 ? 0 : -span / 2 + (span / (list.length - 1)) * i,
    pos: new THREE.Vector3(g.x + (list.length === 1 ? 0 : -span / 2 + (span / (list.length - 1)) * i), y, PIT.garageZ - 1 - 1.4),
  }));
}

/**
 * The dolly-in shot for plinth `i`: camera outside the door, low, looking past the project
 * so it sits left of centre (the spec sheet takes the right), or, on a tall phone screen,
 * in the upper half (the sheet takes the bottom).
 */
export function garageShot(domain: Domain, i: number, portrait = false) {
  const pl = garagePlinths(domain);
  const p = pl[Math.max(0, Math.min(pl.length - 1, i))].pos;
  if (portrait)
    return {
      position: new THREE.Vector3(p.x + 1.2, p.y + 3.6, PIT.garageZ + 7.4),
      target: new THREE.Vector3(p.x, p.y - 0.4, p.z + 1.2),
    };
  return {
    position: new THREE.Vector3(p.x + 2.4, p.y + 2.9, PIT.garageZ + 6.6),
    target: new THREE.Vector3(p.x + 1.5, p.y + 1.1, p.z),
  };
}
