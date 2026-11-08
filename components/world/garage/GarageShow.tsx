"use client";

// Garage experience · Teardown, in the game (owner's pick, 2026-11-07; it replaces the cockpit
// and pit wall). Every bay is a drafting studio with a project on its table (teardown/studio.tsx).
// Open a garage (E at Z05–Z09) and a stand-in for your vehicle, in your livery, leaves from
// exactly where yours stands, drives into the bay through its rolled-up door and pulls aside to
// park by the table, while the camera follows it in and rises into the drawing view (Rig.tsx reads
// garageView); the project comes apart into its parts with callouts (the overlay is Panels.tsx's).
// ← → switch project (store garageSel); Esc backs the stand-in out along the same path to where
// you were, and you drive on.
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { GARAGES, type ZoneId } from "../layout";
import { getState, setState, useWorld } from "../store";
import { carState } from "../carState";
import { CI } from "../buildings/concrete";
import { liveryOf, vehicleByCode } from "../vehicles";
import type { Domain } from "@/content/projects";
import { ShowCar } from "./ShowCar";
import { bayOrigin, cockpitPoses, garageList, inOut, lerp, seg, stepDrive } from "./anim";
import { garageSheet, garageView } from "./state";
import { enterIndoor, indoor, leaveIndoor } from "../indoor";
import { PARK, Standing, Studio, TZ, Table, VIEW, projectCallouts, td, teardownView } from "./teardown/studio";

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

/** The project each bay last showed, so a shut bay keeps what you left on its table. */
const lastShown = new Map<Domain, string>();

/**
 * One bay: the drafting studio, and on its table either the garage's teardown (its bay is the
 * one open, or still backing out: `active`) or the project left there, standing whole.
 */
function GameBay({ domain, active }: { domain: Domain; active: boolean }) {
  const zid = `garage-${domain}` as ZoneId;
  const list = useMemo(() => garageList(domain), [domain]);
  const live = useWorld((s) => (s.zone === zid ? Math.min(s.garageSel, list.length - 1) : null));
  // backing out keeps the project on show, so nothing changes on the table while you leave
  const [sel, setSel] = useState(0);
  if (live !== null && live !== sel) setSel(live);
  const inside = live !== null;
  // reopened: back to the project you left on the table
  const [was, setWas] = useState(false);
  if (inside !== was) {
    setWas(inside);
    const last = list.findIndex((x) => x.p.slug === lastShown.get(domain));
    if (inside && last > 0 && live === 0) setState({ garageSel: last });
  }
  const drive = useMemo(() => ({ get current() { return garageView.dom === domain ? garageView.k : 0; } }), [domain]);
  useFrame(() => {
    if (active && td.shown) lastShown.set(domain, td.shown);
  });
  const origin = useMemo(() => bayOrigin(domain), [domain]);
  const standing = list.find((x) => x.p.slug === lastShown.get(domain)) ?? list[0];
  return (
    <group position={origin.toArray()}>
      {/* no colliders: the bay is shut (buildings/PitBuilding.tsx pitSolids), only the stand-in comes in */}
      <Studio drawings={active} />
      {active ? <Table key={list.map((x) => x.p.slug).join()} list={list} sel={sel} inside={inside} drive={drive} up /> : <Standing key={standing.p.slug} item={standing} />}
    </group>
  );
}

export default function GarageShow() {
  const { scene, camera, size } = useThree();
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
  const root = useRef<THREE.Group>(null);
  const run = useRef({ path: null as Path | null, origin: new THREE.Vector3(), world: new THREE.Vector3(), q: new THREE.Quaternion(), f: new THREE.Vector3(), p: new THREE.Vector3() });
  const view = useRef({ pos: new THREE.Vector3(), look: new THREE.Vector3(), fit: { dist: 4, look: new THREE.Vector3(0, 1, TZ) } });

  useFrame((s, dt) => {
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
        // in through the door and aside, to park by the drafting table (teardown/studio.tsx)
        r.path = makePath(r.world.clone().sub(r.origin), Math.atan2(r.f.x, r.f.z), PARK.clone());
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
      // the chase behind the stand-in as it parks, then up out of it into the drawing view,
      // fitted to the part of the screen the garage's sheet leaves (Rig.tsx frames it there)
      const P = garageView.poses;
      cockpitPoses(P, k, code, r.p, yaw, 0, r.origin);
      const v2 = view.current;
      const free = garageSheet(size.width, size.height).free;
      teardownView(v2, v2.fit, free.w / Math.max(1, free.h), free.w, s.clock.elapsedTime, dt);
      P.eye.copy(v2.pos).add(r.origin);
      P.look.copy(v2.look).add(r.origin);
      P.fov = VIEW.fov;
      inCab.current = false;
    }
    // the callouts' parts on screen, for the sheet's overlay (Panels.tsx)
    if (garageView.car) projectCallouts(camera, r.origin);
    // the bay's light over the table, on as you arrive
    lightAt.position.set(r.origin.x, r.origin.y + 0.9, r.origin.z + TZ);
    light.current.position.set(r.origin.x + 0.9, r.origin.y + 4.2, r.origin.z + TZ + 2.2);
    light.current.intensity = lerp(0, 22, inOut(seg(k, 0.5, 0.9)));

    // parked in the drawing view, the bay fills the picture: the island behind its walls is left
    // out until the back-out starts (indoor.ts). Dev: window.__indoorOff = true keeps it all.
    const off = process.env.NODE_ENV !== "production" && (window as unknown as { __indoorOff?: boolean }).__indoorOff;
    if (k >= 1 && open === d && !indoor.on && !off && root.current) enterIndoor(scene, root.current, r.origin);
    else if ((k < 1 || off) && indoor.on) leaveIndoor();

    if (k === 0 && !open) {
      garageView.dom = null;
      garageView.car = false;
      r.path = null;
      if (dom) setDom(null);
    }
  });

  return (
    <group ref={root} name="garage-show">
      {GARAGES.map((g) => (
        <GameBay key={g.domain} domain={g.domain} active={dom === g.domain} />
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
    </group>
  );
}
