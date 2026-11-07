"use client";

// Henil as the driver: the approved Meshy figure (public/models/driver-*.glb, concept
// public/models/concepts/driver.png), rigged, in his own texture. Origin at the feet, faces +Z,
// 1.75 m tall at scale 1 (the world places it at WORLD_SCALE, ../scale.ts). It idles; `wave`
// blends the wave clip in and back out again.
//
// driver-idle.glb carries the mesh, the skin and the idle clip; driver-wave.glb is the same rig
// and only its clip is used. Both load once (preloaded below); each Avatar is a skeleton clone,
// so the geometry, the texture and the material are shared and only the bones are its own.

import { Suspense, useEffect, useMemo, useRef } from "react";
import type { ThreeElements } from "@react-three/fiber";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

type GroupProps = ThreeElements["group"];

const IDLE = "/models/driver-idle.glb";
const WAVE = "/models/driver-wave.glb";
if (typeof window !== "undefined") {
  useGLTF.preload(IDLE);
  useGLTF.preload(WAVE);
}

/** A real person (m). */
const HEIGHT = 1.75;
/** Seconds for the wave to blend in or back out. */
const BLEND = 0.35;

export type AvatarProps = GroupProps & {
  /** Wave (true) or idle; a function is read every frame, so a caller can switch it without a render. */
  wave?: boolean | (() => boolean);
};

/** The model's scale and foot height, measured once per loaded scene in its rest pose. */
const fits = new WeakMap<THREE.Object3D, { s: number; y: number }>();
function fit(scene: THREE.Object3D) {
  let f = fits.get(scene);
  if (!f) {
    scene.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(scene, true);
    const s = HEIGHT / (bb.max.y - bb.min.y);
    f = { s, y: -bb.min.y * s };
    fits.set(scene, f);
  }
  return f;
}

function Driver({ wave = false, ...props }: AvatarProps) {
  const idle = useGLTF(IDLE);
  const waveClip = useGLTF(WAVE).animations[0];
  const { body, mixer, actions, size } = useMemo(() => {
    const body = cloneSkinned(idle.scene);
    body.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        // the skinned bounds would follow the rest pose; never cull the figure by them
        o.frustumCulled = false;
      }
    });
    const mixer = new THREE.AnimationMixer(body);
    const actions = { idle: mixer.clipAction(idle.animations[0]), wave: mixer.clipAction(waveClip) };
    return { body, mixer, actions, size: fit(idle.scene) };
  }, [idle, waveClip]);

  useEffect(() => {
    actions.idle.play();
    actions.wave.play().setEffectiveWeight(0);
    return () => void mixer.stopAllAction();
  }, [actions, mixer]);

  const mix = useRef(0);
  useFrame((_, dt) => {
    const on = typeof wave === "function" ? wave() : wave;
    // start the wave from its first frame each time it comes in
    if (on && mix.current < 0.02) actions.wave.reset();
    mix.current = THREE.MathUtils.clamp(mix.current + (on ? dt : -dt) / BLEND, 0, 1);
    const w = THREE.MathUtils.smoothstep(mix.current, 0, 1);
    actions.idle.setEffectiveWeight(1 - w);
    actions.wave.setEffectiveWeight(w);
    mixer.update(Math.min(dt, 0.1));
  });

  return (
    <group {...props}>
      <primitive object={body} scale={size.s} position-y={size.y} />
    </group>
  );
}

export function Avatar(props: AvatarProps) {
  return (
    <Suspense fallback={null}>
      <Driver {...props} />
    </Suspense>
  );
}
