# Performance and smoothness

Owner, 2026-11-07: "Keep my existing identity, don't change things; polish it and make it run smooth
on any browser, with no bugs." So nothing here changes the look on the default (High) tier: the
before/after stills at pinned cameras differ only by the grass's wind and the garage slides' clocks.

## How it is measured

- `?perf` in the URL (any build, production included) mounts `components/world/perf.tsx`, which
  exposes `window.__perf`: `stage()`, `scene(time, weather)`, `zone(id)` / `open(id)`, `start()` /
  `stop()` (frame stats), `info()`, `top(n)` (heaviest visible draws), `transparent()`.
- `scripts/perf.mjs` drives it with Playwright (installed outside the repo, `PW=<dir>`): it boots
  the real opening (no `?skip`, so the warm-up runs as for a visitor), presses Enter, then for each
  condition puts the car at the same track point and drives the same lap with `scripts/drive.js`
  for 40 s while sampling every frame. Conditions: day, night, rain (eased in first), and the
  teardown garage (enter Agents, flip to the next project every 4 s). Stills at two pinned cameras
  per condition (`SHOTS=`) are the before/after look check.
- Columns: fps; mean, p95, p99 and the longest frame (ms, wall clock between frames); `cpu` is the
  main thread's share of a frame (every `useFrame`, the physics step and the GL calls of every
  pass, mean / p95), so it shows headroom that a 60 Hz vsync hides; calls and triangles per frame
  (shadow pass, scene and every post pass); `>33` frames over 33 ms; JS heap (Chrome only); a GPU
  memory estimate (unique buffers, textures, the drawing buffer and the shadow map).
- Configs: **chrome** (Google Chrome 156, headless, ANGLE Metal on the M4 Pro), **chrome4x** (the same
  with a 4x CPU throttle), **mobile** (390x844, DPR 3, touch, coarse pointer, 4x CPU throttle; the
  GPU is still the Mac's, which no emulation can slow down), **webkit** (Playwright WebKit 26,
  Safari's engine, headless). Desktop viewports are 1280x800 at DPR 2 (a Retina screen).
- Production build: `npx next build && npx next start -p 3160`. Other agents had browsers and dev
  servers running on the same machine, so expect a frame or two of noise in `max`.
- **Firefox could not be run here.** Playwright's Firefox starts its own sandbox, which the agent's
  macOS sandbox refuses (`sandbox_extension_issue_file_to_process failed`), and no other Firefox is
  installed. The harness supports it: `PW=<dir> node scripts/perf.mjs out.json firefox`.

```sh
npm i --prefix /tmp/pw playwright && npx --prefix /tmp/pw playwright install firefox webkit
PW=/tmp/pw node scripts/perf.mjs /tmp/perf.json chrome,chrome4x,mobile,firefox,webkit
```

## Baseline (commit 85e89f1, before any change)

| config | cond | fps | mean | p95 | p99 | max | cpu (mean/p95) | >33 | calls | tris | heap MB | GPU MB | DPR |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| chrome | day | 60 | 16.7 | 17.3 | 17.5 | 17.9 | 4.2 / 4.9 | 0 | 526 | 2.09 M | 91 | 123 | 1.75 |
| chrome | night | 60 | 16.7 | 17.4 | 17.7 | 18.0 | 4.9 / 6.0 | 0 | 517 | 2.08 M | 102 | 123 | 1.75 |
| chrome | rain | 60 | 16.7 | 17.4 | 17.7 | 18.1 | 4.8 / 5.7 | 0 | 525 | 2.09 M | 89 | 123 | 1.75 |
| chrome4x | day | 51.5 | 19.4 | 27.3 | 31.1 | 215 | 16.3 / 24.6 | 9 | 493 | 2.09 M | 137 | 111 | 1.25 |
| chrome4x | night | 54.7 | 18.3 | 23.8 | 26.1 | 28.4 | 15.3 / 21.6 | 0 | 480 | 2.08 M | 115 | 111 | 1.25 |
| chrome4x | rain | 58.4 | 17.1 | 20.5 | 23.3 | 48.9 | 13.6 / 18.5 | 2 | 489 | 2.09 M | 112 | 111 | 1.25 |
| mobile | day | 60 | 16.7 | 17.8 | 18.4 | 22.0 | 11.9 / 14.4 | 0 | 486 | 1.97 M | 108 | 97 | 1.25 |
| mobile | night | 59.8 | 16.7 | 18.0 | 19.4 | 28.5 | 11.9 / 14.9 | 0 | 475 | 1.96 M | 96 | 97 | 1.25 |
| mobile | rain | 60 | 16.7 | 17.8 | 18.4 | 22.8 | 12.3 / 14.6 | 0 | 483 | 1.96 M | 104 | 97 | 1.25 |
| webkit | day | 59.8 | 16.7 | 19 | 23 | 44 | 6.4 / 8 | 4 | 530 | 2.09 M | n/a | 123 | 1.75 |
| webkit | night | 60 | 16.7 | 19 | 23 | 28 | 6.1 / 7 | 0 | 517 | 2.08 M | n/a | 123 | 1.75 |
| webkit | rain | 59.9 | 16.7 | 19 | 21 | 41 | 6.2 / 7 | 3 | 525 | 2.09 M | n/a | 123 | 1.75 |

Boot (navigation to the garage select, ms): chrome 4057, chrome4x 8426, mobile 8200, webkit 17483.

What the baseline showed:

- On the Mac's GPU, Chrome already held 60 fps with 4-5 ms of main-thread work a frame.
- **chrome4x had silently dropped to the light version** (programs 63, framebuffer 12 MB): drei's
  `PerformanceMonitor` turned `fancy` off for good after the reveal, which removed the whole post
  chain, and with it the only anti-aliasing (the desktop canvas is created without MSAA), so a
  slow desktop got jagged, shimmering kerbs, fences and edges, plus no AO, bloom or vignette.
- A CPU profile of a throttled lap: ~25 % of the main thread was N8AO's transparency pass, which
  walked the scene four times into a `Map` and drew the scene twice more each frame, each draw
  updating every matrix in the world again and redrawing the shadow map (with only the
  transparent casters in it). The scene has transparent labels and glass, so N8AO turns this on.
- The physics step used the time the frame's callback ran rather than the display's frame time,
  so the car stepped by a millisecond or so of jitter against a camera smoothed on the same delta.
- Smoothing was `Math.min(1, dt * k)` everywhere: right at 60 fps, but a different camera lag and
  ease at 30, 120 or 144 Hz.

## After

Same harness, same lap, production build of commit f5d5816 (Auto quality on every config; the tier
it ran is in the last column).

| config | cond | fps | mean | p95 | p99 | max | cpu (mean/p95) | >33 | calls | tris | GPU MB | DPR | tier |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| chrome | day | 60 | 16.7 | 17.4 | 17.7 | 18.1 | 3.9 / 4.7 | 0 | 526 | 2.09 M | 123 | 1.75 | High |
| chrome | night | 60 | 16.7 | 17.3 | 17.6 | 17.8 | 3.9 / 4.6 | 0 | 517 | 2.08 M | 123 | 1.75 | High |
| chrome | rain | 60 | 16.7 | 17.5 | 17.7 | 30.3 | 4.0 / 4.7 | 0 | 524 | 2.09 M | 123 | 1.75 | High |
| chrome | garage | 60 | 16.7 | 17.2 | 17.5 | 19.6 | 7.2 / 8.4 | 0 | 1141 | 2.26 M | 147 | 1.75 | High |
| chrome4x | day | 56.4 | 17.7 | 23.4 | 27.9 | 99.5 | 14.8 / 20.9 | 4 | 528 | 2.04 M | 123 | 1.75 | High (one dip to Balanced and back) |
| chrome4x | night | 59.3 | 16.9 | 18.7 | 21.7 | 28.8 | 13.9 / 16.8 | 0 | 516 | 2.08 M | 123 | 1.75 | High |
| chrome4x | rain | 59.2 | 16.9 | 19.0 | 21.9 | 25.3 | 14.4 / 17.2 | 0 | 525 | 2.09 M | 123 | 1.75 | High |
| chrome4x | garage | 37.4 | 26.8 | 33.3 | 38.3 | 107 | 23.6 / 28.9 | 73 | 1053 | 2.14 M | 130 | 1.25 | → Low |
| mobile | day | 60 | 16.7 | 17.7 | 18.2 | 20.5 | 10.2 / 12.4 | 0 | 486 | 1.97 M | 97 | 1.25 | Low (light) |
| mobile | night | 60 | 16.7 | 17.7 | 18.2 | 36.5 | 10.0 / 12.1 | 1 | 475 | 1.96 M | 97 | 1.25 | Low (light) |
| mobile | rain | 60 | 16.7 | 17.6 | 18.2 | 21.5 | 10.5 / 12.8 | 0 | 482 | 1.96 M | 97 | 1.25 | Low (light) |
| mobile | garage | 38.8 | 25.8 | 29.7 | 35.5 | 44.6 | 23.3 / 26.1 | 32 | 1069 | 2.14 M | 122 | 1.25 | Low (light) |
| webkit | day | 60 | 16.7 | 18 | 18 | 23 | 4.8 / 6 | 0 | 527 | 2.09 M | 123 | 1.75 | High |
| webkit | night | 59.9 | 16.7 | 18 | 18 | 42 | 4.5 / 5 | 2 | 517 | 2.08 M | 123 | 1.75 | High |
| webkit | rain | 60 | 16.7 | 18 | 18 | 22 | 5.2 / 6 | 0 | 524 | 2.09 M | 123 | 1.75 | High |
| webkit | garage | 59.7 | 16.8 | 18 | 19 | 53 | 7.5 / 8 | 10 | 1141 | 2.26 M | 147 | 1.75 | High |

Navigation to the world revealed (ms, includes the harness's Enter): chrome 10927 → 10736,
chrome4x 15269 (baseline not captured), mobile 15277 → 13966, webkit 23981 → 13835. Boot is
unchanged or faster. Console: no errors on any engine; the only warnings are the two library
deprecations below. (WebKit's `performance.now()` is coarse, 1 ms, hence its whole-number columns.)

Before → after, driving (day, night, rain):

- **chrome**: was already at the target; main thread 4.2-4.9 → 3.9-4.0 ms a frame.
- **chrome4x**: before it only reached 51-58 fps by dropping to the light version for good (no
  AA, no AO, no bloom); now it keeps the full High look and runs faster: 56-59 fps, p95 18.7-23.4
  (was 20.5-27.3), main thread 13.9-14.8 ms (was 13.6-16.3 with far less to draw). The first lap's
  longest frame went 215 → 99.5 ms (two long tasks on the first lap only; the later laps have none).
- **mobile** (light version, as before): 60 fps, main thread 10.0-10.5 ms (was 11.9-12.3).
- **webkit**: p95 19 → 18, p99 21-23 → 18, frames over 33 ms 7 → 2, main thread 6.1-6.4 → 4.5-5.2 ms.

Look: stills at two pinned cameras (the chase pose at track t = 0.3 and a wide view over the pit
and the park), day, night and rain, before vs after on Chrome: mean difference 0.23-0.61 per
channel out of 255, 0.006-0.25 % of pixels off by more than 24; the only differing shapes are the
garage slides (their own clock) and the grass's wind. Stills: the scratchpad's `perf/shots/`
(not committed).

The teardown garage costs twice the draw calls of driving (1,100 vs 525) and about twice the main
thread (7 vs 4 ms on the Mac; 37-39 fps at 4x throttle, where Auto steps down to Low within a few
seconds). It is the garage's own scene on top of the world.

## What changed

1. **N8AO transparency pass, same pixels, a fraction of the cost** (`components/world/aoTransparency.ts`).
   N8AO's composite only reads the alpha and depth of its two transparency targets, so the patch
   draws the same objects into the same targets with one walk into flat arrays, reusing the
   matrices and the shadow map the beauty pass made a moment earlier. A/B stills at the same pose:
   mean difference 0.42/255, the same as two stills of the original version (0.37/255, grass wind).
2. **Quality tiers** (`components/world/quality.ts`, Settings → Quality: Auto / High / Balanced / Low).

   | tier | DPR cap | AO | grass | post |
   |---|---|---|---|---|
   | High (the approved look) | 1.75 | N8AO half res | 160k blades (400²) | AO, bloom, SMAA, vignette |
   | Balanced | 1.5 | N8AO half res | 80k (283²) | the same |
   | Low | 1.25 | off | 40k (200², the phone field as before) | bloom, SMAA, vignette; phones: none, MSAA canvas (the light version as before) |

   Auto starts on High with a fine pointer, Low with a coarse one (phones keep exactly what they had),
   and Low at once on a software renderer (SwiftShader, llvmpipe). Then it follows the measured
   frame time while driving (never during the opening, the quick garage or a hidden tab): windows
   of 90 frames, the median of each, so one hitch never moves a tier. Down after two windows in a
   row slower than 20.5 ms; up only after six windows in a row at the display's own refresh rate,
   20 s after the last step down, never above the tier the device started on, and never again after
   the second bounce. A switch costs a frame or two (a resize, the AO pass's shaders, the grass
   rebuilt), then 2.5 s of settling are ignored. Nothing a tier changes recompiles a world material:
   the soft shadows and the canvas's MSAA are fixed for the canvas's life. `?quality=high|balanced|low|auto`
   overrides it per load (headless checks that judge the look should pass `?quality=high`).
   The shadow map stays 2048² on every tier: its size was not where the time went, and halving it
   made the phone's shadows visibly blockier.
3. **Physics on the display's clock** (`World.tsx` `Stepper`): the variable step (the original's ticker,
   kept so the car's feel is unchanged) now takes requestAnimationFrame's timestamp delta, which is
   vsync-aligned, instead of the callback's `performance.now()`. The step was already per frame, so the
   rendered body is the simulated one at any refresh rate; this removes the main thread's jitter from it.
   A fixed step with interpolation would change the handling the owner tuned at 60 fps, so it was not done.
4. **Frame-rate independent smoothing** (`components/world/smooth.ts` `ease(rate, dt)`): exactly
   `Math.min(1, dt * rate)` at 60 fps, the same curve over time at 30/120/144 Hz. Camera follow, height
   and zoom, sun and sky, rain fade, wind boost, power envelopes, wheel and lean smoothing, flags.
5. **No WebGL 2, no endless boot** (`components/ui/NoWorld.tsx`): three r186 needs WebGL 2; without it
   the page shows a card in the brand frame with the resume, email, GitHub and LinkedIn instead of a
   boot that never ends. A crash anywhere in the world shows a "Stalled" card with Reload, never black.
6. **Safari**: older Safari's prefixed `webkitAudioContext` is used when `AudioContext` is missing.
   The GLBs use meshopt, quantization and WebP textures, all supported by Safari 15+ (and WebGL 2
   needs Safari 15 anyway); WebKit ran every condition with no console errors.
7. **Bug: stray white lines.** The wind streaks (the original's faint 10 m paper lines, 2 m over the
   grass) spawned round the car indoors too: in a garage bay, the driver's seat, the teardown and the
   boot's studio they read as a thin white line across the room. They now hide indoors. The power trail
   also restarts after a jump (teleport, reset, the garage's stand-in), where it could draw one straight
   ribbon from where the car had been.

## Left, and why

- **Firefox**: unmeasured here (sandbox, above). Code review found nothing engine-specific: WebGL 2
  only, no OffscreenCanvas, no fullscreen API, long-task timing guarded.
- **Draw calls ~520, triangles ~2.1 M a frame** (art-direction.md 2.11 budgets 300 and 1.5 M). The
  Mac doesn't feel it, but a weak GPU would. The biggest costs: island-wide instanced street props and
  trees (frustum culling off by design, so every instance also goes into the shadow map), 1,070 visible
  meshes, 596 shadow casters. Next steps: cull instanced shadow casters to the shadow camera's box,
  merge static town meshes, and stop updating matrices of objects that never move.
- **The teardown garage**: see the table: twice the draw calls and main-thread time of driving
  (the garage's own code; reported to its owner).
- `THREE.Clock` deprecation and Rapier's "deprecated parameters" init warnings come from
  @react-three/fiber and @react-three/rapier; they are warnings, not errors.
