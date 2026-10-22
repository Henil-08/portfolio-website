// The scripted opening. Plays once per session, then the terminal goes live.

export type Step =
  | { kind: "text"; text: string }
  | { kind: "tool"; name: string; arg: string; result: string; reveal?: boolean }
  | { kind: "pause"; ms: number };

export const QUESTION = "hey claude, who's henil?";

export const intro: Step[] = [
  { kind: "text", text: "Let me check his files." },
  { kind: "tool", name: "Read", arg: "content/profile.ts", result: "4 laps of story, 7 roles" },
  { kind: "tool", name: "Search", arg: 'projects, "agents OR llm"', result: "11 projects, 2 side quests" },
  { kind: "pause", ms: 250 },
  {
    kind: "text",
    text: "Henil is an AI/ML engineer at Waters Corporation in Boston. He builds agents that do real work, and most of his job is giving models the right context and tools so they stop guessing.",
  },
  {
    kind: "text",
    text: "Before that he was the founding ML engineer at a startup that went on Shark Tank India. Before that, a solar car that drove itself.",
  },
  { kind: "tool", name: "Render", arg: "<PitWall />", result: "built the page below", reveal: true },
  { kind: "text", text: "Scroll for the full story, or try one of these." },
];

export const suggestions = [
  { cmd: "/drive", hint: "take the car out" },
  { cmd: "/resume", hint: "the quick version" },
  { cmd: "what's he building at waters?", hint: "ask anything" },
  { cmd: "help", hint: "" },
];

export const HELP = [
  ["/drive", "drive the 3D circuit. his story is on the track"],
  ["/resume", "one page, no animations"],
  ["/story /work /projects /ai /side-quest /research /contact", "jump to a section"],
  ["/mcp", "add this site to your own Claude"],
  ["clear", "clear the terminal"],
  ["anything else", "ask about Henil, answered live"],
] as const;

export const easterEggs: Record<string, string> = {
  cricket:
    "He once fine-tuned Gemma 2 to pick his IPL fantasy team. 85% accurate. He will bring this up.",
  football:
    "Ask him about formations and he'll draw one on a napkin. Then he'll ask what model you'd use to predict it.",
  f1: "Lights out and away we go. Type /drive.",
  "box box": "Copy. Boxing this lap. (Try /contact.)",
  "sudo hire henil": "Permission granted. Email: henil.gajjar2102@gmail.com",
  "hire henil": "Good call. /contact has everything you need.",
};
