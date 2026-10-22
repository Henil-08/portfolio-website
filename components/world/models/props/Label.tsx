// Signage text in the Racero display font. Wraps drei <Text> in its own Suspense
// so a sign never blocks the rest of the world while the font streams in.
"use client";

import { Text } from "@react-three/drei";
import { Suspense, type ComponentProps } from "react";

export const FONT = "/fonts/racero.otf";

type LabelProps = ComponentProps<typeof Text>;

/** Racero text, centred by default. Same props as drei <Text>. */
export function Label({ children, ...props }: LabelProps) {
  return (
    <Suspense fallback={null}>
      <Text font={FONT} anchorX="center" anchorY="middle" {...props}>
        {children}
      </Text>
    </Suspense>
  );
}
