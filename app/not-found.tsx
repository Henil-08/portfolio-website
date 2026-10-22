import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center bg-cream px-4 text-center text-ink">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-red">Track limits</p>
        <h1 className="mt-4 font-display text-7xl font-bold tracking-tight sm:text-9xl">404</h1>
        <p className="mt-4 text-ink-soft">You went off the island. Lap time deleted.</p>
        <Link href="/" className="toy-btn mt-8 inline-block rounded-2xl bg-red px-6 py-3 font-display font-semibold text-white">
          Back to the track
        </Link>
      </div>
    </main>
  );
}
