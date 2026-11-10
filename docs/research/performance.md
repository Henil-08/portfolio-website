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

## After, round 1

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

The teardown garage cost twice the draw calls of driving (1,100 vs 525) and about twice the main
thread (7 vs 4 ms on the Mac; 37-39 fps at 4x throttle, where Auto stepped down to Low within a few
seconds): the garage's own scene on top of the whole island. Round 2 (below) fixes that.

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

## Round 2: the garage, the draw budget, shimmer

Same harness, production build of commit 48a3442. Before is round 1 above.

| config | cond | fps | mean | p95 | p99 | max | cpu (mean/p95) | >33 | calls | tris | GPU MB | DPR | tier |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| chrome | day | 60 | 16.7 | 17.5 | 17.7 | 18.2 | 4.1 / 4.7 | 0 | 431 | 0.78 M | 123 | 1.75 | High |
| chrome | night | 60 | 16.7 | 17.4 | 17.6 | 17.9 | 3.9 / 4.5 | 0 | 414 | 0.75 M | 123 | 1.75 | High |
| chrome | rain | 60 | 16.7 | 17.1 | 17.5 | 17.9 | 4 / 4.6 | 0 | 428 | 0.77 M | 123 | 1.75 | High |
| chrome | garage | 60 | 16.7 | 17.4 | 17.6 | 22 | 2.8 / 3.2 | 0 | 246 | 0.20 M | 147 | 1.75 | High |
| chrome4x | day | 58.7 | 17 | 19.4 | 22.4 | 36.3 | 14.9 / 17.5 | 1 | 431 | 0.79 M | 123 | 1.75 | High |
| chrome4x | night | 58.9 | 17 | 19.3 | 22.1 | 30.2 | 15 / 17.6 | 0 | 413 | 0.75 M | 123 | 1.75 | High |
| chrome4x | rain | 58.6 | 17.1 | 19.5 | 21.7 | 29.6 | 15.3 / 17.6 | 0 | 427 | 0.77 M | 123 | 1.75 | High |
| chrome4x | garage | 60 | 16.7 | 18.3 | 19.9 | 30.7 | 7.6 / 9.7 | 0 | 246 | 0.20 M | 147 | 1.75 | High |
| mobile | day | 60 | 16.7 | 18.1 | 18.9 | 25.5 | 10.3 / 12.5 | 0 | 390 | 0.66 M | 97 | 1.25 | Low (light) |
| mobile | night | 60 | 16.7 | 18 | 18.7 | 23.2 | 10.2 / 12.4 | 0 | 370 | 0.62 M | 97 | 1.25 | Low (light) |
| mobile | rain | 60 | 16.7 | 17.7 | 18.4 | 23.4 | 10.9 / 13.5 | 0 | 384 | 0.65 M | 97 | 1.25 | Low (light) |
| mobile | garage | 60 | 16.7 | 18.2 | 19 | 28 | 5.1 / 6.9 | 0 | 187 | 0.19 M | 122 | 1.25 | Low (light) |
| webkit | day | 60 | 16.7 | 19 | 19 | 21 | 4.9 / 6 | 0 | 433 | 0.79 M | 123 | 1.75 | High |
| webkit | night | 59.9 | 16.7 | 19 | 19 | 46 | 4.8 / 6 | 4 | 414 | 0.75 M | 123 | 1.75 | High |
| webkit | rain | 59.3 | 16.9 | 18 | 19 | 472 | 4.8 / 6 | 1 | 427 | 0.77 M | 123 | 1.75 | High |
| webkit | garage | 59.7 | 16.7 | 18 | 19 | 53 | 3.4 / 4 | 9 | 246 | 0.20 M | 147 | 1.75 | High |

Before (round 1) → after (round 2):

- **Teardown garage**: Chrome 1,141 → 246 draws, 2.26 M → 0.20 M triangles, main thread 7.2 → 2.8 ms
  (driving: 3.9-4.1). 4x throttle 37 → 60 fps (main thread 23.6 → 7.6 ms; driving 14.9-15.3), and Auto
  no longer drops to Low there. Mobile emulation 39 → 60 fps (main thread 23.3 → 5.1 ms, 187 draws).
  WebKit 1,141 → 246 draws, main thread 7.5 → 3.4 ms. The garage is now cheaper than driving on every
  config. What is left in it is the teardown's own project switch: on WebKit a flip costs one frame of
  about 20 ms of main thread (frames of 42-53 ms every 4 s in the run, 9 in 40 s); Chrome absorbs it.
- **Driving**: draws 515-530 → 413-433 a frame (all passes: shadow, scene, AO transparency, post),
  triangles 2.08-2.09 M → 0.75-0.79 M (phones 1.96 M → 0.62-0.66 M). Main thread unchanged (the
  per-copy test costs about what the skipped draws saved on the CPU side; the saving is the GPU's).
  4x throttle: longest frame 99.5 → 36 ms, p95 19.3-19.5.
- **Look**: the pinned stills of the final build (6 s runs, so the sun stands where it stood) against
  the baseline: mean difference 0.26-0.60/255, 0.005-0.25 % of pixels off by more than 24, the same
  as round 1. (The stills taken after the 40 s laps differ from the baseline's by the sun's move over
  the lap, so they aren't comparable.)


### What changed

1. **The world behind a parked garage bay** (`components/world/indoor.ts`, called from
   `garage/GarageShow.tsx`). Once the stand-in has parked and the camera is in the drawing view
   (`garageView.k` = 1) the bay's walls fill the picture, yet the whole island was still drawn
   behind them and into the shadow map. Now, while it lasts, every subtree whose bounds lie outside
   the room (the bay frame with a margin; an instanced mesh counts as inside if any copy stands in
   the room) is left out of each render: the scene's `onBeforeRender` hides it and `onAfterRender`
   puts every flag back, so no other code ever sees it hidden. Those subtrees' matrices stop
   updating and the physics stops stepping. Esc starts the back-out, `k` drops below 1 that frame
   and the world is whole again before it is drawn, so the drive-in and back-out show the world as
   before. Pinned still in the bay, A/B: mean difference 0.09/255, under the noise of two stills of
   the same version (0.14/255, a project part that turns).
2. **Island-wide instanced meshes culled copy by copy** (`components/world/instanceCull.ts`; the
   town's built parts, the trackside furniture, the trees). They are one InstancedMesh each, spread
   over the island, so three.js can't cull them: every copy went through the vertex shader twice a
   frame. Once a frame, after the camera and the sun have moved, each copy's bounding sphere is
   tested against the camera's frustum and the sun's shadow frustum (the tests three.js makes for a
   plain mesh) and only those in either are written to the front of the buffers. Every copy and
   every shadow on screen is drawn as before. A first version also culled a mesh whole when none of
   its copies were in view; that stopped the trees' registry (it works in the mesh's
   `onBeforeRender`) and the trees were missing in the production stills, so it was taken out
   (48a3442) and the stills checked again: chase/wide x day/night/rain vs the baseline, mean
   difference 0.26-0.60/255, the same as round 1.
3. **Fence wires without the crawl** (`components/world/wireAA.ts`, the debris fence and the kit's
   wire panels). A plain alpha test cut each sub-pixel wire on or off per pixel; the same cut, at the
   same threshold, is now spread over one pixel of the alpha's own gradient and the edge blends.
   The wires stand where they stood and fade out at the same distance. Stills: mean difference
   1.3/255 on a crop of the bar fence (softer wire edges), 0.19/255 on the full frame; frame to frame
   with the camera moved a few millimetres, pixels that flip by more than 24 levels on the fence crop
   went 10.7 % → 9.7 %. A modest gain: SMAA already caught most of it. Kerbs are geometry, which
   SMAA handles; nothing to do there without changing the look.

### Measured and not done

- **`matrixAutoUpdate` off for static objects**: the world has 2,726 objects, and a forced update of
  all their matrices takes 0.15 ms on the Mac. Not worth a risk of frozen props.
- **Merging the town's meshes**: after the culling, a chase frame is ~160 draws in the main pass and
  ~130 in the shadow pass, plus ~30 for the post chain. The largest single group left is the player's
  vehicle, about 54 meshes drawn twice (106 calls): merging them would touch the wheels, steering,
  liveries, the swap and the reveal patch, so it is left for a change of its own.
- **Distance LOD / culling with fades**: past the fog's far end things are drawn in the fog colour,
  while the sky behind them is a gradient, so culling them would show; and the chase camera rarely
  sees that far. The per-copy culling above takes what is off screen without any popping.


## Round 3: the vehicle in few meshes, the teardown's switch frame

Same harness, production build of commit 95497d5. Before is round 2 above.

| config | cond | fps | mean | p95 | p99 | max | cpu (mean/p95) | >33 | calls | tris | GPU MB | DPR | tier |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| chrome | day | 60 | 16.7 | 17.4 | 17.7 | 18.1 | 4.4 / 5 | 0 | 350 | 0.78 M | 123 | 1.75 | High |
| chrome | night | 60 | 16.7 | 17 | 17.5 | 18.2 | 4.4 / 5.1 | 0 | 332 | 0.75 M | 123 | 1.75 | High |
| chrome | rain | 60 | 16.7 | 17.5 | 17.7 | 18 | 4.2 / 4.9 | 0 | 345 | 0.77 M | 123 | 1.75 | High |
| chrome | garage | 60 | 16.7 | 16.9 | 17.3 | 20.8 | 2.9 / 3.5 | 0 | 245 | 0.20 M | 147 | 1.75 | High |
| chrome4x | day | 56.8 | 17.6 | 21.2 | 24.2 | 28.9 | 15.7 / 19.2 | 0 | 349 | 0.78 M | 123 | 1.75 | High |
| chrome4x | night | 54.8 | 18.2 | 23 | 25.8 | 33.1 | 16.3 / 20.7 | 0 | 332 | 0.75 M | 123 | 1.75 | High |
| chrome4x | rain | 52 | 19.2 | 25.8 | 30.7 | 130.4 | 17.5 / 23.6 | 7 | 346 | 0.71 M | 113 | 1.5 | Balanced |
| chrome4x | garage | 59.9 | 16.7 | 17.7 | 19.8 | 33.8 | 8.2 / 11.8 | 1 | 245 | 0.20 M | 137 | 1.5 | Balanced |
| mobile | day | 59.2 | 16.9 | 19.1 | 21.3 | 27.1 | 12.5 / 17.3 | 0 | 308 | 0.66 M | 97 | 1.25 | Low (light) |
| mobile | night | 59.9 | 16.7 | 17.6 | 18.7 | 35.9 | 10.9 / 14.4 | 1 | 288 | 0.62 M | 97 | 1.25 | Low (light) |
| mobile | rain | 56.9 | 17.6 | 21.5 | 25.5 | 30.7 | 13.9 / 19.4 | 0 | 301 | 0.64 M | 97 | 1.25 | Low (light) |
| mobile | garage | 60 | 16.7 | 17.7 | 18.3 | 31.8 | 5.6 / 7.7 | 0 | 187 | 0.19 M | 122 | 1.25 | Low (light) |
| webkit | day | 60 | 16.7 | 18 | 18 | 24 | 5.2 / 6 | 0 | 352 | 0.79 M | 123 | 1.75 | High |
| webkit | night | 60 | 16.7 | 17 | 18 | 27 | 5.2 / 6 | 0 | 332 | 0.75 M | 123 | 1.75 | High |
| webkit | rain | 59.6 | 16.8 | 18 | 25 | 79 | 5.4 / 6 | 6 | 346 | 0.77 M | 123 | 1.75 | High |
| webkit | garage | 59.7 | 16.7 | 17 | 19 | 40 | 3.6 / 4 | 8 | 245 | 0.20 M | 147 | 1.75 | High |

Round 2 → round 3:

- **Draw calls while driving**: 413-433 → 332-350 on desktop, 370-390 → 288-308 on the phone
  emulation (all passes: shadow, scene, AO transparency, post). At the pinned chase pose in dev,
  304 → 225. The 300 budget is met on phones and at that pose; a full lap's average on desktop
  is 330-350, the remainder being the town's plain meshes and ~30 post-chain draws.
- **Main thread**: this run read 0.3-2 ms a frame higher than round 2 on every config, which is the
  machine (other agents' browsers were running; the 4x configs swing the most). A direct A/B in one
  page, same pose, bake on and off alternated four times at 4x throttle: 11.7 ms on, 12.2 ms off.
  The bake saves main-thread time, slightly.
- **Teardown switch on WebKit**: worst main-thread frame 22-27 → 14 ms over eight switches (dev,
  measured directly); in the lap harness the WebKit garage now has no frame over 40 ms (it had
  frames of 42-53 ms every switch), 8 frames of 34-40 ms in 40 s, which are the GPU side of the one
  sheet that goes up that frame (the main thread is under 5 ms in them).
- **Look**: pinned stills of this build against the baseline, chase and wide, day, night and rain:
  mean difference 0.27-0.89/255, 0.01-0.35 % of pixels off by more than 24 (rain particles in the
  0.89), the same as rounds 1 and 2.


### What changed

1. **The player's vehicle baked per rigid part** (`components/world/vehicles/merge.ts`, run from
   `Vehicle.tsx`). Each model is built from 60-70 small meshes, every one a draw call in the view
   and another in the shadow map. Once the vehicle has settled (mounted, any swap finished, about
   0.75 s), the meshes that move together are baked into one mesh per material on the group that
   moves them: the body, each wheel's spin, steer and swap groups, the TH-18's DRS flap. The baked
   mesh uses the same material and hangs on the same group, so it moves, lights, shades and casts
   exactly like the parts, which are hidden, not removed. Left as they are: the brake lamps and the
   wet-tyre bands (their materials are swapped at run time), anything textured or transparent, the
   Atlas's thrusters. A new vehicle or livery puts the parts back in the same commit (a layout
   effect), before the swap reads them, so the swap's part-by-part rise is unchanged; the bake comes
   back after it. A watchdog compares every hidden part's place on its group with where it was
   baked every 30 frames and undoes the bake for good if one moved on its own.
   Checked: four vehicles x five liveries, baked against unbaked at the same pose (the car shows no
   difference; what differs is grass wind, leaves and a radio card), the swap frozen mid-rise with
   and without the bake (same picture), a livery swap (0 baked meshes during it, back after).
   Draw calls at a close pose: TH-18 585 → 503, E14 695 → 509, Atlas 597 → 496, Apollo 592 → 514
   (10-17 baked meshes in place of 54-71).
2. **The teardown's switch frame** (`components/world/garage/teardown/studio.tsx`). Measured on
   WebKit: reading a project (`analyse`, 0-4 ms) and drawing its three sheets (1-6 ms) were cheap;
   the frame was the three canvas textures (4.6 Mpx with mipmaps) going to the GPU together. Now
   the wipe's paper is held over the sheets two frames longer while they go up one a frame, and the
   first drawing as the bay opens goes up one a frame too. WebKit, eight switches: the worst
   main-thread frame 27 → 14 ms, frames over 40 ms 4 → 1.

## Left, and why

- **Firefox**: unmeasured here (sandbox, above). Code review found nothing engine-specific: WebGL 2
  only, no OffscreenCanvas, no fullscreen API, long-task timing guarded.
- **Draw calls**: 330-350 a frame while driving on desktop (budget 300), of which ~30 are the post
  chain. Next: the town's small plain meshes merged per material, the way the vehicle is.
- **WebKit hitches**: the teardown's switch is down to one GPU-side frame of 34-40 ms (the largest
  sheet, 2048 x 1268 with mipmaps, going up); moving that upload off the main path would take
  ImageBitmaps, which older Safari handles unevenly. While driving, one to three frames of 45-79 ms
  per lap with an idle or 35 ms main thread, the same as the baseline's.
- `THREE.Clock` deprecation and Rapier's "deprecated parameters" init warnings come from
  @react-three/fiber and @react-three/rapier; they are warnings, not errors.


## look=next (the rendering polish pass)

`?look=next` (components/world/look.ts; docs/BRAND.md 2026-11-09) against the current look, same
harness, production build of commit 95b33a5 (plus the AO gating below), `SECS=25`, the other agent's
Blender bake off (`&bake=off`) so only this pass is measured. The machine was busy (Blender and a
Metal shader compiler at several cores during the runs), so the two looks were run interleaved,
current, next, current, next, and the comparison is pair by pair. Pair 2 (the quieter one):

| config | cond | current fps | next fps | current p95 | next p95 | current cpu | next cpu | calls (cur / next) | GPU MB (cur / next) | tier (cur / next) |
|---|---|---|---|---|---|---|---|---|---|---|
| chrome | day | 59.3 | 60 | 17.7 | 17.4 | 5.0 / 6.9 | 4.2 / 4.9 | 362 / 361 | 122.7 / 123.7 | High / High |
| chrome | night | 56 | 60 | 26.4 | 17.5 | 5.1 / 7.9 | 4.2 / 4.9 | 343 / 344 | 122.7 / 123.7 | High / High |
| chrome | rain | 60 | 60 | 17.0 | 17.2 | 4.1 / 4.7 | 4.4 / 5.1 | 361 / 360 | 122.8 / 123.7 | High / High |
| chrome | garage | 60 | 60 | 17.2 | 16.9 | 2.6 / 3.2 | 2.7 / 3.2 | 180 / 178 | 147.3 / 148.2 | High / High |
| chrome4x | day | 48 | 50 | 24.0 | 26.2 | 18.8 / 21.7 | 18.0 / 23.5 | 360 / 359 | 112.7 / 106.5 | Balanced / Low |
| chrome4x | night | 58 | 58.4 | 20.8 | 19.7 | 14.9 / 18.7 | 13.6 / 18.0 | 343 / 330 | 112.7 / 113.7 | Balanced / Balanced |
| chrome4x | rain | 51.2 | 48.7 | 28.4 | 28.5 | 17.3 / 26.0 | 18.6 / 26.1 | 353 / 355 | 105.6 / 106.5 | Low / Low |
| chrome4x | garage | 60 | 60 | 17.7 | 17.7 | 7.5 / 10.2 | 6.3 / 8.7 | 166 / 166 | 130.1 / 131 | Low / Low |
| mobile | day | 60 | 59.8 | 17.7 | 18.0 | 11.0 / 14.6 | 12.2 / 16.0 | 319 / 320 | 97.2 / 98.2 | Low / Low |
| mobile | night | 59.3 | 59.9 | 18.6 | 17.5 | 12.6 / 16.8 | 11.6 / 15.2 | 300 / 301 | 97.2 / 98.2 | Low / Low |

- **Desktop (Chrome, the Mac's GPU, DPR 1.75):** 60 fps on High in every condition with MSAA x4 on
  the composer, the HDRI, the clearcoat and the micro-textures; p95 17 ms, main thread 4.2-4.4 ms
  (current: 4.1-5.1). Draw calls unchanged (the contact shadow is one draw; the bake adds none).
  GPU memory +1 MB (the four micro-textures and the HDRI's PMREM; the MSAA target is the GPU's).
- **4x CPU throttle:** both looks stepped down the same way on this loaded machine (round 3 had
  56.8 fps on High for the current look; today the current look itself ran 48-58 and went to
  Balanced/Low). Next is within the run-to-run noise of current: 48.7-58.4 vs 48-58 fps, main
  thread 13.6-18.6 vs 14.9-18.8 ms. Auto steps down cleanly (one switch, no flicker).
- **Mobile emulation (Low, the light version):** 59.8-60 fps both; main thread +1 ms at 4x in
  pair 1, -1 ms in pair 2: noise. Low pays for none of the new costs (no MSAA, no micro-texture
  lookups, no grain; tone mapping is in the renderer's own pass).
- **Fixed after pair 1:** the baked AO (lookWorld.tsx `StaticAO`) first ran its per-vertex pass in
  one go, up to tens of ms for a big model, and a few models were left for the first lap on slow
  machines (chrome day: 95 frames over 33 ms). The pass is now sliced (1 ms a frame once driving,
  8 ms during the boot), runs on flat arrays, reads the GPU back asynchronously, never runs on Low
  once driving and never while a garage is open (the bay's room mounts then: pair 1's garage had
  16-20 frames over 33 ms, pair 2 none). Boot: 129 models, 224k vertices, ~140 ms of main thread
  in all, done before the select screen on the Mac.

Measured and not done: MSAA at DPR 1.75 is free on the Mac's tile GPU; a discrete GPU at 4K may
want DPR 1.5 with it. Tier rules are unchanged, so Auto would step down there as before.

## Baked light on look=next (2026-11-09)

scripts/bake/run.mjs bakes AO, sun visibility and bounce for 230 static meshes (terrain, road,
kerbs, buildings, trackside, hardscape) into six maps (components/world/bake/*). Production build,
`?look=next` against `?look=next&bake=off`, same harness (25 s laps, day and night):

| config | cond | fps | mean | p95 | p99 | max | calls | GPU MB |
|---|---|---|---|---|---|---|---|---|
| chrome, bake=off | day | 60 | 16.7 | 17.2 | 17.5 | 18.1 | 361 | 124 |
| chrome, bake | day | 60 | 16.7 | 17.5 | 17.8 | 19.1 | 362 | 164 |
| chrome, bake | night | 60 | 16.7 | 17.1 | 17.5 | 18.4 | 344 | 164 |
| chrome4x, bake=off | day | 48 | 20.8 | 27.6 | 30.8 | 116 | 351 | 107 |
| chrome4x, bake | day | 54.3 | 18.4 | 25 | 28.8 | 79 | 350 | 147 |
| mobile, bake | day | 58.7 | 17 | 19.6 | 21.4 | 24 | 320 | 98 |

- Frame cost: none measurable (one texture read and a few multiplies on the baked meshes; no
  extra draw calls, a few more programs).
- GPU memory: +40 MB (7.5 Mpx of maps with mipmaps, RGBA8). Low tier (phones) never loads it.
  An Auto drop to Low after it has loaded (chrome4x above) keeps it.
- Download: 4.6 MB (WebP maps 3.6 MB, light-map uv 1.2 MB), fetched 3 s after the reveal.
- Coming in: matched and swapped one chunk a frame, programs compiled in parallel first, maps
  uploaded one a frame. The first version's 730 ms frame (StaticAO re-cloning baked materials,
  which then compiled unpatched) is gone: no frame over 33 ms from it on chrome.

### look=next polish fixes (2026-11-09, later)

The bake and the per-vertex AO now ease in (0.9 s and 0.6 s), the tone map keeps part of its
toe, a night lamp rides over the car (one point light, always present, 0 by day) and the trees'
unwritten instance slots are empty matrices. Production build, `?look=next` with the bake,
`SECS=25`:

| config | cond | fps | p95 | p99 | max | cpu | calls | GPU MB | tier |
|---|---|---|---|---|---|---|---|---|---|
| chrome | day | 60 | 17.5 | 17.7 | 20.3 | 4.3 | 362 | 165 | High |
| chrome | night | 60 | 17.4 | 17.7 | 17.9 | 4.1 | 343 | 165 | High |
| chrome4x | day | 48.9-50.5 | 23.5-26.1 | 28-33 | 42-43 | 18.1-18.7 | 358-360 | 165 | High |
| chrome4x | night | 51.8-56.5 | 20.5-23 | 22.6-26.6 | 31-35 | 16.2-17.7 | 340-344 | 155-165 | High / Balanced |
| mobile | day | 59.9 | 17.8 | 18.7 | 21.5 | 12.3 | 322 | 98 | Low |
| mobile | night | 60 | 18.5 | 19.2 | 21.9 | 11.5 | 301 | 98 | Low |

- Same as before the fixes (chrome p95 17.1-17.5, 362/344 calls, 164 MB; mobile 58.7 fps): the
  night lamp costs nothing measurable and the AO ramp's re-uploads stay inside the frame.
- One of four chrome4x day runs had a single 1.9 s long task as Auto stepped down to Balanced;
  the other three had none over 43 ms. A forced High to Balanced switch at 4x measures 176 ms on
  look=next against 81 ms on the current look (the post chain is rebuilt); left as it is.
