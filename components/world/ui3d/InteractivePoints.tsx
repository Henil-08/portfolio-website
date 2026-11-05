"use client";

// The interaction prompt: the zone sticker (docs/BRAND.md S02, I02, I08) at every place and
// contact link, after folio-2025's InteractivePoints (MIT, public/vendor/LICENSE.md,
// sources/Game/InteractivePoints.js): a point is HIDDEN until the opening is done, then
// CONCEALED, and the one the car is at (store `near` / `nearLink`) OPENs.
//
// - Concealed: a small code tag (Z05, C03) on paper with a 2 px ink border and a hard shadow, its
//   status dot an outline until you have opened the place and ink after.
// - Open: the sticker. Paper, a 2 px ink border, the hard 3 px ink shadow; the ink E key on the
//   left (Tap on touch), standing on the point; the code in Plex Mono after the one orange, the
//   live dot; the name in Plex Sans 600. Its frame draws top to bottom while the key pops and
//   the code and name decode (M01, M06, M03, about .3 s); leaving wipes it out. E or Enter
//   (Hud.tsx) presses the key into its shadow; a click or a tap on the sticker opens it too.
//
// Stickers are DOM over the canvas, the same size on screen at any distance. Every frame each
// point is projected through the camera; a tag that would overlap the open sticker or a nearer
// tag hides, and tags fade out with distance. They all step back for the garage sequence. The
// places page draws the world into several boxes with their own cameras: it passes them as
// `views` and every box gets a layer of its own.
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getState, openZone } from "../store";
import { garageView } from "../garage/state";
import { SECTORS, zoneMarker, zones, type ZoneId } from "../layout";
import { heightAt } from "../terrain";
import { LINKS, LINK_SPOTS, openLink } from "../social";
import { paper } from "../sound";

/** A box the world is drawn into and the camera it is drawn with (the places page's views). */
export type PromptView = { id: string; el: HTMLElement; camera?: THREE.Camera };

const ZONE_Y = 3; // m over the ground at a zone's marker: in front of the building's face
const LINK_Y = 2.4; // m: just over a contact slab
const ZONE_FAR = 70; // m from the camera; a tag fades out over the last 15%
const LINK_FAR = 34;
const KEY = 32; // px, the key's width inside the border (44 on touch)
const KEY_TOUCH = 44;
const GAP = 4; // px kept between a shown tag and anything else

type Point = { id: string; code: string; kicker: string; name: string; pos: THREE.Vector3; far: number; zone: ZoneId | null; open: () => void };

const pad = (n: number) => String(n).padStart(2, "0");

function points(): Point[] {
  return [
    ...zones.map((zn, i) => {
      const [x, z] = zoneMarker(zn);
      const sector = SECTORS.find((s) => `sector-${s.n}` === zn.id);
      return {
        id: zn.id,
        code: `Z${pad(i + 1)}`,
        kicker: sector ? `Sector ${sector.n} · ${sector.year}` : zn.hint,
        name: zn.label,
        pos: new THREE.Vector3(x, heightAt(x, z) + ZONE_Y, z),
        far: ZONE_FAR,
        zone: zn.id,
        open: () => openZone(zn.id),
      };
    }),
    ...LINKS.map((l, i) => {
      const [x, z] = LINK_SPOTS[i];
      return { id: `link-${l.key}`, code: `C${pad(i + 1)}`, kicker: "Contact", name: l.name, pos: new THREE.Vector3(x, heightAt(x, z) + LINK_Y, z), far: LINK_FAR, zone: null, open: () => openLink(l.key) };
    }),
  ];
}

const CSS = `
.ipl{position:fixed;left:0;top:0;pointer-events:none;overflow:hidden;z-index:10}
.ipp{position:absolute;left:0;top:0;width:0;height:0}
.ipt{position:absolute;left:0;top:0;translate:-50% -50%;display:flex;align-items:center;gap:4px;padding:1px 5px 1px 4px;border:2px solid #111;background:#f3f2ed;box-shadow:2px 2px 0 #111;font:600 10.5px/15px var(--font-plex-mono),ui-monospace,monospace;color:#111;white-space:nowrap;opacity:0}
.ipd{flex:none;width:6px;height:6px;border-radius:50%;border:1.5px solid #111;box-sizing:border-box}
.ipt[data-seen] .ipd{background:#111}
.ips{position:absolute;top:0;translate:0 -50%;display:flex;align-items:stretch;margin:0;padding:0;border:2px solid #111;background:#fff;box-shadow:3px 3px 0 #111;color:#111;font:inherit;text-align:left;cursor:pointer;visibility:hidden;pointer-events:none}
.ips[data-open]{pointer-events:auto}
.ipk{display:grid;place-items:center;flex:none;background:#111;color:#fff;font:600 15px var(--font-plex-mono),ui-monospace,monospace}
.ipb{display:flex;flex-direction:column;justify-content:center;gap:1px;padding:5px 12px 6px 10px}
.ipc{display:flex;align-items:center;gap:6px;font:500 11px/14px var(--font-plex-mono),ui-monospace,monospace;color:#5d5d58;white-space:nowrap}
.ipc .ipd{border:0;background:#ff4f00;animation:ipl-blink 1.06s steps(1,end) infinite}
.ipn{font:600 15px/19px var(--font-plex),system-ui,sans-serif;letter-spacing:-.005em;white-space:nowrap}
.iph{position:relative;display:inline-block}
.iph>.ipg{visibility:hidden}
.iph>.ipv{position:absolute;left:0;top:0}
@keyframes ipl-blink{50%{opacity:0}}
@media (pointer:coarse){.ipk{font-size:12px}.ipb{padding:8px 14px 9px 10px}}
@media (prefers-reduced-motion:reduce){.ipc .ipd{animation:none}}
`;

// M03 Decode: scramble glyphs keep the real character's case, three run ahead (components/brand/motion.tsx).
const UPPER = "ABCDEFGHJKLNPRSTUVXYZ";
const LOWER = "abcdeghknopqrsuvxyz";
const DIGIT = "0123456789";
function glyph(ch: string) {
  const set = /[A-Z]/.test(ch) ? UPPER : /[a-z]/.test(ch) ? LOWER : /\d/.test(ch) ? DIGIT : "#/<>";
  return set[(Math.random() * set.length) | 0];
}
function decoded(text: string, k: number) {
  if (k >= 1) return text;
  if (k <= 0) return "";
  const n = Math.floor(k * text.length);
  let s = text.slice(0, n);
  for (let i = n; i < Math.min(text.length, n + 3); i++) s += text[i] === " " ? " " : glyph(text[i]);
  return s;
}

const HIDDEN = 0;
const CONCEALED = 1;
const OPEN = 2;

/** One point's elements in one layer. */
type El = {
  root: HTMLDivElement;
  tag: HTMLDivElement;
  stk: HTMLButtonElement;
  code: HTMLSpanElement;
  name: HTMLSpanElement;
  /** tag and sticker size, measured once the fonts are in */
  tw: number;
  th: number;
  sw: number;
  sh: number;
  last: string;
  alpha: number;
};
type Layer = { el: HTMLDivElement; items: El[]; box: string };

/** Text that decodes in place: the final text holds the box, the live copy sits over it. */
function hold(cls: string, text: string) {
  const outer = document.createElement("span");
  outer.className = `${cls} iph`;
  const ghost = document.createElement("span");
  ghost.className = "ipg";
  ghost.textContent = text;
  const live = document.createElement("span");
  live.className = "ipv";
  live.textContent = text;
  live.setAttribute("aria-hidden", "true");
  outer.append(ghost, live);
  return { outer, live };
}

export default function InteractivePoints({ views }: { views?: () => PromptView[] }) {
  const pts = useRef<Point[]>([]);
  const st = useRef<{ state: number; t0: number; done: boolean }[]>([]);
  const layers = useRef(new Map<string, Layer>());
  const active = useRef(-1);
  const coarse = useRef(false);
  const reduced = useRef(false);
  const v = useRef(new THREE.Vector3());
  const cam = useRef(new THREE.Vector3());
  /** The canvas's own root element: the layers go right after it, in the same stacking context as the HUD. */
  const host = useRef<HTMLElement | null>(null);

  useEffect(() => {
    coarse.current = window.matchMedia("(pointer: coarse)").matches;
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    pts.current = points();
    st.current = pts.current.map(() => ({ state: HIDDEN, t0: 0, done: true }));
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.append(style);
    const all = layers.current;
    // the measured sizes are only right once the web fonts are in
    let live = true;
    void document.fonts.ready.then(() => {
      if (!live) return;
      for (const l of all.values()) for (const it of l.items) it.tw = 0;
    });
    // E or Enter presses the open sticker's key into its shadow (I01, I02)
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if ((e.code === "KeyE" || e.code === "Enter") && !e.repeat && active.current >= 0) press(active.current);
    };
    window.addEventListener("keydown", key);
    return () => {
      live = false;
      window.removeEventListener("keydown", key);
      for (const l of all.values()) l.el.remove();
      all.clear();
      style.remove();
    };
  }, []);

  function layer(id: string): Layer {
    const have = layers.current.get(id);
    if (have) return have;
    const el = document.createElement("div");
    el.className = "ipl";
    el.dataset.prompts = id;
    // the places page's canvas is a fixed layer at z 20: its boxes' prompts go over it
    if (views) el.style.zIndex = "21";
    const kw = coarse.current ? KEY_TOUCH : KEY;
    const items = pts.current.map((p, i) => {
      const root = document.createElement("div");
      root.className = "ipp";
      const tag = document.createElement("div");
      tag.className = "ipt";
      tag.innerHTML = `<i class="ipd"></i>`;
      tag.append(p.code);
      const stk = document.createElement("button");
      stk.type = "button";
      stk.tabIndex = -1;
      stk.className = "ips";
      stk.style.left = `${-(2 + kw / 2)}px`;
      stk.setAttribute("aria-label", `Open ${p.name}`);
      const k = document.createElement("span");
      k.className = "ipk";
      k.style.width = `${kw}px`;
      k.textContent = coarse.current ? "Tap" : "E";
      const body = document.createElement("span");
      body.className = "ipb";
      const codeLine = document.createElement("span");
      codeLine.className = "ipc";
      codeLine.innerHTML = `<i class="ipd"></i>`;
      const code = hold("", `${p.code} · ${p.kicker}`);
      codeLine.append(code.outer);
      const name = hold("ipn", p.name);
      body.append(codeLine, name.outer);
      stk.append(k, body);
      stk.addEventListener("click", (e) => {
        e.stopPropagation();
        if (st.current[i].state !== OPEN) return;
        press(i);
        p.open();
      });
      root.append(tag, stk);
      el.append(root);
      return { root, tag, stk, code: code.live, name: name.live, tw: 0, th: 0, sw: 0, sh: 0, last: "", alpha: 0 };
    });
    // beside the canvas, not on <body>: the page's fixed root is its own stacking context, and
    // the HUD's stickers in it must stay over these
    if (host.current) host.current.after(el);
    else document.body.append(el);
    const made = { el, items, box: "" };
    layers.current.set(id, made);
    // a point that is already open shows in the new layer too
    st.current.forEach((s, i) => s.state === OPEN && drawIn(made.items[i], 0));
    return made;
  }

  function drawIn(it: El, delay: number) {
    const d = reduced.current ? 0 : 1;
    it.stk.dataset.open = "";
    it.stk.style.visibility = "visible";
    it.stk.getAnimations().forEach((a) => a.cancel());
    // M01 Draw, top to bottom, the shadow kept inside the clip
    it.stk.animate([{ clipPath: "inset(-5px -5px 100% -5px)" }, { clipPath: "inset(-5px -5px -5px -5px)" }], { duration: 300 * d, delay: delay * d, easing: "cubic-bezier(.6,0,.2,1)", fill: "both" });
    // M06 Pop for the key
    it.stk.firstElementChild?.animate([{ transform: "scale(0)" }, { transform: "scale(1)" }], { duration: 280 * d, delay: delay * d, easing: "cubic-bezier(.3,1.7,.5,1)", fill: "both" });
  }

  function wipeOut(it: El) {
    delete it.stk.dataset.open;
    // the wipe overrides the draw's clip; a key press still running finishes under it
    const a = it.stk.animate([{ clipPath: "inset(-5px -5px -5px -5px)" }, { clipPath: "inset(-5px -5px -5px 100%)" }], { duration: reduced.current ? 0 : 220, easing: "cubic-bezier(.55,0,1,.45)", fill: "both" });
    a.onfinish = () => {
      if (!it.stk.dataset.open) it.stk.style.visibility = "hidden";
    };
  }

  function press(i: number) {
    if (reduced.current) return;
    for (const l of layers.current.values())
      l.items[i].stk.animate([{ translate: "0 -50%" }, { translate: "3px calc(-50% + 3px)", boxShadow: "0 0 0 #111", offset: 0.35 }, { translate: "0 -50%" }], { duration: 220, easing: "ease-out" });
  }

  function reveal(i: number, now: number) {
    const s = st.current[i];
    if (s.state === OPEN) return;
    s.state = OPEN;
    s.t0 = now;
    s.done = false;
    for (const l of layers.current.values()) drawIn(l.items[i], 0);
    paper(true);
  }

  function conceal(i: number) {
    const s = st.current[i];
    if (s.state === CONCEALED) return;
    const was = s.state;
    s.state = CONCEALED;
    if (was !== OPEN) return;
    for (const l of layers.current.values()) wipeOut(l.items[i]);
    paper(false);
  }

  useFrame((state) => {
    const list = pts.current;
    if (!list.length) return;
    const s = getState();
    const now = performance.now();
    // HIDDEN until the opening has swept out; the garage sequence hides every one
    const hide = !s.revealed || garageView.dom !== null;
    if (s.revealed) st.current.forEach((p, i) => p.state === HIDDEN && conceal(i));
    // the open one: the link the car is at, else the place; a place's sheet open steps it back
    const want = hide || s.zone ? null : s.nearLink ? `link-${s.nearLink}` : s.near;
    const next = want ? list.findIndex((p) => p.id === want) : -1;
    if (next !== active.current) {
      if (active.current >= 0) conceal(active.current);
      active.current = next;
    }
    if (next >= 0) reveal(next, now);

    host.current ??= state.gl.domElement.parentElement?.parentElement ?? null;
    const vs: PromptView[] = views ? views() : [{ id: "world", el: state.gl.domElement, camera: state.camera }];
    // every box's rect first, before this frame writes anything
    const rects = vs.map((view) => view.el.getBoundingClientRect());
    vs.forEach((view, k) => {
      if (!view.camera) return;
      const l = layer(view.id);
      const r = rects[k];
      const W = r.width;
      const H = r.height;
      const off = hide || W < 4 || H < 4 || r.bottom < 0 || r.top > window.innerHeight;
      const box = off ? "none" : `${r.left},${r.top},${W},${H}`;
      if (box !== l.box) {
        l.box = box;
        l.el.style.display = off ? "none" : "";
        if (!off) Object.assign(l.el.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${W}px`, height: `${H}px` });
      }
      if (off) return;
      const camera = view.camera;
      camera.updateMatrixWorld();
      camera.getWorldPosition(cam.current);
      // project every point, nearest first; the open sticker claims its box before any tag
      const order = list
        .map((p, i) => {
          v.current.copy(p.pos).project(camera);
          const inFront = v.current.z > -1 && v.current.z < 1;
          return { i, x: (v.current.x * 0.5 + 0.5) * W, y: (-v.current.y * 0.5 + 0.5) * H, d: cam.current.distanceTo(p.pos), inFront };
        })
        .sort((a, b) => (a.i === active.current ? -1 : b.i === active.current ? 1 : a.d - b.d));
      const taken: [number, number, number, number][] = [];
      const free = (x0: number, y0: number, x1: number, y1: number) => !taken.some(([a0, b0, a1, b1]) => x0 < a1 + GAP && x1 > a0 - GAP && y0 < b1 + GAP && y1 > b0 - GAP);
      for (const o of order) {
        const it = l.items[o.i];
        const p = list[o.i];
        if (!it.tw && it.tag.offsetWidth) {
          it.tw = it.tag.offsetWidth;
          it.th = it.tag.offsetHeight;
          it.sw = it.stk.offsetWidth;
          it.sh = it.stk.offsetHeight;
        }
        const onScreen = o.inFront && o.x > -it.sw && o.x < W + 40 && o.y > -60 && o.y < H + 60;
        // behind the camera a projection comes out mirrored: the point steps out of the layer
        const t = o.inFront ? `translate3d(${o.x.toFixed(1)}px,${o.y.toFixed(1)}px,0)` : "translate3d(-9999px,0,0)";
        if (t !== it.last) {
          it.root.style.transform = t;
          it.last = t;
        }
        let a = 0;
        if (o.i === active.current) {
          if (onScreen) {
            const kw = coarse.current ? KEY_TOUCH : KEY;
            const x0 = o.x - kw / 2 - 2;
            taken.push([x0, o.y - it.sh / 2, x0 + it.sw + 3, o.y + it.sh / 2 + 3]);
          }
        } else if (onScreen && st.current[o.i].state === CONCEALED) {
          // fade out over the last 15% of the reach
          const k = THREE.MathUtils.clamp((p.far - o.d) / (p.far * 0.15), 0, 1);
          const box = [o.x - it.tw / 2, o.y - it.th / 2, o.x + it.tw / 2 + 2, o.y + it.th / 2 + 2] as const;
          if (k > 0 && free(...box)) {
            a = k;
            taken.push([...box]);
          }
        }
        // ease toward the target so a tag that is crowded out or comes back never pops
        it.alpha += (a - it.alpha) * 0.25;
        if (Math.abs(it.alpha - a) < 0.01) it.alpha = a;
        it.tag.style.opacity = it.alpha.toFixed(3);
        if (p.zone) {
          const seen = s.found.includes(p.zone);
          if (seen !== it.tag.hasAttribute("data-seen")) it.tag.toggleAttribute("data-seen", seen);
        }
      }
    });

    // M03 Decode on the open sticker: the code from 60 ms, the name from 120 ms, .3 s each; the
    // last write is always the full text, however long a frame took
    const i = active.current;
    const cur = st.current[i];
    if (i >= 0 && !cur.done) {
      const k = reduced.current ? 2 : (now - cur.t0) / 300;
      const p = list[i];
      const c = decoded(`${p.code} · ${p.kicker}`, k - 0.2);
      const n = decoded(p.name, k - 0.4);
      for (const l of layers.current.values()) {
        l.items[i].code.textContent = c;
        l.items[i].name.textContent = n;
      }
      cur.done = k >= 1.4;
    }
  });

  return null;
}
