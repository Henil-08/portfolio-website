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
| Track, places, zones, crossings | components/world/layout.ts (`TRACK_POINTS`, `SECTORS`, `zones`, `PIT`, `PIT_WALL`, `TIMELINE`, `CROSSINGS`, `onBridge`, `nearCrossing`, `nearestT3`) |
| Terrain heights, pads, slope limit | components/world/terrain.ts (`heightAt`, `heightTexture`) |
| Road ribbon, kerbs, colliders | components/world/Island.tsx |
| Bridge | components/world/Bridge.tsx |
| Places (garages, sectors, pitches, letters, nature) | components/world/Places.tsx, models/sectors/*, models/props/* |
| Street dressing (barriers, floodlights, skyline, run-off) | components/world/street/* (Floodlights.tsx, layoutStreet.ts `FLOODS`) |
| Living world (wind, grass, leaves, confetti, birds) | components/world/alive/*, components/world/Grass.tsx |
| Car | components/world/models/Car.tsx (`LIVERIES`, `DEFAULT_LIVERY`), Vehicle.tsx (physics) |
| Lighting, day/night, weather | components/world/Effects.tsx (`SCENES`), Rig.tsx (camera, sun, sky), World.tsx (canvas, post) |
| HUD and panels | components/ui/* (Hud.tsx, Panels.tsx, Intro.tsx, RadioMessages.tsx, MapMenu.tsx); design language in docs/BRAND.md |
| Store | components/world/store.ts (`near`, `zone`, `menuOpen`, `teleport`, `achievements`) |
| Audio | components/world/sound.ts, scripts/gen-audio.mjs, app/api/voice, content/radio.ts |
| Timeline (career plaza) | components/world/Timeline.tsx, components/world/timeline/* |
| Coast, sea, lakes, river | components/world/layout.ts (`COAST_KEYS`, `coastR`, `shoreDist`, `LAKES` (spring lake, hairpin pond), `CANALS`/`RIVER` (river only since v5), `inLand`, `SEA_Y`), terrain.ts (beaches/basins), Water.tsx, Harbour.tsx (river bridge parapets) |
| Garden infield | components/world/garden/* (`PATHS`, `BEDS`, `POND`, `nearGarden`) |
| Town | components/world/street/town.ts (placement, `BUILDINGS`), street/Skyline.tsx (renderer) |
| Waterfront | components/world/waterfront/* (`PROMENADE`, `PIER`, `nearPromenade`) |
| Contact logos | components/world/social/* (`LINKS`, store `nearLink`) |
| Trees, bushes (W10 faceted cypresses and round crowns) | components/world/foliage/* (`species.ts` geometry and colours, `registry.ts` one instanced draw per kind), models/props/Tree.tsx, park/bushes.ts |
| Opening (boot, garage select, align, Bloom) | components/ui/Intro.tsx (stages, G reopens the garage), Boot.tsx (mark, decode, CSS bar), GarageSelect.tsx (chrome, keys, build log); components/world/bloom/state.ts (`opening` stage store, `boot`, `ALIGN`, dev `__alignT`/`__buildT`/`__swapT`), Opening.tsx (shader warm-up legs, turntable `Garage`, cameras, dots, paper floor), plan.ts (`PLAN` timings, `buildDots`, build log), patch.ts (central reveal patch on every world material, `bloomOn`/`bloomOff`); Experience.tsx `INTRO_MS` (deferred world mount) |
| Start spot and the way to the track | components/world/startSpot.ts (`START_SPOT`, `REVEAL_AT`), start.ts, StartGarden.tsx; the sandy path to the pit lane is a garden path (garden/layout.ts `PATHS`) |
| Park common ground (slab paths, lanterns, benches, fence) | components/world/districts/park.ts |
| Car parking at rest (no jitter) | components/world/Vehicle.tsx (`parked`, `REPARK_*`, `SUSPENSION`) |
| Knock-about props (tyres, rocks, benches...) | components/world/Movables.tsx (`Movables`, `kindFromMatrices`, `HomeBody`) |

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
   - `?skip` skips the opening entirely. Without it the loader waits for shader compiles (~30 s
     headless) and the animation runs ~10x slow: wait ~130 s before the circle is open.
   - `eval:window.__movables()` counts knock-about props out of place.
   - Car feel bugs (vibration, creep, bounce): measure, don't guess. `window.__realtime = true` runs real
     60 fps physics steps in the slow headless browser; `window.__stepLog = []` records every step
     [ground speed, yaw rate, sideways speed, roll, throttle]; `window.__tune` overrides handling numbers
     (Vehicle.tsx `tune`) to compare variants. Repeat each variant 3x: headless key timing varies.
     `carState.motion` has yaw rate, roll and sideways speed. The owner checks; "fixed" means a flat trace.
   - `media:print` in shoot.mjs checks print styles (the resume).
   - Layout scripts: run TS from a scratchpad script with jiti (`createJiti(cwd, { alias: { "@/": cwd + "/" } })`)
     to print ASCII maps of track/zones/water, heights, or scene facing before rendering.
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
   The owner wants his look and code reused, not reinvented. Keep his license beside copied assets
   (public/vendor/LICENSE.md). Owner (2026-10-23): don't write his name in the code; comments say
   "the original" / folio-2025. Credit goes in the main README later.
5. This is Next 16: read node_modules/next/dist/docs before using Next APIs.
6. Never commit secrets (.env.local) or the licensed Racero font (public/fonts is gitignored).

## Art direction (applies to every step)

The world follows Concrete & Ink (docs/BRAND.md, "World (approved 2026-10-26)"): a modern circuit,
not a toy town. Concrete (#d9d6ce), muted grass (`C.grass` #7a8462), gravel (#cdc4b0) where the
old sand was, dark asphalt (#3a3b3e) with a thin paper edge line and the start line as its only paint,
ink/paper kerbs, ink and paper objects with one orange (#ff4f00) accent each, very little text in the
world. Palette: components/world/palette.ts `C` (keys kept from the old palette, `red` is the orange
accent). The UI and the opening follow docs/BRAND.md (Datasheet). The model swap runs as step 11 a–i.

## Where it stands (2026-10-23, late night)

The world is layout v5 (README "Track layout v5", docs/research/layout-v5-sketch.png): the main
straight with a pit lane its whole length, the east side's S over the river on a low deck, the bridge
loop that crosses its own entry 4.2 m up (no piers), the Monaco hairpin round a pond, the bottom-left
chicane round a green block with the garden pond. The world is flat (land away from the road at 0).
The car starts in front of HENIL GAJJAR under a shade tree, on the garden path that leads past the
garages to the pit lane. The opening is folio-2025's sequence in the site's colours. Tyre walls, rocks,
benches, lanterns, crates, cones and letters can be knocked about and tidy up when the car is 45 m
away. The car parks dead still at rest (re-parks when left alone; damped stop). Floodlight towers
light the lap at night, a pit wall with a fence separates the pit lane, grandstands line the main
straight and T1, showers come and go (wets go on in a quick swap), and M opens a map rendered from
the real world with pins that teleport behind a wipe. Commit history has the details; everything in
4b, 4c, 4d, 4e and 5 below is done.

Next, in order (the first unticked box in the steps below is the one to do):
1. **4e owner check** items left open below (only if the owner reports them again).
2. 4b h-k are done (floodlights, pit wall, grandstands, rain + tyre swap).
3. Steps 5-9 are done except brake/boost feel (needs the owner on a real GPU). Garage experience and the
   /resume redesign are in (2026-10-25).
4. Owner said "later": credit folio-2025 / Bruno Simon in the main README (only there).

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
- [x] Build it (docs/research/layout-v4.md), one sub-step per commit:
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
  - [x] f. (4a3aea9, slopes 3143f16) Old town round the crossover. Done: `footing()` in town.ts; floor at
        the highest ground, stone plinth + sand coping down to the lowest, past 2.5 m the building sits
        into the high side; bans lifted (19 -> 42 buildings); old town skips the 20 m crossing circle and
        keeps corners 6.5 m off both roads (8 buildings within 45 m). Camera-side ones still wait for h.
        Original brief:
        Owner (2026-10-23): buildings may stand on slopes. Walls stay vertical; the base follows the
        ground (a plinth/foundation skirt that reaches down to `heightAt` at every corner, so the low
        side shows more stone, never a floating edge). Then lift the slope bans added today:
        `reliefAt > 0.6` / `duneMask > 0.1` in town.ts `clear()` and the random fill, and let `oldTown`
        use the hill and embankment ground round the crossover. Slopes must stay as they are (don't
        flatten terrain for buildings). Camera blocked under the bridge deck is fine (owner).
  - [x] g. District identity (components/world/districts/*; Bruno's benches, lanterns, fences baked by
        scripts/bake-props.mjs into models/props/propModels.ts): old town slab forecourts + lanterns
        (31bc571), harbour quay benches/lanterns/crates (8ba0ff2), hills wildflowers + rocks (a5860d1),
        dunes sand fences + marram (837d234). Waterfront, garden and park were dressed earlier.
  - [x] h. (c2841dd, filter removed 3f75dd8) components/world/seeThrough.ts: `patchSeeThrough` /
        `seeThrough(mat)`, updated from Rig.tsx. Dither-discard inside the circle, only for fragments in
        front of the car and over a metre above it (so the road ahead never fades); applied to town,
        bridge deck/piers/parapets, harbour bridge, embankments, road ribbons and kerbs, tree trunks;
        crowns use Bruno's exact alpha. Palms (old per-mesh trees) are not patched yet.
        Original brief: See-through when the car is hidden, like Bruno: his Foliage.js fades foliage in a soft
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
- [x] (9a93545) Rebuild the timeline Bruno's way: compact (aim under a third of today's footprint), floating
      rocks that rise and move as you pass, labels revealed by a wipe, years as small markers.
      Free the old pad back to the garden (garden/layout.ts paths and hedges that point at it).
- [x] (0ad0254) Owner: colleges only, no school. Nirma B.Tech Jun 2019 - Jun 2023, CSE minor Jul 2021 -
      Jun 2023, Northeastern Sep 2023 - Dec 2025 (dates in content/experience.ts `education`, also in
      Profile.pdf). Terrace ~13.6 x 13.5 m (31% of the old 31 x 19). Was: Add the school journey to it. content/experience.ts `education` only has Nirma University
      (B.Tech ECE, Ahmedabad) and Northeastern (MS Data Science, 4.0, Dec 2025, Boston). Anything
      before college (schools, years, places) is not in the repo: ask the owner for it, never invent.
      Keep entries in content/ (e.g. extend `education`), the world only reads them.

### 4. Water, lake and surroundings
- [x] (de96488) Spring lake: drivable shelf then a basin; reeds with cattails, rocks, lily pads round the
      lake and along the river (districts/waterside.ts). Quays/steps at the harbour were done in 3g (8ba0ff2).
      Was: The lake and inlet look like flat holes in sand. Bruno's look: ground colour gradient by depth
      (sand #ffa94e-ish -> teal #5bc2b9 -> navy #13375f, toned to our palette), a soft glowing
      shoreline, gentle waves/caustics, reeds, rocks, a quay or steps at the harbour, lily pads.
- [x] (63da291) Beaches: rock groups and driftwood (districts/beaches.ts), sand-to-grass blend widened to
      ~7 m. The wet-sand band was already in Island.tsx terrain colours. Was: wet-sand band, rocks, driftwood.
- [x] (0f09206, reflections 818d181) Water.tsx: Bruno's teal shore glow (faint emission at night), two scrolling
      ripple layers in the normals, fresnel; the foam already follows the depth contour; warm lamp reflections
      at night (promenade, pier, harbour lanterns, shore street lamps).
      Was: normal ripples, fresnel toward the horizon, foam that follows the shore contour, night reflections.
- [x] (8c1db86, layout v4 b) Harbour bridge: stone deck with parapets over open water, piers in the channel.
      Was: Harbour bridge (Harbour.tsx): the causeway is so low the arch is a culvert; either raise the road
      over the inlet a little (track heights in layout.ts TRACK_POINTS near t ~0.92) or make it a
      proper low bridge with a gap under the deck.

### 4b. Owner review: scale, flat world, F1 circuit (owner, 2026-10-23 night)
The owner compared our world with Bruno's (screenshots in that session: his jeep in tall-but-short grass,
chunky bench, small wooden bridge, lamp; a Qatar night circuit under floodlight towers; Melbourne's pit
straight with pit wall, fences and stands). Do these in order, one commit per item, screenshots each time.
- [x] a. (90676c6) See-through only for foliage. Owner: "no need to blur behind the building, behind leaves is fine".
      Keep the foliage crowns and trunks (foliage/material.ts, registry.ts); take `patchSeeThrough` /
      `seeThrough(...)` off Skyline.tsx, Bridge.tsx, Harbour.tsx, Embankments.tsx and Island.tsx road
      materials. Buildings must then never hide the car: bring back the town's camera filter
      (revert 3f75dd8, `blocksCamera` in street/town.ts) and see b (lower buildings).
- [x] b. (car f446b06, grass 8606f5e, town 78e88f7, props af25fd3) Owner chose the bigger car (x1.38,
      `CAR_SCALE` in models/Car.tsx, physics too) over pulling the camera in. Grass cut was wrong (owner: "too small, look at his"), reverted in cd7def6 to his blade size on a 280 grid; storeys
      3.0/2.6 m with 1-2 near the track, `PROP_SCALE` 1.3 (models/props/kit.ts), footbridge 3.6 m wide.
      Was: Scale and proportions, like Bruno. In his world buildings are barely taller than the vehicle, the
      grass is a fraction of the car's height, and props (bench, lamp, footbridge) are chunky and read
      big next to the car. Ours: grass blades are as tall as the F1 car (Grass.tsx `BLADE_HEIGHT` 0.6 m
      + randomness; the car body is ~0.5 m tall), buildings run 2-5 storeys (town.ts `bodyH`, `MAX_TOP`
      18 m), and the chase camera sits far (Rig.tsx `OFFSET` 10.5, 12.5, 14). Measure first (headless
      shots side by side with Bruno's), then: pull the camera in, cut grass to about a third of the car's
      height, cap buildings near the track to 1-2 low storeys, and scale props up relative to the car.
      Owner thinks "mine is too zoomed out or the car is smaller": try both, show him.
- [x] c. (cedccf6) Track at 0 except the crossover's eased ramps (deck 4.5 m, was 7.1) and the low decks
      over the river and harbour arm (kept: layout-v4 has a real gap under them). `reliefAt` removed;
      `meadowAt` keeps the old hill spots as the wildflower/rock mask. Plinths, parapets and the slope
      limit are already conditional, so they now only appear at the ramps and shores: nothing to delete.
      Was: Flat world. Owner: "no need for ups and downs, it's an F1 theme world". Flatten the track
      heights in layout.ts `TRACK_POINTS` and drop the relief (`reliefAt` hills and dunes, terrain.ts),
      keeping only the crossover bridge's ramps (approved in layout-v4). Then the building plinths
      (3f), embankment parapets (Embankments.tsx) and slope caps mostly fall away: remove what is no
      longer needed. This is a layout change the owner asked for; anything beyond flattening, ask.
- [x] d. (f19b671) Trails fade with time too (`REGROW` 4 s in alive/Tracks.tsx), so grass grows back where
      the car stopped; Island.tsx `LAND` reads the tracks and shows bare earth under them on grassy ground.
      Blade height was cut in b. Was: Grass like Bruno's (Grass.tsx, alive/Tracks.tsx already ports his wheel tracks): wheels part
      the grass and show the ground; it grows back after a while and is whole again when you return.
      Check it really reads like his (see his Grass.js / Terrain.js), tune blade density and colour.
- [x] e. (7a2d602) park/bushes.ts: single round clumps (species `bush` is now his one-clump bush) beside
      the garden paths, round the park islands and in infield clusters. Was: Bushes like Bruno's (sources/Game/World/Bushes.js + Foliage.js clumps on the ground), scattered
      through the infield, park and along paths. Reuse foliage/* (his clump material is already ported).
- [x] f. (ee3750f) districts/park.ts: slab paths between the islands, lanterns, benches, flowers, a fence
      arc north of the football island; bushes came in e. Not done: a second small footbridge (it needs new
      water in the middle, a layout change: ask the owner); park benches have no colliders.
      Was: The infield common area in the middle is too empty: fill it Bruno-style (bushes, paths, his
      benches/lanterns/fences from models/props/propModels.ts, a small wooden footbridge, flower beds).
      No invented text or facts.
- [x] g. (a165eb3) Done with layout v5: Ahmedabad now sits on the top straight facing the camera. Was: OPEN, needs the owner: Ahmedabad is the only scene on the camera side (front faces away). The far
      side is river for the whole of sector 1, so it can't move across; turned round in place it stands
      between car and camera and hides the car (tried, reverted). Options: move sector 1's scene to another
      stretch (layout change), or keep it and lower its tall parts. Was: Team Stallions (Sector 1 Ahmedabad scene, models/sectors/Ahmedabad.tsx, placed by layout.ts
      `SECTORS` scene/sceneRot ~line 400): it faces away from the camera so you only see its back.
      Turn it (and check every sector scene) so its front faces the chase camera (street/common.ts
      `AWAY`), or move it to the far side of the road.
- [x] h. (f52cc2a) street/Floodlights.tsx, layoutStreet.ts `FLOODS`: 8 m masts with a tilted 4x2 lamp bank every
      ~17 m on the far side, past the run-off (they step back up to 8 m when something is in the way); on the
      main straight on the pit-wall line, or behind the pit lane between garages where the gap is too narrow.
      Additive light pool on the road under each, pitched with the road. Street lamps gone.
      Was: Track lighting like a real F1 night race (Qatar reference): no street lamps on the circuit
      (street/Lamps.tsx, layoutStreet.ts `LAMPS`). Instead tall floodlight towers with lamp banks set
      back outside the run-off, many of them, lighting the track at night (cheap light pools on the
      asphalt, emissive banks that bloom). Bruno-style small lamps stay only in the park and garden.
- [x] i. (99455a3) PitWallRun.tsx, layout.ts `PIT_WALL` / `pitWallZ`: white wall + red cap + catch fence +
      crash cushions halfway between lane and straight, x -62..36 (where the gap closes at the exit). Lane moved
      2 m north (`PIT.z` 32) because the straight overlapped it at the east end. Strategy stands on the lane side.
      Not done: painted pit entry/exit lines on the track (art direction says no paint on the asphalt; ask the owner).
      Was: Pit lane is a real dedicated lane (Melbourne reference): separate it from the main straight with
      a pit wall and fence (PitRoads.tsx, layout.ts `PIT`), painted pit entry/exit lines, the lane
      clearly its own strip in front of the garages.
- [x] j. (d2f15e9) street/standSpots.ts `STAND_SPOTS` (`open` = back to the camera), Trackside.tsx: 9 more stands on
      the camera side of the straight and outside T1 (11 with the main one), set back so the roof clears the chase
      camera's line; open backs, catch fence in front of every stand. The gantry and promenade leave a gap x -39..26.
      Was: Grandstands: lots of them along the main straight and round T1 (models/props/Grandstand.tsx,
      `GRANDSTAND` in layout.ts, street/Trackside.tsx), covered, with crowds, fences in front.
- [x] k. (9379320) Effects.tsx `RainCycle`/`rainAmount` (the original's humidity x clouds noise, humidity 0.72: ~10% of
      the time, ~5 min showers about hourly, same sky for every visitor); Vehicle.tsx swap (`SWAP_*`), wets in
      Car.tsx (`LIVERY.wet` blue band + tread grooves), `carState.tyres`. Rain itself is still the old point drops
      (folio-2025's RainLines.js is the next step up if the owner wants it).
      Was: Random rain with a tyre change: weather (Effects.tsx, store `scene.weather`) turns to rain at
      random times for a while, like Bruno's. When rain starts the car's slicks animate off and wet
      tyres (blue band) come on, a quick pit-stop style swap; back to slicks when it stops
      (models/Car.tsx `CarWheel`, `LIVERIES`). Frequency random, not too often.

### 4c. Owner review 2 (2026-10-23, night)
- [x] (cd7def6) Grass back to full blade size (the 4b-b cut made a lawn), 280 x 280 grid on desktop.
- [x] (30f7ce8) Opening like his: no title, name or loading bar; a ring on the ground fills while the world
      warms up (compileAsync + steady frames), shrinks, then the world opens in a 5 m circle at the normal chase
      distance; start sweeps it out. Rings trace the ground plane; reveal runs after AO; no renderer swap mid-reveal.
- [x] (044e620) Start back in front of the name (owner: "keep it where it was"), under a shade tree, at the
      head of an asphalt lane with chevrons (access.ts, AccessRoad.tsx) that runs to the pit exit and onto T1.
      (e9321a7 put it on the verge by the straight: wrong, replaced.)
- [x] (f94d226, bd22ff7, 7e40710) Car still at load: parked after spawn/teleport until the first drive input
      (x, z, rotation held, height settles damped), angular inertia scaled by CAR_SCALE^2.
- [x] (a609888, 51722ae) Knock-about props that tidy up: tyre walls (every tyre a body), wall ends, rocks,
      benches, lanterns, crates, barrels, cones, letters; back home once the car is 45 m away.
- [x] (7ff8268) His name out of the code (files renamed, comments say "the original").
- [ ] Credit him in the main README (owner: later).
- [ ] Garden benches/lamps and fences are still fixed; make them movable too if the owner wants.

### 4d. Layout v5 (owner sketch, 2026-10-23)
Spec and sketch in README.md "Track layout v5" (docs/research/layout-v5-sketch.png). Owner: river/harbour and
place spots "your choice"; Team Stallions "give a nice spot".
- [x] (a165eb3) Track traced from the sketch, pit lane the length of the straight (PIT z 34, x -58..40),
      hairpin pond, podium and cricket moved, scenes placed in turn and scored by facing (Ahmedabad faces the camera).
- [x] (0cbb499) Idle car vibration: the infield wasn't level (land averaged nearby road heights); level now, and the
      car re-parks when left alone.
- [x] (d0437f1) Opening ported from folio-2025: grid floor, glowing cut, click-to-start label, dip then sweep.
- [x] (ca81eea) No lines or words on the track, speckled asphalt, olive grass, orange sand.
- [x] Superseded by 4e (owner reviewed v5 and asked for the fixes there).

### 4e. Owner review 3 (2026-10-23, late night)
- [x] (ace948d) No piers under the bridge; contact ring off the road (zone at 34, -30; tyre wall 36, -19);
      the west harbour arm removed (CANALS is the river only, `RIVER`), garden pond moved into the chicane.
- [x] (b714bc8) Car judder when slowing: traced a dive-and-bounce at every stop; suspension damping up
      (compression 14, relaxation 6), eased stop when hands off, re-park only below 0.12 m/s.
- [x] (507279a) Way to the circuit is a sandy garden path (no asphalt lane, no overlaps).
- [x] (dbcad24) Opening: the site's ink floor with a soft cream dot grid and hairlines, red ring and cut,
      Geist Mono label, no boot jump (page painted `FLOOR` first, grid fades in, ring min 0.55 s), 1.5x faster.
- [ ] Owner to try in a real browser: intro timing, stop feel, chicane kerbs, the 4 m verge between the
      bridge loop and the strand leaving it. Fix only what the owner reports.

### 4f. Owner review 4 (2026-10-24)
- [x] (33e5f35) Tyres on the road after the bridge loop: tyre walls now keep 0.8 m off every stretch of road.
      scripts/check-clear.mjs lists anything placed on the road or pit lane; run it before layout commits.
- [x] (b04da58) Main straight dead straight (`STRAIGHT_Z` 43, x -63..42), pit lane parallel inside it with a
      2 m wall strip (`PIT.z` follows), entry peeling off the inside of the last corner and exit rejoining on
      the inside of T1 (owner's sketch), one solid white line on each lane's track side, kerbs cut there.
- [x] (da603ed) Night: tarmac lit evenly (Island.tsx `roadLight`), light pools gone; 13 towers on the pit wall.
- [x] (0f90330) Garden hedge blocks are knock-about props.
- [x] Design language (superseded by docs/BRAND.md, the old DESIGN.md is deleted): option A (pit wall broadcast) approved with the fonts unchanged (owner,
      2026-10-24); specimen at /docs/design (22d1916). Shared classes 2d94c41; moved over one commit each:
      edge tabs b680f08, team radio 9c45faa, toast 5c6d9f4, place panel + picks 4c77845, controls / hints / speed /
      pedals badbcf7, radio subtitle 0dc6e44, fit check + lap chip 61bb491, autopilot bd0237f, E prompt (interim).
      Garage teleports now land inside the garage zone (7370750).
- [x] Opening ("boot") in the new language: F1 start lights replace the loader ring (StartLights.tsx, Reveal.tsx
      `boot`), lights out opens the circle. The boot. Commit: see git log "Boot".

### 5. Map menu like Bruno's (M)
Owns components/ui/** (MapMenu in Hud.tsx) and a new components/world/MapCapture.tsx.
- [x] (0087e0f) MapCapture.tsx (`MAP`, `worldToMap`), ui/MapMenu.tsx. Renders into a square of the canvas
      before the composer draws (no render target, so tone mapping matches), copied to a 1024 jpeg.
      Panel in the site's ink with a cream hairline (owner: UI in the site's look, not the aubergine).
      Was: Top-down image of the real world: an orthographic camera renders the scene once into a
      render target when the map opens (and again when day/night flips), shown in a modal on
      Bruno's dark aubergine panel with the inset hairline. It must show the new coast and water.
- [x] (0dfe84c) ui/MapMenu.tsx `PINS`: zone pins (sector pins sit on the sector hotspots, which are beside
      the scenes), small pins for the contact medallions; cream diamonds with ink border, red once found.
      Touch: first tap shows the label, second goes.
      Was: Pins for places (zones + SECTORS scenes + contact logos) as white diamonds with dark border;
      labels pop on hover with Bruno's springy bezier (docs/research/bruno-folio-2025.md §1);
      player arrow rotating with `carState.forward`.
- [x] (0e9cef0) world/Overlay.tsx `wipeTo(zone)`: the original's wipe (2 s in, 4 s out, swooshes) in ink.
      Was: Click a pin: teleport (`setState({ teleport: { id, zone } })`) behind Bruno's diagonal wipe
      (his Overlay.js); M or Esc closes.
- [x] (8a99388) Achievements as a quiet second tab, with the fit check (`fitOpen`) and the resume under it.
- Accept when: the map is something you'd want to open; works on a 390x844 viewport (checked headless;
  owner to judge in a real browser).

### 6. Interaction prompt like Bruno's (E)
Owns new components/world/ui3d/** and Race.tsx (`InteractionPoint`, the current HTML pill).
- [x] (a26859c) world/ui3d/InteractivePoints.tsx; touch gets a bottom Open button (Hud.tsx `TouchInteract`).
      Was: Port Bruno's InteractivePoints.js (research brief §3): in-world diamond with an SDF outline,
      key icon, label sliding out from the diamond, states HIDDEN / CONCEALED / OPEN with his gsap
      eases (elastic open 1.5 s), fixed tilt for our chase camera, drawn on top while open.
      Concealed diamonds sit at every place; open on the nearest within reach. Works for zones
      (`near`) and contact logos (`nearLink`). Remove the HTML pill.
- [x] (4c77845, 4f) Opened panel (Panels.tsx): dark translucent gradient, Racero title only, Geist body,
      Geist Mono labels, 0.3 s fade/slide, no pills.
- [x] (5c6d9f4, 4f) Toasts (Hud.tsx Toast): Bruno's single queued toast, top-centre, 2 px countdown bar.
- [x] (b680f08, badbcf7, b742fc6) Top-bar buttons and bottom key hints in the same language; settings in its own small panel
      (gear: Livery, Sound, Voice) instead of under Controls.

### 7. Night
- [x] Light pools at night: done with the floodlights (4b h, `FLOODS` `px/pz`).
- [x] (f702a53, brake light a365a63) shared.ts `nightGlow`: every glow x1.8 at night, `nightGlow` option for
      night-only windows (Team Stallions). Was: Every night emissive > 1 with `toneMapped: false` so it blooms: garage headers
      (models/props/Garage.tsx), sector-scene windows/signs (models/sectors/*), car brake light.
- [x] (ef35560) Fireflies in the garden and by the lake at night (alive/Fireflies.tsx, add anchors).
- [x] (138c2c4) Optional: tinted shadows like Bruno (albedo x shadow colour), only via one cheap shared patch (tintedShadows.ts).

### 8. Town streets
- [x] (f5c5cd7) districts/townStreets.ts + Streets.tsx: pavements with kerbs on 12 frontages, planters with trees,
      knock-about bollards and cafe sets, one bus stop, one kiosk. Zebra crossings left out: the circuit carries
      no paint (art direction); ask the owner if he wants them anyway.
      Was: Pavements with kerb edging where buildings front the circuit, zebra crossings, street trees
      in planters, bollards, a bus stop or kiosk, cafe tables (street/**; use common.ts helpers).

### 9. Smaller things
- [x] (a4d2e93) Radio voice George (ElevenLabs `JBFqnCBsd6RMkjVDRZzb`, eleven_v4, stability 0.5,
      similarity_boost 0.8): set as default in scripts/gen-audio.mjs and app/api/voice/route.ts,
      re-record with `node scripts/gen-audio.mjs --only radio-sector-1,radio-sector-2,radio-sector-3,radio-sector-4,radio-garage-agents,radio-garage-genai,radio-garage-hardware,radio-garage-ml,radio-garage-vision,radio-playbook,radio-podium,radio-contact,radio-hello,radio-idle,radio-claude,radio-temp-on,radio-temp-off --force`,
      commit public/sfx. Voice Library voices return 402 on the free plan.
- [x] (a342ec7) Palms still use the old per-tree meshes; port them to the foliage registry (foliage/palm.ts).
- [x] (e1895eb) Tree colours are a first pass (foliage/species.ts); shade side reads dark. Now the original's oak/bush colours.
- [x] (2fde5fd) Engine a bit quieter (owner, 2026-10-25: `ENGINE_VOL` 0.65 in sound.ts).
- [x] (5d3c9c1) Car shook left-right while slowing (owner, 2026-10-25): measured yaw flipping every step at a
      crawl with the wheels turned; low-speed side grip (`LOW_SPEED`, `LOW_SIDE`) and the front idle brake fading
      as the wheels turn. Owner to confirm on a real GPU.
- [x] (4f9c1f7) Garage experience: dolly in (Rig.tsx, garageShots.ts), spec sheet per project (Panels.tsx
      `GarageSheet`), ring on the plinth, arrow keys.
- [x] (3317f53) /resume in design A with hover states; ink on white in print. Scroll-driven site: dropped (owner).

### 10. Brand: Datasheet (owner, 2026-10-25)
Spec: docs/BRAND.md (source of truth). Part number HG-08.
Owner picked the Datasheet direction (`/docs/brand/datasheet`), with motion. It replaces design A
(pit wall broadcast) on every screen; the 3D world is step 11. Code: components/brand/*. Tokens: paper #f3f2ed, ink #111111, graphite #5d5d58,
rule #cfcdc4, signal orange #ff4f00 (section numbers, status dots, focus brackets only). Type: IBM Plex
Sans, IBM Plex Mono for part numbers, values and keys. Hard edges, no rounded corners, no blur, no glow.
Voice: short, declarative, units on every claim.

Micro-interactions, everywhere: panels draw their frame in, header bars wipe, titles and codes decode,
figures count up, list rows wipe in staggered, orange corner brackets on hover/focus, buttons invert
to ink on hover, one scan line on a panel's first open. `prefers-reduced-motion` skips to the end.

- [x] Logo picked (owner, 2026-10-25): L10 · A "draw and fill" (app/docs/brand/mark.tsx). Reference for every item
      below: `/docs/brand/system` (identity, motion M00–M09, interactions I01–I08, screens S01–S06).
- [x] (d0096d3) Favicon app/icon.svg; brand code in components/brand; tokens, motion and interaction
      CSS in globals.css; IBM Plex in app/layout.tsx; custom cursor (I09); old exploration pages deleted.
- [x] (8e84b86) Old UI layer removed: hud-*, r-*, toy-*, map pins, start lights, old colour tokens, the Racero @font-face, Geist aliases; docs/DESIGN.md deleted. The 3D world still loads racero.otf directly (step 11).
- [x] (59526e3) Boot S01: components/ui/Boot.tsx replaces StartLights; paper floor with an ink dot grid, orange reveal ring; the start label is a sticker with the key.
- [x] (bcf5046) HUD S02 (Hud.tsx): tabs top right, the `Sheet` frame every place opens in, toast, hints, speed, Controls and Settings modals, touch stick and pedals.
- [x] (9e8abb0) Interact prompt in the world (ui3d/InteractivePoints.tsx): an ink square marker (no diamond) with the E key, the label ink Plex on white.
- [x] (bcf5046) Garage S03: GarageSheet shows `DsCard` (container-aware, prev/next within the garage); place bodies in Panels.tsx rewritten (roles as rows, papers and patents as coded rows, compounds as code squares, contact as rows).
- [x] (77cd8be) Overlays: RadioMessages (radio panel), Ask (I06), FitPanel and LapChip, AutopilotHud. EasterEggs only toasts. Deleted dead Section.tsx, ui/Reveal.tsx, RaceHud.tsx.
- [x] (77cd8be) Map S04: components/brand/TacticalMap.tsx, live car, objective = nearest unopened place, pins wipe there; side panel with position, places, achievements. MapCapture (top-down render) deleted.
- [x] (ba28252) /resume S05 (app/resume/Resume.tsx): the whole resume as a datasheet, tailored block, plain ink print.
- [x] (dd6fb40) 404 S06 (app/not-found.tsx). /docs/design is gone; /docs/brand/system is the specimen.
- [x] (dd6fb40, db56d8f) Trackside boards drawn on canvas with the mark and HG-08 (street/boardArt.ts); props say HG-08.

### 11. World redesign (owner, 2026-10-25)
Owner: next to the new UI "the world feels childish (car, building, fence, colors, etc)" and asked
to "design everything again". This overrides the old art direction above (folio-2025 look, olive
grass, orange sand) once approved. Proposals with turntable models: `/docs/brand/world`.
- [x] Owner picks the world palette and models on /docs/brand/world (2026-10-26: "Everything looks good").
      Approved: Concrete & Ink palette and W02–W10, the four vehicles with five liveries (replace W01),
      the start sequence (garage select, align, Bloom), powers on Shift. All in docs/BRAND.md.
- [ ] Swap, model by model. Reference code: app/docs/brand/world/* (models.tsx W02–W10, vehicles.tsx,
      StartSequence.tsx, island.tsx Bloom, powers.tsx). Wave 1 runs in parallel (disjoint files); wave 2 needs 11e.
  - [x] a. (4e549b4, c4cfa8a, b7a707b) Palette and ground: retune components/world/palette.ts `C` to Concrete & Ink (keys stay), terrain,
        grass, water and sand colours; W05 kerbs (ink/paper), the paper edge line, gravel run-off.
        Files: palette.ts, terrain.ts, Island.tsx, Grass.tsx, Water.tsx, street run-off.
  - [x] b. (172b8da..28f81ed) Trackside: W03 TecPro blocks replace the tyre walls, W04 concrete wall + ink debris fence (pit wall),
        W06 grandstands, W07 floodlights, W08 start gantry. Files: street/*, PitWallRun.tsx, Embankments.tsx.
  - [ ] c. Buildings: W02 garages (concrete block, glazed bays, thin ink roof), W09 concrete town blocks.
        Files: Places.tsx garages, models/sectors/*, street/Skyline.tsx, street/town.ts, districts/*.
  - [x] d. (75c2a5f, 259b723; palms became cypresses) Trees: W10 faceted cypresses and round crowns. Files: foliage/*, models/props/Tree.tsx, Groves.tsx.
  - [ ] e. Vehicles: the four vehicles (TH-18, E14, Atlas, Apollo) and five liveries drive in the game, each with
        its own handling; models move to components/world/vehicles/ and the docs page imports them from there.
        Replaces models/Car.tsx (and its Racero use). Files: models/Car.tsx, liveries.ts, Vehicle.tsx, store.ts.
  - [ ] f. (wave 2) Start sequence in the game: boot, garage select, align, Bloom of the real world, game camera.
        Replaces the Reveal.tsx / Intro.tsx opening.
  - [ ] g. (wave 2) Powers: Shift replaces boost, the meter in the HUD, SKYLINE / OVERTAKE / SPLIT / SEND IT in real
        physics. In the game the vehicle keeps going from where the power leaves it (no reset to the grid).
  - [ ] h. Night lighting rework (owner flagged it on the proposal).
  - [ ] i. Racero leftovers (Timeline.tsx, models/Avatar.tsx, models/props/Label.tsx) move to IBM Plex.
  - [ ] j. Sweep: everything not covered above follows the design language too (owner, 2026-10-26: design
        what the proposal lacks). Harbour, waterfront, park islands and slabs, garden (beds, hedges, flowers),
        StartGarden, timeline stones, contact logos, name letters, knock-about props, alive/* (birds, confetti,
        leaves), people, pit road paint.
  - [ ] k. Road redesign (owner, 2026-10-26: "Road / track should be black"): plain near-black matte asphalt, no speckle
        (Island.tsx `ASPHALT`, `lit`, `roadPaint`); paper edge line both sides; W05 ink/paper kerbs in the bends; gravel trap
        behind the kerb (street/Runoff.tsx); pit entry/exit lines only off the track, no dark slivers or notches (PitRoads.tsx);
        ink/paper start line. Owner to check. Places.tsx pit lane lines still use an unlit material (swap to `roadPaint`).
