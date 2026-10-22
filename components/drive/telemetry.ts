/**
 * Per-frame numbers the HUD reads with its own rAF loop. Written by the car
 * inside useFrame; never stored in React state.
 */
export const telemetry = {
  speedKmh: 0,
  gear: "N" as string,
  /** seconds into the current lap, 0 before lights out */
  lapTime: 0,
  /** 0..1 how far round the lap */
  progress: 0,
  offTrack: false,
};

export function resetTelemetry() {
  telemetry.speedKmh = 0;
  telemetry.gear = "N";
  telemetry.lapTime = 0;
  telemetry.progress = 0;
  telemetry.offTrack = false;
}

export function formatLap(t: number | null | undefined) {
  if (t == null || !Number.isFinite(t)) return "--:--.---";
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(3).padStart(6, "0")}`;
}

export function formatSplit(t: number | null | undefined) {
  if (t == null || !Number.isFinite(t)) return "--.---";
  return t.toFixed(3);
}
