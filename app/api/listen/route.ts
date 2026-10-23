import { clientIp, hit } from "@/lib/ratelimit";

// Push-to-talk: speech to text with Whisper on Groq.
export async function POST(req: Request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return Response.json({ error: "Voice input is offline." }, { status: 503 });
  if (!hit(`l:${clientIp(req)}`, 10, 60_000) || !hit("l:global", 600, 86_400_000)) {
    return Response.json({ error: "Too many voice messages, give it a minute." }, { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size < 1200 || audio.size > 4_000_000) {
    return Response.json({ error: "Didn't catch that." }, { status: 400 });
  }

  const out = new FormData();
  out.append("file", audio, "radio.webm");
  out.append("model", "whisper-large-v3-turbo");
  out.append("language", "en");
  out.append("response_format", "json");
  out.append("prompt", "Questions about Henil Gajjar, an ML engineer: Waters, Hyperlab, Northeastern, LangGraph, RAG, MCP, agents.");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}` },
    body: out,
    signal: req.signal,
  }).catch(() => null);
  if (!res?.ok) return Response.json({ error: "Radio interference. Try again." }, { status: 502 });
  const data = (await res.json()) as { text?: string };
  return Response.json({ text: (data.text ?? "").trim() });
}
