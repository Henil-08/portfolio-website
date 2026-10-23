"use client";

import { useEffect, useRef } from "react";
import { useWorld } from "@/components/world/store";
import { carState } from "@/components/world/carState";
import { SECTORS, trackCurve, zones } from "@/components/world/layout";

// Live minimap for the menu: the circuit, the places, and you.
export function Minimap() {
  const found = useWorld((s) => s.found);
  const dot = useRef<SVGCircleElement>(null);
  const pts = trackCurve.getSpacedPoints(120);
  const R = 100;
  const toSvg = (x: number, z: number) => [((x + R) / (2 * R)) * 100, ((z + R) / (2 * R)) * 100];
  const path = pts.map((p, i) => `${i ? "L" : "M"}${toSvg(p.x, p.z).join(" ")}`).join(" ") + "Z";

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const [x, y] = toSvg(carState.pos.x, carState.pos.z);
      dot.current?.setAttribute("cx", String(x));
      dot.current?.setAttribute("cy", String(y));
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
            <path d={path} fill="none" stroke="#3c3f45" strokeWidth="3.2" strokeLinejoin="round" />
            <path d={path} fill="none" stroke="#f3f1ec" strokeWidth="0.5" strokeDasharray="1.5 1.5" />
            {SECTORS.map((s) => {
              const p = trackCurve.getPointAt(s.from);
              const [x, y] = toSvg(p.x, p.z);
              return (
                <text key={s.n} x={x} y={y - 3} fontSize="5" textAnchor="middle" fill="#25272c" style={{ fontFamily: "Racero, sans-serif" }}>
                  S{s.n}
                </text>
              );
            })}
            {zones.map((z) => {
              const [x, y] = toSvg(z.pos[0], z.pos[1]);
              const seen = found.includes(z.id);
              return (
                <circle
                  key={z.id}
                  cx={x}
                  cy={y}
                  r={1.8}
                  fill={seen ? "#6f9677" : "#b8bbc1"}
                  stroke="#fff"
                  strokeWidth="0.5"
                />
              );
            })}
            <circle ref={dot} r="2.6" fill="#e10600" stroke="#fff" strokeWidth="1" />
    </svg>
  );
}
