"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { story } from "@/content/profile";
import Section from "@/components/ui/Section";

const photos: Record<number, { src: string; alt: string; caption: string }> = {
  1: { src: "/img/mercury.jpg", alt: "Mercury, Team Stallions' solar electric car", caption: "Mercury, 2021" },
  3: { src: "/img/henil-boston.jpg", alt: "Henil in downtown Boston", caption: "Boston" },
};

export default function Story() {
  const [active, setActive] = useState(1);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number(e.target.getAttribute("data-lap")));
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const current = story[active - 1];

  return (
    <Section id="story" index="01" label="Story" title="How I got here">
      <div className="grid gap-12 lg:grid-cols-[280px_1fr] lg:gap-20">
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-mute">Lap</p>
            <p className="font-display text-[120px] font-black leading-none tabular-nums">
              {active}
              <span className="text-4xl text-mute">/{story.length}</span>
            </p>
            <p className="mt-2 font-display text-2xl font-bold text-red">{current.place}</p>
            <p className="font-mono text-sm text-mute">{current.years}</p>
            <div className="mt-8 flex gap-1.5">
              {story.map((s) => (
                <span
                  key={s.lap}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                    s.lap < active ? "bg-green" : s.lap === active ? "bg-purple" : "bg-line"
                  }`}
                />
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-28">
          {story.map((s, i) => (
            <article
              key={s.lap}
              data-lap={s.lap}
              ref={(el) => {
                refs.current[i] = el;
              }}
            >
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-mute lg:hidden">
                Lap {s.lap} · {s.place} · {s.years}
              </p>
              <h3 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl">{s.title}</h3>
              <div className="mt-6 space-y-5 text-lg leading-relaxed text-chalk/80">
                {s.body.map((p) => (
                  <p key={p.slice(0, 24)}>{p}</p>
                ))}
              </div>
              {photos[s.lap] && (
                <figure className="mt-8 overflow-hidden rounded-xl border border-line">
                  <Image
                    src={photos[s.lap].src}
                    alt={photos[s.lap].alt}
                    width={1400}
                    height={900}
                    className="h-72 w-full object-cover sm:h-96"
                    sizes="(min-width: 1024px) 720px, 100vw"
                  />
                  <figcaption className="border-t border-line bg-panel px-4 py-2 font-mono text-xs text-mute">
                    {photos[s.lap].caption}
                  </figcaption>
                </figure>
              )}
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
