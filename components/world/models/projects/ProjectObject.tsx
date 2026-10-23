// Picks the showcase object for a project slug (see content/projects.ts).
"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { C } from "../../palette";
import { Label } from "../props/Label";
import { M, setGlow, useGlowMat, useLive, type ObjProps } from "./common";
import { AppSage, ElderKnowledge, ResumeParser, SqlChat, Verta } from "./Agents";
import { HeliosTimeout, MaternityEcommerce, PcmBattery, RagDocQa, SimDriving, TableTennis, YoutubeBlog } from "./Extras";
import { Freemoji, GptFromScratch, IplFantasy } from "./GenAI";
import { RtlCoverageAgents, VerilogCoder } from "./Hardware";
import { ApiAnomaly, Frisbee, Runway } from "./ML";
import { GestureControl, Kidney, PiCar, SelfDriving } from "./Vision";

/** Fallback: a glossy red cube balanced on its corner, slowly turning, with a glowing core seam. */
export function ProjectFallback({ active, ...props }: ObjProps) {
  const live = useLive(active);
  const spin = useRef<THREE.Group>(null);
  const seam = useGlowMat(C.white, 1.0);
  useFrame(() => {
    const { a, t } = live.current;
    if (spin.current) {
      spin.current.rotation.y = t * 0.5;
      spin.current.position.y = 0.42 + Math.sin(t * 1.6) * 0.025;
    }
    setGlow(seam, 0.9 + a * 1.4);
  });
  return (
    <group {...props}>
      <mesh position={[0, 0.02, 0]} material={M.ink()} receiveShadow castShadow>
        <cylinderGeometry args={[0.2, 0.24, 0.04, 40]} />
      </mesh>
      <group ref={spin}>
        <group rotation={[Math.atan(Math.SQRT1_2), 0, Math.PI / 4]}>
          <RoundedBox args={[0.36, 0.36, 0.36]} radius={0.05} smoothness={4} material={M.red()} castShadow />
          <mesh scale={[0.37, 0.02, 0.37]} material={seam}>
            <boxGeometry />
          </mesh>
        </group>
      </group>
      <Label position={[0, 0.02, 0.245]} fontSize={0.035} color={C.white}>
        HG
      </Label>
    </group>
  );
}

/** The showcase object for a project, origin at its base centre, faces +Z. */
export function ProjectObject({ slug, ...props }: ObjProps & { slug: string }) {
  switch (slug) {
    case "rtl-coverage-agents":
      return <RtlCoverageAgents {...props} />;
    case "verilog-coder":
      return <VerilogCoder {...props} />;
    case "appsage":
      return <AppSage {...props} />;
    case "freemoji":
      return <Freemoji {...props} />;
    case "verta":
      return <Verta {...props} />;
    case "self-driving":
      return <SelfDriving {...props} />;
    case "ipl-fantasy":
      return <IplFantasy {...props} />;
    case "kidney":
      return <Kidney {...props} />;
    case "frisbee":
      return <Frisbee {...props} />;
    case "runway":
      return <Runway {...props} />;
    case "sql-chat":
      return <SqlChat {...props} />;
    case "elder-knowledge":
      return <ElderKnowledge {...props} />;
    case "gpt-from-scratch":
      return <GptFromScratch {...props} />;
    case "api-anomaly":
      return <ApiAnomaly {...props} />;
    case "resume-parser":
      return <ResumeParser {...props} />;
    case "pi-car":
      return <PiCar {...props} />;
    case "gesture-control":
      return <GestureControl {...props} />;
    case "youtube-blog":
      return <YoutubeBlog {...props} />;
    case "rag-doc-qa":
      return <RagDocQa {...props} />;
    case "table-tennis":
      return <TableTennis {...props} />;
    case "helios-timeout":
      return <HeliosTimeout {...props} />;
    case "sim-driving":
      return <SimDriving {...props} />;
    case "pcm-battery":
      return <PcmBattery {...props} />;
    case "maternity-ecommerce":
      return <MaternityEcommerce {...props} />;
    default:
      return <ProjectFallback {...props} />;
  }
}
