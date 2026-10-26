"use client";

/** Prints the paper version of the resume (globals.css `.resume` print rules). */
export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="x-btn x-secondary font-mono">
      Print
    </button>
  );
}
