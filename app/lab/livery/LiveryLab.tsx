"use client";

// Every livery side by side, same studio, same 3/4 angle, to choose from.
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { CarPreview, GROUND_Y, LIVERIES, type LiveryName } from "@/components/world/models/Car";
import { Driver, DRIVER_SEAT } from "@/components/world/models/Avatar";

const NAMES = Object.keys(LIVERIES) as LiveryName[];
const PI_2 = Math.PI / 2;

function Car({ name }: { name: LiveryName }) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[radial-gradient(120%_90%_at_50%_30%,#f3efe7_0%,#e4ddd0_100%)]">
      <Canvas shadows camera={{ position: [3.5, 1.8, 3.4], fov: 30 }} dpr={[1, 2]} onCreated={({ camera }) => camera.lookAt(0, 0.35, 0)}>
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={3} position={[0, 6, 0]} rotation={[PI_2, 0, 0]} scale={[8, 5, 1]} />
          <Lightformer form="rect" intensity={2} position={[0, 2.5, 6]} scale={[12, 1.2, 1]} />
          <Lightformer form="rect" intensity={1.4} position={[-7, 2, 0]} rotation={[0, PI_2, 0]} scale={[8, 2, 1]} />
        </Environment>
        <directionalLight position={[3.5, 7, 4.5]} intensity={2} castShadow shadow-mapSize={[1024, 1024]} />
        <group position={[0, -GROUND_Y, 0]}>
          <CarPreview livery={name} steer={-0.35}>
            <Driver position={DRIVER_SEAT} />
          </CarPreview>
        </group>
        <ContactShadows position={[0, 0.003, 0]} opacity={0.5} scale={7} blur={2.4} far={1.6} />
      </Canvas>
      <p className="absolute left-3 top-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-black/60">
        {NAMES.indexOf(name) + 1} · {LIVERIES[name].label}
      </p>
    </div>
  );
}

export default function LiveryLab() {
  return (
    <main className="min-h-screen bg-[#f7f4ee] p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {NAMES.map((n) => (
          <Car key={n} name={n} />
        ))}
      </div>
    </main>
  );
}
