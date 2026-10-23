import type { ZoneId } from "@/components/world/layout";

// What the race engineer says the first time you pull up somewhere. Short, factual, F1 radio.
export const radioLines: Partial<Record<ZoneId, string>> = {
  "sector-1": "Box, box. This is where it started. Mercury, the solar car. He taught it to drive itself.",
  "sector-2": "Copy. Hyperlab. First ML engineer on the team, and they took it all the way to Shark Tank.",
  "sector-3": "Boston, copy. Masters with a four point oh, five courses as a TA, three co-ops.",
  "sector-4": "Waters. This is the current stint. Agents doing real work, on custom MCP servers.",
  "garage-agents": "Agent garage. Most of his best work lives in here.",
  "garage-genai": "Gen AI garage. Fine-tunes, and one very serious fantasy cricket model.",
  "garage-hardware": "Hardware garage. AI that writes and verifies chips. Keep an eye on this one.",
  "garage-vision": "Vision garage. Cones, cars and table tennis balls.",
  "garage-ml": "ML garage. The classic stuff, done properly.",
  playbook: "Tyre wall. How he gets more out of Claude Code for less money.",
  podium: "Podium. Seven papers and two patents.",
  contact: "Mailbox. If you're hiring, this is the one.",
};
