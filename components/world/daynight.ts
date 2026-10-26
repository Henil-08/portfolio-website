// Shared day/night state. The cycle driver writes it every frame; anything that
// glows at night (street lamps, windows, neon) reads `night` in its own useFrame.
export const dayNight = {
  t: 0.3, // 0..1 around the clock; 0.25 noon-ish, 0.75 midnight-ish
  night: 0, // 0 in daylight, 1 at full night, eases at dusk and dawn
  sunElevation: 1, // -1..1
  rain: 0, // 0 dry, 1 raining, eases in and out (Effects.tsx DayNight)
};

/** 0..1 at night with smooth dusk/dawn, for emissive intensities. */
export function nightAmount() {
  return dayNight.night;
}
