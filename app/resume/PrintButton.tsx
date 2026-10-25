"use client";

/** Prints the paper version of the resume (globals.css `.resume` print rules). */
export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="r-btn">
      Print
    </button>
  );
}
