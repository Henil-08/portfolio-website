"use client";

// One WebGL canvas for the whole places page. It mounts the real game world once (Island,
// Places, Street, StartGarden and the E prompts, inside a paused Rapier world, so nothing
// moves until you look) and draws it into every card's box that is on screen, each with its
// own camera and orbit controls. A drei <View> per card would build the world once per card;
// this shares one scene and only renders the boxes in the viewport.
//
// Lighting is the game's day (Effects.tsx sceneParams, Rig.tsx Sky, the same studio
// environment); the sun follows whichever box is being drawn, as the game's follows the car,
// so every place gets sharp shadows. No post-processing (AO, bloom) per box.
import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Island from "@/components/world/Island";
import Places from "@/components/world/Places";
import Street from "@/components/world/street";
import StartGarden from "@/components/world/StartGarden";
import InteractivePoints from "@/components/world/ui3d/InteractivePoints";
import { Sky } from "@/components/world/Rig";
import { EnvLight, sceneParams } from "@/components/world/Effects";
import { dayNight } from "@/components/world/daynight";
import { heightAt } from "@/components/world/terrain";
import { views } from "./views";

// the game's noon (Effects.tsx TIME_OF.day)
const NOON = 0.24;

function MultiView() {
  const light = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const tgt = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ gl, scene, size }) => {
    const l = light.current;
    const h = hemi.current;
    if (!l || !h) return;
    dayNight.t = NOON;
    const p = sceneParams();
    l.intensity = p.sun;
    l.color.copy(p.sunColor);
    h.intensity = p.hemi;
    h.color.copy(p.hemiSky);
    h.groundColor.copy(p.hemiGround);
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(p.fog);
    const a = dayNight.t * Math.PI * 2;
    const elev = Math.max(0.35, Math.abs(Math.sin(a)));

    gl.setScissorTest(false);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
    gl.setScissorTest(true);
    for (const v of views.values()) {
      const r = v.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > size.height || r.width < 4 || r.height < 4) continue;
      if (!v.camera || !v.controls) {
        const s = v.spec;
        const target = new THREE.Vector3(s.x, heightAt(s.x, s.z) + s.lift, s.z);
        const cam = new THREE.PerspectiveCamera(34, r.width / r.height, 0.5, 1200);
        cam.position.set(target.x + s.off[0], target.y + s.off[1], target.z + s.off[2]);
        const c = new OrbitControls(cam, v.el);
        c.target.copy(target);
        c.enableZoom = false;
        c.enablePan = false;
        c.enableDamping = true;
        c.dampingFactor = 0.12;
        c.maxPolarAngle = 1.45;
        c.rotateSpeed = 0.7;
        v.camera = cam;
        v.controls = c;
      }
      const cam = v.camera;
      cam.aspect = r.width / r.height;
      cam.updateProjectionMatrix();
      v.controls.update();
      const t = v.controls.target;
      l.position.set(t.x + Math.cos(a) * 40, t.y + 40 * elev + 8, t.z + 14 + Math.sin(a) * 10);
      tgt.position.copy(t);
      tgt.updateMatrixWorld();
      const y = size.height - r.bottom;
      gl.setViewport(r.left, y, r.width, r.height);
      gl.setScissor(r.left, y, r.width, r.height);
      gl.render(scene, cam);
    }
    gl.setScissorTest(false);
  }, 1);

  return (
    <>
      <primitive object={tgt} />
      <hemisphereLight ref={hemi} args={["#ffffff", "#b8b4a9", 1.0]} />
      <directionalLight
        ref={light}
        target={tgt}
        intensity={2.4}
        color="#fff6ea"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
    </>
  );
}

export default function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
      className="!pointer-events-none !fixed !inset-0 z-20"
    >
      <fog attach="fog" args={["#e9e7e1", 160, 440]} />
      {/* the game's studio environment (World.tsx), for paint and glass */}
      <Environment resolution={256} frames={1} environmentIntensity={0.3}>
        <Lightformer intensity={2.2} position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={[30, 30, 1]} color="#ffffff" />
        <Lightformer intensity={1.4} position={[-18, 4, 8]} rotation-y={Math.PI / 2} scale={[20, 6, 1]} color="#ffffff" />
        <Lightformer intensity={1.1} position={[18, 4, -8]} rotation-y={-Math.PI / 2} scale={[20, 6, 1]} color="#eef1f3" />
        <Lightformer intensity={0.8} position={[0, 3, -20]} scale={[30, 4, 1]} color="#f3f2ed" />
      </Environment>
      <Sky />
      <MultiView />
      <Suspense fallback={null}>
        <Physics gravity={[0, -9.81, 0]} paused>
          <Island />
          <Places />
          <Street />
          <StartGarden />
        </Physics>
      </Suspense>
      <InteractivePoints />
      <EnvLight />
    </Canvas>
  );
}
