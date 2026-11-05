# Model fidelity pass: make each 3D model match its concept image

Owner, 2026-11-05: "It is not just lighting; the renders themselves are not accurate to the images. Not
all, but some are a bit off: the textures in the bench, the stones in the bush, etc." Paused for the usage
limit. This is the plan.

## 1. Compare like for like (no guessing)

- On /docs/brand/models, each row gets:
  - a **matched camera** at the concept's own angle, field of view and framing;
  - a **slider overlay** (concept ↔ render) and a 50 % onion-skin.
- Render in the Studio look. The work-in-progress is uncommitted in components/world/studio/*,
  ModelsPage.tsx and KitModel.tsx. Finish it first, so lighting differences don't hide real geometry
  differences.
- Score each model: shape, proportions, missing or extra parts, material detail, colour. List the
  concrete differences in a table at the bottom of this file. No "looks close".

## 2. Fix pic by pic, in code

Per model, change the geometry and materials until the overlay lines up:

- **Proportions and parts.** Match heights, widths and counts to the concept (slats, lamps, stones, steps,
  rails), and add what's missing. Known gaps:
  - Ahmedabad's taller left block
  - town-mid's side loggias
  - see-through glass
  - the floodlight back glow
- **Surface detail** (what the owner noticed):
  - Bench: slat texture, edge chamfers, the seat/back gap.
  - Bush: real gravel stones in the tray, as instanced chips with size variety, not flat noise.
  - Concrete grain and paper grain, as small tileable textures.
  - Grass blade density.
- **Textures.** Make tileable maps for concrete, gravel, slats and grain. Use small procedural canvases,
  or Meshy text-to-image tiles (3–6 credits each) if procedural doesn't match. Keep them under ~256 px.
  Use them on the page and in the world.
- Order: the models the owner flagged first (bench, bush), then the ones the build agents reported as
  off, then a sweep of the rest in concept order.

## 3. Where code can't get there

For organic or very detailed pieces (grasses, rock set, maybe the boat and the café chairs):

1. Meshy image-to-3D from the approved concept, textured, 30 credits each. 455 credits are left.
2. Compress with webp textures and meshopt.
3. Compare on the page.
4. Keep whichever is closer: our code model or the Meshy model.

## 4. Then the world

- Carry each approved fix into the game. Only the geometry and texture changes go in; the Studio
  lighting step is separate.
- Keep instancing, colliders and night glow.
- Check day, dusk, night and rain.

## Also open (from the same session)

- **Cypress crowns render solid black in the game.** The kitA tree swap dropped the vertex colours or the
  colour, or broke the normals or the see-through. Fix it in foliage/species.ts / registry.
- **Owner's calls still pending:**
  - Put the sector signs back (HYPERLAB, SCHOOL OF ENGINEERING, WATERS) as Plex signs?
  - Is the pit wall stand's 1.8 m intrusion into the pit lane OK?
  - Garage doors are 10.6 m wide in the game versus the concept's tall doors.
  - Planters under every tree?
  - Boats: all motor launches?
  - Podium numbers in white?
  - Do the Meshy monuments and the driver go into the contact area?
- **The 2560 × 1440 check of the boot and garage select still needs a re-shoot.**

## Comparison table (2026-11-05, Studio look at the matched camera)

How it was read: /docs/brand/models, row switch **Match** (or `?view=match`). Each row renders the model in
the Studio look at the concept's own camera (app/docs/brand/models/match.ts: angle, fov, and the concept's
silhouette box measured from its pixels). The page fits distance and aim to the concept's **height and
centre**, so the **width ×** figure is our width over the concept's at the same height: 1.00 means the
proportions match, below 1 we are narrower, above 1 wider. It also moves with the camera angle (the angles
are hand-tuned, ±10°), so read anything within ±0.12 as "same". Wipe slider and a 50 % onion-skin sit on
each match cell. Shots: scratchpad `studio/pair-p1*-<id>.jpg` (concept left, ours right).

| Model | Shape | Proportions (width ×) | Missing / extra parts | Material detail | Colour | Verdict |
|---|---|---|---|---|---|---|
| tree-cypress | fuller sage spindle on a short ink trunk (fixed) | crowns overlay; the width figure still reads ×0.80 from the planter | none | flat facets | sage #8c9a7c | small diffs |
| tree-round | tiled geodesic crown with grooves between the tiles (fixed) | ×1.00 | orange collar now just under the crown; thin square plate (fixed) | facets flat | sage tiles (fixed) | match |
| bush | three faceted bushes placed as in the concept (fixed) | ×0.86 (tray seen from the concept's angle; overlay lines up) | label strip with an ink rule and dot, orange clip (fixed) | a packed bed of individual pebbles in five stone colours (fixed) | pale rim, sage bushes | match |
| grasses | wide, long, arching blades (fixed) | ×1.02 | tan/paper chevron plumes (fixed) | no grain on the blades | mostly sage, paper and sand, a little ink (fixed) | match |
| rocks | three big blocky sharply cut boulders (fixed) | ×0.95 | none | dense dark grit of individual pebbles (fixed) | warm grey concrete (fixed) | match |
| lamp | post, lantern and cap | ×0.86 | the lantern glows (fixed); wider head and base (fixed) | base grained concrete (studio grain) | warm grey base (fixed) | match |
| bench | plinth-cut block with deep end and foot chamfers; seat flush between raised ends (fixed) | ×1.00 | uprights on flat posts behind, clear seat/back gap (fixed) | grained charcoal slats (fixed); concrete grain | warm grey #bfbab1 (fixed) | match |
| bollard | three faceted posts with ink caps and an orange band | ×1.01 | none | concept's twist reads stronger (sharper facet breaks); ours facet less visible | concrete lighter than concept | match |
| kiosk | ink body with big chamfered corners (fixed) | ×0.99 | thick awning with a front lip, window frame and mullion (fixed) | glass flat | counter concrete matches | match |
| busstop | shelter, bench, sign | ×1.08 | thick chamfered roof slab, sign on the right post (fixed) | glass too opaque | fine | small diffs |
| cafe | table, four chairs, cup | ×1.04 | none | slab grained concrete | mid-grey slab (fixed) | match |
| boat | sharper faceted bow (fixed) | ×0.81 | open wheelhouse with seats and a console (fixed) | none | ink gunwale and orange stripe match | small diffs |
| pier | deck, rails, bigger ink caps and piles (fixed) | ×1.49 (the concept crops the pier; no data) | orange bollard with the near rail set back (fixed) | slab joints | warm grey deck (fixed) | small diffs |
| goal | frame, net, orange band | ×1.01 | none | net grid matches | matches | match |
| stumps | three tall stumps, orange bails | ×1.04 | none | ink seam lines match | grey concrete base (fixed) | match |
| podium | three square steps, bigger chamfers, ink tops nearly to the edge (fixed) | ×1.43 (the concept crops step 2 at the frame; steps 1 and 3 overlay) | none | concrete grain | warm grey (fixed) | small diffs |
| trophy (code) | faceted cup on a stem, two-tier ink plinth with orange band | broader cup, bigger square handles (fixed) | none | facets | matches | small diffs |
| town-low | three storeys, taller and narrower (13 x 10 m, 13.6 m tall) | ×1.00 | 4 window bays on the front, 3 on the side, as the concept | deep window reveals read; no grain | concrete now the warm grey | match (fixed 2026-11-05) |
| town-mid | five storeys and a glazed penthouse, a heavier frame | ×0.84 | corner loggias with dark glass and glass balustrades now down the front corner and the side; open balcony at the far corner | | concrete warm grey | small diffs (fixed 2026-11-05; still a little narrow) |
| town-tower | grid façade; a deep chamfered slab band at every floor, well proud of slim pilasters | ×0.87 | slab balconies give the stacked look | | glass a paler neutral grey, not blue | small diffs (fixed 2026-11-05) |
| pit-building | five bays, glazed upper storey, thin roof; taller ground floor (7.4 m) and shorter ends | ×1.15 | none | upper glazing a paler grey glass | concrete warm grey | small diffs (fixed 2026-11-05) |
| boston | rowhouses + domed church with portico and spire; longer row, lower dome and spire | ×0.83 | the wide plinth is gone | | rowhouse windows paler grey glass | small diffs (fixed 2026-11-05) |
| ahmedabad | taller ground arcade (7.2 m) with the upper tier right on it, set back 1 m; a tall block at the front left beside a low two-bay wing; dome on the tier | ×0.88 | terrace between the tiers gone | lattice screens match | concrete warm grey | small diffs (fixed 2026-11-05) |
| hyperlab | three gables, glazed entrance, orange panel | ×0.90 | roofs carry glass skylights in heavy ink frames; entrance grid of five posts split in two, transom and door rail, a mezzanine inside | | skylights pale grey glass | match (fixed 2026-11-05) |
| waters | long low block (23 x 10 m, 5.8 m to the roof), ribbon window, plant units, canopy | ×1.08 | none | | fine | match (fixed 2026-11-05) |
| grandstand | stepped concrete wedge, seats, roof lower on wider Y braces | ×0.90 | ink railing along the whole front; side stair in darker concrete down to the ground with a handrail; taller mesh fence | | a block of paper seats across the middle of one row | match (fixed 2026-11-05) |
| floodlight | mast, platform, head | ×0.46 (the head faces the road, so it is end-on at this angle; it is 5.6 m wide like the concept) | ladder cage: hoops every 0.9 m and five uprights | | fine | small diffs (cage fixed 2026-11-05) |
| gantry | mitred beam, LED board, five lights | ×1.14 | none | | fine | match |
| tecpro | two rows of 7 strapped blocks, tall chamfered boxes (1.1 x 1.2 x 1.2 m) | ×1.07 | none | straps match | top row B W W B W W B, one orange below | match (fixed 2026-11-05) |
| marshal | booth with roof, desk, phone, flag; wider (2.9 m) | ×0.84 | none | | roof matte ink all over (the light band no longer pokes through its top) | small diffs (fixed 2026-11-05) |
| pitwall | four booths (2.9 m pitch), fence, plates 1–4 | ×1.19 | base slab ends just past the booths; canopies smaller with a steeper hip | fence bars thicker and spaced wider (less moiré) | slab warm grey concrete | small diffs (fixed 2026-11-05) |
| Meshy mail (C01) | envelope on plinth, matches | ×0.88 | none | plinth texture blotchy; envelope edge lines wobble | plinth slightly darker | match |
| Meshy linkedin (C02) | network sculpture, matches | ×0.66 (angle) | none | plinth texture blotchy | fine | match |
| Meshy github (C03) | branching sculpture, matches | ×0.68 (angle) | none | plinth texture blotchy | fine | match |
| Meshy resume (C04) | page on plinth | ×0.80 | none | text lines blurred and uneven; paper creased | fine | small diffs |
| Meshy scholar (C05) | books and cap on pedestal | ×0.87 | none | orange smears baked into the plinth steps; plinth face has scratch marks | | small diffs |
| Meshy huggingface (C06) | ring sculpture twisted into a figure 8; concept's is an open ring with an orange clasp | ×0.89 | | | | off |
| Meshy medium (C07) | typewriter on plinth, matches | ×0.83 | none | sheet in the typewriter blank-ish | fine | match |
| Meshy driver | rigged suit, helmet with orange stripe, white side panel: matches | ×0.68 (the pose: wave/idle vs the concept's A-pose) | none | fine | matches | match |
| Meshy trophy | cup, handles, plinth | ×0.82 | the orange stripe round the plinth missing (paint is body + plinth only) | | stem collar paints white-to-ink in a ragged band | small diffs |
| Meshy mercury | no concept image to match | ×1.03 | | | | n/a |

Count: 8 match, 23 small diffs, 9 off (bush, grasses, rocks, pier, podium, town-tower, ahmedabad,
huggingface, plus the gravel trays in general); Mercury has no concept. Fix order suggestion: bench and bush (owner-flagged), then the
off list, then the paper-vs-concrete colour calls (lamp base, cafe slab, stumps base, pier deck, town
façades), which are one-line paint changes.

## World scale (2026-11-05)

Owner: "everything is out of proportion, the grass is too big, the street lights are too big, bench
is the same size as the bush, there are random benches in S3."

**Why it happened.** The road is 8 m (layout.ts `TRACK_WIDTH`) and stands for a real 12 m road, so
the vehicles drive at 2/3 of their size (vehicles/scale.ts `VEHICLE_SCALE` = 8/12) to keep the
proposal's car-to-road proportion. The kit (components/world/kit/*) is modelled in real metres and
went into the world at real size, or at a guess per object (town blocks fitted to their plots,
sector buildings 0.42-0.54, floodlight 0.6, gantry 0.65, grandstand 0.75, marshal post 0.8, pit
wall 0.7, lamps 0.55-1.02, benches 0.8-1.0). So the furniture stood 1.5x too big next to the car
and nothing agreed with anything else: a 2.1 m bench beside a 2 m bush tray, a 3.7 m lamp as tall
as the car is long, grass blades up to 1.2 m.

**The rule.** components/world/scale.ts: `WORLD_SCALE` = `VEHICLE_SCALE` (2/3). Everything modelled
in real metres goes into the world at its real size times WORLD_SCALE (`real(m)`). Buildings go by
their storeys: a real 3.3 m storey times WORLD_SCALE (`storeyScale(modelStorey)`), so a three-storey
block is about 10 m real, 6.6 m to its roof here. Never size anything by eye: write its real size in
this table and multiply.

**The check.** Dev only: `window.__lineup()` (components/world/ScaleLineup.tsx) parks the car at the
head of a row on the pit lane's east end and stands the world's own pieces beside it, each drawn
exactly as the world draws it: a person, the bench, a bush, the lamp, a bollard, a cypress and a
round tree, over a 1 m grid, each with its real size written in front of it, and points the camera
at it. `__lineup(false)` clears it. Read it like a photo: the lamp about twice the person, the bench
knee-high, the bush waist-high, the car longer than the bench.

World sizes in metres (real x 2/3). "Before" is what the world drew before this pass.

| Object | Model (real m) | Real target | Before (world) | Now (world) | Where |
|---|---|---|---|---|---|
| Car TH-18 | 5.6 long, 1.0 tall | F1 car 5.6 | 3.73 | 3.73 (the reference) | vehicles/scale.ts |
| Driver figure (contact area) | 1.75 | 1.75 | 1.75 | 1.17 | social/index.tsx |
| Fans in the stands (seated) | figure 0.74 to the crown | crown 0.9 above the seat | 0.70-0.78 | 0.57-0.63 | Trackside.tsx, props/Grandstand.tsx |
| Marshals (standing) | figure 0.74 | 1.75 | 0.81 | 1.17 | Trackside.tsx |
| Lamp (kit) | 3.68 | 3.5-4 | 3.74 old town and park, 3.5 harbour, 3.68 waterfront, 2.0 garden | 2.45 everywhere | districts/furniture.ts, garden, waterfront |
| Boston gas lamp | 4.3 | 3.5-4.5 | 4.3 | 2.85 | sectors/Boston.tsx |
| Bench (kit) | 2.1 x 0.6, seat 0.48 | 1.8-2.1, seat 0.45 | 2.1 park and old town, 1.79 garden and start, 1.68 waterfront | 1.4 x 0.4, seat 0.32, everywhere | districts/furniture.ts |
| Bush (kit tray) | bushes 0.66-1.25 tall in a 2.7 x 2.3 tray | 1-1.5 | tallest 0.9 x scatter 0.7-1.35; start 0.63-0.72 | tallest 0.83 x scatter 0.75-1.4 (real 0.9-1.75); start 0.83, 0.79 | foliage/species.ts, start.ts |
| Cypress | 4.32 | 6-10 | 5.6 x scatter | 5.0 x scatter 0.8-1.4 (real 6-10.5) | foliage/species.ts |
| Round tree | 4.95 | 5-8 | 5.2 x scatter | 4.3 x scatter 0.8-1.4 (real 5.2-9.1) | foliage/species.ts |
| Street tree in its planter | round tree, planter 1.5 x 0.6 | 4-5 | 3.2, planter 1.0 | 2.8, planter 1.0 x 0.4 | districts/townStreets.ts |
| Boulder (nature) | 1.2 x 0.7 x 1.0 | about 1 | 1.0-1.6 wide | 0.7-1.1 wide | props/Tree.tsx |
| Bollard (kit) | 1.0 | 0.9-1.0 | 1.0 | 0.67 | districts/Streets.tsx |
| Kiosk (kit) | 2.2 square, 2.5 | 2.5 | 2.5 | 1.67 | districts/Streets.tsx |
| Bus stop (kit) | 3.45 x 1.66, 2.7 | 2.5-2.8 | 2.7 | 1.8 | districts/Streets.tsx |
| Café table / chair (kit) | 0.75 / 0.86 | same | 0.75 / 0.86 | 0.5 / 0.57 | districts/Streets.tsx |
| Grasses trough (kit, start) | 1.6 x 0.62 x 0.5 | same | 1.6 | 1.07 | StartGarden.tsx |
| Lawn grass | | blades 5-38 cm, most 15-25 | 0.15-1.16, most about 0.5 | 0.03-0.25, most about 0.12 | Grass.tsx |
| Marram tufts (dunes) | | 0.6-1.0 | 0.28-0.91 | 0.32-0.8 | districts/dunes.ts |
| Reeds | 0.8-1.45 | 1.5-3 | 1.0-1.9 | unchanged (in range) | districts/waterside.ts |
| Fence bay | 1.24 x 2.14 | 1.1 | 1.4-1.5 | 0.73, bays 1.43 | districts/furniture.ts, park.ts, dunes.ts |
| Crate / drum | 0.55-0.7 / 0.88 | same | real size | 0.37-0.47 / 0.59 | districts/harbour.ts |
| Launch (kit) | 6.6 | 6-7 | 5.3-6.6 | 4.4 | waterfront/index.tsx |
| Pier rails (kit) | 1.03 | 1.0-1.1 | 1.03 | 0.69 (deck unchanged: 2.6 x 18) | waterfront/index.tsx |
| Sea railing | | 1.1 | 1.0 | 0.73 | waterfront/index.tsx |
| Floodlight (kit) | 28 to the head's top | 20-30 | 16.9 (0.6) | 18.7 | street/Floodlights.tsx |
| Start gantry (kit) | span 15, 8.25 tall | spans the 12 m road | 9.75 span (0.65) | 10 span, posts 9.4 apart, 5.5 tall | props/Gantry.tsx |
| Grandstand (kit, game cut) | 15.6 x 8.4 x 7.3 | | 0.75 | 0.667: 10.4 x 4.9 tall | kit/builtTrackside.tsx STAND_SCALE |
| Marshal post (kit) | 3.45 x 2.6 x 3.25 | | 0.8 | 0.667 | street/Trackside.tsx |
| Pit wall booths (kit) | 2.9 pitch, 3.4 tall | | 0.7 | 0.667 | props/PitWall.tsx |
| TecPro block | built in world metres: 1.0 x 0.8 x 0.8 | 1.5 x 1.2 x 1.2 | same | unchanged (already at scale) | street/layoutStreet.ts |
| Town-low | 13 x 10 x 13.6; 4.2 m shop floor and two floors, 4.17 m a storey | three storeys, 10.8 with parapet | 6.1-9.0, fitted to plots | 7.2 (storey scale 0.528; facades 0.8-1.25 of it to fit the plot) | street/town.ts |
| Town-mid | 17 x 13.6 x 21; five storeys of 3.02 and a penthouse | about 23 | none placed (capped 12) | 15.3 (0.729); none fit the plots this time either | street/town.ts |
| Tower | 12.5 core x 41; twelve storeys of 3.0 | about 45 | 17.2 (capped) | 30.7 (0.733), one on the far side | street/town.ts |
| Boston row and state house | 31 x 13.6, storeys 3.1 | | 0.54 | 0.667, set back so the steps stop at the pavement | sectors/Boston.tsx |
| Ahmedabad school | arcade 7.2 (double height), tier 3.2 | | 0.44 | 0.44 (left, below) | sectors/Ahmedabad.tsx |
| Hyperlab halls | 13.5 x 17.4 x 8 | | 0.42 | 0.42 (left) | sectors/Hyperlab.tsx |
| Waters lab | 23 x 13.4, 5.8 to the roof (two storeys) | | 0.48 | 0.48 (left) | sectors/Waters.tsx |
| Football goal | kit 3 x 2; the pitch's 4 x 1.8 x 1.5 | 5-a-side 3 x 2 (the pitch is 24 x 19.5 real) | 4 x 1.8 | left (gameplay, see below) | props/Goal.tsx, Places.tsx |
| Cricket stumps | 0.71 | 0.71 | 0.72 tall, 0.36 wide | left (gameplay) | props/Stumps.tsx, Places.tsx |
| Podium | 1.72 x 1.6, steps 1.2 / 0.85 / 0.6 | top step 0.8-1.0 | as modelled | left (gameplay) | props/Podium.tsx, Places.tsx |
| Tyre stack (playbook) | r 0.45, 0.32 wide | F1 tyre 0.72 across, 0.38 wide | as modelled | left (gameplay) | props/Tyre.tsx, Places.tsx |

**Benches.** Every bench now faces something at a plausible spot (district benches are knock-about
bodies, so their colliders follow the smaller bench):
- S3 Boston: the bench jammed against the state house's portico steps is gone.
- Garden: the two benches by the old pond stood on the edge of the circuit since the v5 track took
  that corner of the garden (0.5 m and -0.2 m from the road edge); gone. The one in front of the
  podium faced it from 0.6 m inside its place; it now stands beside the podium's signpost, just
  outside its place, turned to the podium 8 m away. The east-path bench stood on a lamp; it moved 3 m along the path.
- Park: each faces its slab path from 1.5 m (was 2.1 m); a bench never goes where a bush stands.
- Old town: against a facade, a hand's width off it, seat to the forecourt. Waterfront: land side
  of the walk, facing the sea. Start: facing the lane.

**Left for a follow-up.**
- Ahmedabad, Hyperlab and Waters sets: their buildings are still at 0.42-0.48 (storeys about 2 m
  real) and their props (table tennis, giant phone, studio stage, Mercury, instrument, racks,
  cones) at real size. At the storey rule the buildings are 23-59 % bigger and no longer fit their
  set's 10 m depth with the props where they are, so each set needs a re-layout. The sector
  hotspots (layout.ts `SECTOR_SPOTS`, built this week against today's sets) must move with it.
- Gameplay pieces (goal, stumps, podium, tyres) are bigger than real for play, like the ball
  (r 0.35, three times a real football). At the world's scale the goal is 2 x 1.33, the wicket
  0.47 tall; their colliders and the goal and wicket checks live in Places.tsx. Owner's call.
- The pit building belongs to the garage work; not touched here.
