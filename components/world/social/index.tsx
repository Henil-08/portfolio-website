"use client";

// Contact, the way Bruno does his social area: one medallion per link in a half
// ring round a waving Henil. Drive up to a medallion and the prompt names it;
// Enter (or a click on the prompt) opens the link. Links come from
// content/profile.ts only.
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { profile } from "@/content/profile";
import { carState } from "../carState";
import { C } from "../palette";
import { heightAt } from "../terrain";
import { getState, setState } from "../store";
import { geo, mat } from "../models/props/shared";
import { Avatar } from "../models/Avatar";
import { ICONS, type IconName } from "./icons";

export type SocialLink = { key: string; name: string; url: string; icon: IconName; color: string };

export const LINKS: SocialLink[] = [
  { key: "mail", name: "Email", url: `mailto:${profile.email}`, icon: "mail", color: C.red },
  { key: "linkedin", name: "LinkedIn", url: profile.links.linkedin, icon: "linkedin", color: "#3d6f9e" },
  { key: "github", name: "GitHub", url: profile.links.github, icon: "github", color: C.ink },
  { key: "resume", name: "Résumé", url: profile.resume, icon: "resume", color: "#b4573f" },
  { key: "scholar", name: "Scholar", url: profile.links.scholar, icon: "googlescholar", color: "#4f7cc4" },
  { key: "huggingface", name: "Hugging Face", url: profile.links.huggingface, icon: "huggingface", color: "#d59a2b" },
  { key: "medium", name: "Medium", url: profile.links.medium, icon: "medium", color: C.ink },
];

/** Centre of the ring: the medallions bow away from the camera (to -z), open side toward it. */
export const SOCIAL = { center: [42, 23] as [number, number], radius: 6.2, reach: 2.6 };

/** World x, z of each medallion. */
export const LINK_SPOTS: [number, number][] = LINKS.map((_, i) => {
  const a = (i * Math.PI) / (LINKS.length - 1);
  return [SOCIAL.center[0] + Math.cos(a) * SOCIAL.radius, SOCIAL.center[1] - Math.sin(a) * SOCIAL.radius];
});

// ------------------------------------------------------------ geometry

const DISC_R = 0.78;
const DISC_T = 0.2;
const POST_H = 0.55;
const FACE_Y = POST_H + DISC_R + 0.05; // disc centre height

function iconGeometry(name: IconName) {
  return geo(`social-icon-${name}`, () => {
    const svg = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${ICONS[name]}"/></svg>`);
    const shapes = svg.paths.flatMap((p) => SVGLoader.createShapes(p));
    const g = new THREE.ExtrudeGeometry(shapes, { depth: 1.4, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.25, bevelSegments: 2, curveSegments: 8 });
    // 24-unit grid, y down -> about 0.95 m across, y up, centred, standing proud of the
    // disc face. Flip y and z together (a rotation, not a mirror) so faces keep their winding.
    g.translate(-12, -12, 0);
    const s = 0.95 / 24;
    g.scale(s, -s, -s);
    g.translate(0, 0, (1.4 + 0.35) * s);
    g.computeVertexNormals();
    return g;
  });
}

const discGeo = () =>
  geo("social-disc", () => {
    const g = new THREE.CylinderGeometry(DISC_R, DISC_R, DISC_T, 40);
    g.rotateX(Math.PI / 2);
    return g;
  });
const rimGeo = () => geo("social-rim", () => new THREE.TorusGeometry(DISC_R, 0.06, 10, 48));
const postGeo = () =>
  geo("social-post", () => {
    const g = new THREE.CylinderGeometry(0.14, 0.2, POST_H, 18);
    g.translate(0, POST_H / 2, 0);
    return g;
  });
const footGeo = () =>
  geo("social-foot", () => {
    const g = new THREE.CylinderGeometry(0.55, 0.62, 0.16, 28);
    g.translate(0, 0.08, 0);
    return g;
  });

function Medallion({ link, x, z }: { link: SocialLink; x: number; z: number }) {
  const y = heightAt(x, z);
  // face the ring's centre, turned a little toward the camera so the glyphs read
  const yaw = Math.atan2(SOCIAL.center[0] - x, SOCIAL.center[1] + 4 - z);
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]}>
      <mesh geometry={footGeo()} material={mat(C.sand, { r: 0.85 })} castShadow receiveShadow />
      <mesh geometry={postGeo()} material={mat(C.cream, { r: 0.6 })} castShadow />
      <mesh geometry={discGeo()} position={[0, FACE_Y, 0]} material={mat(C.white, { r: 0.45 })} castShadow receiveShadow />
      <mesh geometry={rimGeo()} position={[0, FACE_Y, 0]} material={mat(link.color, { r: 0.4 })} castShadow />
      <mesh geometry={iconGeometry(link.icon)} position={[0, FACE_Y, DISC_T / 2 - 0.01]} material={mat(link.color, { r: 0.4 })} castShadow />
      <mesh geometry={iconGeometry(link.icon)} position={[0, FACE_Y, -DISC_T / 2 + 0.01]} rotation={[0, Math.PI, 0]} material={mat(link.color, { r: 0.4 })} />
    </group>
  );
}

/** Sets `nearLink` when the car is next to a medallion (with a little hysteresis). */
function LinkWatcher() {
  useFrame(() => {
    const s = getState();
    if (s.phase !== "world") return;
    const { x, z } = carState.pos;
    let best: string | null = null;
    let bd = Infinity;
    LINK_SPOTS.forEach(([lx, lz], i) => {
      const d = Math.hypot(x - lx, z - lz);
      const reach = LINKS[i].key === s.nearLink ? SOCIAL.reach + 0.8 : SOCIAL.reach;
      if (d < reach && d < bd) {
        bd = d;
        best = LINKS[i].key;
      }
    });
    if (best !== s.nearLink) setState({ nearLink: best });
  });
  return null;
}

export function openLink(key: string) {
  const l = LINKS.find((q) => q.key === key);
  if (l) window.open(l.url, "_blank", "noopener");
}

export default function Social() {
  const spots = useMemo(() => LINK_SPOTS, []);
  const [cx, cz] = SOCIAL.center;
  return (
    <>
      {LINKS.map((l, i) => (
        <Medallion key={l.key} link={l} x={spots[i][0]} z={spots[i][1]} />
      ))}
      <RigidBody type="fixed" colliders={false}>
        {spots.map(([x, z], i) => (
          <CylinderCollider key={i} args={[(FACE_Y + DISC_R) / 2, 0.45]} position={[x, heightAt(x, z) + (FACE_Y + DISC_R) / 2, z]} />
        ))}
      </RigidBody>
      <Avatar position={[cx, heightAt(cx, cz - 2.2), cz - 2.2]} rotation={[0, 0.25, 0]} wave />
      <LinkWatcher />
    </>
  );
}
