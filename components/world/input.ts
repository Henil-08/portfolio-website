"use client";

// Shared, mutable input state. Keyboard and touch both write here; the car reads it every frame.
export const input = {
  forward: 0, // 0..1
  back: 0, // 0..1
  steer: 0, // -1 (left) .. 1 (right)
  handbrake: false,
  power: false, // Shift (or the touch button) is held: the vehicle's power runs while it is
  powerPress: false, // it went down since the last physics step (a tap starts the power and lets it go)
  reset: false,
  honk: false,
};

const keys = new Set<string>();

function sync() {
  input.forward = keys.has("KeyW") || keys.has("ArrowUp") || keys.has("KeyZ") ? 1 : 0;
  input.back = keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0;
  const left = keys.has("KeyA") || keys.has("ArrowLeft") || keys.has("KeyQ");
  const right = keys.has("KeyD") || keys.has("ArrowRight");
  input.steer = (right ? 1 : 0) - (left ? 1 : 0);
  input.handbrake = keys.has("Space");
  input.power = keys.has("ShiftLeft") || keys.has("ShiftRight");
}

export function bindKeyboard() {
  const isTyping = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
  };
  const down = (e: KeyboardEvent) => {
    if (isTyping(e)) return;
    if (e.code === "KeyR") input.reset = true;
    if (e.code === "KeyH") input.honk = true;
    if ((e.code === "ShiftLeft" || e.code === "ShiftRight") && !e.repeat) input.powerPress = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    sync();
  };
  const up = (e: KeyboardEvent) => {
    keys.delete(e.code);
    sync();
  };
  const blur = () => {
    keys.clear();
    sync();
  };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", blur);
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", blur);
  };
}

if (typeof window !== "undefined") (window as unknown as { __input: typeof input }).__input = input;
