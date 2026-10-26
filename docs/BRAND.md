# Brand: Datasheet

The approved identity for the site, the world's UI and the resume. **Read this before any UI work.**
Live reference: `/docs/brand/system` (app/docs/brand/system/System.tsx). If this file and that page
disagree, the page is what the owner approved; fix this file.

## Decision log (owner approvals, newest first)

| Date | Decision |
|---|---|
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

| I09 | Cursor | `components/brand/Cursor.tsx`, mounted once in app/layout.tsx. A 10 px ink square with a paper outline follows the pointer and shrinks to 0.7 while pressed. **No brackets on hover** (owner, 2026-10-26); hover feedback is the target's own. A 2 px bar over text fields; `data-cursor="drag"` shows a DRAG tag (3D views); `data-cursor="none"` hides it. The current mode is on `<html data-cursor-mode>`. Mouse and pen only; touch is unchanged. |

Hover and keyboard focus share one signal, the orange corner brackets (`x-sel` + `<Corners/>`). The cursor itself never shows brackets.

## Screens (S01–S06 in System.tsx; build the real ones from these)

- **S01 Boot:** paper screen.
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
- **S05 Resume:** the datasheet resume (`DsResume`). Print stays plain ink on white.
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
