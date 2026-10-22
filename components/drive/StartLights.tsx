"use client";

type Props = {
  /** how many of the five lights are on */
  lit: number;
  /** true for a moment right after they go out */
  out: boolean;
  onSkip: () => void;
};

/** Five-light start gantry. Each column has two lamps, like the real thing. */
export function StartLights({ lit, out, onSkip }: Props) {
  return (
    <div className="pointer-events-none flex flex-col items-center gap-3">
      <div className="flex gap-2 rounded-lg border border-line bg-ink/90 p-3 shadow-2xl sm:gap-3 sm:p-4">
        {[0, 1, 2, 3, 4].map((i) => {
          const on = !out && i < lit;
          return (
            <div key={i} className="flex flex-col gap-2 rounded-md bg-carbon p-1.5 sm:p-2">
              {[0, 1].map((j) => (
                <span
                  key={j}
                  className={`block h-7 w-7 rounded-full border sm:h-10 sm:w-10 ${
                    on && j === 1
                      ? "border-red bg-red shadow-[0_0_24px_6px_rgba(225,6,0,0.55)]"
                      : "border-line bg-[#1a0606]"
                  }`}
                />
              ))}
            </div>
          );
        })}
      </div>
      {out ? (
        <p className="font-display text-2xl font-black tracking-[0.2em] text-chalk uppercase sm:text-3xl">
          Lights out
        </p>
      ) : (
        <button
          type="button"
          onClick={onSkip}
          className="pointer-events-auto cursor-pointer rounded-md border border-line bg-ink/80 px-3 py-1.5 font-mono text-xs text-mute hover:text-chalk"
        >
          Skip the lights (Enter)
        </button>
      )}
    </div>
  );
}

/** Small card that explains the controls before the start. */
export function ControlsHint({ isTouch }: { isTouch: boolean }) {
  const rows = isTouch
    ? [
        ["◀ ▶", "steer"],
        ["Go / Brake", "throttle and brake, hold both thumbs"],
        ["Reset", "back onto the track"],
      ]
    : [
        ["W / ↑", "throttle"],
        ["S / ↓", "brake, then reverse"],
        ["A D / ← →", "steer"],
        ["Space", "handbrake, for a bit of a slide"],
        ["R", "reset onto the track"],
      ];
  return (
    <div className="pointer-events-none w-[min(22rem,calc(100vw-2rem))] rounded-md border border-line bg-ink/85 p-4 font-mono text-xs backdrop-blur-sm">
      <p className="mb-2 font-display text-sm font-bold text-chalk">How this works</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-chalk">{k}</dt>
            <dd className="text-mute">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 leading-relaxed text-mute">
        Drive through the four gantries to read my story. Stop in the pit box by the start line to look
        at projects. The cricket ground and football pitch are in the infield.
      </p>
    </div>
  );
}
