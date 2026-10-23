#!/usr/bin/env node
// Generates every sound in public/sfx with ElevenLabs (sound effects + text to speech).
// Usage: node scripts/gen-audio.mjs [--only name,name] [--force]
// Needs ELEVENLABS_API_KEY in .env.local and ffmpeg on PATH (for the radio voice filter).
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const KEY = process.env.ELEVENLABS_API_KEY || env.ELEVENLABS_API_KEY;
if (!KEY) throw new Error("ELEVENLABS_API_KEY missing");
const VOICE = env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb"; // George, warm British
const OUT = join(root, "public/sfx");
mkdirSync(OUT, { recursive: true });

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null;
const force = args.includes("--force");

const SFX = {
  "music-1": { text: "Seamless loop of calm instrumental lo-fi music: warm electric piano chords, soft synth pad, gentle brushed drums, mellow and relaxing, 90 bpm", seconds: 22, loop: true },
  "music-2": { text: "Seamless loop of upbeat but chill instrumental synthwave: soft analog bass, airy pads, light electronic drums, sunny driving mood, 100 bpm", seconds: 22, loop: true },
  engine: { text: "Modern Formula 1 V6 hybrid engine, steady mid revs, onboard camera, smooth continuous drone, seamless loop", seconds: 4, loop: true },
  boost: { text: "Formula 1 car accelerating hard with turbo whoosh and electric hybrid whine, short", seconds: 2 },
  skid: { text: "Short racing car tyre squeal on asphalt during a drift", seconds: 1.5 },
  honk: { text: "Two short cheerful toy car horn beeps", seconds: 1 },
  crowd: { text: "Grandstand crowd cheering and applauding after a goal, short burst", seconds: 3 },
  sting: { text: "Formula 1 style team radio notification: short clean electronic two-tone beep with slight radio static, broadcast sting", seconds: 1 },
  bump: { text: "Soft dull plastic thud of a small car bumping a barrier", seconds: 0.6 },
};

// Radio lines are generated from content/radio.ts plus a few fixed ones.
const radioSrc = readFileSync(join(root, "content/radio.ts"), "utf8");
const lines = {};
for (const m of radioSrc.matchAll(/"?([\w-]+)"?:\s*"([^"]+)"/g)) lines[`radio-${m[1]}`] = m[2];
Object.assign(lines, {
  "radio-hello": "Radio check. Hold V if you want to talk to me. Box, box.",
  "radio-idle": "Driver, do you copy? Car's warm, tyres are getting cold.",
  "radio-claude": "Claude here. He gave me context, tools and this island. Best prompt I've had all week.",
  "radio-temp-on": "Temperature set to two point oh. The car is fine. The car has always been purple.",
  "radio-temp-off": "Temperature back to zero. Grounded again.",
  "radio-autopilot": "Copy. Forty rookies on track. Watch them learn.",
});

async function post(path, body, accept = "audio/mpeg") {
  const res = await fetch(`https://api.elevenlabs.io${path}`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "content-type": "application/json", accept },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

function radioFilter(input, output) {
  execFileSync("ffmpeg", [
    "-loglevel", "error", "-y", "-i", input,
    "-f", "lavfi", "-i", "anoisesrc=color=pink:amplitude=0.03:sample_rate=44100",
    "-filter_complex",
    "[0:a]highpass=f=350,lowpass=f=3400,acompressor=threshold=-20dB:ratio=6:attack=4:release=80,volume=2,asoftclip=type=atan,apad=pad_dur=0.2[v];[1:a]highpass=f=500,lowpass=f=4000[n];[v][n]amix=inputs=2:duration=first:weights=1 0.35,volume=1.5",
    "-ac", "1", "-b:a", "96k", output,
  ]);
}

const want = (name) => (!only || only.includes(name)) && (force || !existsSync(join(OUT, `${name}.mp3`)));

for (const [name, s] of Object.entries(SFX)) {
  if (!want(name)) continue;
  process.stdout.write(`sfx ${name}… `);
  const buf = await post("/v1/sound-generation", {
    text: s.text,
    duration_seconds: s.seconds,
    prompt_influence: 0.55,
    ...(s.loop ? { loop: true } : {}),
  });
  writeFileSync(join(OUT, `${name}.mp3`), buf);
  console.log("ok");
}

for (const [name, text] of Object.entries(lines)) {
  if (!want(name)) continue;
  process.stdout.write(`voice ${name}… `);
  const buf = await post(`/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
    text,
    model_id: "eleven_multilingual_v2",
    voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.3, speed: 1.04 },
  });
  const raw = join(OUT, `.${name}.raw.mp3`);
  writeFileSync(raw, buf);
  radioFilter(raw, join(OUT, `${name}.mp3`));
  unlinkSync(raw);
  console.log("ok");
}
console.log("done");
