import type { ReactNode } from "react";
import Reveal from "./Reveal";

export default function Section({
  id,
  index,
  label,
  title,
  intro,
  children,
  className = "",
}: {
  id: string;
  index: string;
  label: string;
  title: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-16 px-4 py-24 sm:px-8 sm:py-32 ${className}`}>
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-mute">
            <span className="text-red">{index}</span> · {label}
          </p>
          <h2 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            {title}
          </h2>
          {intro && <div className="mt-6 max-w-2xl text-lg leading-relaxed text-chalk/75">{intro}</div>}
        </Reveal>
        <div className="mt-14">{children}</div>
      </div>
    </section>
  );
}
