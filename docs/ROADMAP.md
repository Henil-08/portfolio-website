# World v3 roadmap

Hand-off plan for the drivable portfolio. Any model or person should be able
to pick up the **first unticked step** from this file alone. Each step is
small, verified with headless screenshots, and committed on its own
(see "Working rules"). Tick items as they land and note the commit hash.

- Bar for look and feel: Bruno Simon's folio-2025 (MIT).
  Research brief: docs/research/bruno-folio-2025.md (map, night, interaction prompt, UI, terrain).
- Owner: Henil Gajjar. Copy rules: first-person, human, no AI tells, never invent facts
  (facts live in content/profile.ts, content/experience.ts, content/projects.ts).

## Where things live (orientation)

| Area | Files |
|---|---|
| Track, places, zones, crossings | components/world/layout.ts (`TRACK_POINTS`, `SECTORS`, `zones`, `PIT`, `TIMELINE`, `CROSSINGS`, `onBridge`, `nearCrossing`, `nearestT3`) |
| Terrain heights, pads, slope limit | components/world/terrain.ts (`heightAt`, `heightTexture`) |
| Road ribbon, kerbs, colliders | components/world/Island.tsx |
| Bridge | components/world/Bridge.tsx |
| Places (garages, sectors, pitches, letters, nature) | components/world/Places.tsx, models/sectors/*, models/props/* |
| Street dressing (barriers, lamps, skyline, run-off) | components/world/street/* |
| Living world (wind, grass, leaves, confetti, birds) | components/world/alive/*, components/world/Grass.tsx |
| Car | components/world/models/Car.tsx (`LIVERIES`, `DEFAULT_LIVERY`), Vehicle.tsx (physics) |
| Lighting, day/night, weather | components/world/Effects.tsx (`SCENES`), Rig.tsx (camera, sun, sky), World.tsx (canvas, post) |
| HUD and panels | components/ui/* (Hud.tsx, Panels.tsx, Intro.tsx, RadioMessages.tsx) |
| Store | components/world/store.ts (`near`, `zone`, `menuOpen`, `teleport`, `achievements`) |
| Audio | components/world/sound.ts, scripts/gen-audio.mjs, app/api/voice, content/radio.ts |
| Timeline (career plaza) | components/world/Timeline.tsx, components/world/timeline/* |

## Working rules

1. One focused change per commit; push after each (`git push`). End commit
   messages with the Co-Authored-By line the harness gives you.
2. Verify every visual change with screenshots before committing:
   - Dev server: `npx next dev -p 3100` (if CSS looks stale: stop it, `rm -rf .next/dev`, restart).
   - `node scripts/shoot.mjs /tmp/shots/x "wait:16000|shot:a" 1400 850 "http://localhost:3100/?skip"`
   - Hooks: `eval:window.__cam=[x,y,z,tx,ty,tz]` pins the camera (null releases); top view `[0,150,90,0,0,-10]`;
     `eval:window.__placeT(0.3)` drops the car at track t; `eval:window.__world.teleport('garage-agents')`;
     `eval:window.__world.setState({scene:{time:'night',weather:'clear'}})`; `eval:window.__world.openZone('podium')`.
   - Physics runs in slow motion headless (low fps). Judge looks, not speed.
3. Before commit: `npx tsc --noEmit -p .` and `npx eslint components app` clean.
   React Compiler rules are strict: mutate three objects through refs in `useFrame`
   (never memoized values), no `Math.random` in render (seeded rng), `useMemo(() => fn())`,
   no setState in effect bodies.
4. Everything on the ground asks `heightAt(x, z)`; nothing stands within
   `nearCrossing(x, z, 20)` (the bridge); keep clear of the road with `nearestT(x,z).dist`.
5. This is Next 16: read node_modules/next/dist/docs before using Next APIs.
6. Never commit secrets (.env.local) or the licensed Racero font (public/fonts is gitignored).

## Art direction (applies to every step)

Polished toy diorama, not childish: soft rounded forms, bevels everywhere,
a restrained palette (warm cream, sage greens, terracotta, slate, one red
accent), real light and shadow doing the work, very little text in the world.
UI is quiet broadcast graphics: small, precise, no cartoon colours.
Fonts are fixed: Racero (display, `font-racing`), Geist (sans), Geist Mono (labels).

## Feedback this plan answers (2026-10-23)

Map is bad, M should open it, like Bruno's · slopes too steep · circuit boring,
cross over itself with a bridge · voice: ElevenLabs "Ian - Professional, Warm,
Calm", Eleven v4, stability 50% · livery not liked · night poor, study Bruno's ·
pop-up banners childish, voice only on Enter · no Vercel deploy on push ·
Enter UI bad · timeline tiles out of place on grass · street lap with a garden
area holding all the places · buildings cute 3D, soft, not harsh; too childish overall.

## Steps

### 0. Quick fixes — done (c31cb73)
- [x] Radio only when a place is opened (Enter); red banner -> subtitle caption
- [x] M toggles the map, Esc closes
- [x] vercel.json disables deploy-on-push (user may also disconnect the Vercel app in the dashboard)
- [x] Voice model eleven_v4 @ stability 0.5 (scripts/gen-audio.mjs + app/api/voice)
- [ ] **Ian voice — blocked**: voice ID is `70HFmYdPmz1aKiKW6Zx3`, but it's a Voice Library
      voice and the free plan returns 402 `paid_plan_required` for library voices over the API.
      Needs a paid plan (or lines recorded by hand in the ElevenLabs UI into public/sfx).
      Then add `ELEVENLABS_VOICE_ID=<id>` to .env.local and run
      `node scripts/gen-audio.mjs --only radio-sector-1,radio-sector-2,radio-sector-3,radio-sector-4,radio-garage-agents,radio-garage-genai,radio-garage-hardware,radio-garage-ml,radio-garage-vision,radio-playbook,radio-podium,radio-contact,radio-hello,radio-idle,radio-claude,radio-temp-on,radio-temp-off --force`.
      Commit public/sfx. Set the same env var on the server for /api/voice.

### 1. Circuit v3: crossover and gentle grades — done (5d83cea)
- [x] Figure-of-eight street lap: north straight runs under a bridge, a loop climbs
      behind the town and comes back over it 7 m up; grades <= ~10%.
- [x] Terrain follows the lower road under the bridge; slope limit 28% off-road.
- [x] Bridge: deck, parapets with colliders, piers; nothing stands under it.
- [x] R respawns onto the nearest road (height-aware).

Notes: ~1% of open ground is still >40% where the raised descent leg (t ~0.70–0.80)
meets the infield. Keep places >= 17 m from that leg.

### 2. Garden infield, city streets outside — NEXT
Two independent halves; they can be done in parallel by separate agents
because they own different files.

**2a. Garden infield** — owns components/world/garden/** (new), Timeline.tsx,
components/world/timeline/**, app/lab/timeline/**, and only the mask function in Grass.tsx.
- [ ] `components/world/garden/index.tsx` exporting default `Garden`, mounted in Places.tsx
      next to `<Groves />`: soft gravel/stone path ribbons (sand #e9dcc4/#d8c7a6, edging #c9b48e)
      linking the infield places (zones playbook, podium, cricket, football; TIMELINE; LETTERS;
      the garages); rounded instanced hedges (#6f8f5a/#5c7a4b); flower beds with sparse instanced
      flowers in muted colours; a small pond with a stone rim; benches; small garden lamps whose
      heads brighten with `dayNight.night` (emissive > 1 so they bloom). < ~25 new draw calls.
      Small colliders on hedges/benches/lamps only; paths and grass stay drivable.
- [ ] Grass.tsx `trackMask()`: paint paths, pond and beds black (no grass) via a helper
      exported from garden.
- [ ] Timeline rebuilt garden-native: a broad stone terrace/path with the neon lines inset
      as glowing grooves, soft edging, low planters along the sides, posts as garden bollards.
      Keep behaviour (lines light up to the car, labels rise, year counter) and API
      (`Timeline({ position, rotation, colliders })`, mounted at TIMELINE.pos, yaw TIMELINE.rot = π/2,
      time runs toward world −x). The year counter must read from the chase camera
      (camera at +X,+Z of the car, looking −X,−Z, ~45°).
- [ ] Remove leftovers that clash (the old cones/flags near the timeline are already gone).
- Accept when: top view and three ground-level views look like a calm park; nothing floats
  or clips; the timeline sits naturally in the garden by day and night.

**2b. Cute city outside the circuit** — owns components/world/street/** and app/lab/city/**.
- [ ] Replace the box skyline (street/Skyline.tsx, instanced boxes + `facadeMaterial`) with soft
      buildings from a small instanced kit: bevelled bodies, chunky inset window frames,
      shop awnings, balconies, pitched/rounded roofs with roof gardens, water tanks, chimneys.
      Palette cream #f3e9d8, terracotta #d9826b, sage #9fb79a, dusty blue #8fa9c4, butter #f0d48a,
      warm white. Mostly 2–5 storeys, a few landmarks <= 18 m. Keep the `BUILDINGS` export
      ({x,z,w,d,h,yaw,...}) — Groves.tsx uses it. Keep per-building CuboidColliders.
- [ ] Night: windows glow warm, seeded lit/unlit per window, driven by `facadeUniforms.uNight`
      / `dayNight.night`, emissive > 1 so they bloom.
- [ ] Streets: pavements with kerb edging where buildings front the circuit, zebra crossings,
      street trees in planters, bollards, a bus stop / kiosk, café tables. Sparse enough to read
      from the high camera. Use street/common.ts helpers (inSectorScene, nearPlace, nearTree,
      distToTrack, FRAMES, barrierOffset); never near the bridge.
- Accept when: from the chase camera the lap feels like driving through a small, cute town;
  no harsh grey towers; night windows glow.

### 3. Night like Bruno's — partly done (72b9ca7)
- [x] Night palette: blue moonlight #4a5cff, violet hemisphere bounce, navy-to-plum sky/fog,
      Bloom (threshold 1, intensity 0.55, mipmap) in World.tsx.
- [ ] Light pools under street lamps at night (soft additive decals on the road at the lamp
      `px/pz` positions in street/layoutStreet.ts LAMPS), fading in with `dayNight.night`.
- [ ] Make every night emissive > 1 with `toneMapped: false` so it blooms: lamp lenses
      (street/Lamps.tsx, already 4.2), garage headers (models/props/Garage.tsx Header), timeline
      lines, sector-scene windows/signs (models/sectors/*), car brake light.
- [ ] Fireflies around trees/garden at night (alive/Fireflies.tsx already exists — add anchors
      in the garden).
- [ ] Optional: tint shadows instead of darkening (Bruno multiplies albedo by a shadow colour);
      only if it can be done with a cheap onBeforeCompile patch shared by all materials.
- Accept when: a night screenshot from the chase camera reads as calm blue-violet with warm
  glowing points, not a flat dark frame.

### 4. Map like Bruno's (M)
Owns components/ui/** (MapMenu in Hud.tsx ~line 399) and a new components/world/MapCapture.tsx.
- [ ] Top-down image of the real world: an orthographic camera renders the scene once into a
      render target when the map opens (and again when day/night flips), shown in a modal.
- [ ] Pins for places (zones + SECTORS scenes) as small diamonds; labels pop in on hover with a
      springy curve; a player arrow rotating with `carState.forward`.
- [ ] Click a pin: teleport (`setState({ teleport: { id, zone } })`, see store.ts) behind a
      diagonal wipe; M or Esc closes.
- [ ] Achievements as a quiet second tab; keep the job-fit check reachable (it opens `fitOpen`).
- Accept when: the map is something you'd want to open; works on a 390x844 viewport.

### 5. UI: interaction prompt, panels, toasts
Same ownership as step 4 plus new components/world/ui3d/**.
- [ ] In-world prompt above the place you're near (`near` in store): a diamond key icon with the
      Enter glyph and a short label sliding out, elastic open, fixed tilt facing the camera,
      drawn on top. Remove the old HTML hint. Position: zone pos / sector scene at heightAt + ~3 m.
- [ ] Opened panel (Panels.tsx ZoneCard/PanelBody): dark translucent gradient, Racero title only,
      Geist body, Geist Mono labels, 0.3 s fade/slide, no pills.
- [ ] Toasts (Hud.tsx Toast): one at a time, queued, top-centre, small, 2 px countdown bar,
      muted palette with one accent.
- [ ] Top-bar buttons and bottom key hints in the same language (keep Resume).

### 6. Livery — done
- [x] /lab/livery shows six palettes: Rosso, Papaya, Racing green, Midnight, Silver arrow, Cream & red (7a4eb64).
- [x] All six selectable in settings (Controls panel, "Livery" swatches); default Cream & red;
      the choice is remembered per browser (localStorage `hg-livery`). Palettes live in
      components/world/liveries.ts; store field `livery`; Vehicle passes it to CarBody/CarWheel.
- [ ] When step 5 restyles the panels, give settings its own small panel (gear icon) with
      Livery, Sound and Voice toggles, instead of living under Controls.

### 7. Later
- Bruno-style "unstuck" hint if the car barely moves for 3 s.
- Engine sound regenerate or keep silent; check the music ducking under radio.
- Garage experience: dolly in, browse project spec sheets.
- Optional scroll-driven broadcast site.
