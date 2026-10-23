# Bruno Simon folio-2025: technical brief for an R3F port

Source: github.com/brunosimon/folio-2025 (MIT). I read a shallow clone at
a local shallow clone. All paths below are relative to that repo.
Stack: vanilla three `three/webgpu` + TSL node materials, Rapier physics, gsap, Stylus CSS, Vite.
**Porting caveat:** every shader in the repo is TSL, which runs only with `WebGPURenderer`
(that renderer has a WebGL2 fallback, `forceWebGL: true`). If you stay on the classic `WebGLRenderer`,
rewrite each TSL `outputNode` as `onBeforeCompile` patches or a `ShaderMaterial`. The math carries over one to one.

Camera context (it explains a lot of his choices): `sources/Game/View.js`
```js
spherical.phi   = Math.PI * 0.31        // 0.27 on low quality
spherical.theta = Math.PI * 0.25        // fixed 45deg isometric-ish yaw
spherical.radius.edges = { min: 15, max: 30 }   // zoom range
```
Fixed-angle chase cam, no free orbit. The world is basically a flat 192x192 tile.

---

## 1. MAP

**It is not a camera zoom-out.** It is an HTML modal holding a **pre-rendered top-down image**
(1024x1024, rendered offline in Blender). There are two versions: `static/ui/map/map-day.webp` and `map-night.webp`.
HTML pins and a rotating player arrow sit on top of it.

- JS: `sources/Game/Map.js`. CSS: `sources/style/map.styl`. HTML: `sources/index.html` ~L863 (modal) and ~L93 (trigger button).
- **Open:** the `M` key (`Keyboard.KeyM`, toggles open/close) or the top-right `.map-trigger` button
  (44x44, `top: 70px`, under the menu button). The map is just a modal (`modals.open('map')`), so `Esc`/close works the same way.
- **The image swaps day/night** on open: `dayCycles.intervalEvents.get('night').inInterval ? night : day`.
  The `<img>` fades in with `opacity 0 -> 1, transition 0.3s` on `load`.
- **World to map** (size = `terrain.size = 192`, world origin at the image centre):
```js
x = clamp(pos.x / 192 + 0.5, 0, 1);  y = clamp(pos.z / 192 + 0.5, 0, 1)   // -> CSS left/top %
```
- **Locations:** a hardcoded list `{ name, respawnName, offset:{x,y} }` (offset in 0..1 map units, used to nudge pins).
  Each pin's position comes from the named **respawn point** (Blender empties named `respawnXxx` in `respawnsReferencesModel`,
  read in `sources/Game/Respawns.js`, y forced to 4). `zIndex = round(mapY*1000)` stacks the pins.
- **Click a pin** -> `player.respawn(name)` -> `modals.close()`. Respawn = full-screen **overlay wipe**
  (`sources/Game/Overlay.js`). On wipe complete the car is teleported (`physicalVehicle.moveTo(pos, rotY)`), then the wipe un-reveals.
  See §4 for the overlay.
- **Player marker:** `.player::after` is an 80px sprite (`ui/map/player.webp`), offset -40px to centre it.
  It updates only when the rounded world position changes, with `transform: rotate(${-vehicle.yRotation}rad)`.
  An optional `.is-bouncing` keyframe runs 1s and pulses scale 1 -> 1.2 -> 1 twice.
- **Pin styling** (`.location .pin`): a 20px **white diamond** (`rotate(45deg)`), `border: 4px solid #251f2b`,
  `box-shadow 0 0 4px #251f2b77` (12px/3px border on mobile).
- **Label** (`.name`): black box `#000`, white uppercase, `padding 2px 6px`, `letter-spacing 1px`, `box-shadow 0 0 4px #0007`.
  Hidden at `scale(0)` and **popped on hover** (touch: always shown) with a springy bezier:
  ```
  transform-origin 50% 80%; transition transform .3s cubic-bezier(0.65,-1,0.45,1)   // hide
  hover: scale(1); transition-timing-function cubic-bezier(0.49,2.2,0.53,0.75)      // overshoot pop
  ```
- **Map frame:** `.map` is 1024px (768 under 1100px, 512 under 800px), `max 100vmin`, bg `radial-gradient(ellipse at top left,#251f2b,#1d1721)`.
  An inset hairline: `::after { inset:3px; border:1px solid #fff; opacity:.35 }`.
  The close button is a tab sticking out **above** the top-right edge (`bottom:100%`, 50x44, red gradient, see §6).
- What the art looks like (map-day): sand-orange land (#e8a050-ish) with dark asphalt circuit loops, red/white kerbs,
  olive grass blobs, teal-glow shorelines (#5bc2b9) fading to a navy sea. The night version is the same scene with
  blue-lit sand and glowing orange lamp dots.

## 2. NIGHT / DAY CYCLE

`sources/Game/Cycles/DayCycles.js` + `Cycles.js`. The **cycle is 4 minutes** (`super(..., 4*60)`), and
progress = `Date.now()/1000/duration % 1`, so it is tied to wall-clock time and every visitor sees the same phase.
Keyframes are interpolated per property (`THREE.Color` lerp + number lerp):
```js
day:   { lightColor:'#ffd2c2', lightIntensity:1.2, shadowColor:'#6d3fff', fogColorA:'#00ffff', fogColorB:'#9b89ff', fogNearRatio:0.315, fogFarRatio:1.25, revealColor:'#5f7dff', revealIntensity:12 }
dusk:  { lightColor:'#ff8181', lightIntensity:1.2, shadowColor:'#4e009c', fogColorA:'#3e53ff', fogColorB:'#ff4ce4', fogNearRatio:0,     fogFarRatio:1.25, revealColor:'#ff86d9' }
night: { lightColor:'#3240ff', lightIntensity:3.8, shadowColor:'#2f00db', fogColorA:'#10266f', fogColorB:'#490a42', fogNearRatio:-0.85, fogFarRatio:1,    revealColor:'#b678ff', revealIntensity:10 }
dawn:  { lightColor:'#ffa882', lightIntensity:1.2, shadowColor:'#db004f', fogColorA:'#f885ff', fogColorB:'#ff7d24', fogNearRatio:0.3,   fogFarRatio:1.25 }
// stops: day 0 -> day .15 -> dusk .25 -> night .35 -> night .60 -> dawn .80 -> day .90
// interval events: night = [0.25, 0.70], deepNight = [0.35, 0.60]
```
(The presets also carry `temperature` and `electricField`, which drive the weather/snow/lightning systems, not lighting.)

**How the lighting is applied: there are no real ambient/hemisphere lights.** Every material is
`MeshDefaultMaterial` (`sources/Game/Materials/MeshDefaultMaterial.js`, extends Lambert but overrides `outputNode`).
It is a hand-rolled toon-ish lighting model:
```
out  = baseColor
out  = mix(out, terrainColorUnderneath, bounce)   // "light bounce": down-facing normals within 1.5m of ground pick up terrain colour
out *= lightColor * lightIntensity                // the whole "sun" is one colour multiplier
core = smoothstep(1.0, -0.25, dot(N, lightDir))   // coreShadowEdgeHigh=1, Low=-0.25 (soft terminator)
drop = 1 - shadowMapValue
out  = mix(out, baseColor * shadowColor, max(core, drop))   // shadows are TINTED, never black
out  = mix(out, fogColor, rangeFog(near, far))
```
So **night = blue multiplier #3240ff at x3.8, with shadows = albedo x #2f00db (violet).** That is where the purple/blue feel comes from.
Day shadows are also violet (#6d3fff), which is the signature look of the whole site.

- One `DirectionalLight` is used only for the shadow map (2048 on high quality, 512 on low, radius 3, bias -0.001, normalBias 0.1).
  It follows the visible area. The sun direction orbits with the cycle (`sources/Game/Ligthing.js`):
  `theta = 0.72 + sin(-(p+9/16)*2PI)*1.25`, `phi = 0.63 + cos(...)*0.5*0.62`.
- **Fog / sky** (`sources/Game/Fog.js`): `scene.backgroundNode` is a **screen-space radial gradient**
  `mix(fogColorA, fogColorB, smoothstep(0,1, length(viewportUV)))`, a corner-to-corner wash.
  Objects fade into that same gradient with a range fog. The fog distances come from the camera's visible-ground
  near/far: `near = nearDist + ratio*(far-near)`. At night `fogNearRatio = -0.85` means everything is partially
  fogged, so the whole frame gets a navy-to-plum tint. There is **no skybox, no stars sky, no light shafts**
  (the camera never sees the horizon).
- **Bloom** (`sources/Game/Rendering.js`): `bloom(scenePass)` with `threshold 1, strength 0.25, smoothWidth 1`,
  5 mips on high quality and 2 on low. Only HDR > 1 pixels bloom. There is also a "cheap DOF": a hash blur
  growing toward the top and bottom of the screen (`start .2, end .5, amount .003, repeats 25`), a tilt-shift miniature feel.
  No tone-mapping or LUT pass. The "grading" is the light, shadow and fog colours above.
- **Emissives** (`sources/Game/Materials.js`) are `MeshBasic` with colour normalised by luminance and then multiplied,
  so they sit above 1.0 and bloom:
```js
colorNode = mix(colorA, colorB, length(uv-0.5)*2) / luminance(...) * intensity   // radial gradient per face
emissiveOrangeRadialGradient '#ff8641' -> '#ff3e00' x1.7
emissivePurpleRadialGradient '#454bbc' -> '#ff2eb4' x1.7
emissiveBlueRadialGradient   '#91f0ff' -> '#128fff' x1.7
emissiveGreenRadialGradient  '#f8ffa6' -> '#74ff00' x1.5
emissiveWhiteRadialGradient  '#ffffff' -> '#666666' x2.7 (not normalised)
```
  Assignment is **by Blender material name**: `materials.updateObject(mesh)` swaps each glTF material for the
  prebuilt one with the same `name`. A glass mesh named `emissiveOrangeRadialGradient` glows automatically.
  These materials skip fog, so they punch through the night tint.
- **Lamps at night** (`sources/Game/World/PoleLights.js`): instanced pole lights. On the `night` interval event the
  glass instance is set `visible = true` (it is emissive orange). It is a hard toggle, with **no real PointLights at all**.
  There are also **fireflies**: 5 per pole, sprite circles r=0.015 using the orange emissive, drifting
  `sin(t*.4)*.5, sin(t)*.2, sin(t*.3)*.5` around `pole+1m`, with a gsap scale 0->1 over 5s. Other night toggles:
  candle flames in the Lab scale 0->1 over 10s (`LabArea.js` ~L1126), the moon in the toilet cabin (`ToiletArea.js`), and night ambience audio.
- **Porting recipe:** keep one directional light for shadows. Drive a single `uLightColor*uIntensity`, `uShadowColor`,
  `uFogA/B` and fog near/far from a keyframed cycle, and inject them into every material. Make emissives
  `MeshBasicMaterial({color: c.multiplyScalar(k), toneMapped:false})`, then add `<Bloom luminanceThreshold={1} intensity≈0.25>`.

## 3. INTERACTION PROMPT (in-world 3D, not HTML)

`sources/Game/InteractivePoints.js`. Each point is a **3D billboard-ish group** standing at a world position.
It is not camera-facing: it uses a fixed tilt that matches the fixed camera.
```js
group.rotation.reorder('YXZ'); group.rotation.x = -PI*0.15; group.rotation.y = PI*0.25; group.scale.setScalar(0.85)
```
Three parts:
1. **Diamond**: `PlaneGeometry(2,2)` rotated 45deg. Its shader draws a square SDF `d = max(|u-.5|,|v-.5|)*2`,
   discards `d > threshold`, and draws an inner outline ring at `|threshold - d - lineOffset| < lineThickness/2`.
   The fill is `backColor #251f2b` (fogged), the line is `frontColor #ffffff`.
2. **Key icon**: a 2x2 plane at z=0.01 scaled to 0.25 showing a white glyph texture
   (`interactivePointsKeyIconEnter`, which swaps to Cross/A for gamepads and is hidden on touch).
   `depthTest:false`, renderOrder 8. One shared instance is reparented into the active point.
3. **Label**: a canvas texture, **`700 64px "Amatic SC"`**, white text on a black rect, padding 60px on the icon side and 12px on the other,
   Nearest filtering. Plane width `0.75*w/h`, height 0.75, anchored at the diamond centre and extending right (or left with `ALIGN_RIGHT`).
   It slides out by animating a UV offset `labelOffset` 1 -> 0 and discarding outside [0,1] (a wipe-from-the-diamond effect).

States and animation (gsap):
| state | threshold | lineThickness | lineOffset | ease / dur |
|---|---|---|---|---|
| HIDDEN | 0 | .150 | .175 | `back.in(4.5)` .6s |
| CONCEALED (idle, small diamond visible) | .25 | .150 | .175 | `back.in(4.5)` .6s (+.2 delay) |
| OPEN (car near) | .5 | .075 | .150 | `elastic.out(1.3,0.4)` 1.5s |
| interact pulse | .6 then .5 | | | `power2.out` .1s, then `elastic.out(1.3,.6)` 1.5s |
On OPEN the key icon scales 0 -> 0.25 with `elastic.out(1.3,0.8)` 1.5s after a .6s delay, the label slides in
(`power2.out` .6s, delay .2), and a paper-rustle sound plays. While open, all of its materials switch to `depthTest=false` so the prompt draws over everything.

**Proximity:** the test reruns only when the player has moved more than 0.2 since the last test. It picks the **nearest point within 2.5 units**
(2D distance on XZ). Leaving conceals it. Mouse hover and click also work (a sphere r=0.75 raycast).
**Keys:** `interact` = `Enter`, `E`, `F`, or gamepad cross. On touch there is an HTML bottom-bar button instead
(`sources/style/interactiveButtons.styl`): Amatic SC 64px white text over a `linear-gradient(#1D172100,#1D172199)` bottom fade.
There is also an **"unstuck"** button (see §4).

**Panels after interacting:** most content (projects, career, lab) is shown **in-world**, with the camera moving to a
board in the scene, not in HTML modals. The HTML modals are only `circuit-end`, `discord`, `map` plus the menu (`index.html` ~L742).
Modal system (`sources/Game/Modals.js`, `style/modals.styl`): `.modals` is fixed fullscreen flex-centre with **no backdrop dimming or blur**
(the world stays visible). The whole layer fades `opacity 0 -> 1, .3s` (class `is-displayed`, then after 2 rAFs `is-visible`).
Opening switches the input filter to `'modal'`, which disables driving. Panel: `.content { padding 25px 40px 40px; background radial-gradient(ellipse at top left,#251f2b,#1d1721) }`,
with close at `top/right 38px`, 40px, `opacity .65 -> 1` on hover. Discord cards: `border 1px solid #ffceca; border-top:none`.
Their title sits *on* the missing top border with flex `line | title | line` hairlines (`#ffceca`, Amatic 1.7rem),
and the button sits on the bottom edge.

## 4. TERRAIN & WORLD STYLE

- **The terrain is flat. There are no hills.** `sources/Game/Terrain.js`: `size = 192`, `subdivision = 128`. The terrain is a
  **512x512 RGB data texture** (`static/terrain/terrain.png`) painted in Photoshop (`resources/terrain.psd`):
  **R = paved slabs/paths, G = grass, B = water depth**. UV = `pos.xz / 128 / 1.5 + 0.5`.
- The floor (`sources/Game/World/Floor.js`) is a plane that follows the camera (cell 1.5m). The only displacement is
  `y -= B * 1.5`, so ponds and the sea are shallow basins 1.5m deep (`water.surfaceElevation = -0.3`, `depthElevation = -1.5`).
  Physics = a Rapier heightfield from `terrain.glb`, `friction 0.2, restitution 0.15`. Slopes only exist at shorelines (about 1.5m over a few metres).
  Past the map edge a kinematic "bedrock" box follows the player so they cannot fall off.
- **Ground colour:** a gradient indexed by `1 - B`: `0.1 #ffa94e` (sand) -> `0.3 #5bc2b9` (teal shallows) -> `0.9 #13375f` (deep navy).
  Grass `#b8b62e` is mixed in by G. Slabs: `mix('#a87762','#ffcf8b', slabsTex)` at freq 0.175, masked by `R * perlin(xz*0.03)`,
  so paths break up organically at the edges. Wheel tracks are a render target that erases grass (`G *= 1 - tracks`).
  Grass in G also feeds `shadowNode`, so grass reads darker.
- **Road:** the dark asphalt circuit with red/white kerbs is modelled in Blender, and the race track occupies the whole west half.
  The east half is a park of organic blobby grass islands threaded by sand/slab paths, small wooden bridges over ponds,
  and themed areas (`sources/Game/World/Areas/*.js`: Landing, Projects, Lab, Career, Social, Bowling, Circuit, Altar, Cookie, TimeMachine...).
- **Prop art:** Blender low-poly models, **flat-shaded off a single palette texture** (`static/palette.png`, 128x4 px)
  via `materials.createPalette()`. There is no baked lighting: all shading is the runtime shader in §2. Shapes are chunky and rounded.
- **Foliage** (`World/Foliage.js`): each bush/tree crown = **80 planes of 0.8x0.8** scattered in a sphere, with normals pushed out
  spherically (`lerp(pos, normalize(pos), .85)`) so the clump shades like a ball. Alpha comes from an SDF leaf texture, with wind sway.
  Two-tone colours: oak/bush `#b4b536 -> #d8cf3b`, birch `#ff4f2b -> #ff903f`, cherry `#ff6d6d -> #ff9990`.
- **Get-back helpers:**
  - `R` / gamepad select = `respawn()` to the **closest respawn point** (`respawns.getClosest`).
  - **Stuck detection** (`Physics/PhysicsVehicle.js setStuck`): if the car travelled < 0.5 units over the last 3s,
    it fires `stuck`, which shows the "unstuck" interactive button. Pressing it respawns.
  - Death (falling, explosions) respawns 2s later.
  - **The respawn transition** (`Overlay.js`) is a fullscreen quad (renderOrder 99) that wipes in diagonally from one corner:
    a tiled pattern texture (200px) plus 45deg stripes (`(x+y)/10 mod 1`), with a `#251f2b -> #1d1721` gradient and hash dither.
    `show` takes 2s `power1.inOut` and `hide` takes 4s (inverted direction), with a swoosh sound.

## 5. NOTIFICATIONS / ACHIEVEMENTS

`sources/Game/Notifications.js`, `sources/style/notifications.styl`.
`show(html, type, duration=3, onClick, id)` is a **single toast at a time with a pending queue**.
- Position: top-centre, `top 20px`, width `min(350px, 100% - 40px)`.
- Box: `padding 12px 20px 15px 15px`, panel gradient `#251f2b -> #1d1721`, 16px text, square corners, no border.
- Enter: `translateY(calc(-100% - 20px)) -> 0`, `.6s cubic-bezier(0.4,1.6,0.65,1)` (overshoot drop).
  Leave: `translateY(calc(-100% + 20px)) scale(0)`, `.45s cubic-bezier(0.42,0,0.47,-0.55)` (wind-up then suck away).
- **Time bar:** a 2px strip at the top, `transform-origin: 100% 0`, scaleX shrinking with the remaining time.
- Variants by class: `is-achievement` has title Amatic 1.7rem `#d5ff95` (lime), a right-aligned check icon + `n / m` bold, and a description;
  the bar is lime. `is-song` uses `#ffc67b`. `is-server-disconnected` uses `#ff6a7c`. Default bar `#ffceca`.
  A hover reveals an "open" icon.

## 6. FONTS & UI DESIGN LANGUAGE

- **Fonts** (Google): `Amatic SC 700` for every title, label and the in-world prompts (hand-drawn condensed caps).
  `Nunito 400/700/900` for body (`html { font-size 20px }`, 18px under 520px, 16px under 440px). `Pally` (local) for a few bits.
  Fonts are preloaded via hidden `.fonts-loader` divs before canvas text is drawn, which matters for the canvas labels.
- `.title { font-family "Amatic SC"; font-weight 700; font-size 2.5rem; margin-bottom .25em }`, `.text { 1rem }`.
- **Palette:** panel bg `radial-gradient(ellipse at top left, #251f2b, #1d1721)` (dark aubergine, used everywhere, including the `html` bg).
  Text `#fff`. Accent blush `#ffceca` (hairlines, active inputs), success lime `#d5ff95`, danger `#ff6a7c`/`#ff87a2`, warm `#ffc67b`.
  Selection is inverted (`#251f2b` on white).
- **Edge buttons** (menu/map triggers, close tabs): `radial-gradient(ellipse at top right, #C21515, #46123B)` (crimson to plum),
  44x44, flush to the screen edge. An inner hairline `::after { inset 3px; border 1px solid #fff; opacity .35 }` (open on the edge side)
  brightens to .8 on hover. Hover slides the button out 4px (`translateX(-4px)`, `.15s`). When a modal/menu opens, the trigger slides off-screen (`translateX(100%)`).
- **Buttons:** `height 58px; padding 0 16px; border-radius 8px; border 1px solid rgba(255,255,255,.8)`, transparent bg, hover goes to full white.
  Disabled = dashed border. Inputs are 58px with `#555` 1px borders, joined segments, and 8px outer radii.
- **No backdrop-filter / blur anywhere** in the styles (`grep backdrop` finds nothing). The look is flat dark panels, thin white/blush hairlines,
  square corners on panels, rounded only on buttons, and bouncy overshoot cubic-beziers on every show/hide.
