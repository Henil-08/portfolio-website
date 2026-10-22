import { z } from "zod";
import { clientIp, hit } from "@/lib/ratelimit";

// Text to speech for the race-engineer radio, via Groq's Orpheus model.
// The browser adds the radio effect, so this returns clean audio.
const Body = z.object({ text: z.string().min(1).max(400) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("bad request", { status: 400 });

  const key = process.env.GROQ_API_KEY;
  if (!key) return new Response("voice off", { status: 503 });
  if (!hit(`v:${clientIp(req)}`, 6, 60_000) || !hit("v:global", 300, 86_400_000)) {
    return new Response("rate limited", { status: 429 });
  }

  const res = await fetch("https://api.groq.com/openai/v1/audio/speech", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.GROQ_TTS_MODEL || "canopylabs/orpheus-v1-english",
      voice: process.env.GROQ_TTS_VOICE || "troy",
      input: parsed.data.text,
      response_format: "wav",
    }),
    signal: req.signal,
  }).catch(() => null);

  if (!res?.ok || !res.body) {
    if (res) console.warn(`groq tts -> ${res.status}`);
    return new Response("voice unavailable", { status: 503 });
  }
  return new Response(res.body, { headers: { "content-type": "audio/wav", "cache-control": "no-store" } });
}
