import { z } from "zod";
import { clientIp, hit } from "@/lib/ratelimit";
import { experienceText, profileText, projectsText } from "@/lib/knowledge";
import { projects } from "@/content/projects";
import { zones } from "@/components/world/layout";

// Paste a job description, get an honest fit read, the projects that matter for it,
// and a route through the island. Answers only from Henil's real content.

const Body = z.object({ jd: z.string().min(40).max(8000) });

export type Fit = {
  score: number;
  role: string;
  summary: string;
  strengths: string[];
  gaps: string[];
  slugs: string[];
  route: string[];
};

const SLUGS = new Set(projects.map((p) => p.slug));
const PLACES = new Set<string>(zones.map((z) => z.id));
const MODELS = [process.env.GROQ_MODEL || "openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"].filter(
  (m, i, a) => a.indexOf(m) === i
);

const system = () => `You assess how well Henil Gajjar fits a job description, for a recruiter. Be honest and specific; never invent experience, numbers or employers. Use only the facts below.
Return JSON only:
{"score": 0-100 integer (how strong the match is), "role": "short role title from the JD", "summary": "two sentences, plain, recruiter-friendly", "strengths": ["3 to 4 short bullets citing concrete facts"], "gaps": ["0 to 2 honest gaps, or empty"], "slugs": ["up to 6 most relevant project slugs, best first"], "route": ["3 to 6 place ids to visit in order"]}
Place ids: ${zones.map((z) => `${z.id} (${z.label})`).join(", ")}.
Project slugs: ${projects.map((p) => `${p.slug}=${p.name}`).join(", ")}.
Only claim a technology if it appears in the facts below, and name where (role or project).

Facts:
${profileText()}

Experience:
${experienceText()}

Projects:
${projectsText()}`;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Paste a job description (at least a few lines)." }, { status: 400 });

  const ip = clientIp(req);
  if (!hit(`fit:${ip}`, 4, 3_600_000) || !hit("fit:global", 200, 86_400_000)) {
    return Response.json({ error: "That's a lot of roles. Try again in a bit, or email henil.gajjar2102@gmail.com" }, { status: 429 });
  }
  const key = process.env.GROQ_API_KEY;
  if (!key) return Response.json({ error: "Fit check is offline in this build." }, { status: 503 });

  for (const model of MODELS) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : { reasoning_format: "hidden" }),
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_completion_tokens: 900,
        messages: [
          { role: "system", content: system() },
          { role: "user", content: `Job description:\n${parsed.data.jd}` },
        ],
      }),
      signal: req.signal,
    }).catch(() => null);

    if (!res?.ok) {
      if (res) console.warn(`fit ${model} -> ${res.status}`);
      if (res && res.status !== 429 && res.status < 500) break;
      continue;
    }
    try {
      const data = await res.json();
      const raw = JSON.parse(data.choices[0].message.content) as Partial<Fit>;
      const fit: Fit = {
        score: Math.max(0, Math.min(100, Math.round(Number(raw.score) || 0))),
        role: String(raw.role ?? "This role").slice(0, 80),
        summary: String(raw.summary ?? "").slice(0, 500),
        strengths: (raw.strengths ?? []).map(String).slice(0, 4),
        gaps: (raw.gaps ?? []).map(String).slice(0, 2),
        slugs: (raw.slugs ?? []).filter((s) => SLUGS.has(s)).slice(0, 6),
        route: (raw.route ?? []).filter((r) => PLACES.has(r)).slice(0, 6),
      };
      return Response.json(fit, { headers: { "cache-control": "no-store" } });
    } catch {
      continue;
    }
  }
  return Response.json({ error: "Couldn't reach the model. Try again in a minute." }, { status: 502 });
}
