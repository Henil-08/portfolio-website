import { z } from "zod";
import { systemPrompt } from "@/lib/prompts";
import { clientIp, hit } from "@/lib/ratelimit";

const Body = z.object({
  voice: z.enum(["terminal", "radio"]).default("terminal"),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(1500),
      })
    )
    .min(1)
    .max(8),
});

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const DAILY_CAP = Number(process.env.RADIO_DAILY_CAP ?? 800);

const text = (body: string, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return text("That message didn't come through. Try something shorter.", 400);
  const { messages, voice } = parsed.data;
  if (messages.at(-1)?.role !== "user") return text("Need a question to answer.", 400);

  const ip = clientIp(req);
  if (!hit(`m:${ip}`, 8, 60_000) || !hit(`d:${ip}`, 60, 86_400_000)) {
    return text("Box box. You've hit the question limit for now. Email Henil instead: henil.gajjar2102@gmail.com", 429);
  }
  if (!hit("global", DAILY_CAP, 86_400_000)) {
    return text("The radio's on its daily limit. The page has everything, or email henil.gajjar2102@gmail.com", 429);
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return text("Radio's offline in this build. Everything I'd tell you is on the page, or try /resume.");
  }

  const upstream = await fetch(GROQ_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      temperature: voice === "radio" ? 0.8 : 0.5,
      max_tokens: voice === "radio" ? 160 : 320,
      messages: [{ role: "system", content: systemPrompt(voice) }, ...messages],
    }),
    signal: req.signal,
  }).catch(() => null);

  if (!upstream?.ok || !upstream.body) {
    return text("We've lost telemetry with the model. Try again in a moment.", 502);
  }

  // Groq streams OpenAI-style SSE. Forward only the text deltas.
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  const stream = upstream.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const data = line.replace(/^data: ?/, "").trim();
          if (!data || data === "[DONE]" || !line.startsWith("data:")) continue;
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          } catch {}
        }
      },
    })
  );

  return new Response(stream, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
