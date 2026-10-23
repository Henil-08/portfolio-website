# World v3 roadmap

Working plan for the drivable portfolio. Each step is small, verified with
headless screenshots, and committed on its own. Tick items as they land and
note the commit, so the next session can pick up from the first unticked one.

Reference for look and feel: Bruno Simon's folio-2025 (MIT). Research brief:
docs/research/bruno-folio-2025.md (map, night, interaction prompt, UI, terrain).

## Feedback this plan answers (2026-10-23)

- Map is bad; M should open it; make it like Bruno's.
- Slopes are too steep: hard to get back onto the track.
- Circuit is boring: use height to cross over itself (a bridge).
- Voice: use ElevenLabs "Ian - Professional, Warm, Calm", Eleven v4, stability 50%.
- Livery still not liked.
- Night looks poor: study Bruno's night.
- Pop-up banners are childish; the voice should only play on Enter.
- No Vercel deploy on every push.
- The interaction ("Enter") UI is bad: Bruno's is the bar.
- Timeline tiles look out of place on the grass.
- Want a street lap with a garden area holding all the places.
- Buildings should be cute 3D, soft, not harsh; overall too childish now.

## Art direction (applies to every step)

Polished toy-diorama, not childish: soft rounded forms, bevels everywhere,
a restrained palette (warm cream, sage greens, terracotta, slate, one red
accent), real light and shadow doing the work, very little text in the world.
UI is quiet broadcast graphics: small, precise, translucent, no cartoon colours.

## Steps

### 0. Quick fixes — done (c31cb73)
- [x] Radio only when a place is opened (Enter); banner -> subtitle caption
- [x] M toggles the map, Esc closes
- [x] vercel.json disables deploy-on-push
- [x] Voice model eleven_v4 @ 0.5 (gen script + /api/voice)
- [ ] Ian voice: needs the voice ID from the user (key lacks voices_read);
      then `ELEVENLABS_VOICE_ID=<id> node scripts/gen-audio.mjs --only radio-... --force`

### 1. Circuit v3: crossover and gentle grades — done (5d83cea)
- [x] New track points (components/world/layout.ts): a figure-of-eight street
      circuit where one leg climbs over the other on a bridge (>= 5 m clearance),
      grades <= ~7%, a couple of fast sweepers, one hairpin, the pit straight kept.
- [x] Terrain (terrain.ts): at a crossover the land follows the LOWER road; IDW
      must ignore the bridge span. Clamp off-road slope (max ~25%) so a car that
      leaves the road can always drive back.
- [x] Bridge model: deck, parapets, piers, abutment ramps; collider = the road
      trimesh (already per-ribbon) plus parapet cuboids.
- [x] Re-run scene placement, pit lanes, street dressing; verify with overview shots.

Notes from step 1: R respawns onto the nearest road (nearestT3, height-aware).
~1% of open ground is still >40% where the raised descent leg meets the
infield; step 2's garden layout should keep places >= 17 m from that leg.
Headless physics runs in slow motion (low fps), so judge driving by screenshots.

### 2. Garden infield, city streets outside
- [ ] Infield becomes a garden park: soft paths (gravel/stone), hedges, flower
      beds, a pond, benches, lamps; each place sits on the path network.
- [ ] Timeline rebuilt as a garden path with the neon lines inset into stone,
      not a tile slab.
- [ ] Outside the circuit: streets with pavements, crossings, cute rounded
      buildings (bevelled, awnings, chunky window frames, roof gardens), a
      softer palette; replace the harsh box skyline.

### 3. Night like Bruno's
- [ ] Night palette (sky, fog, ambient, sun/moon colour), bloom on emissives,
      lamp light pools, lit windows, garage glow, fireflies.

### 4. Map like Bruno's (M)
- [ ] Rebuild per the brief: real-world top-down view, pins for places,
      click to travel, achievements as a quiet side list.

### 5. UI: interaction prompt, panels, toasts
- [ ] Interaction prompt and the opened panel styled like Bruno's.
- [ ] Toasts/achievements restyled; no childish colours.

### 6. Livery
- [ ] Livery lab with 3-4 options side by side; user picks; apply.

## How to verify

- Dev server: `npx next dev -p 3100`; if CSS looks stale, stop it, `rm -rf .next/dev`, restart.
- Screenshots: `node <scratchpad>/tools/world.mjs <outPrefix> "wait:14000|shot:a" 1400 850 "http://localhost:3100/?skip"`
  (steps `|`-separated, each `op:arg`: wait, shot, eval, down, up, key).
- Dev hooks: `window.__cam = [x,y,z, tx,ty,tz]` pins the camera; `__world.teleport('sector-1')`;
  `__world.setState({ scene: { time: 'night', weather: 'clear' } })`.
- Before commit: `npx tsc --noEmit -p .` and `npx eslint components/world app`.
