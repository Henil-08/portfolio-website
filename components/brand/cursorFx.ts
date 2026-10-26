// Helpers for the cursor hover options (components/brand/Cursor.tsx, docs/BRAND.md I09).

// What a click on `el` does, as a short caps prompt (D · Tag): data-cursor-label wins, then the link
// kind, then the button's own name. Max 12 characters.
export function clickVerb(el: Element): string {
  const own = el.getAttribute("data-cursor-label");
  if (own) return fit(own);
  if (el instanceof HTMLAnchorElement) {
    const href = el.getAttribute("href") ?? "";
    if (href.startsWith("mailto:")) return "EMAIL";
    if (href.startsWith("tel:")) return "CALL";
    if (el.hasAttribute("download")) return "SAVE";
    return el.target === "_blank" ? "OPEN ↗" : "OPEN";
  }
  if (el instanceof HTMLSelectElement) return "PICK";
  if (el instanceof HTMLLabelElement) return "SELECT";
  const name = el.getAttribute("aria-label") || el.textContent || "";
  return fit(name) || "SELECT";
}

function fit(s: string) {
  const t = s.replace(/\s+/g, " ").trim().toUpperCase();
  if (t.length <= 12) return t;
  const word = t.split(" ")[0];
  return word.length <= 12 ? word : `${t.slice(0, 11)}…`;
}

// The element's code (P01, Z03…) for G · Scan, if it carries one.
export function codeOf(el: Element): string {
  const c = el.closest("[data-code]") ?? el.querySelector("[data-code]");
  return c?.getAttribute("data-code")?.slice(0, 8) ?? "";
}

// E · Magnetic: four tiny cells fly out from (x, y) and fade, three ink at logo weights and the orange one.
const BURST = [
  { dx: -1, dy: -1, o: 1 },
  { dx: 1, dy: -1, o: 0.45 },
  { dx: -1, dy: 1, o: 0.2 },
  { dx: 1, dy: 1, o: -1 },
];
export function burst(layer: HTMLElement, x: number, y: number) {
  for (const b of BURST) {
    const s = document.createElement("div");
    s.className = "cursor-spark";
    if (b.o < 0) s.dataset.signal = "";
    else s.style.opacity = String(b.o);
    layer.appendChild(s);
    const from = `translate3d(${x}px, ${y}px, 0)`;
    const to = `translate3d(${x + b.dx * 14}px, ${y + b.dy * 14}px, 0) scale(.5)`;
    const a = s.animate([{ transform: from }, { transform: to, opacity: 0 }], { duration: 280, easing: "cubic-bezier(.2,.8,.2,1)" });
    a.onfinish = a.oncancel = () => s.remove();
  }
}

// G · Scan: one orange line sweeps across the rect, once.
export function scan(box: HTMLElement, r: DOMRect) {
  const line = box.firstElementChild as HTMLElement | null;
  if (!line) return;
  box.style.left = `${r.left}px`;
  box.style.top = `${r.top}px`;
  box.style.width = `${r.width}px`;
  box.style.height = `${r.height}px`;
  line.getAnimations().forEach((a) => a.cancel());
  const ms = Math.min(520, 260 + r.width * 0.4);
  line.animate(
    [
      { transform: "translateX(0)", opacity: 1 },
      { transform: `translateX(${r.width}px)`, opacity: 1, offset: 0.92 },
      { transform: `translateX(${r.width}px)`, opacity: 0 },
    ],
    { duration: ms, easing: "cubic-bezier(.6,0,.2,1)" },
  );
}
