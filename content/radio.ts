import type { ZoneId } from "@/components/world/layout";

// What the race engineer says the first time you pull up somewhere. Short, warm, F1 radio.
// The [tags] are delivery cues for the voice model (ElevenLabs v3); radioText() strips them
// for the on-screen transcript. scripts/gen-audio.mjs voices every line in this file.
export const radioLines: Partial<Record<ZoneId, string>> = {
  "sector-1": "[calm] Okay, this is where it all started. Mercury, the solar car. [warmly] He taught it to drive itself.",
  "sector-2": "[excited] Hyperlab! First ML engineer on the team... and they took it all the way to Shark Tank.",
  "sector-3": "Boston, copy. [impressed] Masters with a four point oh. Five courses as a TA, three co-ops.",
  "sector-4": "[calm] Right, this is the current stint. Waters. Agents doing real work, on custom MCP servers.",
  "garage-agents": "Agent garage. [softly] Most of his best work lives in here.",
  "garage-genai": "Gen AI garage. Fine-tunes... [chuckles] and one very serious fantasy cricket model.",
  "garage-hardware": "Hardware garage. AI that writes and verifies chips. [excited] Keep an eye on this one.",
  "garage-vision": "Vision garage. Cones, cars... [chuckles] and table tennis balls.",
  "garage-ml": "[calm] ML garage. The classic stuff, done properly.",
  playbook: "Tyre wall. [conspiratorial] This is how he gets more out of Claude Code, for less money.",
  podium: "[excited] Podium! Seven papers, two patents. Get in there!",
  contact: "Mailbox. [warmly] If you're hiring... this is the one.",
};

// Lines the easter eggs trigger. Same voice, same file naming (public/sfx/radio-{key}.mp3).
export const radioExtras = {
  hello: "Radio check, radio check. [calm] Hold V if you want to talk to me.",
  idle: "[sighs] Driver, you still with us? Tyres are getting cold.",
  claude: "[amused] Claude here. He gave me context, tools and this whole island. Best prompt I've had all week.",
  "temp-on": "[laughs] Temperature two point oh. The car is fine. The car has always been purple.",
  "temp-off": "[relieved] Temperature back to zero. Grounded again.",
};

export function radioText(line: string) {
  return line.replace(/\[[^\]]*\]\s*/g, "").replace(/\s{2,}/g, " ").trim();
}
