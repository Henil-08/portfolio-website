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
