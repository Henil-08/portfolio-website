import { profile, stats, story, offTrack } from "@/content/profile";
import { experience, education } from "@/content/experience";
import { DOMAINS, projects } from "@/content/projects";
import { publications, patents, toolbox } from "@/content/research";
import { playbook } from "@/content/playbook";

// Plain-text views of the content, shared by the radio prompt and the MCP server.

export function profileText() {
  return [
    `${profile.name}, ${profile.role} at ${profile.company}, ${profile.location}.`,
    profile.oneLiner,
    `Email: ${profile.email}. Resume: ${profile.resume}.`,
    `GitHub: ${profile.links.github}. LinkedIn: ${profile.links.linkedin}. Scholar: ${profile.links.scholar}.`,
    `Stats: ${stats.map((s) => `${s.value} ${s.label}`).join("; ")}.`,
    `Education: ${education.map((e) => `${e.degree}, ${e.school} (${e.detail})`).join("; ")}.`,
  ].join("\n");
}

export function storyText() {
  return story
    .map((s) => `Lap ${s.lap}: ${s.title} (${s.place}, ${s.years})\n${s.body.join(" ")}`)
    .join("\n\n");
}

export function experienceText() {
  return experience
    .map(
      (r) =>
        `${r.title} at ${r.company} (${r.dates}, ${r.kind})\n${r.points.map((p) => `- ${p}`).join("\n")}`
    )
    .join("\n\n");
}

export function projectText(p: (typeof projects)[number]) {
  return [
    `${p.name}: ${p.tagline} [${DOMAINS.find((d) => d.id === p.domain)?.label}]`,
    `Headline: ${p.headline.value} ${p.headline.label}`,
    `Stack: ${p.stack.join(", ")}`,
    ...p.points.map((x) => `- ${x}`),
    ...p.links.map((l) => `${l.label}: ${l.href}`),
  ].join("\n");
}

export function projectsText() {
  return projects.map(projectText).join("\n\n");
}

export function researchText() {
  return [
    "Publications:",
    ...publications.map((p) => `- ${p.title} (${p.venue}, ${p.date})`),
    "Patents:",
    ...patents.map((p) => `- ${p.title} (${p.id}, ${p.status})`),
  ].join("\n");
}

export function extrasText() {
  return [
    "Toolbox:",
    ...toolbox.map((t) => `- ${t.group}: ${t.items.join(", ")}`),
    "How he works with AI:",
    ...playbook.map((p) => `- ${p.title}: ${p.body}`),
    "Outside work:",
    ...offTrack.map((o) => `- ${o.title}: ${o.body}`),
  ].join("\n");
}

export function fullKnowledge() {
  return [
    profileText(),
    storyText(),
    experienceText(),
    projectsText(),
    researchText(),
    extrasText(),
  ].join("\n\n---\n\n");
}

export function searchProjects(query: string) {
  const q = query.toLowerCase().split(/\s+/).filter(Boolean);
  return projects
    .map((p) => {
      const hay = projectText(p).toLowerCase();
      return { p, score: q.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}
