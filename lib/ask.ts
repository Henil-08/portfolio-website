export type ChatMessage = { role: "user" | "assistant"; content: string };
export type Voice = "terminal" | "radio";

// Streams a reply from /api/radio, calling onChunk with each piece of text.
export async function ask(
  messages: ChatMessage[],
  voice: Voice,
  onChunk: (text: string) => void,
  signal?: AbortSignal
) {
  const res = await fetch("/api/radio", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: messages.slice(-8), voice }),
    signal,
  });
  if (!res.body) {
    onChunk(await res.text());
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}
