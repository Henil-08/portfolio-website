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
