# Brand: Datasheet

The approved identity for the site, the world's UI and the resume. **Read this before any UI work.**
Live reference: `/docs/brand/system` (app/docs/brand/system/System.tsx). If this file and that page
disagree, the page is what the owner approved; fix this file.

## Decision log (owner approvals, newest first)

| Date | Decision |
|---|---|
| 2026-10-26 | True proportion made E14 and Apollo too small. Turntable sizes now sit between true proportion and all-the-same: swept radius TH-18 1.42, Atlas 1.25, E14 1.0, Apollo 0.95. Hover cursor cell 10 px. |
| 2026-10-26 | Vehicles stay in true proportion on the turntable: one scale for all, set so TH-18 (the biggest) fits the plinth's inner circle; E14 and Apollo read small next to it. Replaces "all the same visual size". Hover cursor cell 13 px to 11 px (1.5x the 7 px square). Silver Arrows tail lamps stay orange. Flicker back to the grid slot after a power is for the /docs/brand/world demo only; in the real game the vehicle keeps going from where the power left it. |
| 2026-10-26 | Vehicle touch-ups: TH-18 gets more accent lines (nose strip, accent wing endplates) and an orange rain light low on the diffuser. E14 side and front panels go plain body colour (graphics removed, number plates kept), the yellow TSAL beacon is removed, the HV cables follow the livery accent (no longer always orange). E14 firewall brake light kept. |
| 2026-10-26 | Start sequence mock reworked (owner feedback): vehicles rebuilt (V01 F1 HG-08, V02 E14 Baja space frame, V03 Roadster after the new roadster references with no logo, V04 R-08 sport bike) with new side-profile icons; the world now builds in all around from the real island data (an orange ring expands from the car, the camera arcs over the island and swoops into the chase cam). Special powers on F proposed, owner to pick. |
| 2026-10-26 | **Build-in locked: 03 Bloom** ("I absolutely love it"). Trace and Scan are dropped. |
| 2026-10-26 | Vehicle names: **TH-18** (F1, V01), **E14** (ATV, V02), **Atlas** (roadster, V03), **Apollo** (bike, V04). Liveries, the same five in the same order for every vehicle: Paper, Ink, Graphite, Orange, Silver Arrows (silver with teal). Every vehicle fits inside the plinth's inner circle, all the same visual size. Atlas's rear must be filled in. |
| 2026-10-26 | Special powers on **Shift** (was F): a meter fills over time; the power can fire from 10% upward; after use it refills to full in 5 s. Powers: Atlas **SKYLINE** (thruster flight), TH-18 **OVERTAKE** (boost, DRS, light trail), Apollo **SPLIT** (lane split through props), E14 **SEND IT** (big Baja jump; launch control was too close to OVERTAKE). |
| 2026-10-26 | Cursor picked: border and fill, animated like one cell of the logo (trace round, fill from the left), final size 1.8x. Power meter: bar centred in its box, the 10% marks removed. Smoothness of the start sequence confirmed ("perfect"). |
| 2026-10-26 | Built in the mock: Bloom only (Trace and Scan code deleted); names TH-18/E14/Atlas/Apollo; five liveries in order, with Silver Arrows (#c9ccce metallic, teal #00a19c, black trim); vehicles scaled to the plinth dial's inner edge (`FIT_R` 1.42); Atlas rear closed. Powers on Shift (powers.tsx): the meter refills to 100% in 5 s, fires from 10%, and uses all its charge (more charge, bigger power); OVERTAKE, SPLIT and SEND IT flicker the vehicle back to its grid slot afterwards (agent's choice, owner to confirm). |
| 2026-10-26 | Cursor: all five lab options rejected. Keep the small square; on clickables it animates either to "border and fill" or "flicker". Owner picks one of these two. |
| 2026-10-26 | Cursor redesign: Magnetic rejected; five cursor-only options (Mark, Reticle, Arrow, Caret, Ring) in the I09 lab for the owner to pick. |
| 2026-10-26 | Start sequence mock, round 3 (owner feedback): the build-in ends at the game camera (Rig.tsx offset 10.5/12.5/14, fov 34); the circle is replaced by a dot layout of the real world with three options (01 Trace, 02 Scan, 03 Bloom); E14 rebuilt from the owner's photos (triangular firewall, roll cage, Team livery black/red/white with blue coilovers); Roadster rebuilt with smooth panels; bike touched up; livery swatches per vehicle; one fixed dial plinth; loadout swap (slide off, spin, orange scan reveal). Not approved yet. |
| 2026-10-26 | Cursor: Magnetic chosen; small boxes get the square outside the corner, plain links get brackets (owner). Options D, F, G and their code removed. |
| 2026-10-26 | Start sequence proposal (owner idea), mock in /docs/brand/world section 04: after the boot, a loadout panel to pick a vehicle on a turntable (V01 F1 HG-08, V02 ATV E14 after his SAE e-BAJA car, V03 supercar GT-08, V04 bike R-08), then Enter builds the world in around it (~3.5 s) and drops into the chase cam. Not approved yet. |
| 2026-10-26 | Owner disliked cursor options A/B/C. New lab options (I09, /docs/brand/system): D Tag (context verb tag beside an orange square), E Magnetic (targets lean ≤5 px to the pointer, the square docks in their corner, press throws logo cells), F Trail (logo-weight trail folding into a 2x2 attention map on hover), G Scan (one orange scan across the target, crosshair with its data-code). Default stays "no change". Preview persists via localStorage `hg:cursor-style`. |
| 2026-10-26 | Boot: the bar follows the load in legs (→60% while the world loads, →88% while shaders compile, full when ready); the floor grid shows from the first frame as a still (public/img/boot-floor.jpg) that hands over to the live grid. |
| 2026-10-26 | Boot bar runs on CSS (no jump to 100%), the floor grid waits for the world, cursor 7 px (owner). |
| 2026-10-26 | Step 10 done: every screen (boot, HUD, sheets, garage, map, overlays, prompt, resume, 404, trackside boards) is in this language; the old UI layer and docs/DESIGN.md are deleted. |
| 2026-10-26 | Cursor: no corner brackets on hover, just the square (owner). |
| 2026-10-26 | Custom cursor approved (I09). The brand code moved to components/brand; the old exploration pages are deleted, and /docs/brand/system and /docs/brand/world are kept. Step 10 started. |
| 2026-10-26 | Lockup: next to the name, the visible square is as tall as the name's font size, 0.4× apart (`<Lockup size name />` in mark.tsx). The old 36 px mark beside 20 px text looked too heavy. |
| 2026-10-26 | World proposal "Concrete & Ink" liked ("All of this is nice"). Night lighting needs more work later. The owner expects it to be lighter on memory too: share materials and instance repeated models when it's built. |
| 2026-10-25 | Part number is **HG-08** (08 is the car's number), never HG-26. |
| 2026-10-25 | `/docs/brand/system` approved as the language for every screen ("I loved all the things"). |
| 2026-10-25 | Map must read like a tactical game map (CoD-style), not a plain outline. Done in S04. |
| 2026-10-25 | Decode animation must never wrap text onto a second line mid-animation (fixed in parts.tsx `Hold`/`fit`). |
| 2026-10-25 | Logo: **L10 · A "Draw and fill"**: the 4×4 attention map, animated. |
| 2026-10-25 | Identity direction: **Datasheet**, with motion (`/docs/brand/datasheet`). Owner: "modal / COD games vibe". |
| 2026-10-25 | Project bullets come from the old portfolio (henilgajjar.framer.ai) and the resume, technical and verbatim. |
| 2026-10-25 | World (3D) looks childish next to the new UI; a redesign is open. See "World" below. |

Rejected, so don't bring them back:
- The pit-wall broadcast UI (design A: ink panels, cream hairlines, Racero).
- Three "same layout, new colours" directions: Paddock, Signal and Origin.
- Trace (lime on carbon) and Casebook (serif editorial) as the whole identity.
- Logos the owner found generic or too hardware-only:
  - a chip with pins, a sticker, a timing diagram, a schematic net;
  - L10b (HG spelled in pixels);
  - L12 (`hg` with a cursor);
  - L9 (tokens). The owner liked L9's motion, so the chosen logo's animation borrows it.

## Identity

- **Name block:** Henil Gajjar · `HG-08` · AI/ML engineer. Codes are part of the voice: projects
  `P01…`, zones `Z01…`, achievements `A01…`, rules `R01…`, screens `S01…`, error `E404`.
- **Logo** (app/docs/brand/mark.tsx, `<Mark size motion />`):
  - A 4×4 grid of squares in a 64-unit box: each cell 12.5 with a 2 gap, starting at 4.
  - Each cell is filled ink at an attention weight. Rows:
    `1 .25 .1 .1 / .45 1 .2 .1 / .15 .4 1 .25 / .1 .2 .5 ●`
  - The bottom-right cell ● is solid orange.
  - On a dark background, the ink cells turn paper. Never recolour the cells and never add anything to the mark.
  - Smallest size 16 px. Clear space is one cell on every side.
  - **Lockup:** the mark beside the name. The visible square equals the name's font size, with a gap of
    0.4 × that size (`<Lockup>`). Stacked (mark above the name, as on the boot screen), the name is set
    about as wide as the mark.
  - **Logo animation:**
    1. Each cell's outline traces itself (0.5 s), stepping 45 ms per diagonal.
    2. 170 ms later, the cell fills from the left (0.35 s, `cubic-bezier(.6,0,.2,1)`).
    3. The outline fades.
    4. The orange cell flickers on at 560 ms.
    - Total about 0.8 s. It plays once on the boot and once on first load of the header; everywhere else it is still.
- **Colour:** paper `#f3f2ed` (every background), ink `#111111` (text, rules, frames, fills),
  graphite `#5d5d58` (secondary text), rule `#cfcdc4` (table lines), signal orange `#ff4f00`.
  - Orange is used **only** for: focus brackets, status dots, section/code numbers, the one figure
    that matters, the player on the map, the objective.
  - Orange is never a panel fill.
- **Type:**
  - IBM Plex Sans for everything:
    - display 600 at 44/1.0, −0.02em
    - title 600 at 22
    - body 400 at 15/1.6
    - labels 600 at 13, caps, +0.06em
  - IBM Plex Mono for codes (12) and figures (600, tabular).
  - Loaded with next/font as `--b-plex` / `--b-plex-mono`; the app layout will take this over in step 10.
- **Rules:**
  - R01 Hard edges: no rounded corners, blur, glow or gradients. Shadows are solid ink, offset 3 px.
  - R02 Number everything.
  - R03 Units on every claim.
  - R04 One orange.
  - R05 Motion builds, then stops.
  - R06 Readable first: body in sentence case at 15 px or more; caps only for short labels.

## Motion (classes in app/docs/brand/datasheet/parts.tsx `CSS`)

A block wrapped in `<Stage motion>` gets `data-anim` while it waits and `data-run` once it is on
screen. The `dsa-*` classes animate with a per-element delay `--d` (helper `d(ms)`). Order inside a
panel: frame, bars, text, figures, details.

| Code | Name | Class / component | Timing | Used for |
|---|---|---|---|---|
| M00 | Mark | `<Mark motion>` | ≈.8s | boot, header once |
| M01 | Draw | `.dsa-frame` | clip top→bottom .6s cubic(.6,0,.2,1) | panels, cards opening |
| M02 | Wipe | `.dsa-x` / `.dsa-wipe` | .5s / .45s | header bars, rules, rows |
| M03 | Decode | `<Decode text run delay dur>` | .45s, 3 glyphs ahead | titles, codes, zone names |
| M04 | Count | `<Count value run>` | .7s ease-out cubic | every figure |
| M05 | Stagger | `.dsa-wipe` + `.dsa-pop` | 110 ms apart | bullets, list rows |
| M06 | Pop | `.dsa-pop` | .28s overshoot | dots, pins, numbers |
| M07 | Scan | `.dsa-scan` | 1.2s, once per panel | first open of a panel |
| M08 | Flicker | `.dsa-flicker` | .55s steps | labels in the world, toasts |
| M09 | Loading | the mark's cells pulsing | loops | world or answer loading |

- **Allowed loops (nothing else loops):** the loader, the radio waveform, live status dots, the
  objective ping on the map, and a text cursor.
- `prefers-reduced-motion` jumps every animation to its end.
- **Decode rules:**
  - Scramble glyphs keep the real character's case (no M or W), so the width hardly changes.
  - Text that fits on one line stays on one line while it decodes; text that wraps keeps wrapping
    (`fit()` measures the invisible copy).
- **SVG gotcha:** a CSS animation's `transform` replaces an SVG `transform` attribute. Put the SVG
  transform on an outer `<g>` and the animated class on an inner one.

## Micro-interactions (System.tsx `CSS`)

| Code | Thing | Behaviour |
|---|---|---|
| I01 | Buttons | Primary `x-btn x-primary`: ink fill, orange corner brackets on hover/focus, the arrow nudges 4 px, and on press it sinks 3 px into its shadow. Secondary `x-btn x-secondary`: ink wipes in from the left. Link `x-link`: the underline draws. |
| I02 | Keys | `x-key`: a cap that presses down on the real keydown (E, M, Esc, arrows). Every action shows its key. |
| I03 | Tabs, toggles | An ink block slides under the active tab. Toggles are square and say ON/OFF in words. |
| I04 | Chips | `x-chip` inverts on hover. |
| I05 | Rows | `x-row` inverts and the arrow arrives; figures stay in mono. |
| I06 | Ask | Focused input shows the brackets and an orange caret; the answer decodes in as it streams. |
| I07 | Toast | Flickers on, an ink countdown bar runs, it leaves. One at a time, top centre. |
| I08 | Tooltip, status | Tooltip is a white sticker with a hard shadow. Status dots are the only round thing: orange blinking = live, ink = visited, outline = not yet. |

| I09 | Cursor | **Chosen (owner, 2026-10-26): border and fill, drawn like a logo cell.** Idle: a 7 px ink square with a 1 px paper outline, on the pointer with no lag. Over clickables (`a[href], button, [role=button], summary, label[for], select, [data-cursor=hover]`) it becomes one 10 px logo cell: a paper halo at once, the 1.5 px ink outline traces round in 90 ms, then orange wipes in from the left in 80 ms. Press: scale 0.85, the fill turns ink. I-beam over text, DRAG over `[data-cursor=drag]`, hidden on `[data-cursor=none]`, the end state under reduced motion. Only the cursor reacts; targets keep their own hover CSS. Flicker and the style switch are removed. |

Hover and keyboard focus share one signal, the orange corner brackets (`x-sel` + `<Corners/>`). The cursor itself never shows brackets.

## Screens (S01–S06 in System.tsx; build the real ones from these)

- **S01 Boot (built, components/ui/Boot.tsx):** the loading bar is a CSS transition (it eases to
  90% over 9 s, then finishes in 0.35 s once the world is ready), never rAF-driven: building the
  world and compiling shaders block the main thread, and a JS bar froze then jumped to 100% (owner,
  2026-10-26). There is no percent readout for the same reason. The floor's dot grid stays hidden
  until the world is ready (Reveal.tsx `load.grid`), so it doesn't snap when the camera moves into place.
- **Boot order** (components/Experience.tsx `INTRO_MS`): the world isn't imported or mounted
  until the intro has played (1.8 s). Importing it runs heavy module code and building it blocks
  the main thread for seconds, which made the mark and the decoding stutter (owner, 2026-10-26).
  Measured with Chrome long tasks: none before 2.2 s now; the heavy work runs behind a still
  screen where only the CSS bar moves.
- **S01 Boot (mock):** paper screen.
  1. The mark builds.
  2. The name decodes, then `HG-08 · role · city`.
  3. "Loading the island" counts to 100% with a bar.
  4. "Press Enter to drive" flickers on.
  - Coordinates sit bottom left and the revision bottom right.
- **S02 Driving HUD:**
  - Radio panel top left: ink bar with an orange waveform, and the line decoding.
  - Tabs top right: Map (M), Controls, Settings, Sound, and Resume in ink with an orange shadow.
  - Toast top centre.
  - Zone sticker bottom centre: E tab, `Z02 · Hyperlab`, and the story title.
  - Speed sticker bottom left.
- **Place sheets (built):** Hud.tsx `Sheet`. On desktop it sits on the right, 440 px wide (640 px for
  garages); on phones it's a bottom sheet. The ink bar shows `Zxx · kicker` (Panels.tsx `zoneCode`) and
  an Esc close; the title decodes; bodies use numbered heads (`Head`). Controls and Settings use
  the same frame as centred modals (`Modal`).
- **S03 Garage:** the datasheet project card (parts.tsx `DsCard`) over the garage, with an Esc sticker.
  ← → step through projects and each one boots in. The card has:
  - header bar `HG-08 / Pxx`
  - 1 Features
  - 2 Key specifications (`specs` from content/projects.ts)
  - 3 Built with (bus diagram)
  - 4 Source
  - prev/next footer
- **S04 Map:** a tactical map built from real world data:
  - coastline (`coastR`), sea and lakes hatched at 45°, river
  - every building (`BUILDINGS`) as an ink block, darker the more floors it has
  - garages; track and pit lane as outlined roads at true width; orange start line
  - 8×8 grid with A–H / 1–8 references; S1–S4 labels; Zxx pins (hover shows the name)
  - objective pinging orange; player arrow with an orange view cone; compass; 25 m scale bar
  - side panel: 1 Position (grid references, distance), 2 Legend, 3 Achievements.
- **Map (built):** `components/brand/TacticalMap.tsx` draws S04 in both the docs page (fixed
  player) and the game (MapMenu.tsx, `player="live"` from carState). The objective is the nearest
  place not opened yet; clicking a pin wipes there. The old top-down render (MapCapture) is gone.
- **Stage trigger:** `useRun` starts on the first visible pixel (rootMargin −8% at the bottom). A
  20% threshold never fired for tall fixed panels.
- **S05 Resume (built):** app/resume/Resume.tsx, the whole resume as a datasheet (DsResume is its
  first-page preview). The print rules in globals.css force every animated element visible and print
  in plain ink.
- **S06 404:** `E404 · Off track`, "Track limits", "You went off the island. Lap time deleted.",
  and a primary button.

## Voice

Short, declarative, units on everything. The radio keeps its warm F1-engineer voice
(content/radio.ts). Never invent facts; content lives in content/*.ts. No AI tells.

## Where things live

- components/brand/mark.tsx: `Mark`, `Lockup`, `ATTENTION` (the logo).
- components/brand/motion.tsx: `Stage`, `Decode`, `Count`, `d`, `useRun`.
- components/brand/sheets.tsx: `DsCard` (project sheet), `DsResume`, `DsLabel`.
- components/brand/tokens.tsx: `DS` colours, `pad`, `LINKS`, `Figures` (server-safe).
- components/brand/Corners.tsx, components/brand/Cursor.tsx.
- app/globals.css: `@theme` tokens (`ink`, `paper`, `graphite`, `rule`, `signal`), the brand
  section (`dsa-*` motion, `hgm-*` mark, `x-*` interactions, `map-*`) and the cursor.
- app/layout.tsx: IBM Plex Sans/Mono as `--font-plex` / `--font-plex-mono`; `font-sans` and
  `font-mono` resolve to them. `--font-geist*` are temporary aliases for the canvas labels.
- app/icon.svg: the favicon (the still mark on paper).
- Reference pages: /docs/brand/system (System.tsx) and /docs/brand/world (World.tsx, models.tsx).
  /docs/brand redirects to the system page.

## World (pending)

The owner says the 3D world now feels childish next to this UI: the car, buildings, fences and colours.
Proposals are at `/docs/brand/world`. Nothing in the world changes until the owner approves there;
then record the approved palette and models here and in ROADMAP step 11.

**Proposal: "Concrete & Ink"** (owner liked it 2026-10-26; implementation not started; night lighting to be reworked), a modern circuit instead of a toy town.
Code in app/docs/brand/world/models.tsx; the page draws every view through one WebGL canvas
using drei `<View>`.
- **Palette:**
  - concrete `#d9d6ce`, concrete dark `#b8b4a9`, asphalt `#3a3b3e`, gravel `#cdc4b0`
  - grass `#7a8462`, leaf `#5c6a4b` / `#73805c`, water `#3e5a63`
  - ink `#151515`, paper `#f3f2ed`, orange `#ff4f00` (one accent per object), glass `#1f262b`
- **Models:**
  - W01 car HG-08: ink body, paper sidepods and engine cover with 08, an orange nose line
  - W02 garages: a concrete block with five glazed bays Z05–Z09 and a thin ink roof
  - W03 TecPro barrier blocks (replaces the tyre walls)
  - W04 concrete wall and ink debris fence
  - W05 ink/paper kerbs, a paper edge line and gravel
  - W06 grandstand
  - W07 floodlight with night beams
  - W08 start gantry: LED board and orange start lights
  - W09 concrete town blocks
  - W10 trees: faceted cypresses and round crowns
- **Changes from the old art direction** (it said no painted lines and kept red/white kerbs): this
  proposal adds paper edge lines and ink/paper kerbs.
