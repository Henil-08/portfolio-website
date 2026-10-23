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
| Coast, sea, lakes, inlet | components/world/layout.ts (`COAST_KEYS`, `coastR`, `shoreDist`, `LAKES`, `CANALS`, `inLand`, `SEA_Y`), terrain.ts (beaches/basins), Water.tsx, Harbour.tsx |
| Garden infield | components/world/garden/* (`PATHS`, `BEDS`, `POND`, `nearGarden`) |
| Town | components/world/street/town.ts (placement, `BUILDINGS`), street/Skyline.tsx (renderer) |
| Waterfront | components/world/waterfront/* (`PROMENADE`, `PIER`, `nearPromenade`) |
| Contact logos | components/world/social/* (`LINKS`, store `nearLink`) |
| Trees (Bruno's) | components/world/foliage/*, models/props/Tree.tsx, public/bruno/ (MIT) |
| Opening reveal | components/world/Reveal.tsx, components/ui/Intro.tsx |

## Working rules

1. One focused change per commit; push after each (`git push`). End commit
   messages with the Co-Authored-By line the harness gives you.
2. Verify every visual change with screenshots before committing:
   - Dev server: `npx next dev -p 3100` (if CSS looks stale: stop it, `rm -rf .next/dev`, restart).
   - `node scripts/shoot.mjs /tmp/shots/x "wait:16000|shot:a" 1400 850 "http://localhost:3100/?skip"`
   - Hooks: `eval:window.__cam=[x,y,z,tx,ty,tz]` pins the camera (null releases); top view `[0,190,80,0,0,-5]`;
     `eval:window.__placeT(0.3)` drops the car at track t; `eval:window.__placeXZ(x,z,heading)` anywhere; `eval:window.__world.teleport('garage-agents')`;
     `eval:window.__world.setState({scene:{time:'night',weather:'clear'}})`; `eval:window.__world.openZone('podium')`.
   - Physics runs in slow motion headless (low fps). Judge looks, not speed.
3. Before commit: `npx tsc --noEmit -p .` and `npx eslint components app` clean.
   React Compiler rules are strict: mutate three objects through refs in `useFrame`
   (never memoized values), no `Math.random` in render (seeded rng), `useMemo(() => fn())`,
   no setState in effect bodies.
4. Everything on the ground asks `heightAt(x, z)`; nothing stands within
   `nearCrossing(x, z, 20)` (the bridge); keep clear of the road with `nearestT(x,z).dist`;
   keep things on land with `inLand(x, z, margin)`, off the garden with `nearGarden`, off the
   promenade with `nearPromenade`. Places.tsx `Nature` and street/common.ts `TREES` are the same
   scatter twice: change both together, same checks, same order.
7. Bruno's repo (MIT, assets included) is the reference and a source to copy from:
   `git clone --depth 1 https://github.com/brunosimon/folio-2025` into the scratchpad; read, don't run.
   The owner wants his look and code reused, not reinvented. Keep his license beside copied assets.
5. This is Next 16: read node_modules/next/dist/docs before using Next APIs.
6. Never commit secrets (.env.local) or the licensed Racero font (public/fonts is gitignored).

## Art direction (applies to every step)

Polished toy diorama, not childish: soft rounded forms, bevels everywhere,
a restrained palette (warm cream, sage greens, terracotta, slate, one red
accent), real light and shadow doing the work, very little text in the world.
UI is quiet broadcast graphics: small, precise, no cartoon colours.
Fonts are fixed: Racero (display, `font-racing`), Geist (sans), Geist Mono (labels).

## Where it stands (2026-10-23, evening)

Done and working, don't redo: garden infield and timeline terrace; soft town (4 draw calls);
Bruno's trees; HENIL GAJJAR letters at the start; contact ring of logos; Bruno's bumper collider,
softer brake, boost release, stuck hint; Bruno's opening reveal; promenade, pier, boats;
no wheel smoke or loose leaves; livery picker (six palettes). Since this morning: the car no longer
breaks apart (CCD, buried respawn); continuous rumble kerbs; walls replaced by tyre walls at tight
corners; layout v4 (docs/research/layout-v4.md): island ~15% bigger, harbour arm with quays under a
stone bridge, a river from a spring lake under the east esses, hills on the north coast, east dunes,
park islands north of the garden with a footbridge; no building blocks the chase camera.
Commit history has the details.

Owner feedback still open (latest first): the map menu is bad; the water and its surroundings are
not up to the mark (now more water to dress: harbour, river, spring lake); the E prompt should be
animated like Bruno's. New (2026-10-23): buildings on slopes with vertical walls (3f), a Bruno-style
see-through when the car is hidden (3h), and a compact Bruno-style career timeline with floating rocks
plus the owner's school journey (3b). Next up, in order: 3f, 3g, 3h, 3b, then step 4.

## Steps (do them in order; first unticked one is next)

### 1. Glitches
- [x] **Car breaks apart** (5af6d89: a boost into a lamp drove the chassis through the terrain;
      now CCD, respawn when buried, wheel visuals clamped to rest +-0.25 m and snapped on respawn).
- [x] Street lamps standing on the road (two, at T1 and the last corner): fixed in 4e050da/35ba10b.
- [x] Sweep (`__placeT` every 0.05, day and night, plus crash tests). Fixed: run-off strips bridged
      the road where a corner changed hands (355d63c); hairline across the road at the start line
      where the road ribbon closes (e45804d). Left for later steps: barriers sink into slopes and grass
      pokes through them (red "drips"), and their segments overlap at odd angles in tight corners (step 2);
      the chase camera loses the car under the bridge deck (t ~0.5); the tall building by Boston that
      hid the car (t ~0.6) is fixed in 290b26a.
- [x] **Car stuck on slopes** (owner, 2026-10-23). The colliders sat 0.18 m off the ground on a 3 m
      bumper, so 7-degree crests beached it: they now clear 0.3 m (2dffb4f; footprint check 309 -> 75
      beaching poses). The rest were embankments (crossover ramps, bridge approaches) dropping 1-5 m
      past the shoulder into pits: parapets along them now (d01cd50, Embankments.tsx). A gentler
      roadside slope limit was tried and did nothing (the steep bits sit between pinned cells).
      Left: the north-coast hills still meet the beach steeply (far from the road).

### 2. Kerbs and barriers
- [x] (387ab64) Corner kerbs (Island.tsx `Kerbs`) are separate flat red/white tiles with gaps. Make them a
      continuous, slightly raised rumble kerb hugging the corner (alternating red/white segments
      that touch, bevelled outer edge), only where the lap bends; straights get the plain white line.
- [x] (dc869c9) Red/white barrier walls (street/Barriers.tsx). Owner's answer (2026-10-23): "like Bruno,
      mostly gone". Walls removed; a short tyre wall with rounded end blocks on the outside of each
      run-off corner (`TYRE_WALLS` in street/layoutStreet.ts); sponsor boards on their own legs.

### 3. World layout ("the map is still bad")
The owner wants a map with character like Bruno's, not a loop on a blob. Study Bruno's map image
(`static/ui/map/map-day.webp` in his repo) and his terrain paint (`static/terrain/terrain.png`):
distinct areas threaded by paths, water woven through, shorelines with teal glow.
- [x] (7fb5950) Layout proposal: docs/research/layout-v4.md. Approved 2026-10-23 as written; keep the
      crossover, park places move to islands east of the garden, island grows ~15%.
- [ ] Build it (docs/research/layout-v4.md), one sub-step per commit:
  - [x] a. (ce14edd) Grow the island ~15% and reshape the track: longer harbour section in the west, hill climb
        moved north-east, same sector order and crossover.
  - [x] b. (8c1db86, quays 773f5c0) Harbour arm from the west sea to the garden (quays on the town side) replacing the west lake
        and inlet; harbour bridge with a real gap under the deck.
  - [x] c. (e7453b1) River from a spring lake inside the north-east loop, south past the start, under the
        east esses (road bridge) and out to the east sea. Changed from the plan: no branch to the garden
        pond (it is far west; a branch would cut through the timeline and letters). All water is at sea
        level (one water plane), so the river is a shallow creek you can drive through.
  - [x] d. (b8a42f0) Relief: `reliefAt` in layout.ts. Hills along the north coast behind the old town and the
        NE hairpin (the NE loop itself had no room), knolls round the spring lake, dunes on the east beach.
  - [x] e. (2fc6d8e) Park islands (park/layout.ts `ISLANDS`, `parkSand`): football, podium, playbook,
        contact on grass islands in sand, north of the garden (the open infield there, not east: the
        river and the esses leave no room east). One wooden footbridge over the river (park/index.tsx).
  - [~] f. (4a3aea9) Old town round the crossover: three buildings so far (town.ts `oldTown`).
        Owner (2026-10-23): buildings may stand on slopes. Walls stay vertical; the base follows the
        ground (a plinth/foundation skirt that reaches down to `heightAt` at every corner, so the low
        side shows more stone, never a floating edge). Then lift the slope bans added today:
        `reliefAt > 0.6` / `duneMask > 0.1` in town.ts `clear()` and the random fill, and let `oldTown`
        use the hill and embankment ground round the crossover. Slopes must stay as they are (don't
        flatten terrain for buildings). Camera blocked under the bridge deck is fine (owner).
  - [ ] g. District identity: paving, planting, props, one district per commit.
  - [ ] h. See-through when the car is hidden, like Bruno: his Foliage.js fades foliage in a soft
        screen-space circle round the car (`seeThroughPosition`, `seeThroughEdgeMin/Max`, alpha =
        sdf * mix(threshold, 1, distanceFade)). Do the same for anything between car and camera:
        project the car to screen each frame into a shared uniform, and in town buildings
        (street/Skyline.tsx), bridge decks/pillars (Bridge.tsx, Harbour.tsx) and tree crowns
        (foliage/*) fade or dither-discard fragments inside that circle when they are closer to the
        camera than the car. One shared onBeforeCompile patch, not per-material copies. Remove the
        town's `blocksCamera` filter (town.ts) once this works so buildings can come back.

### 3b. Career timeline like Bruno's (owner, 2026-10-23)
The current timeline plaza (Timeline.tsx, timeline/*, `TIMELINE` in layout.ts, a 31 x 19 m pad in
the garden) uses too much ground. Bruno's career area (folio-2025 sources/Game/World/Areas/
CareerArea.js) is small: a few lines of stones laid in the ground; as the car drives along a line the
stone rises out of the ground (`activeElevation` 2.5, sound), floats with a slow bob, and its label
wipes in (`labelReveal` 0 -> 1, power2.inOut 1 s); leaving lowers it again. Years sit beside the lines.
- [ ] Rebuild the timeline Bruno's way: compact (aim under a third of today's footprint), floating
      rocks that rise and move as you pass, labels revealed by a wipe, years as small markers.
      Free the old pad back to the garden (garden/layout.ts paths and hedges that point at it).
- [ ] Add the school journey to it. content/experience.ts `education` only has Nirma University
      (B.Tech ECE, Ahmedabad) and Northeastern (MS Data Science, 4.0, Dec 2025, Boston). Anything
      before college (schools, years, places) is not in the repo: ask the owner for it, never invent.
      Keep entries in content/ (e.g. extend `education`), the world only reads them.

### 4. Water, lake and surroundings
- [ ] The lake and inlet look like flat holes in sand. Bruno's look: ground colour gradient by depth
      (sand #ffa94e-ish -> teal #5bc2b9 -> navy #13375f, toned to our palette), a soft glowing
      shoreline, gentle waves/caustics, reeds, rocks, a quay or steps at the harbour, lily pads.
- [ ] Beaches: wet-sand band, a few rocks and driftwood, softer transition to grass.
- [ ] Water.tsx shader: add subtle normal ripples (two scrolling noise layers), fresnel toward the
      horizon, foam that follows the shore contour (sample depth gradient), night reflections of lamps.
- [ ] Harbour bridge (Harbour.tsx): the causeway is so low the arch is a culvert; either raise the road
      over the inlet a little (track heights in layout.ts TRACK_POINTS near t ~0.92) or make it a
      proper low bridge with a gap under the deck.

### 5. Map menu like Bruno's (M)
Owns components/ui/** (MapMenu in Hud.tsx) and a new components/world/MapCapture.tsx.
- [ ] Top-down image of the real world: an orthographic camera renders the scene once into a
      render target when the map opens (and again when day/night flips), shown in a modal on
      Bruno's dark aubergine panel with the inset hairline. It must show the new coast and water.
- [ ] Pins for places (zones + SECTORS scenes + contact logos) as white diamonds with dark border;
      labels pop on hover with Bruno's springy bezier (docs/research/bruno-folio-2025.md §1);
      player arrow rotating with `carState.forward`.
- [ ] Click a pin: teleport (`setState({ teleport: { id, zone } })`) behind Bruno's diagonal wipe
      (his Overlay.js); M or Esc closes.
- [ ] Achievements as a quiet second tab; keep the job-fit check reachable (`fitOpen`).
- Accept when: the map is something you'd want to open; works on a 390x844 viewport.

### 6. Interaction prompt like Bruno's (E)
Owns new components/world/ui3d/** and Race.tsx (`InteractionPoint`, the current HTML pill).
- [ ] Port Bruno's InteractivePoints.js (research brief §3): in-world diamond with an SDF outline,
      key icon, label sliding out from the diamond, states HIDDEN / CONCEALED / OPEN with his gsap
      eases (elastic open 1.5 s), fixed tilt for our chase camera, drawn on top while open.
      Concealed diamonds sit at every place; open on the nearest within reach. Works for zones
      (`near`) and contact logos (`nearLink`). Remove the HTML pill.
- [ ] Opened panel (Panels.tsx): dark translucent gradient, Racero title only, Geist body,
      Geist Mono labels, 0.3 s fade/slide, no pills.
- [ ] Toasts (Hud.tsx Toast): Bruno's single queued toast, top-centre, 2 px countdown bar.
- [ ] Top-bar buttons and bottom key hints in the same language; settings in its own small panel
      (gear: Livery, Sound, Voice) instead of under Controls.

### 7. Night
- [ ] Light pools under street lamps at night (street/layoutStreet.ts LAMPS `px/pz`), fading in
      with `dayNight.night`.
- [ ] Every night emissive > 1 with `toneMapped: false` so it blooms: garage headers
      (models/props/Garage.tsx), sector-scene windows/signs (models/sectors/*), car brake light.
- [ ] Fireflies in the garden and by the lake at night (alive/Fireflies.tsx, add anchors).
- [ ] Optional: tinted shadows like Bruno (albedo x shadow colour), only via one cheap shared patch.

### 8. Town streets
- [ ] Pavements with kerb edging where buildings front the circuit, zebra crossings, street trees
      in planters, bollards, a bus stop or kiosk, cafe tables (street/**; use common.ts helpers).

### 9. Smaller things
- [ ] Radio voice George (ElevenLabs `JBFqnCBsd6RMkjVDRZzb`, eleven_v4, stability 0.5,
      similarity_boost 0.8): set as default in scripts/gen-audio.mjs and app/api/voice/route.ts,
      re-record with `node scripts/gen-audio.mjs --only radio-sector-1,radio-sector-2,radio-sector-3,radio-sector-4,radio-garage-agents,radio-garage-genai,radio-garage-hardware,radio-garage-ml,radio-garage-vision,radio-playbook,radio-podium,radio-contact,radio-hello,radio-idle,radio-claude,radio-temp-on,radio-temp-off --force`,
      commit public/sfx. Voice Library voices return 402 on the free plan.
- [ ] Palms still use the old per-tree meshes; port them to the foliage registry.
- [ ] Tree colours are a first pass (foliage/species.ts); shade side reads dark.
- [ ] Brake and boost feel: tune `HANDBRAKE_*` and the overspeed brake in Vehicle.tsx on a real GPU.
- [ ] Later: engine sound; garage experience (dolly in, project spec sheets); scroll-driven site.
