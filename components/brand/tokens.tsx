// Brand tokens and server-safe helpers (docs/BRAND.md). Colours mirror the @theme tokens in globals.css.
import { profile } from "@/content/profile";

export const DS = { paper: "#f3f2ed", ink: "#111111", grey: "#5d5d58", rule: "#cfcdc4", orange: "#ff4f00" };
export const pad = (n: number) => String(n).padStart(2, "0");
export const LINKS = [
  ["Email", profile.email, `mailto:${profile.email}`],
  ["LinkedIn", "in/henilgajjar", profile.links.linkedin],
  ["GitHub", "Henil-08", profile.links.github],
  ["Scholar", "Google Scholar", profile.links.scholar],
] as const;

// Figures inside a sentence (44.9%, 20K+, <1s, 10) get picked out so a skim finds them.
// A figure starts a word (not "GPT-4" or "S/4"), keeps inner commas and points only before a
// digit (so "Llama 3," stays plain), and takes its unit or suffix with it ("20M+", "3.5x").
const NUM = /((?<![\w./-])<?\d(?:[\d]|[.,](?=\d))*(?:%|x|ms|s(?![a-z])|K|M|B|TB|h)?\+?)/g;
export function Figures({ text, className }: { text: string; className: string }) {
  return text.split(NUM).map((s, i) =>
    i % 2 ? (
      <span key={i} className={className}>
        {s}
      </span>
    ) : (
      s
    ),
  );
}
