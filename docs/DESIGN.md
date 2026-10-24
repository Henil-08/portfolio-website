# Design language

**Status: proposed, waiting for the owner's approval (2026-10-24).** Live specimen with both options
side by side, day and night: `/docs/design` (app/docs/design, not indexed). Nothing below has been applied
to the UI yet, except the map (components/ui/MapMenu.tsx), which already follows option A. When it is
approved, the components listed under "What changes" move to it, one commit each, and this line
becomes "approved".

Two layers, two languages:

- **The world** (everything in the 3D canvas) copies folio-2025's look: olive grass, orange sand, plain
  speckled asphalt, chunky red and white kerbs, soft rounded toy forms, very little text. See
  docs/ROADMAP.md "Art direction". This document doesn't change it.
- **The screen** (HUD, panels, map, toasts, prompts, the opening) uses the site's own language,
  below. It never borrows folio-2025's aubergine panels, crimson gradients or hand-drawn fonts. It
  does borrow its *mechanics*: the edge tabs, the springy pops, the wipe, no blur.

## Option A (recommended): pit wall broadcast

The UI looks like the graphics on an F1 TV broadcast, or like the timing screens on the pit wall:
dark ink panels with square corners, a thin cream hairline inset, red as the one accent, small mono
caps for labels. It matches the theme and night races, and it reads well over the bright world.

### Tokens

| Token | Value | Use |
|---|---|---|
| ink | `#1f2133` | panel fill (top-left of the gradient), text on cream |
| ink-deep | `#171928` | panel fill (bottom-right), labels, inactive tabs |
| cream | `#fff8ec` | text on ink, hairlines (at 35%), secondary buttons |
| red | `#ff4b3e` | the one accent: primary action, close tab, found/earned marks, the car on the map |
| red-deep | `#a3241c` | bottom of the red tab gradient |
| sector purple / green / yellow | `#9b6bff` / `#45c46b` / `#ffd23f` | timing only (sector flashes), never decoration |

Panel fill: `radial-gradient(ellipse at top left, #1f2133, #171928)`.
Hairline: 1 px cream at 35% opacity, inset 3 px from the edge (brightens to 80% on hover for tabs).

### Type

| Role | Font | Size / case |
|---|---|---|
| Title (one per panel, at most) | Racero (`font-racing`) | 22-28 px, uppercase |
| Body | Geist (`font-sans`) | 14-15 px, sentence case, cream at 85% |
| Labels, keys, tabs, numbers | Geist Mono (`font-mono`) | 11-12.5 px, uppercase, tracking 0.08-0.16em |

### Pieces

- **Panel**: ink gradient, square corners, inset hairline, no border radius, no shadow beyond a soft
  `0 0 4px #0007`. No backdrop blur and no dimming of the world behind it.
- **Edge tab**: a 44 px tab that sticks out from a panel's edge or the screen edge (map close tab,
  map/achievement tabs, top-right controls). Red for close or the main action, ink for navigation.
  Slides out 4 px on hover; slides off-screen while a modal is open.
- **Buttons**: primary is a red block with cream text; secondary is a cream block with ink text;
  quiet is a cream hairline on ink. Square corners, 40-44 px tall.
- **Label chip**: ink-deep box, cream mono caps, 2 x 6 px padding (map pin names, the zone hint).
- **Diamond**: the marker for places (map pins now, the in-world E prompt in step 6): cream fill with
  an ink border, red once found.
- **Key cap**: a small cream square with an ink mono letter (E, M, R, Space).

### Motion (folio-2025's curves)

- Pop in: `cubic-bezier(0.49, 2.2, 0.53, 0.75)` 0.3 s (overshoot). Pop out: `cubic-bezier(0.65, -1, 0.45, 1)` 0.3 s.
- Panels: fade 0.3 s, slide 8-12 px.
- Toast: drops in `cubic-bezier(0.4, 1.6, 0.65, 1)` 0.6 s, leaves `cubic-bezier(0.42, 0, 0.47, -0.55)` 0.45 s,
  one at a time with a 2 px countdown bar.
- Teleport: the diagonal wipe (world/Overlay.tsx).

### What changes when A is approved

| Component | Today | After |
|---|---|---|
| Top bar (Hud.tsx `TopBar`, `IconBtn`, Resume) | cream rounded cards | ink edge tabs on the right edge |
| Toast (Hud.tsx `Toast`) | big tilted Racero pill | single queued ink toast, top centre, countdown bar |
| Zone panel (Hud.tsx `ZoneCard`, Panels.tsx) | cream rounded card | ink panel, Racero title, Geist body, mono labels |
| Pinned picks (`PicksCard`), fit check (FitPanel.tsx), lap chip | cream cards and pills | ink panels, square buttons |
| Controls / settings (`Controls`, `LiveryPicker`) | cream card | small ink panel behind a gear tab (step 6) |
| Key hints, joystick, brake/gas (`Hints`, `Joystick`) | cream pills | key caps and square ink buttons |
| Radio transcript, autopilot HUD, Ask box | mixed | ink chip / panel |
| Map (MapMenu.tsx) | already A | — |
| `/resume` | cream paper | stays cream paper (it prints) |

## Option B: cream toy cards

Keep what the HUD has today everywhere: translucent cream cards with big rounded corners, soft
shadows and backdrop blur, ink text, chunky "pressed" buttons. Softer and more toy-like, close to
the world's mood. If B is chosen, the map moves to it instead (rounded cream frame, ink pin labels,
the close tab becomes a round cream button), and step 6's prompt uses cream diamonds.
