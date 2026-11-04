"use client";

// Garage experience mock: the pieces only the docs page needs. The bay's contents, the vehicle,
// the clocks and the camera move are the game's own (components/world/garage).
// Bay frame: x across the door, y up, +z out of the door; floor y = 0, door at z = +3.5.
import * as THREE from "three";
import { PitBuilding, type Bay, type PitOpts } from "@/components/world/buildings/PitBuilding";
import { CI } from "@/components/world/buildings/concrete";
import { GARAGES, garageLabel, zones } from "@/components/world/layout";
import { DOOR_Z } from "@/components/world/garage/anim";
import type { Domain } from "@/content/projects";

export { garageList } from "@/components/world/garage/anim";

/** The bays exactly as the game builds them (Places.tsx): one per domain, coded like its zone. */
export const BAYS: Bay[] = GARAGES.map((g) => ({
  x: g.x,
  code: zoneCode(g.domain),
  name: garageLabel[g.domain].toUpperCase(),
}));
const PIT_OPTS: PitOpts = { apron: 4.8 };
export function zoneCode(domain: Domain) {
  return `Z${String(zones.findIndex((z) => z.id === `garage-${domain}`) + 1).padStart(2, "0")}`;
}
export const DOMAIN_ORDER: Domain[] = GARAGES.map((g) => g.domain);

/** The pit building with `domain`'s bay at the origin, the pit lane in front, the light. */
export function BayScene({ domain, lamp = 14 }: { domain: Domain; lamp?: number }) {
  const g = GARAGES.find((q) => q.domain === domain)!;
  return (
    <>
      <color attach="background" args={["#ebe9e3"]} />
      <fog attach="fog" args={["#ebe9e3", 26, 70]} />
      <hemisphereLight args={["#ffffff", "#b8b4a9", 0.9]} />
      <directionalLight
        position={[9, 16, 14]}
        intensity={2.2}
        color="#fff6ea"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-far={60}
      />
      {/* the bay's own light, as the game puts one in the bay nearest the car */}
      <pointLight color={CI.lamp} intensity={lamp} distance={9} decay={1.6} position={[0, 3.0, 0.2]} />
      <group position={[-g.x, 0, 0]}>
        <PitBuilding bays={BAYS} opts={PIT_OPTS} night={false} />
      </group>
      {/* pit lane asphalt with its paper edge lines, then concrete */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, DOOR_Z + 4.8 + 3]} receiveShadow>
        <planeGeometry args={[120, 6]} />
        <meshStandardMaterial color="#2b2c2f" roughness={0.95} />
      </mesh>
      {[-2.8, 2.8].map((o) => (
        <mesh key={o} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, DOOR_Z + 4.8 + 3 + o]}>
          <planeGeometry args={[120, 0.18]} />
          <meshStandardMaterial color={CI.paper} roughness={0.8} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#d3d0c7" roughness={1} />
      </mesh>
    </>
  );
}

/** A camera pose eased between two, written into the default camera each frame. */
export function setCam(c: THREE.PerspectiveCamera, pos: THREE.Vector3, look: THREE.Vector3, fov: number) {
  c.position.copy(pos);
  c.lookAt(look);
  if (Math.abs(c.fov - fov) > 1e-3) {
    c.fov = fov;
    c.updateProjectionMatrix();
  }
}

/** The establishing shot outside the bay, where every option starts and backs out to. */
export const OUTSIDE = { pos: new THREE.Vector3(2.6, 3.2, 18), look: new THREE.Vector3(0, 1.2, 4), fov: 36 };
