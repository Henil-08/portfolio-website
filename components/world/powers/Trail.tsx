"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { power } from "./state";

const N = 36; // points per trail
const WIDTH = 0.16;

// The light trail of OVERTAKE and SPLIT: a glowing ribbon in the brand orange that follows an
// anchor (a wing tip, the bike's tail) as `power.trail` rises and fades out after.
export function PowerTrail({ anchor }: { anchor: React.RefObject<THREE.Object3D | null> }) {
  const pts = useRef(Array.from({ length: N }, () => new THREE.Vector3()));
  const primed = useRef(false);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3));
    const a = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) a[i * 2] = a[i * 2 + 1] = 1 - i / (N - 1);
    g.setAttribute("fade", new THREE.BufferAttribute(a, 1));
    const idx: number[] = [];
    for (let i = 0; i < N - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    g.setIndex(idx);
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uLife: { value: 0 }, uColor: { value: new THREE.Color("#ff4f00") } },
        vertexShader: `attribute float fade; varying float vFade; void main(){ vFade = fade; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform float uLife; uniform vec3 uColor; varying float vFade; void main(){ gl_FragColor = vec4(uColor * 1.6, vFade * vFade * uLife); }`,
      }),
    []
  );
  const mesh = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);

  useFrame(() => {
    const a = anchor.current;
    const m = mesh.current;
    if (!a || !m) return;
    const tmp = m.userData.tmp ?? (m.userData.tmp = new THREE.Vector3());
    a.getWorldPosition(tmp);
    if (!primed.current) {
      pts.current.forEach((p) => p.copy(tmp));
      primed.current = true;
    }
    m.material.uniforms.uLife.value = power.trail;
    // Shift history and add the newest point at the front.
    const P = pts.current;
    for (let i = N - 1; i > 0; i--) P[i].copy(P[i - 1]);
    P[0].copy(tmp);
    const pos = m.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) {
      const w = WIDTH * (1 - i / N);
      pos.setXYZ(i * 2, P[i].x, P[i].y + w, P[i].z);
      pos.setXYZ(i * 2 + 1, P[i].x, P[i].y - w, P[i].z);
    }
    pos.needsUpdate = true;
    m.geometry.computeBoundingSphere();
  });

  return <mesh ref={mesh} geometry={geo} material={mat} frustumCulled={false} />;
}
