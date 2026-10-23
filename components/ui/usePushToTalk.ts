"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Hold to record, release to transcribe with Whisper. Works with a button or the V key.
export function usePushToTalk(onText: (text: string) => void) {
  const [state, setState] = useState<"idle" | "listening" | "thinking" | "denied">("idle");
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    if (rec.current) return;
    try {
      stream.current ??= await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const r = new MediaRecorder(stream.current, type ? { mimeType: type } : undefined);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = async () => {
        rec.current = null;
        const blob = new Blob(chunks.current, { type: r.mimeType || "audio/webm" });
        if (blob.size < 1200) return setState("idle");
        setState("thinking");
        try {
          const fd = new FormData();
          fd.append("audio", blob, "radio.webm");
          const res = await fetch("/api/listen", { method: "POST", body: fd });
          const data = (await res.json()) as { text?: string };
          if (data.text) onText(data.text);
        } catch {}
        setState("idle");
      };
      r.start();
      rec.current = r;
      setState("listening");
    } catch {
      setState("denied");
    }
  }, [onText]);

  const stop = useCallback(() => {
    if (rec.current && rec.current.state === "recording") rec.current.stop();
  }, []);

  // Hold V anywhere in the world to talk.
  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
    };
    const down = (e: KeyboardEvent) => {
      if (e.code === "KeyV" && !e.repeat && !isTyping(e)) start();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "KeyV") stop();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [start, stop]);

  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), []);

  return { state, start, stop };
}
