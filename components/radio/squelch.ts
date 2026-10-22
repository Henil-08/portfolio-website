// Short burst of filtered noise plus a beep, like an F1 radio keying up.
let ctx: AudioContext | null = null;

export function squelch(end = false) {
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime;

    const noise = ctx.createBuffer(1, ctx.sampleRate * 0.18, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1800;
    band.Q.value = 0.9;
    const ng = ctx.createGain();
    ng.gain.value = 0.08;
    src.connect(band).connect(ng).connect(ctx.destination);
    src.start(t);

    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(end ? 1200 : 900, t + 0.05);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.03, t + 0.06);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc.connect(og).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  } catch {}
}
