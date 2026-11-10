// The journey's facts, shared by the three redesigns (./JourneyA.tsx, B, C). Everything here
// comes from content/: the roles and degrees through ../timeline/data.ts (its LANES and COPY
// labels), their date strings from content/experience.ts, and the four chapters from
// content/profile.ts `story` (the same four places as the circuit's sectors S1 to S4).
import { education, experience } from "@/content/experience";
import { story } from "@/content/profile";
import { LANES, NOW, type Lane } from "../timeline/data";

export { NOW };

export type Role = Lane & {
  /** "01".."12", earliest first (R02: number everything). */
  code: string;
  /** The content's own date range, in caps: "JAN 2022 – AUG 2023", "JAN 2026 – PRESENT". */
  dates: string;
};

const DATES = new Map<string, string>([
  ...experience.map((r) => [`${r.company}|${r.title}`, r.dates] as const),
  ...education.map((e) => [`${e.school}|${e.degree}`, e.dates] as const),
]);

export const ROLES: Role[] = LANES.map((l) => ({
  ...l,
  code: String(l.index + 1).padStart(2, "0"),
  dates: (DATES.get(l.key) ?? "").toUpperCase().replace(/\s*[–-]\s*/, " – "),
}));

/** First date on the journey and the present. */
export const T_START = Math.min(...ROLES.map((r) => r.start));
export const T_END = NOW;
/** Every January inside the journey (2020 ... 2026). */
export const YEARS: number[] = [];
for (let y = Math.ceil(T_START); y <= Math.floor(T_END); y++) YEARS.push(y);

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
/** 2022.17 -> "MAR 2022". */
export function monthLabel(t: number) {
  const y = Math.floor(t + 1e-6);
  const m = Math.min(11, Math.max(0, Math.floor((t - y) * 12 + 1e-6)));
  return `${MONTHS[m]} ${y}`;
}

/** Roles going on at time t (start inclusive, end exclusive; an ongoing role never ends). */
export const activeAt = (r: Role, t: number) => t >= r.start && (r.ongoing || t < r.end);

export type Chapter = { code: string; place: string; title: string; years: string; start: number };

// The story's four laps start with these roles (content/profile.ts story, lap 1 to 4).
const OPENS = [
  "Nirma University|B.Tech, Electronics and Communication",
  "Hyperlab Sportech|Founding ML Engineer",
  "Northeastern University|MS, Data Science",
  "Waters Corporation|AI/ML Software Engineer",
];

/** The four chapters, S1 Ahmedabad to S4 Waters, each from the date its first role starts. */
export const CHAPTERS: Chapter[] = story
  .map((s, i): Chapter | null => {
    const r = ROLES.find((x) => x.key === OPENS[i]);
    return r ? { code: `S${s.lap}`, place: s.place.toUpperCase(), title: s.title, years: s.years, start: r.start } : null;
  })
  .filter((c): c is Chapter => c !== null);

/** The chapter going on at time t. */
export const chapterAt = (t: number) => CHAPTERS.reduce<Chapter | null>((c, x) => (t >= x.start ? x : c), null);
