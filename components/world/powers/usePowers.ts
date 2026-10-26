"use client";

// The four powers in real physics (docs/BRAND.md 2026-10-26; the look follows the approved mock,
// app/docs/brand/world/powers.tsx). Hold Shift to use the vehicle's power: it starts from 10%
// charge (more charge, a bigger power), runs while held and drains the meter, and winds down
// safely the moment it's let go or the bar runs dry. The vehicle keeps going from wherever the
// power leaves it (no reset to the grid, unlike the mock).
//   V01 TH-18   OVERTAKE  a surge along its heading, steered gently onto the track, DRS open, light trail;
//                         let go, the surge eases off and DRS closes
//   V02 E14     SEND IT   a real jump: a crouch, a launch, held it hangs on lift, let go it falls;
//                         the landing squashes in dust either way
//   V03 Atlas   SKYLINE   thrusters lift it to a hover while held, it steers in the air; let go, a controlled descent
//   V04 Apollo  SPLIT     a ghost while held: knock-about props pass through it (collision groups) and it dashes on;
//                         let go, it turns solid, and a prop still inside it stays ghost until they're apart
// Physics units: the world runs at 2x time (carState.ticker), so velocities here are in metres per
// physics second (half the real m/s) and power times are real seconds.
import { useEffect, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useBeforePhysicsStep, useRapier, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { input } from "../input";
import { carState, ticker } from "../carState";
import { getState } from "../store";
import { SEA_Y, TRACK_WIDTH, nearestT3, trackCurve, trackPoint, trackTangent } from "../layout";
import { surfaceY } from "../alive/ground";
import { kickDust } from "../alive/events";
import { bump, powerCue, powerRefused } from "../sound";
import { chargeOf, startPower, stopPower } from "./meter";
import { power } from "./state";
import { ghostLook } from "./ghost";

/** The player's vehicle is in collision group 1; every other collider keeps the default (all). */
export const CAR_GROUPS = 0x0002ffff;
const CAR_BIT = 0x0002;

const clamp01 = (k: number) => Math.min(1, Math.max(0, k));
const smooth = (a: number, b: number, x: number) => {
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const inOut3 = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/* ------------------------------------------------------------------ the numbers */

// k is the charge the power started with (0.1..1): more charge, a bigger power. How long it lasts
// is how long Shift is held, up to the bar running dry (meter.ts LAST: 2.5, 2, 3.5, 3 s full).

/** OVERTAKE: real m/s added on top of the speed it started at (14..28), in at rate 7/s, out at 5/s. */
const OVERTAKE = { gain: (k: number) => 12 + 16 * k, max: 62, accel: 60, rateIn: 7, rateOut: 5 };
/** SPLIT: the ghost fades in over 0.2 s and out over 0.35 s after release, with a lighter dash (8..14 real m/s on top). */
const SPLIT = { gain: (k: number) => 7 + 7 * k, max: 48, accel: 40, fadeIn: 0.2, fadeOut: 0.35, settle: 4 };
/**
 * SEND IT: a 0.14 s crouch, then a jump 2.3..3.2 m high with at least 10..16 real m/s forward;
 * held in the air, lift carries 45% of its weight (a hang, up to ~5.8 m), released it just falls.
 */
const SENDIT = { crouch: 0.14, height: (k: number) => 2.2 + 1.0 * k, fwd: (k: number) => 10 + 6 * k, lift: 0.45, land: 0.9, max: 6 };
/** SKYLINE: climbs 0.8 s to 3.7..6 m (the mock's 5.5..9 m at the game's 2/3 vehicle scale), hovers while held, then a 1.1 s descent. */
const SKYLINE = { up: 0.8, down: 1.1, height: (k: number) => (5.5 + 3.5 * k) * (8 / 12) };

/** A puff of dust under wheel i of the vehicle. */
function dustAt(wheels: { x: number; z: number }[], i: number, amount: number, spread: number) {
  const w = wheels[i];
  const f = carState.forward;
  const side = tmp.crossVectors(f, up).normalize();
  wheelAt.copy(carState.pos).addScaledVector(f, w.x).addScaledVector(side, w.z);
  const y = surfaceY(wheelAt.x, wheelAt.z);
  if (carState.pos.y - y > 3) return;
  kickDust(wheelAt.x, y + 0.1, wheelAt.z, amount, side.x * spread * Math.sign(w.z || 1) - f.x * spread * 0.4, side.z * spread * Math.sign(w.z || 1) - f.z * spread * 0.4);
}

/* ------------------------------------------------------------------ the hook */

type Run = {
  code: string;
  k: number;
  /** seconds since it started */
  e: number;
  /** still held (and charged); seconds since it was let go, while it winds down */
  on: boolean;
  off: number;
  /** 0..1: OVERTAKE and SPLIT's surge, SPLIT's ghost */
  env: number;
  ghost: number;
  /** SEND IT: launched, landed (seconds since landing, or -1) */
  launched: boolean;
  landed: number;
  /** SKYLINE: the ground it hovers over, smoothed; the height it was let go at */
  ground: number;
  hOff: number;
  /** how high its centre rides over the ground at rest (where it took off) */
  ride: number;
  dust: boolean;
  /** real ground speed when it started (m/s) */
  v0: number;
};

const up = new THREE.Vector3(0, 1, 0);
const q = new THREE.Quaternion();
const fwd = new THREE.Vector3();
const bodyUp = new THREE.Vector3();
const err = new THREE.Vector3();
const tmp = new THREE.Vector3();
const wheelAt = new THREE.Vector3();
let trackLen = 0;

/**
 * Runs the vehicle's power: reads input.power, fires through the shared meter, moves the body in
 * the physics step (after the vehicle controller), and drives the looks (ghost, squash) per frame.
 * `box` is the vehicle's bumper (half extents and centre in the chassis frame), for SPLIT's exit check.
 */
export function usePowers({
  code,
  body,
  model,
  lean,
  box,
  wheels,
  grounded,
}: {
  code: string;
  body: RefObject<RapierRigidBody | null>;
  model: RefObject<THREE.Object3D | null>;
  lean: RefObject<THREE.Object3D | null>;
  box: { half: readonly [number, number, number]; x: number; y: number };
  wheels: { x: number; z: number }[];
  /** a wheel touches the ground, this physics step */
  grounded: () => boolean;
}) {
  const { world, rapier } = useRapier();
  const run = useRef<Run | null>(null);
  const held = useRef(false); // Shift was down last step (a press is the step it goes down)
  // SPLIT: the props it passes through, with the groups they had
  const ghosted = useRef(new Map<number, number>());
  const leftover = useRef(0); // seconds props have stayed ghost since SPLIT ended
  const probe = useRef<InstanceType<typeof rapier.Cuboid> | null>(null);
  const look = useRef<ReturnType<typeof ghostLook> | null>(null);

  // A new vehicle (or leaving the page) ends any power: props get their collisions back.
  useEffect(() => {
    const list = ghosted.current;
    return () => {
      for (const [h, g] of list) world.getCollider(h)?.setCollisionGroups(g);
      list.clear();
      power.through = false;
      look.current?.drop();
      if (run.current?.on) stopPower(power.meter, power.clock);
      run.current = null;
      power.active = null;
      power.trail = power.drs = power.thrust = power.ghost = 0;
      power.squash = 1;
    };
  }, [world]);

  /** SPLIT: every knock-about prop (a dynamic body that isn't us) stops colliding with the vehicle. */
  const ghostProps = (b: RapierRigidBody) => {
    world.forEachCollider((c) => {
      const p = c.parent();
      if (!p || p.handle === b.handle || !p.isDynamic() || ghosted.current.has(c.handle)) return;
      const g = c.collisionGroups();
      ghosted.current.set(c.handle, g);
      c.setCollisionGroups((g & ~CAR_BIT) >>> 0);
    });
    power.through = ghosted.current.size > 0;
  };
  /** Gives props back their collisions, all of them or only those no longer inside the vehicle. */
  const solidProps = (b: RapierRigidBody, all: boolean) => {
    const list = ghosted.current;
    if (!list.size) return;
    const inside = new Set<number>();
    if (!all) {
      const t = b.translation();
      const r = b.rotation();
      q.set(r.x, r.y, r.z, r.w);
      tmp.set(box.x, box.y, 0).applyQuaternion(q).add(t as THREE.Vector3);
      const shape = (probe.current ??= new rapier.Cuboid(box.half[0] + 0.2, box.half[1] + 0.2, box.half[2] + 0.2));
      world.intersectionsWithShape(tmp, r, shape, (c) => {
        inside.add(c.handle);
        return true;
      }, undefined, undefined, undefined, b);
    }
    for (const [h, g] of list) {
      if (inside.has(h)) continue;
      world.getCollider(h)?.setCollisionGroups(g);
      list.delete(h);
    }
    power.through = list.size > 0;
  };

  /** Adds forward speed (physics m/s) toward `want`, at most `accel` per physics second. */
  const surge = (b: RapierRigidBody, want: number, accel: number, dt: number) => {
    const v = b.linvel();
    const f = tmp.set(fwd.x, 0, fwd.z).normalize();
    const along = v.x * f.x + v.z * f.z;
    if (along >= want) return;
    const add = Math.min(want - along, accel * dt);
    b.setLinvel({ x: v.x + f.x * add, y: v.y, z: v.z + f.z * add }, true);
  };
  /** Steers gently onto the track's direction when it's on the road and roughly along it. */
  const assist = (b: RapierRigidBody, dt: number) => {
    const t = b.translation();
    const n = nearestT3(t.x, t.y, t.z);
    trackLen ||= trackCurve.getLength();
    const p = trackPoint(n);
    if (Math.hypot(p.x - t.x, p.z - t.z) > TRACK_WIDTH) return;
    // aim a few metres ahead, so it follows a bend instead of cutting it
    const ahead = trackTangent((n + (Math.sign(trackTangent(n).dot(fwd)) * 6) / trackLen + 1) % 1);
    if (ahead.x * fwd.x + ahead.z * fwd.z < 0) ahead.negate();
    const d = wrap(Math.atan2(-ahead.z, ahead.x) - Math.atan2(-fwd.z, fwd.x));
    if (Math.abs(d) > 0.7) return;
    const av = b.angvel();
    b.setAngvel({ x: av.x, y: av.y + (d * 3 - av.y) * Math.min(1, 6 * dt) * (input.steer ? 0.3 : 1), z: av.z }, true);
  };
  /** Holds the body level in the air (pitch `pitch`, no roll) and turns it with the steering. */
  const level = (b: RapierRigidBody, pitch: number, yawRate: number, dt: number) => {
    bodyUp.set(0, 1, 0).applyQuaternion(q);
    // the up the body should have: world up, tipped by `pitch` about the body's right axis
    const right = tmp.crossVectors(fwd, up).normalize();
    const want = err.copy(up).applyAxisAngle(right, pitch);
    const axis = bodyUp.cross(want); // rotation that takes the body's up to the wanted up
    const av = b.angvel();
    const k = Math.min(1, 8 * dt);
    b.setAngvel({ x: av.x + (axis.x * 5 - av.x) * k, y: av.y + (yawRate - av.y) * k, z: av.z + (axis.z * 5 - av.z) * k }, true);
  };

  const end = () => {
    run.current = null;
    power.active = null;
  };
  /** Shift let go (or the bar is empty): the meter stops draining and the power winds down. */
  const letGo = (R: Run) => {
    R.on = false;
    R.off = 0;
    stopPower(power.meter, power.clock);
  };

  // After the vehicle controller (Vehicle.tsx registers its step first).
  useBeforePhysicsStep(() => {
    const b = body.current;
    const dts = ticker.deltaScaled; // physics seconds this step
    const dt = dts / ticker.scale; // real seconds
    power.clock += dt;
    const P = power.meter;
    const st = getState();
    // a power winding down (SKYLINE's descent, SEND IT's landing) can't be restarted until it's done
    P.armed = st.phase === "world" && st.ready && !run.current;
    // a press is Shift going down (latched by the key handler, so a tap between two steps still counts)
    const press = input.powerPress || (input.power && !held.current);
    input.powerPress = false;
    held.current = input.power;
    if (press && st.phase === "world") {
      // SEND IT jumps off the ground only
      const k = b && !run.current && (code !== "V02" || grounded()) ? startPower(P, power.clock, code) : 0;
      if (k > 0) {
        run.current = { code, k, e: 0, on: true, off: 0, env: 0, ghost: 0, launched: false, landed: -1, ground: Math.max(SEA_Y, surfaceY(carState.pos.x, carState.pos.z)), hOff: 0, ride: 0.64, dust: false, v0: Math.max(0, carState.speed) };
        run.current.ride = THREE.MathUtils.clamp(carState.pos.y - run.current.ground, 0.4, 0.9);
        power.active = code;
        powerCue(code);
        if (code === "V04" && b) ghostProps(b);
      } else {
        power.refused++;
        powerRefused();
      }
    }
    const R = run.current;
    // let go, or the bar ran dry: the meter refills from here and the power winds down
    if (R?.on && (!input.power || chargeOf(P, power.clock) <= 0)) letGo(R);
    // SPLIT's leftovers: props still inside the vehicle get their collisions back once clear
    // (all of them after SPLIT.settle s, whatever: a prop then simply gets pushed out)
    if ((!R || R.code !== "V04" || R.ghost === 0) && ghosted.current.size && b) {
      leftover.current += dt;
      solidProps(b, leftover.current > SPLIT.settle);
    } else leftover.current = 0;
    if (!R || !b) {
      power.trail += (0 - power.trail) * Math.min(1, dt * 4);
      power.drs += (0 - power.drs) * Math.min(1, dt * 6);
      power.thrust = 0;
      power.ghost = 0;
      return;
    }
    R.e += dt;
    if (!R.on) R.off += dt;
    const e = R.e;
    // Dev and headless checks: window.__powerLog = [] records every step of a power
    // [seconds in, held, height above the ground, vertical speed, real ground speed, squash, meter].
    const log = process.env.NODE_ENV !== "production" ? (window as unknown as { __powerLog?: number[][] }).__powerLog : undefined;
    if (log && log.length < 5000) {
      const t = b.translation();
      const v = b.linvel();
      log.push([+e.toFixed(3), R.on ? 1 : 0, +(t.y - surfaceY(t.x, t.z)).toFixed(2), +v.y.toFixed(2), +(Math.hypot(v.x, v.z) * ticker.scale).toFixed(1), +power.squash.toFixed(2), +chargeOf(P, power.clock).toFixed(2)]);
    }
    const r = b.rotation();
    q.set(r.x, r.y, r.z, r.w);
    fwd.set(1, 0, 0).applyQuaternion(q);
    const braking = input.handbrake || input.back > 0;
    const real = (v: number) => v / ticker.scale; // real m/s to physics m/s

    if (R.code === "V01" || R.code === "V04") {
      const N = R.code === "V01" ? OVERTAKE : SPLIT;
      R.env += ((R.on ? 1 : 0) - R.env) * Math.min(1, dt * (R.on ? OVERTAKE.rateIn : OVERTAKE.rateOut));
      if (R.code === "V01") power.drs = power.trail = R.env;
      else {
        R.ghost = R.on ? Math.min(1, R.ghost + dt / SPLIT.fadeIn) : Math.max(0, R.ghost - dt / SPLIT.fadeOut);
        // props that turn up during the ghost (dropped by the engineer) pass through too
        if (R.on && Math.floor(e * 4) !== Math.floor((e - dt) * 4)) ghostProps(b);
        power.ghost = R.ghost;
        power.trail = R.env;
      }
      if (!braking && grounded()) {
        surge(b, real(Math.min(N.max, Math.max(R.v0, R.code === "V01" ? 8 : 6) + N.gain(R.k) * R.env)), real(N.accel) / ticker.scale, dts);
        if (R.on) assist(b, dts);
      }
      // done once the surge (and SPLIT's ghost) has faded; props still inside it stay ghost until clear
      if (!R.on && R.env < 0.03 && R.ghost === 0) {
        if (R.code === "V04") solidProps(b, false);
        end();
      }
    } else if (R.code === "V02") {
      if (!R.launched) {
        power.squash = 1 - 0.12 * smooth(0, SENDIT.crouch, e);
        if (e >= SENDIT.crouch) {
          R.launched = true;
          const v = b.linvel();
          const f = tmp.set(fwd.x, 0, fwd.z).normalize();
          const along = Math.max(v.x * f.x + v.z * f.z, real(SENDIT.fwd(R.k)));
          const side = { x: v.x - f.x * (v.x * f.x + v.z * f.z), z: v.z - f.z * (v.x * f.x + v.z * f.z) };
          // physics gravity is 9.81 per physics second squared
          b.setLinvel({ x: f.x * along + side.x * 0.5, y: Math.sqrt(2 * 9.81 * SENDIT.height(R.k)), z: f.z * along + side.z * 0.5 }, true);
          const av = b.angvel();
          b.setAngvel({ x: 0, y: av.y, z: 0 }, true);
          for (let i = 0; i < wheels.length; i++) dustAt(wheels, i, 3, 1.2);
        }
      } else if (R.landed < 0) {
        const air = e - SENDIT.crouch;
        const v = b.linvel();
        // held: lift carries part of its weight; let go, it simply falls
        if (R.on) b.setLinvel({ x: v.x, y: v.y + SENDIT.lift * 9.81 * dts, z: v.z }, true);
        power.squash += (1.06 - power.squash) * Math.min(1, dt * 12); // stretched in the air
        // nose up while it climbs, a touch nose down as it falls, to land on all fours
        level(b, THREE.MathUtils.clamp(v.y / 8, -0.4, 1) * 0.16, -input.steer * 1.2, dts);
        if (air > 0.15 && grounded()) {
          R.landed = 0;
          if (R.on) letGo(R);
          // soak the landing: the springs alone bounced it twice
          if (v.y < 0) b.setLinvel({ x: v.x * 0.92, y: v.y * 0.25, z: v.z * 0.92 }, true);
          const av = b.angvel();
          b.setAngvel({ x: av.x * 0.2, y: av.y, z: av.z * 0.2 }, true);
          for (let i = 0; i < wheels.length; i++) dustAt(wheels, i, 10, 3.5);
          bump(2.5);
        } else if (air > SENDIT.max) {
          R.landed = 0;
          if (R.on) letGo(R);
        }
      } else {
        R.landed += dt;
        const x = R.landed;
        power.squash = 1 - 0.32 * Math.sin(13 * x) * Math.exp(-4.5 * x);
        if (x >= SENDIT.land) {
          power.squash = 1;
          end();
        }
      }
    } else if (R.code === "V03") {
      const H = SKYLINE.height(R.k);
      const bob = (x: number) => 0.18 * Math.sin((x * Math.PI * 2) / 1.5);
      // held: climb, then hover; let go: a controlled descent from wherever it is, shorter from lower
      const climb = (x: number) => (x < SKYLINE.up ? H * inOut3(x / SKYLINE.up) : H + bob(x - SKYLINE.up));
      const down = SKYLINE.down * Math.sqrt(Math.max(0.15, R.hOff / H));
      const h = R.on ? climb(e) : R.hOff * (1 - inOut3(clamp01(R.off / down)));
      if (R.on) R.hOff = h;
      power.thrust = R.on ? (e < SKYLINE.up ? smooth(0, 0.12, e) : 0.62) : 0.8 * (1 - smooth(0.8, 1, R.off / down));
      const t = b.translation();
      // the ground it flies over, smoothed so a kerb or a bank doesn't jolt it (never below the sea)
      const g = Math.max(SEA_Y, surfaceY(t.x, t.z));
      R.ground += (g - R.ground) * Math.min(1, dt * (!R.on && R.off > down - 0.5 ? 10 : 3));
      const ride = carState.pos.y - surfaceY(carState.pos.x, carState.pos.z);
      const want = Math.max(R.ground, g) + R.ride + h;
      const v = b.linvel();
      // track the height with a stiff spring; steer and throttle in the air (no tyres up there)
      const vy = (want - t.y) * 6;
      const f = tmp.set(fwd.x, 0, fwd.z).normalize();
      let along = v.x * f.x + v.z * f.z;
      along += (input.forward - input.back) * real(14) * dts - along * 0.25 * dts;
      along = THREE.MathUtils.clamp(along, -real(10), real(Math.max(R.v0, 22))); // no faster than it took off: it lands at a speed the tyres can take
      const sx = v.x - f.x * (v.x * f.x + v.z * f.z);
      const sz = v.z - f.z * (v.x * f.x + v.z * f.z);
      const grip = 1 - Math.min(1, 3 * dts);
      if (h > 0.15 || ride > R.ride + 0.25) {
        b.setLinvel({ x: f.x * along + sx * grip, y: vy, z: f.z * along + sz * grip }, true);
        level(b, 0, -input.steer * 1.1, dts);
      } else b.setLinvel({ x: v.x, y: Math.min(v.y, vy), z: v.z }, true);
      if (!R.dust) {
        R.dust = true;
        for (let i = 0; i < wheels.length; i++) dustAt(wheels, i, 4, 1.5);
      }
      if (!R.on && R.off >= down) {
        // touch down at rest: no drop onto the springs
        const lv = b.linvel();
        b.setLinvel({ x: lv.x, y: Math.max(-0.3, Math.min(0.3, lv.y)), z: lv.z }, true);
        for (let i = 0; i < wheels.length; i++) dustAt(wheels, i, 3, 1.2);
        end();
      }
    }
  });

  // Looks: SPLIT's ghost on the model, SEND IT's squash on the whole vehicle (about the ground line).
  useFrame(() => {
    // made when the ghost starts and dropped when it's over, so a livery change never sees stale copies
    const m = model.current;
    if (m && power.ghost > 0) (look.current ??= ghostLook("#ff4f00")).set(m, power.ghost);
    else if (look.current) {
      look.current.drop();
      look.current = null;
    }
    const l = lean.current;
    if (l) {
      const s = power.squash;
      const wide = 1 / Math.sqrt(s);
      l.scale.set(wide, s, wide);
    }
  });
}
