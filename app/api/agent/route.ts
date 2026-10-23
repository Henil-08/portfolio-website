import { z } from "zod";
import { systemPrompt } from "@/lib/prompts";
import { clientIp, hit } from "@/lib/ratelimit";
import { zones } from "@/components/world/layout";
import { DOMAINS, projects } from "@/content/projects";

// The world agent: answers questions about Henil AND drives the 3D world with tools.
// The model picks tools, the browser runs them. One tool round, then a short reply.

const Body = z.object({
  voice: z.enum(["terminal", "radio"]).default("terminal"),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(1500) }))
    .min(1)
    .max(8),
});

const PLACES = zones.map((z) => z.id);
const SLUGS = new Set(projects.map((p) => p.slug));

const tools = [
  {
    type: "function",
    function: {
      name: "go_to",
      description: "Drive the visitor's car to a place on the island and open its card. Use when they ask to see something.",
      parameters: {
        type: "object",
        properties: { place: { type: "string", enum: PLACES } },
        required: ["place"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "feature_projects",
      description: "Pin up to 5 of Henil's projects on screen. The card shows each project's real details.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short heading, e.g. 'Agent work'" },
          slugs: { type: "array", maxItems: 5, items: { type: "string" } },
        },
        required: ["title", "slugs"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "camera_shot",
      description: "Frame a cinematic camera shot for a few seconds.",
      parameters: {
        type: "object",
        properties: { style: { type: "string", enum: ["orbit", "aerial", "low", "chase"] } },
        required: ["style"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_scene",
      description: "Change the time of day and/or weather on the island.",
      parameters: {
        type: "object",
        properties: {
          time: { type: "string", enum: ["day", "golden", "night"] },
          weather: { type: "string", enum: ["clear", "rain", "snow"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "spawn",
      description: "Drop fun things into the world near the car.",
      parameters: {
        type: "object",
        properties: {
          thing: { type: "string", enum: ["cones", "footballs", "tyres", "confetti"] },
          count: { type: "integer", minimum: 1, maximum: 30 },
        },
        required: ["thing"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "autopilot",
      description:
        "Start or stop the self-driving lab: 40 ghost cars with tiny neural nets that learn to lap the circuit by neuroevolution, live in the browser. Great for 'show me some AI' or 'impress me'.",
      parameters: { type: "object", properties: { on: { type: "boolean" } }, required: ["on"] },
    },
  },
];

const extra = `You also control the 3D world the visitor is driving in, through tools. Use them when they help: go_to a place when they want to see something, feature_projects when they ask about skills or fit, set_scene or spawn when they're playing around. Always write a one or two sentence reply in the same message as any tool calls; the pinned card shows the detail, so don't list projects in the reply.
Places: ${zones.map((z) => `${z.id}=${z.label}`).join(", ")}.
When featuring projects, include every project that fits, up to 5.
Projects by domain: ${DOMAINS.map(
  (d) => `${d.label}: ${projects.filter((p) => p.domain === d.id).map((p) => `${p.slug} (${p.name})`).join(", ")}`
).join(". ")}.`;

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODELS = [process.env.GROQ_MODEL || "openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"].filter(
  (m, i, a) => a.indexOf(m) === i
);

type ToolCall = { id: string; function: { name: string; arguments: string } };
type Action = { name: string; args: Record<string, unknown> };

// Plain text for the radio and the chat: no markdown.
function clean(t: string) {
  return t
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^#+\s*/gm, "")
    .trim();
}

function fallbackReply(actions: Action[]) {
  const a = actions[0];
  if (!a) return "Copy.";
  if (a.name === "go_to") return "Copy, taking you there now.";
  if (a.name === "feature_projects") return `Pinned: ${String(a.args.title ?? "a few projects")}.`;
  if (a.name === "set_scene") return "Copy, changing conditions.";
  if (a.name === "spawn") return "Incoming.";
  if (a.name === "autopilot") return a.args.on ? "Copy. Forty rookies on track, watch them learn." : "Copy, ghosts in.";
  return "Copy.";
}

async function groq(key: string, body: object, signal: AbortSignal) {
  for (const model of MODELS) {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : { reasoning_format: "hidden" }),
        ...body,
      }),
      signal,
    }).catch(() => null);
    if (res?.ok) return res.json();
    if (res) console.warn(`agent ${model} -> ${res.status} ${await res.text().catch(() => "")}`.slice(0, 300));
    if (res && res.status !== 429 && res.status < 500) break;
  }
  return null;
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ reply: "That didn't come through. Try something shorter.", actions: [] }, { status: 400 });
  const { messages, voice } = parsed.data;

  const ip = clientIp(req);
  if (!hit(`a:${ip}`, 8, 60_000) || !hit(`ad:${ip}`, 60, 86_400_000) || !hit("a:global", 800, 86_400_000)) {
    return Response.json({ reply: "Box box. That's enough questions for now. Email henil.gajjar2102@gmail.com", actions: [] }, { status: 429 });
  }
  const key = process.env.GROQ_API_KEY;
  if (!key) return Response.json({ reply: "Radio's offline in this build.", actions: [] });

  const question = messages.filter((m) => m.role === "user").map((m) => m.content).join(" ");
  const system = `${systemPrompt(voice, question, 1)}\n\n${extra}`;
  const convo = [{ role: "system", content: system }, ...messages.slice(-6)];

  const first = await groq(key, { messages: convo, tools, tool_choice: "auto", max_completion_tokens: 700 }, req.signal);
  if (!first) return Response.json({ reply: "Lost telemetry with the model. Try again in a moment.", actions: [] }, { status: 502 });

  if (process.env.NODE_ENV !== "production") console.log("agent usage", JSON.stringify(first.usage));
  const msg = first.choices?.[0]?.message ?? {};
  const calls: ToolCall[] = (msg.tool_calls ?? []).slice(0, 4);
  const actions = calls
    .map((c) => {
      try {
        return { name: c.function.name, args: JSON.parse(c.function.arguments || "{}") } as Action;
      } catch {
        return null;
      }
    })
    .filter((a): a is Action => !!a)
    .map((a) =>
      a.name === "feature_projects"
        ? { ...a, args: { ...a.args, slugs: ((a.args.slugs as string[]) ?? []).filter((s) => SLUGS.has(s)) } }
        : a
    );

  const reply = clean(msg.content ?? "") || fallbackReply(actions as Action[]);
  return Response.json({ reply: reply.trim() || "Copy. Done.", actions }, { headers: { "cache-control": "no-store" } });
}
