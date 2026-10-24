// Adapted from folio-2025 (MIT, see public/vendor/LICENSE.md), sources/Game/World/Grass.js
// (wind from sources/Game/Wind.js, wheel tracks from sources/Game/Tracks.js + Terrain.js)
"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { carState } from "./carState";
import { CANALS, GARAGES, LAKES, MAX_R, PIT, coastR, TIMELINE, PIT_LANE_WIDTH, SCENE_FOOT, SECTORS, TRACK_WIDTH, pitRoadCurves, trackCurve, zones } from "./layout";
import { C } from "./palette";
import { getWindUniforms, terrainShader, updateWind, TERRAIN_GLSL, WIND_GLSL } from "./alive/wind";
import { perlinTexture, seeded } from "./alive/noise";
import { tracks, tracksTarget } from "./alive/Tracks";
import { paintGarden } from "./garden/layout";
import { paintWaterfront } from "./waterfront/layout";
import { TYRE_WALLS } from "./street/layoutStreet";
import { paintPark } from "./park/layout";
import { paintParkSlabs } from "./districts/park";

// The original grass: one triangle per blade (tip + two base corners), laid out on a
// jittered grid that loops around the car so the field never runs out. Every
// blade turns to face the camera, its height follows a perlin patchwork, the
// shared wind bends its tip, wheel tracks flatten it, and the car pushes it
// aside as it drives through. Lit like the ground under it (normal points up),
// so the field melts into the island at the root and lightens toward the tips.
// A mask painted from the track and building footprints keeps blades off the
// asphalt and out of buildings.
//
// Changes for WebGL + this island: a regular (non-node) MeshStandardMaterial
// patched in onBeforeCompile, a 56 m field around the car (the original sizes it to the
// view), and our palette instead of the original's yellow-green.

const COARSE = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
const SUBDIVISIONS = COARSE ? 148 : 280; // 22k blades on phones, 78k on desktop (the original's count)
const SIZE = 56; // field width in metres
const MASK_RES = 1024;
const WORLD = (MAX_R + 6) * 2;

// The original scales blades up when the field covers more than its ideal surface.
const SURFACE_IDEAL = 2000;
const OVERFLOW = Math.max(0, SIZE * SIZE - SURFACE_IDEAL) / SURFACE_IDEAL;
const BLADE_WIDTH = 0.1 * (1 + OVERFLOW * 0.5);
const BLADE_HEIGHT = 0.6 * (1 + OVERFLOW * 0.5);
const BLADE_HEIGHT_RANDOMNESS = 0.6;

function makeMask() {
  const c = document.createElement("canvas");
  c.width = c.height = MASK_RES;
  const g = c.getContext("2d")!;
  const s = MASK_RES / WORLD;
  const tx = (x: number) => (x + WORLD / 2) * s;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, MASK_RES, MASK_RES);
  // Outside the island: no grass.
  g.globalCompositeOperation = "destination-in";
  // the land, a few metres in from the shore (beaches stay bare)
  g.beginPath();
  for (let k = 0; k <= 360; k++) {
    const a = (k / 360) * Math.PI * 2;
    const r = coastR(a) - 4;
    if (k) g.lineTo(tx(Math.cos(a) * r), tx(Math.sin(a) * r));
    else g.moveTo(tx(Math.cos(a) * r), tx(Math.sin(a) * r));
  }
  g.fill();
  g.globalCompositeOperation = "source-over";
  // The park: sand between its islands (first, so later features cut into the islands).
  paintPark(g, tx);
  g.fillStyle = g.strokeStyle = "#000";
  // The harbour arm and its banks.
  g.lineCap = g.lineJoin = "round";
  for (const cn of CANALS)
    for (let i = 0; i < cn.pts.length - 1; i++) {
      g.lineWidth = (Math.max(cn.w[i], cn.w[i + 1]) + 4) * s;
      g.beginPath();
      g.moveTo(tx(cn.pts[i][0]), tx(cn.pts[i][1]));
      g.lineTo(tx(cn.pts[i + 1][0]), tx(cn.pts[i + 1][1]));
      g.stroke();
    }
  // Lakes and their sandy shores.
  for (const l of LAKES) {
    g.beginPath();
    g.ellipse(tx(l.x), tx(l.z), (l.rx + 2.5) * s, (l.rz + 2.5) * s, -l.yaw, 0, Math.PI * 2);
    g.fill();
  }
  // Track plus kerbs and run-off.
  g.lineWidth = (TRACK_WIDTH + 3.5) * s;
  g.lineJoin = g.lineCap = "round";
  g.beginPath();
  trackCurve.getSpacedPoints(300).forEach((p, i) => (i ? g.lineTo(tx(p.x), tx(p.z)) : g.moveTo(tx(p.x), tx(p.z))));
  g.closePath();
  g.stroke();
  // Pit lane and garages.
  g.fillRect(tx(PIT.from - 6), tx(PIT.z - 4), (PIT.to - PIT.from + 12) * s, 9 * s);
  for (const gr of GARAGES) g.fillRect(tx(gr.x - 5), tx(PIT.garageZ - 5), 10 * s, 9 * s);
  // Plaza and the places.
  // (the timeline's planters stand just outside the pad's long sides)
  g.fillRect(tx(TIMELINE.pos[0] - TIMELINE.hx), tx(TIMELINE.pos[1] - TIMELINE.hz - 1.6), TIMELINE.hx * 2 * s, (TIMELINE.hz + 1.6) * 2 * s);
  for (const z of zones) g.fillRect(tx(z.pos[0] - z.size[0] / 2), tx(z.pos[1] - z.size[1] / 2), z.size[0] * s, z.size[1] * s);
  for (const sc of SECTORS) {
    g.save();
    g.translate(tx(sc.scene[0]), tx(sc.scene[1]));
    g.rotate(-sc.sceneRot);
    g.fillRect(-(SCENE_FOOT.hx + 1) * s, -(SCENE_FOOT.back + 1) * s, (SCENE_FOOT.hx + 1) * 2 * s, (SCENE_FOOT.back + SCENE_FOOT.front + 3) * s);
    g.restore();
  }
  // Garden paths, beds and the pond.
  paintGarden(g, tx, s);
  paintParkSlabs(g, tx, s);
  paintWaterfront(g, tx, s);
  // Tyre walls at the corners.
  for (const w of TYRE_WALLS) {
    g.beginPath();
    g.arc(tx(w.x), tx(w.z), (w.end ? 0.95 : 0.7) * s, 0, Math.PI * 2);
    g.fill();
  }
  // Pit entry and exit lanes.
  g.lineWidth = (PIT_LANE_WIDTH + 1.5) * s;
  for (const c of pitRoadCurves()) {
    g.beginPath();
    c.getPoints(30).forEach((p, i) => (i ? g.lineTo(tx(p.x), tx(p.z)) : g.moveTo(tx(p.x), tx(p.z))));
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.flipY = false;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  return tex;
}

/** A plain white texture: grass everywhere (the lab, or no `mask`). */
function fullMask() {
  const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  t.needsUpdate = true;
  return t;
}

function makeBlades() {
  // The original layout: one blade per cell of a grid, jittered inside its cell; the
  // three vertices of a blade share its centre and the shader builds the shape.
  const r = seeded(280);
  const count = SUBDIVISIONS * SUBDIVISIONS;
  const fragment = SIZE / SUBDIVISIONS;
  const position = new Float32Array(count * 3 * 3);
  const random = new Float32Array(count * 3);
  for (let iX = 0; iX < SUBDIVISIONS; iX++) {
    const fx = (iX / SUBDIVISIONS - 0.5) * SIZE + fragment * 0.5;
    for (let iZ = 0; iZ < SUBDIVISIONS; iZ++) {
      const fz = (iZ / SUBDIVISIONS - 0.5) * SIZE + fragment * 0.5;
      const i = iX * SUBDIVISIONS + iZ;
      const x = fx + (r() - 0.5) * fragment;
      const z = fz + (r() - 0.5) * fragment;
      const h = r();
      for (let v = 0; v < 3; v++) {
        position[(i * 3 + v) * 3] = x;
        position[(i * 3 + v) * 3 + 2] = z;
        random[i * 3 + v] = h;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(position, 3));
  g.setAttribute("aRandom", new THREE.BufferAttribute(random, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), SIZE);
  return g;
}

function makeMaterial(mask: THREE.Texture) {
  const terrain = terrainShader();
  const u = {
    uCenter: { value: new THREE.Vector2() },
    uCar: { value: new THREE.Vector4(0, -100, 0, 0) }, // xyz + grounded
    uMask: { value: mask },
    uWorld: { value: WORLD },
    uSize: { value: SIZE },
    uBladeWidth: { value: BLADE_WIDTH },
    uBladeHeight: { value: BLADE_HEIGHT },
    uBladeHeightRandomness: { value: BLADE_HEIGHT_RANDOMNESS },
    uNoise: { value: perlinTexture() },
    uRoot: { value: new THREE.Color(C.grass).offsetHSL(0, 0.02, -0.07) },
    uTipA: { value: new THREE.Color(C.grass).offsetHSL(0.01, 0.1, 0.06) },
    uTipB: { value: new THREE.Color(C.grass).offsetHSL(-0.03, 0.14, 0.1) },
    ...terrain.uniforms,
  };
  const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, side: THREE.DoubleSide });
  m.defines = { ...terrain.defines };
  m.userData.u = u;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u, getWindUniforms(), tracks.uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
        attribute float aRandom;
        uniform vec2 uCenter; uniform vec4 uCar; uniform sampler2D uMask; uniform float uWorld; uniform float uSize;
        uniform float uBladeWidth; uniform float uBladeHeight; uniform float uBladeHeightRandomness;
        uniform sampler2D uNoise;
        uniform sampler2D uTracks; uniform vec2 uTracksFocus; uniform float uTracksSize;
        varying float vTip; varying float vPatch; varying float vRandom;
        ${WIND_GLSL}
        ${TERRAIN_GLSL}`
      )
      .replace(
        "#include <beginnormal_vertex>",
        /* glsl */ `
        vec3 objectNormal = vec3(0.0, 1.0, 0.0);
        // Blade position, looped around the centre
        float vertexLoopIndex = float(gl_VertexID % 3);
        float tipness = step(vertexLoopIndex, 0.5);
        vec2 loopPosition = position.xz - uCenter;
        float halfSize = uSize * 0.5;
        loopPosition = mod(loopPosition + halfSize, uSize) - halfSize;
        vec2 bladePosition = loopPosition + uCenter;

        // Terrain data: the mask is our "grass" channel; wheel tracks remove grass
        float terrainDataGrass = texture2D(uMask, bladePosition / uWorld + 0.5).r;
        vec2 tracksUv = (bladePosition - uTracksFocus) / uTracksSize + 0.5;
        if (tracksUv.x > 0.0 && tracksUv.x < 1.0 && tracksUv.y > 0.0 && tracksUv.y < 1.0)
          terrainDataGrass *= 1.0 - texture2D(uTracks, tracksUv).r;
        terrainDataGrass *= 1.0 - smoothstep(uSize * 0.36, halfSize, length(loopPosition));
        float hidden = step(terrainDataGrass - 0.4, 0.1);

        // Height
        float heightVariation = texture2D(uNoise, bladePosition * 0.0321).r + 0.5;
        float height = uBladeHeight
          * (uBladeHeightRandomness * aRandom + (1.0 - uBladeHeightRandomness))
          * heightVariation
          * terrainDataGrass;

        // Shape: tip, left, right
        vec3 shape = vec3(0.0);
        if (vertexLoopIndex < 0.5) shape.y = height;
        else shape.x = (vertexLoopIndex < 1.5 ? 1.0 : -1.0) * uBladeWidth * terrainDataGrass;

        // Face the camera
        float angleToCamera = atan(bladePosition.y - cameraPosition.z, bladePosition.x - cameraPosition.x) - PI * 0.5;
        float ca = cos(angleToCamera), sa = sin(angleToCamera);
        shape.xz = vec2(ca * shape.x - sa * shape.z, sa * shape.x + ca * shape.z);

        // Wind
        vec2 wind = windOffset(bladePosition) * tipness * height * 2.0;
        shape.xz += wind;

        // The car pushes blades aside (and down) as it drives through
        vec2 fromCar = bladePosition - uCar.xz;
        float carDistance = length(fromCar);
        float push = (1.0 - smoothstep(0.5, 1.9, carDistance)) * uCar.w * tipness;
        shape.xz += fromCar / max(carDistance, 0.001) * push * height * 1.1;
        shape.y -= push * height * 0.55;

        shape *= 1.0 - hidden;
        vec3 bladeTransformed = vec3(bladePosition.x, terrainHeight(bladePosition), bladePosition.y) + shape;

        vTip = tipness;
        vRandom = aRandom;
        vPatch = texture2D(uNoise, bladePosition * 0.06 + 0.37).r;`
      )
      .replace("#include <begin_vertex>", "vec3 transformed = bladeTransformed;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
        uniform vec3 uRoot; uniform vec3 uTipA; uniform vec3 uTipB;
        varying float vTip; varying float vPatch; varying float vRandom;`
      )
      .replace(
        "vec4 diffuseColor = vec4( diffuse, opacity );",
        /* glsl */ `vec3 tipColor = mix(uTipA, uTipB, smoothstep(0.25, 0.85, vPatch)) * (0.9 + vRandom * 0.2);
        vec4 diffuseColor = vec4(mix(uRoot, tipColor, vTip), opacity);`
      )
      // Always lit like the ground: world up in view space (no back-face flip).
      .replace("#include <normal_fragment_begin>", "#include <normal_fragment_begin>\n normal = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );");
  };
  m.customProgramCacheKey = () => "alive-grass";
  return m;
}

/**
 * Wind-blown grass around the car. `mask={false}` grows grass everywhere (labs).
 */
export default function Grass({ mask = true }: { mask?: boolean }) {
  const mesh = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>(null);

  // Built once on mount (canvas + seeded layout), disposed on unmount.
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const geometry = makeBlades();
    const tex = mask ? makeMask() : fullMask();
    const material = makeMaterial(tex);
    tracksTarget();
    m.geometry = geometry;
    m.material = material;
    m.visible = true;
    return () => {
      geometry.dispose();
      material.dispose();
      tex.dispose();
    };
  }, [mask]);

  useFrame(({ clock }, dt) => {
    updateWind(clock.elapsedTime, dt);
    const m = mesh.current;
    const u = m?.material.userData.u;
    if (!u) return;
    u.uCenter.value.set(carState.pos.x, carState.pos.z);
    u.uCar.value.set(carState.pos.x, carState.pos.y, carState.pos.z, carState.grounded ? 1 : 0);
  });

  return <mesh ref={mesh} visible={false} frustumCulled={false} receiveShadow />;
}
