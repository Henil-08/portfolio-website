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
| tree-cypress | crown tapers to a point at the bottom less than the concept's slim spindle | ×0.80: crown narrower and shorter on the trunk | none | flat facets read right; no grain needed | crown leaf #5c6a4b is darker and more saturated than the concept's sage (~#8c9a7c) | small diffs |
| tree-round | geodesic crown with more, smaller facets (about 6 across vs 5), no grooves between facets | ×1.07 | orange ring on the trunk just under the crown missing; tray bigger than the concept's thin square plate | facets flat, AO darkens the lower crown like the concept | crown darker green than the concept's grey-sage, which also shows more light/dark spread between facets | small diffs |
| bush | three faceted bushes, concept's are rounder (more facets) and bigger in the tray | ×0.86 (bushes small for the tray) | concept's ink strip with two rivets on the tray front reads as a thin line only | gravel is a sparse speckle on a flat tan sheet; the concept is a dense bed of fine light chips | tray paper vs concept's warm concrete | off |
| grasses | blades thinner, fewer and stiffer; concept's are wide, long and arching | ×0.94 | seed heads are stacked white spirals; the concept's are tan feathered plumes | planter chamfers fine; no grain on the blades | too much ink in the blades; the concept is mostly sage, paper and sand with a little ink | off |
| rocks | rocks smaller and rounder; concept's are big, blocky, sharply cut boulders | ×0.86 | none | gravel tray sparse and light; the concept's is dense dark grey grit | rocks near-white paper; concept's are mid concrete grey with grain | off |
| lamp | post, lantern and cap as in the concept | ×0.73: lantern head and base plate narrow (or camera angle) | lantern doesn't glow; concept's frosted cube is lit from inside | base plate paper-smooth; concept's is grained concrete | base plate paper-white vs concept's concrete grey | small diffs |
| bench | concrete block and ink slats; concept's block has deep chamfers on the bottom long edges | ×0.98 | paper end caps at seat height are extra; concept's seat sits in a recess cut in the concrete top; seat/back gap narrower | no slat texture (concept's slats show a fine wood/ink grain); concrete grain present but finer than the concept's pitted cast | concrete reads paper-white; concept's is warm grey #bfbab1 | small diffs |
| bollard | three faceted posts with ink caps and an orange band | ×1.01 | none | concept's twist reads stronger (sharper facet breaks); ours facet less visible | concrete lighter than concept | match |
| kiosk | box body; concept's ink body has big chamfered vertical corners | ×0.99 | awning is a thin plate; concept's is a thick paper slab with a front lip; two-pane window frame missing | glass flat black, no reflection | counter concrete matches | small diffs |
| busstop | shelter, bench and orange sign | ×1.08 | roof thin and flat; concept's is a thick paper slab; orange sign sits on the glass, concept's hangs on the right post | glass too opaque | fine | small diffs |
| cafe | table, four chairs, cup | ×1.04 | none | base slab smooth; concept's is grained concrete | base slab cream/paper vs concept's mid-grey concrete | small diffs |
| boat | hull boxier and beamier; concept's has a sharper faceted bow and chine | ×0.76 at the concept's view | cabin closed in dark glass; concept's wheelhouse is open-sided with seats and a console inside | none | ink gunwale and orange stripe match | small diffs |
| pier | deck and rails | ×1.59 (the concept crops the pier at the frame edge: read as no data) | orange bollard on the deck missing; ink pile caps / cross beams under the deck missing; piles thinner | deck smooth; concept's has slab joints and grain | deck paper-white vs concept's concrete grey | off |
| goal | frame, net, orange band | ×1.01 | none | net grid matches | matches | match |
| stumps | three tall stumps, orange bails | ×1.04 | none | ink seam lines match | base paper-white vs concept's concrete grey | small diffs |
| podium | three steps, ink tops, orange stripe on 1 | ×1.41: our steps 2 and 3 are much deeper and longer than the concept's compact block | none (numbers 1 2 3 are there) | vertical edges chamfered in the concept, square here; paper rim round the ink tops is extra | concrete reads paper-white | off |
| trophy (code) | faceted cup on a stem, two-tier ink plinth with orange band | ×0.81: cup more slender, handles thinner and smaller than the concept's broad square loops | none | concept's cup facets are bigger and crisper | matches | small diffs |
| town-low | three storeys; ours is squatter | ×1.22: wider than the concept's taller, narrower block | upper floors 3 window bays across the front vs the concept's 4 (and 3 on the side) | deep window reveals read; no grain | façade paper vs concept's concrete grey | small diffs |
| town-mid | five storeys and a glazed penthouse | ×0.77 | the side loggias (balconies down the right side) missing | | façade lighter than concept | small diffs |
| town-tower | grid façade with dark glass; concept's has a strong horizontal slab band at every floor | ×0.83 | the floor-slab balconies that give the concept its stacked look missing | | glass too dark and blue | off |
| pit-building | five bays, glazed upper storey, thin roof | ×1.28: longer for its height than the concept | none | glazing darker than the concept's grey glass | fine | small diffs |
| boston | rowhouses + domed church with portico and spire | ×0.82 | our model sits on a wide paper plinth the concept doesn't have | | rowhouse windows darker | small diffs |
| ahmedabad | two tiers with a dome; concept's ground arcade is much taller and the upper tier sits right on it | ×0.88 | taller left block missing; big terrace between the tiers is extra | lattice screens match | fine | off |
| hyperlab | three gables, glazed entrance, orange panel | ×0.86 | roofs carry blue solar panels; concept's are glass skylights in ink frames; entrance mullion grid simpler | | panels blue vs concept's dark glass | small diffs |
| waters | long low block, ribbon window, plant units, canopy | ×1.35: longer and lower than the concept | none | | fine | small diffs |
| grandstand | stepped concrete wedge, seats, roof | ×0.85 | front ink railing along the whole front missing (only a short mesh panel); side stair less clear | | seat pattern (paper seats) differs | small diffs |
| floodlight | mast, platform, head | ×0.46 (narrow head at this angle; check) | ladder cage barely reads | | fine | small diffs |
| gantry | mitred beam, LED board, five lights | ×1.14 | none | | fine | match |
| tecpro | two rows of strapped blocks | ×1.11 | 6 blocks per row vs the concept's 7; blocks shorter and rounder (concept's are tall chamfered boxes) | straps match | the black/white order differs from the concept (top: B W W B W W B) | small diffs |
| marshal | booth with roof, desk, phone, flag | ×0.78 | none | | roof top paper vs concept's ink | small diffs |
| pitwall | four booths, fence, plates 1–4 | ×1.28 | wide paper base slab is extra; canopies bigger and flatter | fence mesh shows a moiré pattern | base slab paper vs concrete | small diffs |
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
