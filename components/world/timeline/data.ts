// Career timeline data: one lane per role from content/experience.ts, with
// real dates parsed into decimal years. Label copy is short, uppercase and
// only says things that are already in the experience file.
import { experience, type Role } from "@/content/experience";

export const T0 = 2021; // left edge of the plaza (Jan 2021)
export const T1 = 2027; // right edge (end of 2026)
export const PER_YEAR = 4; // metres of plaza per year
export const LANE_GAP = 1.3; // metres between lanes
export const LENGTH = (T1 - T0) * PER_YEAR; // 24 m of time axis

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "Jun 2025" -> 2025.417 (start of month); end=true -> end of that month. */
function parseMonth(s: string, end: boolean) {
  const [m, y] = s.trim().toLowerCase().split(/\s+/);
  const mi = MONTHS.indexOf(m.slice(0, 3));
  return Number(y) + (mi + (end ? 1 : 0)) / 12;
}

// Decimal "now", fixed when the module loads (no impure calls in render).
const now = new Date();
export const NOW = now.getFullYear() + (now.getMonth() + 0.5) / 12;

function parseRange(dates: string) {
  const [a, b] = dates.split(/\s*[–-]\s*/);
  const start = parseMonth(a, false);
  const ongoing = /present/i.test(b ?? "");
  const end = ongoing ? NOW : parseMonth(b, true);
  return { start, end, ongoing };
}

type LaneCopy = { title: string; lines: string[]; color: string };

// Keyed by `${company}|${title}` so a new role in experience.ts still shows up
// (with a plain label) even before it gets copy here.
const COPY: Record<string, LaneCopy> = {
  "Team Stallions|Captain": { title: "TEAM STALLIONS", lines: ["CAPTAIN", "8 OF 11 TROPHIES"], color: "#ffcf4a" },
  "SAE Nirma Collegiate Club|Team Lead, Electric ATV": { title: "SAE E-BAJA", lines: ["TEAM LEAD, ELECTRIC ATV", "5TH OF 47 TEAMS"], color: "#ff8039" },
  "Nirma University|Student Researcher": { title: "NIRMA UNIVERSITY", lines: ["STUDENT RESEARCHER", "LI-ION BATTERY HEALTH"], color: "#a2ffab" },
  "Hyperlab Sportech|Founding ML Engineer": { title: "HYPERLAB", lines: ["FOUNDING ML ENGINEER", "SHARK TANK INDIA"], color: "#b65fff" },
  "Northeastern University|Teaching Assistant, Khoury College": { title: "NORTHEASTERN", lines: ["TEACHING ASSISTANT", "+400 STUDENTS"], color: "#5390ff" },
  "Edlight, PBC|Machine Learning Intern": { title: "EDLIGHT", lines: ["ML INTERN", "MULTI-AGENT CHATBOT"], color: "#5ff0ff" },
  "Impacter AI|AI Developer Intern": { title: "IMPACTER AI", lines: ["AI DEVELOPER INTERN", "SALES AGENTS ON AKS"], color: "#ff6fd8" },
  "Waters Corporation|GenAI and ML Intern": { title: "WATERS", lines: ["GENAI + ML INTERN", "LLM EVALS FOR AI SEARCH"], color: "#f3f1ec" },
  "Waters Corporation|AI/ML Software Engineer": { title: "WATERS", lines: ["AI/ML SOFTWARE ENGINEER", "AGENTS FOR S/4HANA"], color: "#ff4b52" },
};

export type Lane = {
  key: string;
  index: number;
  title: string;
  lines: string[];
  color: string;
  start: number;
  end: number;
  ongoing: boolean;
};

function laneFor(r: Role, index: number): Lane {
  const key = `${r.company}|${r.title}`;
  const c = COPY[key] ?? { title: r.company.toUpperCase(), lines: [r.title.toUpperCase()], color: "#f3f1ec" };
  const { start, end, ongoing } = parseRange(r.dates);
  return { key, index, ...c, start: Math.max(T0, start), end: Math.min(T1, end), ongoing };
}

/** Earliest role in lane 0, latest in the last lane: the lines form a staircase. */
export const LANES: Lane[] = [...experience]
  .map((r) => ({ r, s: parseRange(r.dates).start }))
  .sort((a, b) => a.s - b.s)
  .map(({ r }, i) => laneFor(r, i));

// Local layout. Time runs along local -z (Jan 2021 at +z, end of 2026 at -z);
// lanes are spread along +x, the year counter sits on the -x side.
export const Z_START = LENGTH / 2;
export const zOf = (t: number) => Z_START - (t - T0) * PER_YEAR;
export const tOf = (z: number) => T0 + (Z_START - z) / PER_YEAR;
export const laneX = (i: number) => -3.85 + i * LANE_GAP;
export const COUNTER_X = laneX(0) - 2.5;

// Paved plaza footprint (local, centred on the origin).
export const PLAZA = { minX: COUNTER_X - 2, maxX: laneX(LANES.length - 1) + 1.8, minZ: -Z_START - 2.5, maxZ: Z_START + 2.5 };
