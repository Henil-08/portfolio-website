"use client";

import { useFrame } from "@react-three/fiber";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { heightAt } from "../terrain";
import { C } from "../palette";
import { dayNight } from "../daynight";
import { geo, mat, unitBox } from "../models/props/shared";
import { compose } from "./common";
import { Instances } from "./Instances";
import { LAMP_ARM, LAMPS } from "./layoutStreet";

const POLE_H = 7.4;
const HEAD_Y = POLE_H - 0.35;

const poleGeo = () =>
  geo("street-lamp-pole", () => {
    const g = new THREE.CylinderGeometry(0.055, 0.09, POLE_H, 14);
    g.translate(0, POLE_H / 2, 0);
    return g;
  });

/** Warm lens: dim by day, bright at night. Owned by the street so it's safe to animate. */
export const lensMat = new THREE.MeshStandardMaterial({
  color: "#fff4e2",
  emissive: new THREE.Color("#ffc985"),
  emissiveIntensity: 0.1,
  roughness: 0.3,
  toneMapped: false,
});

export const poolUniforms = {
  uNight: { value: 0 },
  uColor: { value: new THREE.Color("#ffc47e") },
};
const poolMat = new THREE.ShaderMaterial({
  uniforms: poolUniforms,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform float uNight; uniform vec3 uColor; varying vec2 vUv;
    void main() {
      vec2 p = vUv * 2.0 - 1.0;
      float d = length(p);
      float a = pow(clamp(1.0 - d, 0.0, 1.0), 1.6);
      gl_FragColor = vec4(uColor * a * uNight * 0.85, 1.0);
    }`,
});
const poolGeo = () =>
  geo("street-pool", () => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.rotateX(-Math.PI / 2);
    return g;
  });

const lensGeo = () => geo("street-lens", () => new THREE.BoxGeometry(0.9, 0.04, 0.3));

const B = (() => {
  const base = { m: [] as THREE.Matrix4[] };
  const pole = { m: [] as THREE.Matrix4[] };
  const arm = { m: [] as THREE.Matrix4[] };
  const head = { m: [] as THREE.Matrix4[] };
  const lens = { m: [] as THREE.Matrix4[] };
  const pool = { m: [] as THREE.Matrix4[] };
  const local = new THREE.Matrix4();
  for (const l of LAMPS) {
    const root = compose(l.x, heightAt(l.x, l.z), l.z, l.yaw);
    const put = (list: THREE.Matrix4[], x: number, y: number, z: number, sx: number, sy: number, sz: number, rz = 0) => {
      local.copy(compose(x, y, z, 0, sx, sy, sz, 0, rz));
      list.push(root.clone().multiply(local));
    };
    put(base.m, 0, 0.25, 0, 0.42, 0.5, 0.42);
    put(base.m, 0, 0.53, 0, 0.26, 0.06, 0.26);
    pole.m.push(root.clone());
    // slender arm, slightly raised toward the road
    put(arm.m, LAMP_ARM / 2 - 0.05, HEAD_Y + 0.12, 0, LAMP_ARM + 0.1, 0.07, 0.07, 0.04);
    put(arm.m, 0, POLE_H - 0.02, 0, 0.16, 0.08, 0.16);
    put(head.m, LAMP_ARM, HEAD_Y + 0.06, 0, 1.05, 0.12, 0.4);
    put(lens.m, LAMP_ARM, HEAD_Y - 0.01, 0, 1, 1, 1);
    pool.m.push(compose(l.px, heightAt(l.px, l.pz) + 0.07, l.pz, l.yaw, 11, 1, 9.5));
  }
  return { base, pole, arm, head, lens, pool };
})();

export function Lamps() {
  useFrame(() => {
    const n = dayNight.night;
    lensMat.emissiveIntensity = 0.08 + n * 4.2;
    poolUniforms.uNight.value = n;
  });
  return (
    <>
      <Instances geometry={unitBox()} material={mat(C.charcoal, { r: 0.45, m: 0.2 })} batch={B.base} />
      <Instances geometry={poleGeo()} material={mat(C.white, { r: 0.32 })} batch={B.pole} />
      <Instances geometry={unitBox()} material={mat(C.ink, { r: 0.4, m: 0.25 })} batch={B.arm} />
      <Instances geometry={unitBox()} material={mat(C.white, { r: 0.3 })} batch={B.head} />
      <Instances geometry={lensGeo()} material={lensMat} batch={B.lens} shadow={false} />
      <Instances geometry={poolGeo()} material={poolMat} batch={B.pool} shadow={false} receive={false} order={2} />
      <RigidBody type="fixed" colliders={false}>
        {LAMPS.map((l, i) => (
          <CylinderCollider key={i} args={[1.5, 0.25]} position={[l.x, heightAt(l.x, l.z) + 1.5, l.z]} />
        ))}
      </RigidBody>
    </>
  );
}
