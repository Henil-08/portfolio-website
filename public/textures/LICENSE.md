# Micro-textures (look=next)

Tileable surface detail for the rendering polish pass behind `?look=next` (docs/BRAND.md,
2026-11-09; components/world/look.ts). Each file packs one material's normal map (R, G: the
tangent normal's x and y, OpenGL convention) and roughness map (B), downsized and repacked by
`scripts/look/pack-textures.mjs`. No colour is used: the model keeps its own paint.

All four come from ambientCG (https://ambientcg.com) by Lennart Demes, released under the
**Creative Commons CC0 1.0 Universal** public-domain dedication
(https://docs.ambientcg.com/license/, https://creativecommons.org/publicdomain/zero/1.0/).
No attribution is required; it is given here anyway.

| File | Size | Source asset | Page |
|---|---|---|---|
| concrete.webp | 512 px | Concrete 034 (1K-JPG: NormalGL, Roughness) | https://ambientcg.com/view?id=Concrete034 |
| asphalt.webp | 512 px | Asphalt 026 C (1K-JPG: NormalGL, Roughness) | https://ambientcg.com/view?id=Asphalt026C |
| plaster.webp | 256 px | Painted Plaster 017 (1K-JPG: NormalGL, Roughness) | https://ambientcg.com/view?id=PaintedPlaster017 |
| metal.webp | 256 px | Metal 009, brushed steel (1K-JPG: NormalGL, Roughness) | https://ambientcg.com/view?id=Metal009 |

Downloaded 2026-11-09.
