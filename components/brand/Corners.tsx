import type { CSSProperties } from "react";

/** Orange corner brackets for any .x-sel element (hover, focus, or .is-on). */
export default function Corners({ inset = -6 }: { inset?: number }) {
  return (
    <>
      {(
        [
          ["border-l-2 border-t-2", { left: inset, top: inset }, "-3px", "-3px"],
          ["border-r-2 border-t-2", { right: inset, top: inset }, "3px", "-3px"],
          ["border-b-2 border-l-2", { left: inset, bottom: inset }, "-3px", "3px"],
          ["border-b-2 border-r-2", { right: inset, bottom: inset }, "3px", "3px"],
        ] as const
      ).map(([c, pos, cx, cy]) => (
        <span key={c} className={`x-corner ${c}`} style={{ ...pos, ...({ "--cx": cx, "--cy": cy } as CSSProperties) }} />
      ))}
    </>
  );
}

