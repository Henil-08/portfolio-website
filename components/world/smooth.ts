/**
 * Frame-rate independent easing: the share of the way to its goal a value moves in `dt` seconds
 * when it moves `rate / 60` of it per 60 fps frame. Exactly `Math.min(1, dt * rate)` at 60 fps
 * (the feel everything was tuned at), and the same curve over time at 30, 120 or 144 Hz, where
 * `dt * rate` lagged more or less than at 60 fps.
 */
export function ease(rate: number, dt: number) {
  if (rate >= 60) return 1;
  return 1 - Math.pow(1 - rate / 60, dt * 60);
}
