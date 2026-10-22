"use client";

import dynamic from "next/dynamic";

// three.js needs the browser, so the whole game is client-only
const Game = dynamic(() => import("./Game"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-ink font-mono text-xs text-mute">
      Rolling the car out of the garage...
    </div>
  ),
});

export default function DriveClient() {
  return <Game />;
}
