# Model conventions

All models in this folder are pure visuals: React Three Fiber components, no physics, no global state.

- Units are meters. Y is up. Models sit on the ground: their origin is at ground level, centered on their footprint.
- Forward for vehicles is **+X**. Everything else faces **+Z** (toward the default camera) unless noted.
- Colors only from `../palette.ts` (`C.red`, `C.grass`...). Use `meshStandardMaterial` with `roughness` 0.6 to 0.9 and `metalness` 0 to 0.2, except glass or chrome.
- The look is chunky and toy-like: rounded edges (`RoundedBox` from drei, capsules, spheres), slightly exaggerated proportions, no thin details smaller than ~3 cm.
- Every visible mesh gets `castShadow` and, where it makes sense, `receiveShadow`.
- Keep each model cheap: share geometries and materials with `useMemo`, and stay under ~40 meshes per model. Use instancing for repeated parts (crowd, trees, kerbs).
- No textures or external files. If text is needed, use drei `<Text>` with no `font` prop (it uses the built-in default), or canvas textures.
- Animated parts take props (`wave`, `spin`, `t`) or use `useFrame` locally. No springs or libs beyond three, fiber, drei.
- Export named components. Accept `...props` of `GroupProps` (`ThreeElements["group"]`) and spread them on the root group so callers can position them.
