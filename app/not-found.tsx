import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center px-4 text-center">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-red">Track limits</p>
        <h1 className="mt-4 font-display text-6xl font-black sm:text-8xl">404</h1>
        <p className="mt-4 text-chalk/70">You went off the circuit. Lap time deleted.</p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-red px-6 py-3 font-semibold text-white hover:bg-[#ff1f17]"
        >
          Rejoin the track
        </Link>
      </div>
    </main>
  );
}
