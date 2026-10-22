/**
 * Shared, mutable input state. Keyboard and touch write into their own
 * buckets; the car reads the merged result every frame. Kept outside React
 * on purpose so 60 fps input never triggers re-renders.
 */

export type InputBucket = {
  throttle: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  handbrake: boolean;
};

const empty = (): InputBucket => ({
  throttle: false,
  brake: false,
  left: false,
  right: false,
  handbrake: false,
});

export const keyboard = empty();
export const touch = empty();

/** One-shot requests consumed by the car on the next frame. */
export const requests = { reset: false };

export type DriveInput = {
  throttle: number;
  brake: number;
  /** -1 = full left, +1 = full right */
  steer: number;
  handbrake: boolean;
};

export function readInput(): DriveInput {
  const left = keyboard.left || touch.left;
  const right = keyboard.right || touch.right;
  return {
    throttle: keyboard.throttle || touch.throttle ? 1 : 0,
    brake: keyboard.brake || touch.brake ? 1 : 0,
    steer: (right ? 1 : 0) - (left ? 1 : 0),
    handbrake: keyboard.handbrake || touch.handbrake,
  };
}

export function clearInput() {
  Object.assign(keyboard, empty());
  Object.assign(touch, empty());
  requests.reset = false;
}
