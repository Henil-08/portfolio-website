// Tiny event bus so anything in the app can trigger living-world effects
// (confetti, dust, leaf scatter) without holding refs to the systems.
// Events fired before a system mounts are queued and replayed once it does.

type Events = {
  confetti: { x: number; y: number; z: number; radius: number; elevation: number };
  dust: { x: number; y: number; z: number; amount: number; vx: number; vz: number };
  explode: { x: number; z: number; radius: number };
};

type Name = keyof Events;
type Handler<K extends Name> = (e: Events[K]) => void;

const handlers: { [K in Name]: Set<Handler<K>> } = { confetti: new Set(), dust: new Set(), explode: new Set() };
const queued: { [K in Name]: Events[K][] } = { confetti: [], dust: [], explode: [] };

export const aliveEvents = {
  emit<K extends Name>(name: K, e: Events[K]) {
    const hs = handlers[name] as Set<Handler<K>>;
    if (hs.size === 0) {
      const q = queued[name] as Events[K][];
      if (q.length < 8) q.push(e);
      return;
    }
    hs.forEach((h) => h(e));
  },
  on<K extends Name>(name: K, h: Handler<K>) {
    const hs = handlers[name] as Set<Handler<K>>;
    hs.add(h);
    const q = queued[name] as Events[K][];
    while (q.length) h(q.shift()!);
    return () => {
      hs.delete(h);
    };
  },
};

/**
 * Pop a confetti burst at a world position (the original Confetti.pop): `radius` is
 * how far it spreads, `elevation` how high it flies. Also scatters nearby leaves.
 */
export function burstConfetti(x: number, y: number, z: number, radius = 4, elevation = 6) {
  aliveEvents.emit("confetti", { x, y, z, radius, elevation });
  aliveEvents.emit("explode", { x, z, radius: 7 });
}

/**
 * Kick up a puff of dust at a world position, e.g. a landing or a crash.
 * `amount` ~ number of puffs (1..12); (vx, vz) is the initial drift in m/s.
 */
export function kickDust(x: number, y: number, z: number, amount = 4, vx = 0, vz = 0) {
  aliveEvents.emit("dust", { x, y, z, amount, vx, vz });
}

/** Blow fallen leaves away from a point (the original Leaves.explode). */
export function scatterLeaves(x: number, z: number, radius = 7) {
  aliveEvents.emit("explode", { x, z, radius });
}
