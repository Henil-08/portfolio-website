"use client";

import { carState } from "./carState";
import { getState, openZone, setState, teleport } from "./store";
import { zoneById, type ZoneId } from "./layout";
import { honk } from "./sound";

export type Action = { name: string; args: Record<string, unknown> };

let seq = 0;

// Runs a tool call from the world agent. Returns a short race-control line for the feed.
export function runAction(a: Action): string {
  switch (a.name) {
    case "go_to": {
      const place = a.args.place as ZoneId;
      if (!zoneById[place]) return "go_to: unknown place";
      teleport(place);
      setTimeout(() => openZone(place), 700);
      return `Car moved to ${zoneById[place].label}`;
    }
    case "feature_projects": {
      const slugs = (a.args.slugs as string[]) ?? [];
      setState({ zone: null, picks: { title: String(a.args.title ?? "Picked for you"), slugs } });
      return `Pinned ${slugs.length} project${slugs.length === 1 ? "" : "s"}`;
    }
    case "camera_shot": {
      const style = (a.args.style as "orbit" | "aerial" | "low" | "chase") ?? "orbit";
      setState({ shot: { id: ++seq, style } });
      return `Camera: ${style}`;
    }
    case "set_scene": {
      const cur = getState().scene;
      const time = (a.args.time as typeof cur.time) ?? cur.time;
      const weather = (a.args.weather as typeof cur.weather) ?? cur.weather;
      setState({ scene: { time, weather } });
      return `Conditions: ${time}, ${weather}`;
    }
    case "spawn": {
      const thing = (a.args.thing as "cones" | "footballs" | "tyres" | "confetti") ?? "cones";
      const count = Math.max(1, Math.min(30, Number(a.args.count ?? 10)));
      const at: [number, number] = [carState.pos.x + carState.forward.x * 6, carState.pos.z + carState.forward.z * 6];
      setState((s) => ({ spawns: [...s.spawns.slice(-6), { id: ++seq, thing, count, at }] }));
      if (thing === "confetti") honk();
      return `Spawned ${count} ${thing}`;
    }
    case "autopilot": {
      const on = a.args.on !== false;
      setState((s) => ({ autopilot: { ...s.autopilot, on } }));
      return on ? "Autopilot lab started" : "Autopilot lab stopped";
    }
  }
  return `${a.name}: not available`;
}
