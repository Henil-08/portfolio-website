import { z } from "zod";
import { clientIp, hit } from "@/lib/ratelimit";

// Text to speech for the race engineer. ElevenLabs if configured, Groq Orpheus as a
// fallback. The browser adds the radio effect, so this returns clean audio.
const Body = z.object({ text: z.string().min(1).max(400) });

// ElevenLabs v3 is the expressive one (and reads [excited]-style cues). If it fails or the
// account can't use it, fall back to Turbo v2.5 with loose, high-style settings.
const MODELS = [
  { model_id: "eleven_v4", voice_settings: { stability: 0.5, similarity_boost: 0.8 } },
  { model_id: "eleven_v3", voice_settings: { stability: 0.5, similarity_boost: 0.8 } },
  { model_id: "eleven_turbo_v2_5", voice_settings: { stability: 0.3, similarity_boost: 0.8, style: 0.55, speed: 1.05 } },
];

async function elevenlabs(text: string, signal: AbortSignal) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return null;
  // Default: George, a warm British premade voice (same as the pre-voiced lines).
  const voice = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
  const models = process.env.ELEVENLABS_MODEL ? MODELS.filter((m) => m.model_id === process.env.ELEVENLABS_MODEL) : MODELS;
  for (const m of models.length ? models : MODELS) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_64`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({ text, ...m }),
      signal,
    }).catch(() => null);
    if (res?.ok && res.body) {
      return new Response(res.body, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
    }
    if (res) console.warn(`elevenlabs ${m.model_id} -> ${res.status}`);
    if (signal.aborted) return null;
  }
  return null;
}

async function orpheus(text: string, signal: AbortSignal) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.groq.com/openai/v1/audio/speech", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.GROQ_TTS_MODEL || "canopylabs/orpheus-v1-english",
      voice: process.env.GROQ_TTS_VOICE || "troy",
      input: text,
      response_format: "wav",
    }),
    signal,
  }).catch(() => null);
  if (!res?.ok || !res.body) return null;
  return new Response(res.body, { headers: { "content-type": "audio/wav", "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("bad request", { status: 400 });
  if (!hit(`v:${clientIp(req)}`, 8, 60_000) || !hit("v:global", 300, 86_400_000)) {
    return new Response("rate limited", { status: 429 });
  }
  const out = (await elevenlabs(parsed.data.text, req.signal)) ?? (await orpheus(parsed.data.text, req.signal));
  return out ?? new Response("voice unavailable", { status: 503 });
}
