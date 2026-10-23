// Career timeline data: one lane per role from content/experience.ts, with
// real dates parsed into decimal years. Label copy is short, uppercase and
// only says things that are already in the experience file.
import { education, experience, type Role } from "@/content/experience";

export const T0 = 2019; // start of the time axis (Jan 2019, the year college began)
export const T1 = 2027; // end (end of 2026)
export const PER_YEAR = 1.3; // metres per year: compact, like Bruno's career strip
export const LANE_GAP = 0.9; // metres between lanes
export const LENGTH = (T1 - T0) * PER_YEAR; // 10.4 m of time axis

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
  // education (content/experience.ts `education`), keyed by school|degree
  "Nirma University|B.Tech, Electronics and Communication": { title: "NIRMA UNIVERSITY", lines: ["B.TECH, ELECTRONICS + COMMUNICATION"], color: "#f0d48a" },
  "Nirma University|Minor, Computer Science and Engineering": { title: "NIRMA UNIVERSITY", lines: ["MINOR, COMPUTER SCIENCE"], color: "#ffb38a" },
  "Northeastern University|MS, Data Science": { title: "NORTHEASTERN", lines: ["MS, DATA SCIENCE", "4.0 GPA"], color: "#8fb6ff" },
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

type Entry = Pick<Role, "company" | "title" | "dates">;

function laneFor(r: Entry, index: number): Lane {
  const key = `${r.company}|${r.title}`;
  const c = COPY[key] ?? { title: r.company.toUpperCase(), lines: [r.title.toUpperCase()], color: "#f3f1ec" };
  const { start, end, ongoing } = parseRange(r.dates);
  return { key, index, ...c, start: Math.max(T0, start), end: Math.min(T1, end), ongoing };
}

/** Roles and degrees, earliest in lane 0, latest in the last lane: the lines form a staircase. */
export const LANES: Lane[] = [...experience, ...education.map((e) => ({ company: e.school, title: e.degree, dates: e.dates }))]
  .map((r) => ({ r, s: parseRange(r.dates).start }))
  .sort((a, b) => a.s - b.s)
  .map(({ r }, i) => laneFor(r, i));

// Local layout. Time runs along local -z (T0 at +z, T1 at -z); lanes are spread
// along +x, centred, and the year markers sit on the -x side.
export const Z_START = LENGTH / 2;
export const zOf = (t: number) => Z_START - (t - T0) * PER_YEAR;
export const tOf = (z: number) => T0 + (Z_START - z) / PER_YEAR;
const HALF_LANES = ((LANES.length - 1) * LANE_GAP) / 2;
export const laneX = (i: number) => -HALF_LANES + 0.5 + i * LANE_GAP;
export const YEAR_X = laneX(0) - 1.1;

// Paved terrace footprint (local, centred on the origin).
export const PLAZA = { minX: YEAR_X - 0.8, maxX: laneX(LANES.length - 1) + 0.8, minZ: -Z_START - 1.2, maxZ: Z_START + 1.2 };
