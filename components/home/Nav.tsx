import Link from "next/link";
import { profile } from "@/content/profile";

const links = [
  ["story", "Story"],
  ["work", "Work"],
  ["projects", "Projects"],
  ["ai", "AI"],
  ["side-quest", "Side quest"],
  ["contact", "Contact"],
] as const;

export default function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line/60 bg-ink/70 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-8">
        <Link href="/" className="font-display text-lg font-black tracking-tight">
          HG<span className="text-red">.</span>
        </Link>
        <div className="hidden flex-1 items-center gap-5 text-sm text-mute md:flex">
          {links.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="transition hover:text-chalk">
              {label}
            </a>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <Link
            href="/resume"
            className="rounded-full border border-line px-3.5 py-1.5 text-chalk/90 transition hover:border-chalk"
          >
            Resume
          </Link>
          <Link
            href="/drive"
            className="rounded-full bg-red px-3.5 py-1.5 font-semibold text-white transition hover:bg-[#ff1f17]"
          >
            Drive ›
          </Link>
        </div>
      </nav>
      <span className="sr-only">{profile.name}</span>
    </header>
  );
}
