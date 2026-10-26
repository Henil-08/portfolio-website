// Text in the world, in IBM Plex like the UI (docs/BRAND.md): Plex Sans SemiBold for
// names, Plex Mono SemiBold (`mono`) for codes and values. Wraps drei <Text> in its own
// Suspense so a sign never blocks the rest of the world while the font streams in.
// The fonts are IBM's (SIL OFL 1.1, public/fonts/OFL.txt).
"use client";

import { Text } from "@react-three/drei";
import { Suspense, type ComponentProps } from "react";

export const FONT_SANS = "/fonts/IBMPlexSans-SemiBold.woff";
export const FONT_MONO = "/fonts/IBMPlexMono-SemiBold.woff";

type LabelProps = ComponentProps<typeof Text> & { mono?: boolean };

/** Plex text, centred by default. Same props as drei <Text>, plus `mono` for codes. */
export function Label({ children, mono = false, ...props }: LabelProps) {
  return (
    <Suspense fallback={null}>
      <Text font={mono ? FONT_MONO : FONT_SANS} anchorX="center" anchorY="middle" {...props}>
        {children}
      </Text>
    </Suspense>
  );
}
