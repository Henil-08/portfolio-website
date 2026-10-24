"use client";

import { getState, subscribe } from "./store";

// All audio is WebAudio. Music, engine and one-shots are pre-generated with ElevenLabs into
// public/sfx (see scripts/gen-audio.mjs); live replies use /api/voice. The team-radio clicks,
// hiss and band-pass are synthesized here so every line sounds like the same radio.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
// Nothing makes a sound until the start button calls unlockAudio().
let unlocked = false;
const buffers = new Map<string, Promise<AudioBuffer | null>>();

function audio() {
  if (!unlocked) return null;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = getState().muted ? 0 : 1;
      master.connect(ctx.destination);
      // Mute affects everything, smoothly.
      subscribe(() => {
        if (ctx && master) master.gain.setTargetAtTime(getState().muted ? 0 : 1, ctx.currentTime, 0.08);
      });
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function load(name: string) {
  let p = buffers.get(name);
  if (!p) {
    p = (async () => {
      const a = audio();
      if (!a) return null;
      try {
        const res = await fetch(`/sfx/${name}.mp3`);
        if (!res.ok) return null;
        return await a.decodeAudioData(await res.arrayBuffer());
      } catch {
        return null;
      }
    })();
    buffers.set(name, p);
  }
  return p;
}

async function play(name: string, { vol = 1, rate = 1 } = {}) {
  const a = audio();
  if (!a || !master) return;
  const buf = await load(name);
  if (!buf) return;
  const src = a.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(g).connect(master);
  src.start();
}

export function unlockAudio() {
  unlocked = true;
  audio();
  ["engine", "music-1", "music-2", "boost", "honk"].forEach((n) => void load(n));
  startMusic();
  startEngine();
}

// ------------------------------------------------------------ music

const MUSIC_VOL = 0.22;
let musicDuck: GainNode | null = null;
let musicStarted = false;
async function startMusic() {
  const a = audio();
  if (!a || !master || musicStarted) return;
  musicStarted = true;
  // Fade-in and ducking live on separate gains so they never fight over one param.
  musicDuck = a.createGain();
  musicDuck.connect(master);
  const musicGain = a.createGain();
  musicGain.gain.value = 0.0001;
  musicGain.connect(musicDuck);
  musicGain.gain.exponentialRampToValueAtTime(MUSIC_VOL, a.currentTime + 3);
  // Alternate the two loops so it doesn't feel like one short track.
  let i = 0;
  const next = async () => {
    const buf = await load(i++ % 2 ? "music-2" : "music-1");
    if (!buf) return;
    const src = a.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(musicGain);
    src.start();
    src.stop(a.currentTime + buf.duration * 3);
    src.onended = () => void next();
  };
  void next();
}

// Music sits at ~35% while the engineer is talking, then comes back up.
function duck(from: number, to: number) {
  if (!musicDuck) return;
  const g = musicDuck.gain;
  g.setTargetAtTime(0.35, from - 0.15, 0.08);
  g.setTargetAtTime(1, to + 0.2, 0.35);
}

// ------------------------------------------------------------ engine

let engine: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
async function startEngine() {
  const a = audio();
  if (!a || !master || engine) return;
  const buf = await load("engine");
  if (!buf) return;
  const src = a.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const gain = a.createGain();
  gain.gain.value = 0;
  src.connect(gain).connect(master);
  src.start();
  engine = { src, gain };
}

let lastSkid = 0;
// Called every frame from the world: pitch follows speed, volume follows throttle.
export function engineUpdate(speedKmh: number, throttle: number, boost: boolean, sliding: boolean) {
  const a = ctx;
  if (!a || !engine) return;
  const s = Math.min(speedKmh / 140, 1.3);
  engine.src.playbackRate.setTargetAtTime(0.7 + s * 0.8 + (boost ? 0.08 : 0), a.currentTime, 0.12);
  // Quiet under the music, silent when parked.
  const moving = speedKmh > 3 || throttle > 0;
  engine.gain.gain.setTargetAtTime(moving ? 0.012 + s * 0.035 + throttle * 0.01 : 0, a.currentTime, 0.25);
  if (sliding && a.currentTime - lastSkid > 1.2 && speedKmh > 30) {
    lastSkid = a.currentTime;
    void play("skid", { vol: 0.35 });
  }
}

export function engineIdle() {
  if (ctx && engine) engine.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
}

// ------------------------------------------------------------ radio

let noise: AudioBuffer | null = null;
function noiseBuffer(a: AudioContext) {
  if (!noise) {
    noise = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noise;
}

// Band-limited noise between two times, with a quick attack and a set release.
function noiseBurst(a: AudioContext, out: AudioNode, t: number, len: number, vol: number, freq: number, q = 0.9) {
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a);
  src.loop = true;
  const bp = a.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(bp).connect(g).connect(out);
  src.start(t, Math.random());
  src.stop(t + len + 0.02);
}

function blip(a: AudioContext, out: AudioNode, t: number, freq: number, len: number, vol: number) {
  const o = a.createOscillator();
  o.type = "square";
  o.frequency.value = freq;
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 3200;
  const g = a.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.003);
  g.gain.setValueAtTime(vol, t + len - 0.006);
  g.gain.linearRampToValueAtTime(0, t + len);
  o.connect(lp).connect(g).connect(out);
  o.start(t);
  o.stop(t + len + 0.01);
}

// Key-up: a crackle of static and a quick rising two-tone chirp. ~110 ms.
function radioOpen(a: AudioContext, out: AudioNode, t: number) {
  noiseBurst(a, out, t, 0.06, 0.22, 2200, 0.7);
  blip(a, out, t + 0.03, 1250, 0.035, 0.07);
  blip(a, out, t + 0.068, 1850, 0.04, 0.07);
  return 0.11;
}

// Key-down: a lower click and a short squelch tail. ~120 ms.
function radioClose(a: AudioContext, out: AudioNode, t: number) {
  blip(a, out, t, 1050, 0.03, 0.06);
  noiseBurst(a, out, t + 0.02, 0.1, 0.18, 1600, 0.6);
  return 0.12;
}

// Low static under the voice while the channel is open.
function hiss(a: AudioContext, out: AudioNode, from: number, to: number) {
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a);
  src.loop = true;
  const hp = a.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 500;
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 4200;
  const g = a.createGain();
  g.gain.setValueAtTime(0, from);
  g.gain.linearRampToValueAtTime(0.014, from + 0.03);
  g.gain.setValueAtTime(0.014, to - 0.03);
  g.gain.linearRampToValueAtTime(0, to);
  src.connect(hp).connect(lp).connect(g).connect(out);
  src.start(from, Math.random());
  src.stop(to + 0.02);
}

// The voice itself: band-pass, a little presence, light drive and compression.
function radioChain(a: AudioContext, input: AudioNode, out: AudioNode) {
  const hp = a.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 320;
  hp.Q.value = 0.8;
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 3400;
  lp.Q.value = 0.8;
  const presence = a.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = 1800;
  presence.gain.value = 4;
  presence.Q.value = 1;
  const drive = a.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(((i / 1023) * 2 - 1) * 1.6) / Math.tanh(1.6);
  drive.curve = curve;
  const comp = a.createDynamicsCompressor();
  comp.threshold.value = -22;
  comp.ratio.value = 5;
  comp.attack.value = 0.004;
  comp.release.value = 0.12;
  const g = a.createGain();
  g.gain.value = 1.1;
  input.connect(hp).connect(lp).connect(presence).connect(drive).connect(comp).connect(g).connect(out);
}

// One transmission at a time: a new one waits for the channel to close.
let channelFree = 0;

function transmit(a: AudioContext, buf: AudioBuffer | null) {
  if (!master) return 0;
  const t0 = Math.max(a.currentTime + 0.03, channelFree + 0.25);
  const open = radioOpen(a, master, t0);
  let end = t0 + open;
  if (buf) {
    const start = t0 + open + 0.04;
    const src = a.createBufferSource();
    src.buffer = buf;
    radioChain(a, src, master);
    src.start(start);
    end = start + buf.duration;
    hiss(a, master, t0 + open * 0.5, end + 0.05);
    duck(t0, end);
  }
  const close = radioClose(a, master, end + 0.03);
  channelFree = end + 0.03 + close;
  return channelFree - a.currentTime;
}

// Just the clicks, no voice: a message arrived (voice off) or the channel is listening.
export function radioBeep() {
  const a = audio();
  return a ? transmit(a, null) : 0;
}

// Pre-voiced line from public/sfx/radio-{name}.mp3. Returns seconds until the channel closes.
export async function radioLine(name: string) {
  const a = audio();
  if (!a) return 0;
  return transmit(a, await load(`radio-${name}`));
}

// Live line (chat replies): ElevenLabs via /api/voice. Silent if unavailable.
export async function radioSpeak(text: string) {
  try {
    if (!audio()) return;
    const res = await fetch("/api/voice", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 400) }),
    });
    if (!res.ok) return;
    const a = audio();
    if (!a) return;
    transmit(a, await a.decodeAudioData(await res.arrayBuffer()));
  } catch {}
}

// ------------------------------------------------------------ one-shots

export function honk() {
  void play("honk", { vol: 0.6 });
}

// A soft UI blip: quick sine chirp, no samples.
export function pop() {
  const a = audio();
  if (!a || !master) return;
  const t = a.currentTime + 0.01;
  const o = a.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(660, t);
  o.frequency.exponentialRampToValueAtTime(1180, t + 0.06);
  const g = a.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.09, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.16);
}

/** The opening's whoosh as the circle sweeps out (public/sfx/reveal.mp3, see public/vendor/NOTICE.md). */
export function revealSound() {
  void play("reveal", { vol: 0.5 });
}

/** The map's wipe in and out (public/sfx/swoosh-*.mp3, see public/vendor/NOTICE.md). */
export function swoosh(dir: "in" | "out") {
  void play(`swoosh-${dir}`, { vol: 0.25 });
}

export function cheer() {
  void play("crowd", { vol: 0.5 });
}

export function bump(strength = 1) {
  void play("bump", { vol: Math.min(0.6, 0.2 * strength) });
}
