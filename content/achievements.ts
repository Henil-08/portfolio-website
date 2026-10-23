// Found by playing around. The list shows names only once earned, so it stays a surprise.
export const ACHIEVEMENTS = [
  { id: "all-places", name: "Full lap", how: "Visit every place" },
  { id: "goal", name: "Back of the net", how: "Score a goal" },
  { id: "hat-trick", name: "Hat-trick", how: "Three goals or three wickets" },
  { id: "howzat", name: "Howzat", how: "Hit the stumps" },
  { id: "autopilot-lap", name: "Student becomes the teacher", how: "Watch a ghost learn a full lap" },
  { id: "fit", name: "Recruiter mode", how: "Run a fit check" },
  { id: "voice", name: "Radio check", how: "Talk to the engineer by voice" },
  { id: "hallucination", name: "Temperature 2.0", how: "Find the old cheat code" },
  { id: "claude", name: "Context window", how: "Say hi to Claude" },
  { id: "gpu", name: "Out of memory", how: "Ask for more GPUs" },
  { id: "night-rain", name: "Monaco, 1984", how: "Night and rain at once" },
  { id: "idle", name: "Driver, do you copy?", how: "Sit still for a minute" },
] as const;
