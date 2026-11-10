# Step 2 of the light bake (scripts/bake/run.mjs runs it, one chunk per Blender, headless):
#   blender -b --factory-startup --python scripts/bake/bake.py -- <config.json>
#
# Reads one chunk GLB from export.mjs (world space, three.js axes), lays out a light-map UV set
# for its receivers (Smart UV Project + pack; or planar over x/z for the island-wide terrain),
# lights the scene like the game's look=next day (Effects.tsx SCENES_NEXT: the warm key at the
# day clock's sun direction, the CC0 overcast HDRI from public/env as the sky), bakes in Cycles
# (Metal GPU when there is one) and writes:
#   <out>/<name>.png      R = ambient occlusion (1 open), G = sun visibility (1 lit),
#                         B = indirect diffuse light (bounce) / its scale; linear, 8 bit
#   <out>/<name>.uv.bin   the light-map uv of every receiver corner, uint16 pairs, receivers
#                         in GLB order, corners in the game's index order (none for planar)
#   <out>/<name>.json     size, bounce scale, per receiver: id, corners, vertices
import bmesh
import bpy
import json
import math
import struct
import sys
import time

import numpy as np
from mathutils import Vector

cfg = json.load(open(sys.argv[sys.argv.index("--") + 1]))
T0 = time.time()


def log(*a):
    print(f"[bake {cfg['name']} {time.time() - T0:6.1f}s]", *a, flush=True)


# ---------------------------------------------------------------- GLB
def read_glb(path):
    d = open(path, "rb").read()
    jlen = struct.unpack_from("<I", d, 12)[0]
    js = json.loads(d[20 : 20 + jlen])
    b0 = 20 + jlen + 8
    blen = struct.unpack_from("<I", d, 20 + jlen)[0]
    binb = d[b0 : b0 + blen]

    def acc(i):
        a = js["accessors"][i]
        v = js["bufferViews"][a["bufferView"]]
        dt = np.float32 if a["componentType"] == 5126 else np.uint32
        n = a["count"] * (3 if a["type"] == "VEC3" else 1)
        return np.frombuffer(binb, dtype=dt, count=n, offset=v.get("byteOffset", 0) + a.get("byteOffset", 0))

    out = []
    for m in js["meshes"]:
        p = m["primitives"][0]
        at = p["attributes"]
        out.append(
            {
                "name": m["name"],
                "pos": acc(at["POSITION"]),
                "col": acc(at["COLOR_0"]) if "COLOR_0" in at else None,
                "idx": acc(p["indices"]),
                "flat": bool(m.get("extras", {}).get("flat", False)),
            }
        )
    return out


def to_blender(p):
    """three.js (y up) to Blender (z up): (x, y, z) -> (x, -z, y), a rotation, winding kept."""
    p = p.reshape(-1, 3)
    b = np.empty_like(p)
    b[:, 0] = p[:, 0]
    b[:, 1] = -p[:, 2]
    b[:, 2] = p[:, 1]
    return b


def build(name, pos, idx, col=None, sharp=None):
    me = bpy.data.meshes.new(name)
    nv = len(pos) // 3
    nl = len(idx)
    nt = nl // 3
    me.vertices.add(nv)
    me.vertices.foreach_set("co", to_blender(pos).ravel())
    me.loops.add(nl)
    me.loops.foreach_set("vertex_index", idx.astype(np.int32))
    me.polygons.add(nt)
    me.polygons.foreach_set("loop_start", np.arange(0, nl, 3, dtype=np.int32))
    me.update(calc_edges=True)
    sf = me.attributes.new("sharp_face", "BOOLEAN", "FACE")
    sf.data.foreach_set("value", sharp if sharp is not None else np.zeros(nt, dtype=bool))
    if col is not None:
        ca = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
        rgba = np.ones((nv, 4), dtype=np.float32)
        rgba[:, :3] = col.reshape(-1, 3)
        ca.data.foreach_set("color", rgba.ravel())
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


# ---------------------------------------------------------------- scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
meshes = read_glb(cfg["glb"])
recs = [m for m in meshes if m["name"] != "occluders"]
occ = [m for m in meshes if m["name"] == "occluders"]

# every receiver in one mesh (vertex ranges kept), so one unwrap and one bake cover the chunk
pos_l, idx_l, col_l, sharp_l, info = [], [], [], [], []
vbase = 0
for r in recs:
    nv = len(r["pos"]) // 3
    pos_l.append(r["pos"])
    idx_l.append(r["idx"].astype(np.int64) + vbase)
    col_l.append(r["col"] if r["col"] is not None else np.full(nv * 3, 0.8, dtype=np.float32))
    sharp_l.append(np.full(len(r["idx"]) // 3, r["flat"], dtype=bool))
    info.append({"id": r["name"], "corners": int(len(r["idx"])), "verts": int(nv)})
    vbase += nv
P = np.concatenate(pos_l)
I = np.concatenate(idx_l)
rec_ob = build("receivers", P, I, np.concatenate(col_l), np.concatenate(sharp_l))
occ_ob = build("occluders", occ[0]["pos"], occ[0]["idx"]) if occ and cfg.get("occluders", True) else None
log(f"{len(recs)} receivers, {len(I) // 3} tris; occluders {len(occ[0]['idx']) // 3 if occ else 0} tris")

# surface area (m²) -> texture size at the asked density
pb = to_blender(P)
tri = I.reshape(-1, 3)
area = float(np.linalg.norm(np.cross(pb[tri[:, 1]] - pb[tri[:, 0]], pb[tri[:, 2]] - pb[tri[:, 0]]), axis=1).sum() / 2)

if cfg["planar"]:
    p3 = P.reshape(-1, 3)
    mn = p3.min(axis=0)
    mx = p3.max(axis=0)
    planar = [float(mn[0]), float(mn[2]), float(mx[0] - mn[0]), float(mx[2] - mn[2])]
    span = max(planar[2], planar[3])
    size = int(min(cfg["maxSize"], max(cfg["minSize"], math.ceil(span * cfg["density"] / 64) * 64)))
else:
    planar = None
    size = int(min(cfg["maxSize"], max(cfg["minSize"], math.ceil(math.sqrt(area / cfg["packing"]) * cfg["density"] / 64) * 64)))
log(f"area {area:.0f} m², texture {size}²")

# ---------------------------------------------------------------- light-map uv
me = rec_ob.data
uv = me.uv_layers.new(name="lm")
if planar:
    corner = p3[I]
    u = (corner[:, 0] - planar[0]) / planar[2]
    v = (corner[:, 2] - planar[1]) / planar[3]
    uv.data.foreach_set("uv", np.stack([u, v], axis=1).astype(np.float32).ravel())
else:
    bpy.context.view_layer.objects.active = rec_ob
    rec_ob.select_set(True)
    me.uv_layers.active = uv
    # uv selection follows the mesh's, so the unwrap and the pack see every face
    scene.tool_settings.use_uv_select_sync = True
    bpy.ops.object.mode_set(mode="EDIT")
    # a world grid of `cell` metres cuts long ribbons (the road, kerbs, walls) into tiles that pack
    # tightly, instead of one curved island whose bounding box wastes most of the map; then Smart
    # UV Project splits at creases sharper than `angle`. The cut only separates faces (edge split):
    # faces and their corners keep their order, which is what the game's index order needs.
    bm = bmesh.from_edit_mesh(me)
    cell = cfg.get("cell", 10.0)
    key = {}
    for f in bm.faces:
        c = f.calc_center_median()
        key[f.index] = (math.floor(c.x / cell), math.floor(c.y / cell), math.floor(c.z / cell))
    for e in bm.edges:
        lf = e.link_faces
        e.select_set(len(lf) == 2 and key[lf[0].index] != key[lf[1].index])
    cuts = sum(1 for e in bm.edges if e.select)
    bmesh.update_edit_mesh(me)
    if cuts:
        bpy.ops.mesh.edge_split(type="EDGE")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(cfg.get("angle", 50)), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    log(f"unwrapped ({cuts} grid cuts)")
    # degenerate faces (zero area) can come out of the unwrap as NaN, which throws the packer off
    bpy.ops.object.mode_set(mode="OBJECT")
    luv = np.empty(len(me.loops) * 2, dtype=np.float32)
    me.uv_layers["lm"].data.foreach_get("uv", luv)
    bad = ~np.isfinite(luv)
    luv[bad] = 0.0
    # no average_islands_scale: Smart UV Project keeps every island at its true size already, and
    # the averaging blows a near-degenerate island up a hundredfold (the packer then gives up)
    scaled = luv.copy()

    def pack(size):
        # the packer now and then throws a few islands far outside the square (thousands of small
        # islands): again from the same start with a smaller margin or plain boxes
        for shape, k in ((cfg.get("shape", "CONCAVE"), 1.0), ("CONCAVE", 0.5), ("AABB", 1.0), ("AABB", 0.5)):
            me.uv_layers["lm"].data.foreach_set("uv", scaled)
            bpy.ops.object.mode_set(mode="EDIT")
            bpy.ops.mesh.select_all(action="SELECT")
            bpy.ops.uv.pack_islands(rotate=True, margin_method="FRACTION", margin=k * cfg["marginPx"] / size, shape_method=shape, scale=True, udim_source="ORIGINAL_AABB")
            bpy.ops.object.mode_set(mode="OBJECT")
            me.uv_layers["lm"].data.foreach_get("uv", luv)
            if luv.min() > -0.05 and luv.max() < 1.05:
                break
        t = luv.reshape(-1, 3, 2)
        e, f = t[:, 1] - t[:, 0], t[:, 2] - t[:, 0]
        uva = float(np.abs(e[:, 0] * f[:, 1] - e[:, 1] * f[:, 0]).sum() / 2)
        got = size * math.sqrt(uva / max(area, 1e-6))  # texels per metre reached
        log(f"packed {size}² ({shape}, margin x{k}): {got:.1f} texels/m of {cfg['density']}")
        return got

    # many small islands each need their margin, so the density a map size reaches isn't linear in
    # its size: step towards the asked density (within 15%), keeping the closest
    want = cfg["density"]
    got = pack(size)
    best = (abs(math.log(got / want)), size)
    for _ in range(4):
        if abs(math.log(got / want)) < 0.15:
            break
        nxt = int(min(cfg["maxSize"], max(cfg["minSize"], round(size * min(2.0, max(0.6, (want / got) ** 0.7)) / 64) * 64)))
        if nxt == size:
            break
        size = nxt
        got = pack(size)
        best = min(best, (abs(math.log(got / want)), size))
    if best[1] != size:
        size = best[1]
        got = pack(size)
    # the packer keeps the islands' original box, which can stick out a hair: back into 0..1
    lo, hi = float(luv.min()), float(luv.max())
    if lo < 0 or hi > 1:
        luv = (luv - min(lo, 0.0)) / (max(hi, 1.0) - min(lo, 0.0))
        me.uv_layers["lm"].data.foreach_set("uv", luv)
# edit mode rebuilt the mesh data: fresh references
me = rec_ob.data
uv = me.uv_layers["lm"]
me.uv_layers.active = uv
uv.active_render = True

# ---------------------------------------------------------------- materials
def material(name, use_col, grey=0.6):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 1.0
    bsdf.inputs["Specular IOR Level"].default_value = 0.0
    if use_col:
        a = nt.nodes.new("ShaderNodeVertexColor")
        a.layer_name = "Col"
        nt.links.new(a.outputs["Color"], bsdf.inputs["Base Color"])
    else:
        bsdf.inputs["Base Color"].default_value = (grey, grey, grey, 1)
    return m


rm = material("rec", True)
me.materials.append(rm)
if occ_ob:
    occ_ob.data.materials.append(material("occ", False))
img_node = rm.node_tree.nodes.new("ShaderNodeTexImage")
rm.node_tree.nodes.active = img_node

# ---------------------------------------------------------------- light (look=next day)
world = bpy.data.worlds.new("sky")
scene.world = world
world.use_nodes = True
wn = world.node_tree
bg = wn.nodes["Background"]
env = wn.nodes.new("ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(cfg["env"]["hdri"])
mapping = wn.nodes.new("ShaderNodeMapping")
coord = wn.nodes.new("ShaderNodeTexCoord")
# three.js's equirect u is Blender's turned half a turn about up
mapping.inputs["Rotation"].default_value = (0, 0, math.pi)
wn.links.new(coord.outputs["Generated"], mapping.inputs["Vector"])
wn.links.new(mapping.outputs["Vector"], env.inputs["Vector"])
wn.links.new(env.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = cfg["env"]["strength"]
world.light_settings.distance = cfg["aoDistance"]

sun_d = bpy.data.lights.new("sun", "SUN")
sun_d.energy = cfg["sun"]["strength"]
sun_d.color = cfg["sun"]["color"]
sun_d.angle = math.radians(cfg["sun"]["angle"])
sun = bpy.data.objects.new("sun", sun_d)
scene.collection.objects.link(sun)
d3 = cfg["sun"]["dir"]  # towards the sun, three.js axes
d = Vector((d3[0], -d3[2], d3[1])).normalized()
sun.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()

# ---------------------------------------------------------------- Cycles
scene.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
try:
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    gpus = [x for x in prefs.devices if x.type == "METAL"]
    for x in prefs.devices:
        x.use = x.type == "METAL"
    scene.cycles.device = "GPU" if gpus else "CPU"
except Exception:
    scene.cycles.device = "CPU"
log("device", scene.cycles.device)
scene.cycles.use_denoising = False
scene.cycles.max_bounces = 3
scene.cycles.diffuse_bounces = 2
scene.cycles.glossy_bounces = 0
scene.cycles.transmission_bounces = 0
scene.cycles.transparent_max_bounces = 0
bk = scene.render.bake
bk.margin = int(cfg.get("bakeMarginPx", 2))
bk.margin_type = "EXTEND"
bk.use_clear = True
bk.target = "IMAGE_TEXTURES"

for o in scene.objects:
    o.select_set(False)
rec_ob.select_set(True)
bpy.context.view_layer.objects.active = rec_ob


def bake(kind, res, samples, **kw):
    img = bpy.data.images.new(kind, res, res, alpha=False, float_buffer=True)
    img.colorspace_settings.name = "Non-Color"
    img_node.image = img
    scene.cycles.samples = samples
    t = time.time()
    bpy.ops.object.bake(type=kind, **kw)
    px = np.empty(res * res * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    log(f"{kind} {res}² x{samples} in {time.time() - t:.1f}s")
    return px.reshape(res, res, 4)


def uv_mask(res):
    """Texels under the light-map uv triangles (grown by ~0.7 texel so thin slivers count)."""
    luv = np.empty(len(me.loops) * 2, dtype=np.float32)
    uv.data.foreach_get("uv", luv)
    t = luv.reshape(-1, 3, 2) * res - 0.5
    m = np.zeros((res, res), dtype=bool)
    lo = np.clip(np.floor(t.min(axis=1) - 1).astype(int), 0, res - 1)
    hi = np.clip(np.ceil(t.max(axis=1) + 1).astype(int), 0, res - 1)
    for k in range(len(t)):
        (x0, y0), (x1, y1) = lo[k], hi[k]
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        a, b, c = t[k]
        inside = np.ones(xs.shape, dtype=bool)
        area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
        sgn = 1.0 if area >= 0 else -1.0
        for p, q in ((a, b), (b, c), (c, a)):
            ex, ey = q[0] - p[0], q[1] - p[1]
            ln = max(1e-9, math.hypot(ex, ey))
            d = sgn * (ex * (ys - p[1]) - ey * (xs - p[0])) / ln
            inside &= d >= -0.7
        m[ys[inside], xs[inside]] = True
    return m


def pushpull(img, mask):
    """Fills every texel outside the islands from the islands around it (a push-pull pyramid),
    so the mip levels average island light, never the black between islands (dark streaks on
    distant, tilted surfaces)."""
    img = img.astype(np.float32)
    w = mask.astype(np.float32)
    levels = []
    cur, cw = img * w[..., None], w
    while min(cw.shape) > 1:
        levels.append((cur, cw))
        h, wd = cw.shape
        ph, pw = h + (h & 1), wd + (wd & 1)
        c = np.pad(cur, ((0, ph - h), (0, pw - wd), (0, 0)))
        ww = np.pad(cw, ((0, ph - h), (0, pw - wd)))
        cur = c[0::2, 0::2] + c[1::2, 0::2] + c[0::2, 1::2] + c[1::2, 1::2]
        cw = ww[0::2, 0::2] + ww[1::2, 0::2] + ww[0::2, 1::2] + ww[1::2, 1::2]
    fill = cur / np.maximum(cw, 1e-6)[..., None]
    for cur, cw in reversed(levels):
        h, wd = cw.shape
        up = np.repeat(np.repeat(fill, 2, axis=0), 2, axis=1)[:h, :wd]
        own = cur / np.maximum(cw, 1e-6)[..., None]
        k = np.clip(cw, 0, 1)[..., None]
        fill = own * k + up * (1 - k)
    return fill


# where the islands are (the rest of the map gets filled from them)
mask = np.ones((size, size), dtype=bool) if planar else uv_mask(size)
ao = bake("AO", size, cfg["samples"]["ao"])[:, :, 0]
sh = bake("SHADOW", size, cfg["samples"]["shadow"])[:, :, 0]
# the bounce is low frequency: half the texels, more samples each, then up and smoothed
half = max(64, size // 2)
bop = bake("DIFFUSE", half, cfg["samples"]["bounce"], pass_filter={"INDIRECT"})
lum = bop[:, :, :3] @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
hmask = mask[: half * 2 : 2, : half * 2 : 2] if size >= half * 2 else mask
lum = pushpull(lum[..., None], hmask)[..., 0]


def blur(a, r=1):
    k = 2 * r + 1
    p = np.pad(a, r, mode="edge")
    s = np.zeros_like(a)
    for dy in range(k):
        for dx in range(k):
            s += p[dy : dy + a.shape[0], dx : dx + a.shape[1]]
    return s / (k * k)


lum = blur(lum, 1)
# bilinear up to the full size
ys = (np.arange(size) + 0.5) * half / size - 0.5
y0 = np.clip(np.floor(ys).astype(int), 0, half - 1)
y1 = np.clip(y0 + 1, 0, half - 1)
fy = np.clip(ys - y0, 0, 1)[:, None]
fx = np.clip(ys - y0, 0, 1)[None, :]
rows = lum[y0] * (1 - fy) + lum[y1] * fy
lum = rows[:, y0] * (1 - fx) + rows[:, y1] * fx
scale = float(max(1e-4, np.percentile(lum[mask], 99.7) if mask.any() else 1.0))
filled = pushpull(np.stack([np.clip(ao, 0, 1) ** cfg.get("aoCurve", 1.0), np.clip(sh, 0, 1), np.clip(lum / scale, 0, 1)], axis=-1), mask)
log(f"islands cover {mask.mean() * 100:.0f}% of the map")

packed = np.ones((size, size, 4), dtype=np.float32)
packed[:, :, :3] = filled
out = bpy.data.images.new("packed", size, size, alpha=False, float_buffer=False)
out.colorspace_settings.name = "Non-Color"
out.pixels.foreach_set(packed.ravel())
out.filepath_raw = f"{cfg['out']}/{cfg['name']}.png"
out.file_format = "PNG"
out.save()

# ---------------------------------------------------------------- uv back to the game
def in_game_order(tri_uv):
    """Blender may start a face's loops at another corner (edit mode rebuilds the mesh): put each
    triangle's uvs back on the game's corners by matching the corners' positions."""
    lv = np.empty(len(me.loops), dtype=np.int32)
    me.loops.foreach_get("vertex_index", lv)
    co = np.empty(len(me.vertices) * 3, dtype=np.float32)
    me.vertices.foreach_get("co", co)
    got = co.reshape(-1, 3)[lv].reshape(-1, 3, 3)
    want = pb[I].reshape(-1, 3, 3)
    if len(got) != len(want):
        raise RuntimeError(f"face count changed: {len(got)} vs {len(want)}")
    best = np.zeros(len(want), dtype=int)
    err = np.full(len(want), np.inf)
    for r in range(3):
        e = np.abs(np.roll(got, -r, axis=1) - want).max(axis=(1, 2))
        better = e < err
        best[better] = r
        err[better] = e[better]
    log(f"corners: {(best != 0).mean() * 100:.1f}% of faces start elsewhere, worst match {err.max():.4f} m")
    out = tri_uv.copy()
    for r in (1, 2):
        k = best == r
        out[k] = np.roll(tri_uv[k], -r, axis=1)
    return out



meta = {"name": cfg["name"], "size": size, "bounce": scale, "area": area, "planar": planar, "receivers": info}
if not planar:
    luv = np.empty(len(me.loops) * 2, dtype=np.float32)
    uv.data.foreach_get("uv", luv)
    luv = in_game_order(luv.reshape(-1, 3, 2)).ravel()
    q = np.clip(np.round(luv * 65535), 0, 65535).astype("<u2")
    q.tofile(f"{cfg['out']}/{cfg['name']}.uv.bin")
json.dump(meta, open(f"{cfg['out']}/{cfg['name']}.json", "w"))
log("written", out.filepath_raw)
