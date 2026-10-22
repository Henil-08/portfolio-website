"use client";

import { getState } from "./store";

// Everything is synthesized, no audio files.
let ctx: AudioContext | null = null;

function audio() {
  if (getState().muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function unlockAudio() {
  audio();
}

function beep(freq: number, start: number, dur: number, type: OscillatorType = "square", vol = 0.05) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// Radio key-up: filtered noise burst plus a beep.
export function squelch(end = false) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const buf = a.createBuffer(1, a.sampleRate * 0.16, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const band = a.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1900;
  const g = a.createGain();
  g.gain.value = 0.07;
  src.connect(band).connect(g).connect(a.destination);
  src.start(t);
  beep(end ? 1250 : 880, 0.04, 0.1, "square", 0.025);
}

export function honk() {
  beep(392, 0, 0.18, "sawtooth", 0.05);
  beep(494, 0, 0.18, "sawtooth", 0.04);
}

export function pop() {
  beep(660, 0, 0.08, "sine", 0.06);
  beep(990, 0.06, 0.1, "sine", 0.05);
}

export function cheer() {
  [523, 659, 784, 1047].forEach((f, i) => beep(f, i * 0.08, 0.18, "triangle", 0.05));
}

// Speaks a line through the browser voice, with radio blips around it.
export function radioSay(text: string, rate = 1.05) {
  if (getState().muted || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.pitch = 0.95;
    const voices = speechSynthesis.getVoices();
    const pick =
      voices.find((v) => /en-GB/i.test(v.lang) && /male|daniel|arthur/i.test(v.name)) ??
      voices.find((v) => /en-GB/i.test(v.lang)) ??
      voices.find((v) => /^en/i.test(v.lang));
    if (pick) u.voice = pick;
    u.onstart = () => squelch();
    u.onend = () => squelch(true);
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {}
}

// Engine note that follows speed. Started once, updated every frame.
let engine: { osc: OscillatorNode; osc2: OscillatorNode; gain: GainNode } | null = null;

export function engineUpdate(speed: number, throttle: number) {
  const a = audio();
  if (!a) {
    if (engine) engine.gain.gain.value = 0;
    return;
  }
  if (!engine) {
    const osc = a.createOscillator();
    const osc2 = a.createOscillator();
    const gain = a.createGain();
    const lp = a.createBiquadFilter();
    osc.type = "sawtooth";
    osc2.type = "square";
    lp.type = "lowpass";
    lp.frequency.value = 900;
    gain.gain.value = 0;
    osc.connect(lp);
    osc2.connect(lp);
    lp.connect(gain).connect(a.destination);
    osc.start();
    osc2.start();
    engine = { osc, osc2, gain };
  }
  const s = Math.min(Math.abs(speed) / 24, 1.4);
  const f = 55 + s * 120 + throttle * 15;
  engine.osc.frequency.setTargetAtTime(f, a.currentTime, 0.08);
  engine.osc2.frequency.setTargetAtTime(f * 0.5, a.currentTime, 0.08);
  engine.gain.gain.setTargetAtTime(0.012 + s * 0.02 + throttle * 0.01, a.currentTime, 0.1);
}

export function engineStop() {
  if (engine) engine.gain.gain.value = 0;
}
