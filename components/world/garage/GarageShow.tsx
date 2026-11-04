"use client";

// Garage experience · Cockpit + pit wall, in the game (owner, approved 2026-11-05). Every bay
// carries its pit wall of screens and its stage (Bay.tsx). Open a garage (E at Z05–Z09) and a
// stand-in for your vehicle, in your livery, leaves from exactly where yours stands, drives into
// the bay and stops facing the wall, while the camera follows it in and settles at the driver's
// eye (Rig.tsx reads garageView). ← → or a click on a screen switch project (store garageSel);
// Esc backs the stand-in out along the same path to where you were, and you drive on.
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { GARAGES, type ZoneId } from "../layout";
import { getState, setState, useWorld } from "../store";
import { carState } from "../carState";
import { CI } from "../buildings/concrete";
import { liveryOf, vehicleByCode } from "../vehicles";
import type { Domain } from "@/content/projects";
import { GarageBay } from "./Bay";
import { ShowCar } from "./ShowCar";
import { PLINTH_H, STAGE, STAGE_Y, STAGE_Z, bayOrigin, cockpitPoses, garageList, glanceOf, inOut, lerp, parkZ, seg, stepDrive, useSlide } from "./anim";
import { garageView } from "./state";

/** The player's model group, by name (Vehicle.tsx PLAYER_MODEL). */
const PLAYER_MODEL = "player-vehicle";
const garageOf = (zone: string | null) => (zone?.startsWith("garage-") ? (zone.slice(7) as Domain) : null);

/** The way in: a curve from where the car stood (its nose's way) round to the parking spot. */
type Path = { pts: THREE.Vector3[]; len: number[]; from: THREE.Vector3 };
function makePath(p0: THREE.Vector3, yaw0: number, park: THREE.Vector3): Path {
  const d = p0.distanceTo(park);
  const c1 = p0.clone().add(new THREE.Vector3(Math.sin(yaw0), 0, Math.cos(yaw0)).multiplyScalar(THREE.MathUtils.clamp(d * 0.4, 0.8, 4)));
  const c2 = park.clone().add(new THREE.Vector3(0, 0, THREE.MathUtils.clamp(d * 0.5, 1.2, 5)));
  const curve = new THREE.CubicBezierCurve3(p0, c1, c2, park);
  const pts = curve.getPoints(48);
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return { pts, len, from: p0.clone() };
}
/** The point and heading a fraction s of the way along. */
function along(p: Path, s: number, pos: THREE.Vector3) {
  const L = p.len[p.len.length - 1];
  const want = s * L;
  let i = 1;
  while (i < p.len.length - 1 && p.len[i] < want) i++;
  const a = p.pts[i - 1];
  const b = p.pts[i];
  const seglen = p.len[i] - p.len[i - 1];
  pos.lerpVectors(a, b, seglen > 1e-6 ? (want - p.len[i - 1]) / seglen : 0);
  return Math.atan2(b.x - a.x, b.z - a.z);
}

/** One bay's wall and stage, following the store while its garage is open. */
function GameBay({ domain }: { domain: Domain }) {
  const zid = `garage-${domain}` as ZoneId;
  const list = useMemo(() => garageList(domain), [domain]);
  const live = useWorld((s) => (s.zone === zid ? Math.min(s.garageSel, list.length - 1) : null));
  // closing keeps the project on show where it is, so nothing slides while you back out
  const [sel, setSel] = useState(0);
  if (live !== null && live !== sel) setSel(live);
  const slide = useSlide(sel, undefined, list.length);
  const drive = useMemo(() => ({ get current() { return garageView.dom === domain ? garageView.k : 0; } }), [domain]);
  useFrame(() => {
    if (garageView.dom === domain) garageView.slide = slide.current;
  });
  const origin = useMemo(() => bayOrigin(domain), [domain]);
  return (
    <group position={origin.toArray()}>
      <GarageBay list={list} drive={drive} slide={slide} onPick={(i) => getState().zone === zid && setState({ garageSel: i })} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[STAGE[0] / 2, STAGE_Y / 2, STAGE[2] / 2]} position={[0, STAGE_Y / 2, STAGE_Z]} />
        <CuboidCollider args={[0.5, (STAGE_Y + PLINTH_H) / 2, 0.5]} position={[0, (STAGE_Y + PLINTH_H) / 2, STAGE_Z]} />
      </RigidBody>
    </group>
  );
}

export default function GarageShow() {
  const { scene } = useThree();
  const code = useWorld((s) => s.vehicle);
  const lname = useWorld((s) => s.livery);
  const v = vehicleByCode[code];
  const livery = liveryOf(code, lname);
  // the garage the stand-in is in (open, or still backing out of)
  const [dom, setDom] = useState<Domain | null>(null);
  const car = useRef<THREE.Group>(null);
  const inCab = useRef(false);
  const light = useRef<THREE.SpotLight>(null!);
  const lightAt = useMemo(() => new THREE.Object3D(), []);
  const run = useRef({ path: null as Path | null, origin: new THREE.Vector3(), world: new THREE.Vector3(), q: new THREE.Quaternion(), f: new THREE.Vector3(), p: new THREE.Vector3() });

  useFrame((_, dt) => {
    const r = run.current;
    const open = garageOf(getState().zone);
    // a garage opens: start from exactly where the player's vehicle stands
    if (open && garageView.k === 0 && garageView.dom !== open) {
      const m = scene.getObjectByName(PLAYER_MODEL);
      garageView.dom = open;
      r.origin.copy(bayOrigin(open));
      if (m) {
        m.updateWorldMatrix(true, false);
        m.getWorldPosition(r.world);
        m.getWorldQuaternion(r.q);
        r.f.set(0, 0, 1).applyQuaternion(r.q);
        r.path = makePath(r.world.clone().sub(r.origin), Math.atan2(r.f.x, r.f.z), new THREE.Vector3(0, 0, parkZ(code)));
      } else r.path = null; // no player here (the places page): the bay alone follows the store
      if (dom !== open) setDom(open);
    }
    const d = garageView.dom;
    if (!d) return;
    // moved away while backing out (a teleport): let go at once
    if (!open && r.path && carState.pos.distanceTo(r.path.from.clone().add(r.origin)) > 6) garageView.k = 0;
    else garageView.k = stepDrive(garageView.k, open === d, dt);
    const k = garageView.k;
    garageView.car = !!r.path && k > 0 && !!car.current;

    if (r.path && car.current) {
      const g = car.current;
      const yaw = along(r.path, inOut(seg(k, 0, 0.8)), g.position);
      g.rotation.y = yaw;
      g.visible = k > 0;
      r.p.copy(g.position).add(r.origin);
      cockpitPoses(garageView.poses, k, code, r.p, yaw, garageView.slide ? glanceOf(garageView.slide) : 0, r.origin);
      inCab.current = garageView.poses.b > 0.8;
    }
    // the bay's showroom light, on as you arrive
    lightAt.position.set(r.origin.x, r.origin.y + 1.2, r.origin.z + STAGE_Z);
    light.current.position.set(r.origin.x + 0.9, r.origin.y + 3.4, r.origin.z + STAGE_Z + 1.8);
    light.current.intensity = lerp(0, 26, inOut(seg(k, 0.5, 0.9)));

    if (k === 0 && !open) {
      garageView.dom = null;
      garageView.car = false;
      r.path = null;
      garageView.slide = null;
      if (dom) setDom(null);
    }
  });

  return (
    <>
      {GARAGES.map((g) => (
        <GameBay key={g.domain} domain={g.domain} />
      ))}
      {/* one showroom light, moved to the bay in use (a constant light count: no shader rebuilds) */}
      <primitive object={lightAt} />
      <spotLight ref={light} target={lightAt} angle={0.55} penumbra={0.65} intensity={0} distance={8} decay={1.5} color={CI.lamp} />
      {dom && (
        <group position={bayOrigin(dom).toArray()}>
          <group ref={car} visible={false}>
            <ShowCar key={`${code}-${livery.name}`} v={v} livery={livery} root={car} inCab={inCab} />
          </group>
        </group>
      )}
    </>
  );
}
