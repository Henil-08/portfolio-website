# Art direction: from toy island to premium 3D

Owner, 2026-11: the site "still looks childish" and should look premium, using "all the tech in the
world". This file is research, not a decision. It has four parts: a reference board (1), what separates
premium from childish (2), why this site reads as a toy today and the ten changes that fix the most (3),
and four named directions for key-frame images the owner can choose from (4). The brand stays Datasheet
(docs/BRAND.md). The world grows up around it.

Read before changing anything: docs/BRAND.md (R01 to R06, "World"), docs/ROADMAP.md step 11,
docs/research/model-fidelity.md. Every direction in part 4 needs owner approval and an entry in BRAND.md's
decision log before it is built.

**How the sources were checked.** Entries marked ✓ were read for this file (pages, case studies, write-ups;
links at the bottom). Entries marked ◦ are well known but were not re-read this time; check them before you
quote numbers from them.

---

## 1. Reference board (22 entries)

| # | Reference | What it does well | Borrow |
|---|---|---|---|
| 1 | ✓ **Bruno Simon, folio-2025**: https://bruno-simon.com (Awwwards case study) | It is the reference the site started from. It is a drivable island where wind, weather, seasons and spatial sound make the world feel alive. Shadows are tinted, so they are never black. Bloom has a threshold of 1 and a strength of 0.25. Quality presets drop the DOF, water blur and shadow resolution on mobile. Colours come from a palette texture. | The engineering: presets, instancing, palette texture, per-object spatial sound. **Not the look.** Its high fixed camera, round toy forms and saturated colours were chosen to look like a toy. Copying those is why this site reads as one. |
| 2 | ✓ **igloo.inc** (Abeto for Bureaux; Awwwards Site of the Year and Developer Site of the Year 2024) | Cold, restrained, tech-styled. They planned the user journey with grey previs before any texturing. Each project gets its own procedurally grown ice block. The UI is drawn in WebGL, and text scrambles by moving offsets in an SDF texture. Transitions use chromatic aberration and a frost effect. The intro renders in real time, not from video. Shaders compile in the background. | Grey previs before colour, so composition is settled first. A transition FX vocabulary used only *between* states. Shaders compile off-screen (the site already does this). |
| 3 | ✓ **Messenger**: https://messenger.abeto.co (Abeto, 2025) | The world's colours live in a shared atlas of 16×16 px swatches, so "the lighting or the mood of the whole world" changes at once. A custom outline system controls thickness, colour and alpha. LOD keeps each silhouette, so swaps don't pop. The smart over-the-shoulder camera never clips into walls. Each area has its own soundscape, with 3D NPC audio. | A single grade/palette control for the whole world. LOD that keeps silhouettes. Per-zone ambience. |
| 4 | ✓ **Lusion studio site**: https://lusion.co (Awwwards case study) | Real-time reflections, analytical volumetric light, "interactive blurry 3D texts". The cloth is simulated in Houdini and blended at runtime (220 KB). A vertex animation is packed into 16-bit PNGs. Their rule: **"You don't need to do everything real-time."** | Bake what doesn't move: AO, light and shadows on static buildings. Run in real time only what the player affects. |
| 5 | ✓ **Oryzo**: https://oryzo.ai (Lusion; reported as Awwwards Site of the Month, April 2026) | The palette is **cream, near-black, a muted olive and one orange**, almost exactly ours, and it reads as luxury. About 99% of the text is one type family, because the UI must "support the content, not compete with it". They rejected real-time PBR for the hero as not good enough and used Gaussian splats instead (78k desktop, 44k mobile). They moved detail to where the camera spends its time: the centre 50% gets about 90% of the texel detail. | Proof that the Datasheet palette can look premium: the toy look comes from the rendering, not the palette. Put detail where the camera dwells (the start, garages, the camera's path). |
| 6 | ✓ **Lusion, Porsche: Dream Machine**: https://lusion.co/projects/porsche_dream_machine | A CG short film for Porsche GB and Wallpaper*. It uses calm, restrained shots, and the car is always the hero of the frame. | Shot list for the key frames: long lenses, a low camera, slow moves, nothing in frame that doesn't serve the car. |
| 7 | ✓ **Hubtown**: https://hubtown.co.in (Unseen Studio; Awwwards Site of the Day, June 2026) | A glowing monolith over a dark, reflective landscape. A cursor reveal uncovers detail in the geometry and light. | Night: a dark reflective ground with few, strong light sources. |
| 8 | ✓ **Explore Primland**: https://explore.ownprimland.com | Real terrain, atmospheric fog and a scroll-driven aerial flythrough. | Aerial perspective: distance desaturates and lifts toward the fog colour, which tells the eye the place is large. |
| 9 | ✓ **Cartier, Watches & Wonders 2026**: https://www.cartier.com/en-fr/watchesandwonders (Immersive Garden) | Six 3D alcoves, one per watch, entered and left on scroll. A Web Audio score is a narrative layer. | Each garage is an alcove with its own light and sound bed, and you enter it by a camera move, not a cut. |
| 10 | ✓ **IVRESS**: https://brand.ivress.co.jp (Utsubo; reported as FWA Site of the Month) | WebGPURenderer with a WebGL fallback, shaders written once in TSL, a budgeted scene graph, and motion paced like a short film. | Budget the scene. Pace motion like a film: fewer, slower, longer moves. |
| 11 | ✓ **Shopify Editions Spring '26**: https://www.shopify.com/editions/spring2026 | Every section is a staged beat (entrance, hold, exit). Type disperses and re-forms. | The "beat" model for zone arrivals: arrive, hold (read), leave. |
| 12 | ✓ **McLaren configurator** (client-side WebGL2, InfinityRT, per a teardown) | Rotatable 3D in the browser with studio reflections, plus WebXR AR. | Car paint: clearcoat and studio strip reflections are what make a car look expensive. |
| 13 | ✓ **Porsche configurator**: https://www.porsche.com (teardown) | It shows studio photos by default (46 stills) and opens a 3D view only on request. | The bar is the photograph. Never show a frame that looks worse than a studio photo, so the boot and garage frames must be composed like one. |
| 14 | ✓ **Ferrari 296 configurator** (UE5 pixel streaming, per the same teardown) | The highest fidelity, rendered on a remote GPU. | Calibration only: it shows what "premium car" means to people, which is reflections, paint depth and light. |
| 15 | ✓ **PureDrive-RT**: https://puredrive-rt.nourtin.com (three.js forum showcase) | HDR environment lighting with pre-baked shadows and adaptive quality. GSAP camera moves are synced to Web Audio. A **"White Clay" mode drops the finish and adds fine edge lines and dimension annotations.** | Clay plus annotation is the Datasheet idea in 3D. It fits the Teardown garage and direction C. |
| 16 | ✓ **Linear** 2026 refresh: https://linear.app/blog/behind-the-latest-design-refresh | "Don't compete for attention you haven't earned." They dimmed the navigation, used fewer and smaller icons, and **"Structure should be felt not seen"**, with fewer dividers. Their success test: most people don't notice what changed. | The HUD rule: chrome steps back and the world leads. |
| 17 | ✓ **Apple product pages**, e.g. https://www.apple.com/macbook-pro/ (secondary analyses) | A narrow palette. Emphasis comes from size, not colour or weight. Each page is 6 to 12 full-screen chapters with one centred visual and the product pinned. Imitators "copy the effects and skip the restraint". | One idea per screen. Emphasis by scale. |
| 18 | ◦ **Vercel**: https://vercel.com (Geist) | Monochrome plus one accent, hairline grid rules, mono type for data. Its sense of precision comes from 1 px lines, not heavy boxes. | Hairline frames at rest and heavy frames only on focus (see change 8). |
| 19 | ✓ **F1 TV camera thinking** (Dean Locke, FOM; Autosport 2019) | "Camera angles, or lenses, can cheat that quite a lot, and make them look not so dramatic and not quite as quick." Whip-pans sell speed. FOM rethought camera positions to show speed. | Speed and drama come from lens and angle, not effects. This drives change 3 and direction B. |
| 20 | ✓ **Forza Horizon 3, "Shoot for the Sky"** (GDC 2017, Playground Games) | Captured 24-hour HDR time-lapse skies light the scene, so the sky *is* the light. | The environment light should come from a believable sky (an HDRI, or our sky baked to an env map), not four flat panels. |
| 21 | ✓ **INSIDE, "Low Complexity, High Fidelity"** (GDC Europe 2016, Playdead) | A deliberately simple aesthetic rendered with high fidelity. Diffuse, specular and bounce light are authored separately. They use analytic AO, SSR, local shadowed volumetrics, and dithering against banding. | This is our exact problem: simple forms can look premium if the light is premium. Dither the sky and fog gradients. |
| 22 | ✓ **Resn, KPR** (Awwwards Site of the Month) | A strong grid, white space and bold type. 3D characters meet 2D design. A WebGL stencil buffer lets one scene mask another (windows, card flips), which also skips rendering hidden content. | Stencil "windows" into a garage or project scene from the world, cheaply. |

Studios to keep watching: ◦ Active Theory (https://activetheory.net; e.g. the Acura "Beat That" racing
game), ◦ Resn (https://resn.co.nz), ◦ Immersive Garden, ◦ Unseen Studio, ◦ Abeto (https://abeto.co).

---

## 2. What separates premium from childish

The short version: **toys are lit flat, painted in uniform satin, seen from above, and covered in stickers.
Premium is lit with contrast and a real environment, has varied surfaces, is seen at eye level through a
longer lens, and keeps the chrome quiet.** Forms can stay simple (INSIDE, Oryzo). The light and the lens
are what make it premium.

### 2.1 Lighting and materials

| Area | Childish | Premium | Numbers for this stack (three r186, postprocessing 6.39) |
|---|---|---|---|
| Tone mapping | `NoToneMapping`: values above 1 clip hard, whites go flat, and colours look printed, not lit | Linear HDR light with a filmic curve. Highlights roll off and blacks stay deep | `ToneMapping` effect last in the composer: NEUTRAL (keeps paper, ink and orange true, already chosen for the studio) or AGX (more filmic; it desaturates orange, so re-tune). Expose first: the curve can't save an over-lit scene |
| Key and fill | A big hemisphere fill that lifts every shadow, with key:fill around 3:1 | Key:fill 4:1 to 8:1 in day. Warm key and cool sky fill (or the reverse at night). The fill comes from the environment | Hemi 0.1 to 0.25 (now 0.7). The sun carries the shape. Env intensity 0.6 to 1.0 (now 0.2) |
| Environment and reflections | Almost no env, so glass, paint and tarmac look dead | A believable sky or studio HDRI. Every surface reflects something, roughness-filtered | A 1k to 2k HDRI, or our own sky plus Lightformer *strips* baked once through PMREM. Car paint needs high-contrast strips to show its curves |
| Roughness | One value everywhere (satin plastic, r 0.5) | Variation inside each surface (wear, smudges, aggregate) and between surfaces | Asphalt 0.8 to 0.95 with noise. Concrete 0.75 to 0.9. Glass 0.05. Paint is `MeshPhysicalMaterial` with clearcoat 1, clearcoatRoughness 0.05 to 0.1, base roughness 0.35 to 0.5. Rubber 0.9. Brushed metal metalness 1, roughness 0.3 to 0.4 |
| Micro-detail | Smooth vertex colour | Tileable 256 to 512 px normal and roughness maps at real-world scale (KTX2) | About 1 to 2 MB total for 5 or 6 surface families |
| AO | None, or SSAO alone | Baked AO on static geometry plus a light SSAO for dynamic contact | `studio/ao.ts` already bakes per-vertex AO. N8AO in the world: half-res, intensity about 1 to 1.5 |
| Shadows | One blurry map, black or flat-grey shadows | A crisp contact shadow under the hero, soft shadows at distance, shadow colour from the sky (cool) | A separate small, high-res shadow or contact shadow under the car. Cascades (CSM) or a cached static map for buildings |

### 2.2 Post-processing (order and restraint)

Order: **scene (HDR, linear) → AO → bloom (HDR) → tone mapping → LUT grade → AA → grain and dither →
vignette.**

- **Bloom:** threshold 1.0, intensity 0.15 to 0.35, mipmap blur. Only lamps, screens and brake lights cross
  1.0. Bruno uses 0.25. If you can see bloom on concrete in daylight, it is wrong.
- **Grade:** one 3D LUT per time of day (`LUT3DEffect`, .cube files, 32³). The grade carries the mood, so the
  albedo palette can stay brand-true. Bruno's "grade" is his light, shadow and fog colours.
- **Depth of field:** only in cinematics, the garage and photo mode, with a long lens and the focus on the
  hero. **Never on a high camera.** Shallow focus plus a high angle is the tilt-shift miniature cue, and
  people read it as "tiny toy".
- **Grain and dither:** grain at 0.02 to 0.05, animated. Dither every gradient (sky, fog) to kill banding,
  as INSIDE does.
- **Vignette:** offset 0.3, darkness 0.15 to 0.25.
- **Motion blur:** none per object. Use a cheap directional or radial blur only during OVERTAKE, and
  wheel-blur discs on the wheels.
- **Chromatic aberration:** edges only, and only during transitions (as igloo does).
- **AA:** SMAA alone can't hold thin geometry (fences, kerb edges, cables). Use MSAA ×4 on the composer for
  desktop, mipmapped alpha-to-coverage for fence textures, and DPR up to 2 on fast GPUs. Shimmer is the
  cheapest-looking artefact of all.

### 2.3 Camera language

- **Focal length.** Vertical fov 34° is about a 39 mm lens. That is fine, but at 21.6 m and 35° down it reads
  as a board game. Premium chase work uses **fov 22 to 28° (about 48 to 62 mm), farther back and lower (10
  to 18° down)**. Perspective compresses, buildings stand up, the horizon shows, and the car fills the lower
  third. Trackside broadcast shots are 8 to 15°.
- **Follow.** Use a critically damped spring on position and look-target (no overshoot) and a small
  look-ahead along the velocity. Add up to +4° fov with speed (Forza-style chase), and no roll.
- **Easing.** Moves take 0.9 to 1.6 s with expo or cubic ease-out. Nothing linear and nothing bouncy.
- **Never-cut versus cuts.** A never-cut opening (select → bloom) is premium, so keep it. In-world, hard
  cuts are fine for broadcast-style replays or idle "attract" cams. A cut is a choice. A slow lerp between
  two bad poses never is.
- **Framing.** Thirds, leading lines along the track, and the hero never dead centre while driving.

### 2.4 Geometry, detail density and bevels

- Every hard edge gets a chamfer of about 1 to 3% of the object's size, so it catches a highlight. Crease
  normals already do this on the models page.
- Break big planes into realistic modules: concrete slab joints every 3 to 6 m, wall panel seams, kerb
  profile and paint wear, a rubbered racing line, drain grates, cable ducts.
- Put the density where the camera dwells: the start, the garages, the grid, and the camera's path through
  the bloom (Oryzo's 90/50 rule).
- Faceted "low-poly" crystals and cones read as a game asset pack. Faceting is fine only if it is precise
  architecture (folded plate roofs with real thickness and glazing mullions).

### 2.5 Scale cues

- Include things whose size everyone knows: 2.1 m doors, 1.1 m railings, people, stair risers, lamp posts,
  road markings at regulation width, and window mullions.
- Aerial perspective: distance desaturates and lifts toward the haze. At the moment the fog is paper and
  flat.
- Real texture frequency: asphalt aggregate, concrete pores and grass blades all at real scale. If texture
  is too big or there is none, the eye reads a miniature.
- Camera height near human or car eye height (1.2 to 4 m) for hero shots. A high camera turns everything
  into a model.

### 2.6 Palette discipline

- Use a 60/30/10 value structure: about 60% mid-value neutrals (concrete, asphalt), 30% darks (ink, glass,
  shadow), and 10% light accents (paper lines). **Orange stays under 1% of the pixels.** It is a light or a
  detail, never a big mass.
- Colour comes from light, not paint: warm key and cool shadow give hue variety, so the albedo can stay
  neutral.
- Large green areas are the most "toy" colour in any scene. Desaturate them, darken them and break them up,
  or replace them with hard landscape. Real circuits are mostly concrete, asphalt, gravel and run-off.

### 2.7 Typography and UI over 3D

- Quiet at rest and loud on focus. Hairline (1 px) frames while driving, heavy (2 px plus hard shadow)
  only for modal sheets and focus.
- Keep at most 2 persistent HUD items (speed, and context or power). Everything else appears on demand.
- Text that sits *in* the world (callouts, leader lines, dimension marks) feels more premium than stickers
  layered *over* it (PureDrive clay mode, Teardown).
- One type family (Oryzo: 99%). The brand already does this with Plex.

### 2.8 Motion design and timing

- UI 150 to 300 ms, camera 0.9 to 1.6 s, world transitions 2 to 4 s. Ease-out, no overshoot in the world.
  M06 Pop is fine on 2D dots but reads as toy-like on 3D objects.
- "Builds, then stops" (R05) is already right. Idle world motion should be slow and physical (wind,
  flags, water), never springy.

### 2.9 Sound design

- **Engine:** RPM-layered loops cross-faded by speed, plus tyre scrub on slip, wind noise rising with speed,
  and a gear-change blip.
- **Space:** a PannerNode with HRTF for floodlight hum, PA, crowd and water. The garage interior gets a
  convolution reverb (a short IR), so entering it *sounds* like a room.
- **UI:** one soft click with random pitch ±3% (Bruno). Duck the music and engine under radio lines.
- **Ambience** per zone (Messenger): the pit lane, the lake, the town.

### 2.10 Loading and onboarding

- The first frame is a composed photograph (the Porsche lesson). The boot's dot floor already works. Make
  the first world frame a designed key-frame, not "whatever the chase cam sees".
- Compile shaders and upload textures before reveal. The site already does this.
- Use one line of onboarding (keys) that fades after the first input.

### 2.11 Performance budgets (how top sites stay at 60 fps)

- **Frame:** 16.6 ms. Aim for ≤ 10 ms GPU on an M1 or Iris Xe at DPR 1.5. Post ≤ 2.5 ms in total.
- **Draw calls** < 300 and **triangles** < 1.5 M visible. Use instancing, merged static geometry, frustum
  culling, and a palette texture instead of per-mesh materials (Bruno).
- **Textures:** KTX2 (ETC1S for albedo, UASTC for normals), geometry with Draco or meshopt.
- **Shadows:** update the static cascade only when the sun moves noticeably, and re-render the car's
  contact shadow every frame.
- **Quality tiers:** `PerformanceMonitor` → tiers (DPR, MSAA, AO resolution, reflector on or off, grass
  density). The site has a fancy/light switch, so grow it into 3 tiers.
- **Bake what doesn't move** (Lusion): AO and light on buildings. Spread work across frames (Messenger).
  Use LOD that keeps silhouettes.

---

## 3. Gap analysis: this site today

Sources: World.tsx, Effects.tsx, Rig.tsx, studio/*, models/props/shared.ts, vehicles/kit.tsx, palette.ts,
and screenshots in the scratchpad (`qa/lap-V04-03.jpg`, `qa/lap-V03-07.jpg`, `qa/pl-V04-1280-sector-2-near.jpg`,
`qa/pl-V04-1280-podium-near.jpg`, `qa/fix/before-after-night.jpg`, `gx/e3v3-1440-3mid.jpg`).

### 3.1 What makes it look childish now

1. **No tone mapping.** World.tsx renders with `toneMapping: THREE.NoToneMapping`, and the composer has no
   ToneMapping pass. Sun 2.4 plus hemi 0.7 clips the paper and concrete to flat white, so nothing rolls off.
   The studio code (studio/StudioStage.tsx `STUDIO_TONE`, Neutral) exists but only on /docs/brand/models.
2. **Flat, fill-heavy light.** The hemisphere is 0.7 (white sky, `#b8b4a9` ground) against a 2.4 sun, so
   shadows are lifted grey (screens: kerbs, walls and lawn all mid-grey). There is no warm/cool split in
   day. The sky is a three-stop paper gradient with no sun, cloud or haze depth.
3. **Almost no reflections.** `environmentIntensity` is 0.2 from four soft Lightformers. Glass bays, car
   paint and asphalt reflect nothing. **No `MeshPhysicalMaterial` or clearcoat exists anywhere** in
   components/world. The "silver" paint is a plain standard material at roughness 0.32 and metalness 0.65.
4. **The toy look is written into the code.** models/props/shared.ts says: *"Look: premium designer-toy
   diorama. Satin plastic (r ~0.45)"*. The default `mat()` is roughness 0.5 and metalness 0.05. Uniform satin
   plastic is the defining toy material.
5. **Diorama camera.** Rig.tsx has a fixed world offset (10.5, 12.5, 14): 21.6 m away, about 35° down, at a
   fixed azimuth that doesn't follow the car's heading. Fov 34. You look *down on* a model and never see a
   horizon, and the car is a small object in the middle (screens: the bike at the Hyperlab is about 4% of
   the frame).
6. **Big untextured planes.** The asphalt is plain (the owner asked for that, but plain *and* unlit reads as
   matte card). The concrete walls are smooth extrusions. The lawn is an olive felt with noisy blotches
   (`C.grass #7a8462`), and it covers most of the frame in the sector shots.
7. **Toy forms.** Giant extruded HENIL GAJJAR letters in orange and ink (podium shot), faceted crystal roofs
   (Hyperlab), faceted boulder bushes, cones of cypress. Signboards are as big as buildings.
8. **Orange used as mass.** The name letters are big solid orange blocks, which breaks R04 ("one orange …
   never a panel fill") in 3D.
9. **Sticker UI over everything.** Seven or more boxes sit on the edges (power meter, five tabs, Resume,
   radio, Team radio, speed), all with 2 px ink frames and the hard 3 to 4 px shadow, plus the E prompt.
   They all have the same visual weight, so the chrome competes with the world and the screen reads like a
   board game.
10. **Night is grey murk.** The night screens are grey fog over grey ground with no true blacks, weak light
    pools and no reflections.
11. **Aliasing.** Fences and kerb edges shimmer and moiré (lap-V03-07, lap-V04-03). SMAA alone, with
    `antialias: false` on desktop.
12. **The good pipeline isn't in the world.** Baked AO, crease normals, grain (studio/*), Neutral tone
    mapping and contact shadows were built for the models page. In the world only `districts/furniture.ts`
    and `KitModel` (opt-in) use parts of it.

What is already right, so keep it: the never-cut opening, compiling shaders before reveal, the
`PerformanceMonitor` fallback, N8AO, bloom at threshold 1 on emissives only, instancing and shared
materials, the kerb and road design, the Datasheet UI system itself (it just needs to be quieter over 3D),
and the Teardown garage concept (it is already the "clay plus annotation" idea).

### 3.2 The 10 highest-impact changes (ranked)

Cost is engineering effort (S under 1 day, M 1 to 3 days, L 1 week or more) plus runtime cost.

| # | Change | Technique | Cost | Files |
|---|---|---|---|---|
| 1 | **Real HDR pipeline** | Add `<ToneMapping mode={NEUTRAL}>` (or AGX) as the last effect; for the light tier, set renderer `toneMapping` to Neutral. Set exposure, then re-key `SCENES` so sunlit paper sits at about 0.8 to 0.9 after mapping, not at the clip. Keep `toneMapped:false` only on emissives that must bloom. | S; ~0 ms | World.tsx, Effects.tsx (`SCENES`, `STUDIO`, `EnvLight` comment), studio/StudioStage.tsx (`STUDIO_TONE_MODE` reuse) |
| 2 | **Re-light: contrast plus a real environment** | Hemi from 0.7 to about 0.15. Env intensity from 0.2 to 0.7 or 1.0, using a 1k HDRI (overcast or "studio small", around 1 MB) or our sky plus Lightformer *strips* baked once. Warm key (5200 K) and cool fill (7500 K). Shadow colour comes from the sky, never black. | S to M; PMREM once | Effects.tsx `SCENES`, Rig.tsx `Sun`/`Sky`, World.tsx `<Environment>` |
| 3 | **Camera: lower, longer, behind** | The chase follows the heading with a critically damped spring and look-ahead. 12 to 18° down, about 10 to 13 m back, fov 24 to 28, +4° at speed. Keep a "director" high cam as an option and for the map. Re-tune fog and LOD for a visible horizon. | M; ~0 ms (more geometry in view, so check culling) | Rig.tsx (`OFFSET`, `FOV`, `CameraRig`), bloom/Opening.tsx (`GAME_FOV`, the hand-over pose), garage/anim.ts |
| 4 | **Materials: retire satin plastic** | A material library with roughness variation and micro-normals (256 to 512 px tileable KTX2): asphalt, concrete (board-formed and jointed), gravel, rubber, brushed metal. Car paint becomes `MeshPhysicalMaterial` with clearcoat. Glass at roughness 0.05 with env. Change the `mat()` default and its comment. | M; textures 1 to 2 MB, ~0.5 ms | models/props/shared.ts, vehicles/kit.tsx (`std`, finishes), vehicles/liveries.ts, kit/shared.ts, Island.tsx (`ASPHALT`), palette.ts |
| 5 | **Grade and post restraint** | Bloom 0.55 to 0.25. One LUT per time of day (`LUT3DEffect`, blended with the day cycle). Grain 0.03. Dithered sky and fog. Vignette 0.2. MSAA ×4 on desktop, and alpha-to-coverage on fences. DOF only in the garage and cinematics. | S; +1 to 1.5 ms | World.tsx (composer), Rig.tsx `Sky` (dither), street fence materials |
| 6 | **Studio look in the world** | Bake AO, crease normals and grain onto static kit models and buildings. Do it offline (a node script writes the `studioAO` attribute into the GLB or JSON), so the boot doesn't stall. Add a contact shadow under the car. | M; load +, runtime ~0 | studio/Studify.tsx, studio/ao.ts, kit/KitModel.tsx, kit/built*.tsx, Vehicle.tsx |
| 7 | **Ground and surface detail** | Less lawn: concrete aprons, paving with joints, gravel run-off. The remaining grass becomes darker and less saturated, denser and shorter. Track: a rubbered racing line, tyre-mark decals, seams, kerb profile and paint wear. Break walls into panels. | M | Grass.tsx, Island.tsx, terrain.ts, palette.ts (`grass`, `grassDark`), street/Runoff.tsx, PitWallRun.tsx |
| 8 | **Quiet HUD** | At rest show only speed and the power meter, in 1 px hairline frames with no shadow. Tabs collapse to one `Esc · Menu` key while driving and fade in on a stop or hover. The hard shadow is reserved for sheets and modals (paper on paper). Radio becomes a bottom-left line, not a centred card. | S; needs an owner decision (BRAND.md I-rules) | components/ui/Hud.tsx, RadioMessages, app/globals.css (`x-*`), docs/BRAND.md |
| 9 | **De-toy forms and scale cues** | Name letters become real signage (a 1 to 1.5 m flush concrete or ink fin with orange only on the dot or one letter), or are removed. Faceted roofs become clean folded plates with thickness and mullions. Chamfer every box. Add people, railings, doors and lamp posts at true size, and shrink the signboards. | M to L (model work) | StartGarden.tsx (letters), models/sectors/*, foliage/*, kit/*, street/* |
| 10 | **Night that's actually night** | Near-black sky and fog (#07080a), real spot-lit pools under floodlights (SpotLight plus a cookie or projected texture, shadows on 2 or 3 of them), headlights as spotlights, and wet asphalt with `MeshReflectorMaterial` (half-res, blurred, night and rain only) or SSR. Orange stays the only warm light. | M to L; reflector +2 to 4 ms (night tier only) | Effects.tsx `SCENES.night`, Island.tsx asphalt, street floodlights (W07), Vehicle.tsx lights |

Changes 1, 2 and 5 together are about three days of work and change every frame. Do them first, re-shoot
the QA laps, and show the owner a before/after pair before touching geometry.

---

## 4. Proposed art directions (for key-frame images)

All four keep Datasheet: paper `#f3f2ed`, ink `#111`, one orange `#ff4f00`, IBM Plex, and hard edges in the
UI. What changes is the light, the lens and how loud the UI is. **R01 ("no blur, glow or gradients")
should be written to apply to the 2D UI only.** Lit 3D needs falloff, lamp bloom and, in cinematics, DOF.
That is an owner decision for the log.

Make three key-frames per direction, all from the same three poses so they compare directly:
**K1** the chase on the main straight past the gantry, **K2** a garage bay opening with the car on the
apron, **K3** a wide establishing shot of the island.

### A. "Engineering Film" (overcast product film on location)

- **Look:** a car brand's launch film shot on a test track under a bright overcast sky. Soft, expensive,
  calm.
- **Light:** a large soft overcast HDRI does most of the work. A weak, high sun (6000 K) gives soft but
  present shadows. Key:fill about 3:1, with contrast coming from AO and reflections rather than hard
  shadows.
- **Materials:** wet-look clearcoat on the cars, satin concrete with fine grain, dark glass that clearly
  reflects the sky, and asphalt with visible aggregate under the sheen.
- **Palette shift:** greys move cooler and cleaner (concrete about `#cfcdc6`), and grass is muted toward
  grey-sage and much less of it. Orange appears only on the vehicle accent, the start lights and the
  objective.
- **Camera:** 50 to 65 mm, low (1.5 to 3 m on hero shots, 12 to 15° on the chase), slow tracking moves and
  long holds.
- **Post:** Neutral tone mapping, a gentle cool LUT, grain 0.03, vignette 0.15. DOF only on K2.
- **UI:** hairline datasheet callouts with leader lines anchored to objects (like the Teardown). The HUD is
  speed only.
- **Refs:** 6, 12, 13, 15, 16. **Risk:** lowest; it is closest to the approved Concrete & Ink proposal.

### B. "Night Race Broadcast" (street-circuit night race on TV)

- **Look:** a night street race seen through broadcast cameras: inky black, sharp white floodlight pools,
  wet tarmac mirroring every lamp, and the orange start lights and brake lights the only warm colour.
- **Light:** sky and fog near-black. Floodlights are 4000 K spots with visible beams (the W07 beams already
  exist, so make them volumetric and subtle). The car runs headlights. Env is a dark HDRI with bright
  strips, for paint highlights.
- **Materials:** wet asphalt (`MeshReflectorMaterial`, roughness 0.3 to 0.5 in pools), glossy kerbs,
  emissive screens on the pit wall and gantry (the datasheet screens).
- **Palette shift:** ink takes about 70% of the frame, paper appears only as lit lines and kerbs, and orange
  is light (start lights, brake lights, the objective ping).
- **Camera:** broadcast vocabulary. Trackside telephoto shots (fov 8 to 15) with whip-pans for idle and
  replay, a low chase at 24 to 28°, and an onboard T-cam for the bike and F1. Cuts are allowed here.
- **Post:** AgX or Neutral, a cooler LUT with crushed-but-not-clipped blacks, bloom 0.35 (lamps only),
  grain 0.04, a light speed blur on OVERTAKE.
- **UI:** Datasheet on ink. Lower-third timing strips in Plex Mono (sector times, speed trap). This is
  **not** the rejected design A: no cream hairline broadcast panels and no Racero. It is the existing
  Datasheet inverted.
- **Refs:** 7, 19, 21, 3 (sound). **Risk:** the costliest (reflections and lights), and it needs night as
  the default or a toggle, or a day equivalent.

### C. "Architectural Model" (the museum maquette, done adult)

- **Look:** an architect's competition model photographed in a gallery. All plaster-white and ink massing,
  machined detail, raking light. It is *meant* to be a model, but an expensive one.
- **Light:** one low raking key (sun 12 to 20° above the horizon, 5000 K), long crisp shadows, and a soft
  studio env. The background is a paper cyclorama or a black void, with no horizon.
- **Materials:** two families only. Matte plaster (roughness 0.9, baked AO strong) for everything built.
  Ink (satin black) for the track, glass and roof edges. Water is ink with a polished sheen. Trees are
  abstract plaster forms or brass pins. Grass is a single flocked tone.
- **Palette shift:** paper and ink only, at 95% or more. Orange marks the projects (garage doors or the
  dots), the car accent and the objective, like the red dot in a site model.
- **Camera:** a long lens from high up (fov 12 to 18, 60 m or more): near-orthographic like model
  photography. For hero beats it drops to "eye level inside the model". DOF here is intentional and
  shallow, because this direction *owns* the miniature read instead of pretending.
- **Post:** Neutral, an almost-neutral LUT, grain 0.03. Stronger AO.
- **UI:** dimension lines, grid references and plotted-drawing labels: the TacticalMap and Teardown
  language placed into the world.
- **Refs:** 15 (clay mode), 21, 5, 22. **Risk:** it changes the world from "a place" to "an object". The
  driving may feel less fast, but it is the most on-brand for Datasheet.

### D. "Golden Hour Paddock" (editorial motorsport photography)

- **Look:** magazine photography at a circuit in the last hour of light. Warm long light and cool shadows,
  haze in the distance, dust in the air, paper glowing.
- **Light:** sun 6 to 12° up, 3500 K. Sky fill cool (8000 K) through the env. Strong rim on the car. Height
  fog with aerial perspective (distance lifts and warms).
- **Materials:** as in A, plus dust and haze particles in light shafts. Grass dries toward straw-khaki.
  Concrete takes the warm light.
- **Palette shift:** neutrals warm up; paper reads cream in the light and blue-grey in shadow. Orange
  becomes a highlight, not a fill.
- **Camera:** 35 to 50 mm, low (0.8 to 2 m) for heroes, a slight handheld micro-shake on idle, sun-flare
  angles kept off-axis and subtle.
- **Post:** AgX with a warm LUT, faint halation on highlights, grain 0.05, vignette 0.25.
- **UI:** Datasheet as photo captions: small, hairline, set in a corner, with the figure in orange.
- **Refs:** 6, 8, 20, 11. **Risk:** the most "mood" and the least neutral. Golden hour is a time of day, so
  it is the day cycle's dusk keyframe made the default.

### Suggested path

Build changes 1, 2, 4 and 5 first. They are shared by every direction and are mostly "A". Render K1 to K3
for A and C (cheapest to mock), and B as a night variant. The owner picks one, and the pick goes into the
BRAND.md log.

---

## Sources read for this file

- Bruno Simon folio-2025, Awwwards case study: https://www.awwwards.com/brunos-portfolio-case-study.html
  (plus docs/research/bruno-folio-2025.md)
- Igloo Inc case study (Abeto): https://awwwards.com/igloo-inc-case-study.html; SOTY and Developer SOTY 2024
  per the Awwwards annual pages listed in search (https://awwwards.com/annual-awards-2024/developer-site-of-the-year)
  and Abeto's profile https://www.awwwards.com/abeto/
- Messenger (Abeto): https://www.awwwards.com/messenger.html
- Lusion site case study: https://awwwards.com/case-study-for-lusion-by-lusion-winner-of-site-of-the-month-may.html
- Lusion projects: https://lusion.co/projects; Porsche Dream Machine: https://lusion.co/projects/porsche_dream_machine
- Oryzo BTS 2/7: https://blog.lusion.co/oryzo-bts-part-2-7-3d-design-and-motion-graphics;
  3/7: https://blog.lusion.co/oryzo-bts-part-3-7-website-ux-ui-and-illustrations
- Best three.js websites 2026 (Utsubo): https://www.utsubo.com/blog/best-threejs-websites-2026
- Resn KPR: https://www.awwwards.com/kpr-by-resn-wins-sotm.html
- Configurator teardown (Porsche, Tesla, Ferrari, McLaren):
  https://dev.to/podifai/we-reverse-engineered-12-product-configurators-heres-whats-actually-under-the-hood-12ld
- PureDrive-RT: https://discourse.threejs.org/t/performance-focused-real-time-3d-car-configurator-in-three-js/87892,
  https://nourtin.com/pages/Subpages/puredrive-rt-webgl-configurator.html
- Linear: https://linear.app/blog/behind-the-latest-design-refresh
- F1 cameras: https://www.autosport.com/f1/news/formula-1-rethinking-all-its-tv-camera-positions-for-2019-5283306/5283306/
- Forza Horizon 3 skies, GDC 2017: https://gdcvault.com/play/1024091/Shoot-for-the-Sky-The
- INSIDE, GDC 2016: https://gdcvault.com/play/1023002/Low-Complexity-High-Fidelity-INSIDE
- AgX and tone-mapping notes: https://discourse.threejs.org/t/is-agx-tonemapping-implemented-correctly/60609,
  https://github.com/mrdoob/three.js/pull/27366
- Tilt-shift and miniature perception (informal sources):
  https://www.digitalcameraworld.com/tutorials/get-the-toy-town-look-and-replicate-the-look-of-tilt-shift-lenses-in-photoshop
- drei MeshReflectorMaterial: https://drei.docs.pmnd.rs/shaders/mesh-reflector-material
- Three.js Journey, Realistic render: https://threejs-journey.com/lessons/realistic-render
