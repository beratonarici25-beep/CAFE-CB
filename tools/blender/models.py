"""CAFE C&B: builds the game's 3D models in Blender and renders them to WebP sprites (assets/models/).

Everything is modelled here from primitives (lathe profiles, bevelled boxes, curves); no outside model files.
Look: "cartoon but realistic" (issue #11) = toon (cel) shading through Shader-to-RGB colour ramps, a soft ink
outline (inverted hull, same #4b2e2b as the game's outlines) and one warm key light from the upper left.

Run (Blender 4.2+):  blender -b -P tools/blender/models.py -- assets/models [only1,only2]
"""
import bpy, bmesh, math, os, sys, random
from mathutils import Vector

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'assets/models')
ONLY = set(ARGS[1].split(',')) if len(ARGS) > 1 and ARGS[1] else None
# pixels per sprite pixel: 2 = retina sprites for the game, 4 = big previews to inspect the models
RES = float(ARGS[2]) if len(ARGS) > 2 else 2.0
os.makedirs(OUT, exist_ok=True)
INK = (0.294, 0.180, 0.169)


def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


# ---------------------------------------------------------------- scene
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()
    sc = bpy.context.scene
    engines = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items]
    sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in engines else 'BLENDER_EEVEE'
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.render.image_settings.file_format = 'WEBP'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.quality = 88
    try:
        sc.eevee.taa_render_samples = 16
    except Exception:
        pass
    w = bpy.data.worlds.new('w'); sc.world = w
    w.use_nodes = True
    nt = w.node_tree; bg = nt.nodes['Background']
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    # vertical soft-box strips (by direction X): a big bright one on the left, a thin one on the right
    sx = nt.nodes.new('ShaderNodeValToRGB'); r = sx.color_ramp; r.interpolation = 'EASE'
    r.elements[0].position = 0.0; r.elements[0].color = (0.05, 0.05, 0.06, 1)
    r.elements[1].position = 1.0; r.elements[1].color = (0.08, 0.07, 0.07, 1)
    for pos, v in ((0.12, 0.08), (0.2, 2.6), (0.34, 2.6), (0.42, 0.12), (0.62, 0.16), (0.7, 1.3), (0.74, 1.3), (0.8, 0.1)):
        e = r.elements.new(pos); e.color = (v, v * 0.97, v * 0.92, 1)
    nt.links.new(sep.outputs['X'], sx.inputs[0])
    # warm floor below the horizon, soft light above
    sz = nt.nodes.new('ShaderNodeValToRGB'); r2 = sz.color_ramp
    r2.elements[0].position = 0.42; r2.elements[0].color = (0.16, 0.1, 0.07, 1)
    r2.elements[1].position = 0.56; r2.elements[1].color = (0.42, 0.42, 0.45, 1)
    nt.links.new(sep.outputs['Z'], sz.inputs[0])
    mx = nt.nodes.new('ShaderNodeMixRGB'); mx.blend_type = 'ADD'; mx.inputs[0].default_value = 1
    nt.links.new(sx.outputs[0], mx.inputs[1]); nt.links.new(sz.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], bg.inputs[0]); bg.inputs[1].default_value = 0.5
    # key light: warm, upper left, a little in front
    sun = bpy.data.lights.new('key', 'SUN'); sun.energy = 1.15; sun.color = (1.0, 0.95, 0.86); sun.angle = 0.2
    o = bpy.data.objects.new('key', sun); sc.collection.objects.link(o)
    o.rotation_euler = (math.radians(50), math.radians(-38), math.radians(-28))
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.clip_end = 1000
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co


MATS = {}


def toon(name, hexcol, kind='toon', alpha=1.0, edge=0.6, lo=None):
    """kind: toon (matte), metal (chrome bands), gloss (ceramic/plastic sheen), glass (see-through), flat"""
    key = (name, hexcol, kind, alpha, edge, lo)
    if key in MATS:
        return MATS[key]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; L = nt.links
    for n in list(N):
        N.remove(n)
    out = N.new('ShaderNodeOutputMaterial')
    base = srgb(hexcol) + (1,)
    diff = N.new('ShaderNodeBsdfDiffuse')
    s2r = N.new('ShaderNodeShaderToRGB'); L.new(diff.outputs[0], s2r.inputs[0])
    ramp = N.new('ShaderNodeValToRGB'); L.new(s2r.outputs[0], ramp.inputs[0])
    cr = ramp.color_ramp; cr.interpolation = 'EASE'
    # three soft bands: shadow side, mid tone, lit side (shadow tinted warm-purple like the 2D art)
    lo = lo if lo is not None else 0.42 if kind == 'metal' else 0.58
    cr.elements[0].position = 0.08; cr.elements[0].color = (lo * 0.95, lo * 0.88, lo * 0.95, 1)
    cr.elements[1].position = 0.62; cr.elements[1].color = (1.04, 1.02, 0.98, 1)
    e = cr.elements.new(0.3); e.color = (0.8, 0.77, 0.79, 1)
    mul = N.new('ShaderNodeMixRGB'); mul.blend_type = 'MULTIPLY'; mul.inputs[0].default_value = 1
    L.new(ramp.outputs[0], mul.inputs[1]); mul.inputs[2].default_value = base
    col = mul.outputs[0]
    if kind in ('metal', 'gloss', 'glass'):
        gl = N.new('ShaderNodeBsdfGlossy'); gl.inputs['Roughness'].default_value = 0.18 if kind == 'metal' else 0.3
        s2 = N.new('ShaderNodeShaderToRGB'); L.new(gl.outputs[0], s2.inputs[0])
        r2 = N.new('ShaderNodeValToRGB'); L.new(s2.outputs[0], r2.inputs[0])
        c2 = r2.color_ramp; c2.interpolation = 'CONSTANT'
        c2.elements[0].color = (0, 0, 0, 1)
        c2.elements[1].position = 0.5 if kind == 'metal' else 0.62; c2.elements[1].color = (0.75, 0.75, 0.75, 1)
        if kind == 'metal':
            e2 = c2.elements.new(0.16); e2.color = (0.16, 0.16, 0.18, 1)
        add = N.new('ShaderNodeMixRGB'); add.blend_type = 'ADD'; add.inputs[0].default_value = 0.7 if kind == 'metal' else 0.45
        L.new(col, add.inputs[1]); L.new(r2.outputs[0], add.inputs[2]); col = add.outputs[0]
    em = N.new('ShaderNodeEmission'); L.new(col, em.inputs[0])
    if alpha < 1:
        tr = N.new('ShaderNodeBsdfTransparent'); mix = N.new('ShaderNodeMixShader')
        lw = N.new('ShaderNodeLayerWeight'); lw.inputs[0].default_value = 0.35
        mr = N.new('ShaderNodeMapRange'); mr.inputs['To Min'].default_value = alpha; mr.inputs['To Max'].default_value = min(1, alpha + edge)
        L.new(lw.outputs['Facing'], mr.inputs[0]); L.new(mr.outputs[0], mix.inputs[0])
        L.new(tr.outputs[0], mix.inputs[1]); L.new(em.outputs[0], mix.inputs[2]); L.new(mix.outputs[0], out.inputs[0])
        for attr, val in (('surface_render_method', 'BLENDED'), ('blend_method', 'BLEND')):
            try:
                setattr(m, attr, val)
            except Exception:
                pass
        for attr in ('show_transparent_back', 'use_transparency_overlap'):
            try:
                setattr(m, attr, False)
            except Exception:
                pass
    else:
        L.new(em.outputs[0], out.inputs[0])
    MATS[key] = m
    return m


def ink_mat():
    if 'ink' in MATS:
        return MATS['ink']
    m = bpy.data.materials.new('ink'); m.use_nodes = True
    N = m.node_tree.nodes
    for n in list(N):
        N.remove(n)
    out = N.new('ShaderNodeOutputMaterial'); em = N.new('ShaderNodeEmission')
    em.inputs[0].default_value = srgb('#4b2e2b') + (1,)
    m.node_tree.links.new(em.outputs[0], out.inputs[0])
    m.use_backface_culling = True
    for attr in ('use_backface_culling_shadow',):
        try:
            setattr(m, attr, True)
        except Exception:
            pass
    MATS['ink'] = m
    return m


def finish(o, mat, outline=0.16, smooth=True, bevel=0.0, subsurf=0):
    o.data.materials.append(mat)
    if bevel:
        b = o.modifiers.new('bev', 'BEVEL'); b.width = bevel; b.segments = 3; b.limit_method = 'ANGLE'
    if subsurf:
        s = o.modifiers.new('sub', 'SUBSURF'); s.levels = subsurf; s.render_levels = subsurf
    if smooth:
        for p in o.data.polygons:
            p.use_smooth = True
        try:
            o.data.set_sharp_from_angle(angle=math.radians(40))
        except Exception:
            pass
    if outline:
        o.data.materials.append(ink_mat())
        so = o.modifiers.new('outline', 'SOLIDIFY')
        so.thickness = outline; so.offset = 1; so.use_flip_normals = True; so.use_rim = False
        so.material_offset = len(o.data.materials) - 1
    return o


def link(o):
    bpy.context.scene.collection.objects.link(o)
    return o


def lathe(name, prof, mat, segs=48, outline=0.16, loc=(0, 0, 0), cap_top=True, cap_bot=True):
    """revolve a (radius, z) profile around Z"""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    rings = []
    for (r, z) in prof:
        ring = []
        for i in range(segs):
            a = 2 * math.pi * i / segs
            ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z)))
        rings.append(ring)
    for j in range(len(rings) - 1):
        for i in range(segs):
            a, b = rings[j][i], rings[j][(i + 1) % segs]
            c, d = rings[j + 1][(i + 1) % segs], rings[j + 1][i]
            if len({a, b, c, d}) == 4:
                bm.faces.new((a, b, c, d))
    if cap_bot and prof[0][0] > 0:
        bm.faces.new(list(reversed(rings[0])))
    if cap_top and prof[-1][0] > 0:
        bm.faces.new(rings[-1])
    bm.normal_update(); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.location = loc
    return finish(o, mat, outline)


def box(name, size, mat, loc=(0, 0, 0), bevel=0.15, outline=0.16, rot=(0, 0, 0)):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me))
    o.scale = size; o.location = loc; o.rotation_euler = rot
    bpy.context.view_layer.objects.active = o
    o.select_set(True); bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); o.select_set(False)
    return finish(o, mat, outline, smooth=True, bevel=bevel)


def cyl(name, r, h, mat, loc=(0, 0, 0), rot=(0, 0, 0), segs=40, outline=0.14, r2=None):
    o = lathe(name, [(0.0001, 0), (r, 0), (r2 if r2 is not None else r, h), (0.0001, h)], mat, segs, outline)
    o.location = loc; o.rotation_euler = rot
    return o


def sphere(name, r, mat, loc=(0, 0, 0), scale=(1, 1, 1), outline=0.12, segs=32):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=segs // 2, radius=r); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.location = loc; o.scale = scale
    return finish(o, mat, outline)


def tube(name, pts, radius, mat, outline=0.12):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for p, q in zip(sp.points, pts):
        p.co = (q[0], q[1], q[2], 1)
    cu.bevel_depth = radius; cu.bevel_resolution = 6; cu.use_fill_caps = True
    o = link(bpy.data.objects.new(name, cu))
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.convert(target='MESH'); o.select_set(False)
    return finish(o, mat, outline)


def smooth_curve(pts, n=8):
    """Catmull-Rom through points, for bent pipes and handles"""
    out = []
    P = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = map(Vector, P[i - 1:i + 3])
        for k in range(n):
            t = k / n
            out.append(tuple(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)))
    out.append(tuple(pts[-1]))
    return out


def soft(prof, n=6):
    """smooth a lathe profile through its points"""
    pts = [(r, 0, z) for r, z in prof]
    return [(max(0.0001, p[0]), p[2]) for p in smooth_curve(pts, n)]


def render(name, width_px, tilt=14, pad=0.06, yaw=0):
    """frame everything in the scene from the front, tilted down `tilt` degrees, and write OUT/name.webp"""
    sc = bpy.context.scene
    cam = sc.camera
    rx = math.radians(90 - tilt); rz = math.radians(yaw)
    cam.rotation_euler = (rx, 0, rz)
    bpy.context.view_layer.update()
    # project all mesh vertices onto the camera plane to find the frame
    mw = cam.matrix_world.inverted()
    xs, ys = [], []
    dg = bpy.context.evaluated_depsgraph_get()
    for o in sc.objects:
        if o.type != 'MESH':
            continue
        oe = o.evaluated_get(dg); me = oe.to_mesh()
        for v in me.vertices:
            p = mw @ (oe.matrix_world @ v.co); xs.append(p.x); ys.append(p.y)
        oe.to_mesh_clear()
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    w *= 1 + pad * 2; h *= 1 + pad * 2
    cam.data.ortho_scale = max(w, h)
    px = width_px * RES
    sc.render.resolution_x = int(px) if w >= h else max(8, int(px * w / h))
    sc.render.resolution_y = max(8, int(px * h / w)) if w >= h else int(px)
    # move the camera so the frame centre is in the middle
    off = cam.matrix_world.to_3x3() @ Vector((cx, cy, 0))
    cam.location = cam.location + off - cam.matrix_world.to_3x3() @ Vector((0, 0, -60))
    sc.render.filepath = os.path.join(OUT, name + '.webp')
    bpy.ops.render.render(write_still=True)
    print('rendered', name, sc.render.resolution_x, 'x', sc.render.resolution_y)


def job(name):
    def deco(fn):
        JOBS.append((name, fn))
        return fn
    return deco


JOBS = []
STEEL = '#9aa6ad'; CHROME = '#b4bec5'; DARK = '#2d2827'; WALNUT = '#7a4426'; PAPER = '#f8f3ea'; BLUSH = '#e8968c'

# ---------------------------------------------------------------- equipment
def portafilter(state):
    reset()
    st = toon('steel', STEEL, 'metal')
    # basket and ring (seen from above at an angle)
    lathe('ring', [(0.1, -0.2), (2.9, -0.2), (3.15, 0.5), (3.25, 1.6), (3.0, 1.75), (2.7, 1.3), (2.6, 0.2)], st, cap_top=False)
    for a in (0, math.pi):  # lugs
        box('lug', (0.9, 0.5, 0.5), st, loc=(3.0 * math.cos(a + math.pi / 2), 3.0 * math.sin(a + math.pi / 2), 1.3), bevel=0.1)
    if state != 'empty':
        g = toon('grounds', '#5b3423' if state == 'ground' else '#3e2318')
        top = 1.45 if state == 'ground' else 1.05
        if state == 'ground':
            lathe('pile', [(0.0001, 0.3), (2.6, 0.3), (2.55, 1.2), (1.6, 1.6), (0.0001, 1.75)], g, outline=0.03)
        else:
            lathe('puck', [(0.0001, 0.3), (2.6, 0.3), (2.6, top), (0.0001, top)], g, outline=0.03)
    else:
        lathe('basket', [(0.0001, 0.35), (2.55, 0.35), (2.6, 1.3)], toon('basket', '#7f8b92', 'metal'), outline=0.02, cap_top=False)
    # neck and the walnut handle out to the right
    cyl('neck', 0.55, 2.2, st, loc=(2.8, 0, 0.7), rot=(0, math.radians(90), 0))
    lathe('handle', [(0.0001, 0), (0.75, 0), (0.85, 1.2), (0.95, 5.5), (0.85, 7.4), (0.0001, 7.6)], toon('walnut', WALNUT, 'gloss'),
          loc=(4.8, 0, 0.75)).rotation_euler = (0, math.radians(90), 0)
    cyl('spout', 0.45, 1.0, st, loc=(0, 0, -1.1))
    render('pf-' + state, 260, tilt=48)


for s in ('empty', 'ground', 'tamped'):
    job('pf-' + s)(lambda s=s: portafilter(s))


@job('tamper')
def tamper():
    reset()
    st = toon('steel', CHROME, 'metal')
    lathe('base', [(0.0001, 0), (2.9, 0), (2.95, 1.2), (2.6, 1.5), (0.8, 1.7), (0.0001, 1.7)], st)
    cyl('shaft', 0.6, 2.2, st, loc=(0, 0, 1.5))
    lathe('knob', soft([(0.0001, 3.4), (0.7, 3.45), (1.3, 3.9), (1.75, 4.8), (1.85, 5.6), (1.55, 6.5), (0.9, 7.0), (0.0001, 7.1)]), toon('walnut', WALNUT, 'gloss'), segs=56)
    render('tamper', 110, tilt=12)


def pitcher(state):
    reset()
    st = toon('steel', CHROME, 'metal')
    prof = [(0.0001, 0), (3.3, 0), (3.5, 0.3), (3.45, 3.0), (3.0, 6.0), (2.75, 7.6), (2.9, 8.0)]
    o = lathe('body', prof, st, cap_top=False, segs=56)
    # pull the rim out into a spout on the left
    for v in o.data.vertices:
        if v.co.z > 6.5 and v.co.x < -1.5:
            k = (v.co.z - 6.5) / 1.5 * max(0, (-v.co.x - 1.5) / 1.4)
            v.co.x -= 1.4 * k; v.co.z += 0.5 * k
    lathe('inner', [(0.0001, 2.0), (2.6, 2.0), (2.6, 7.7)], toon('inner', '#7f8b92', 'metal'), outline=0, cap_top=False)
    if state != 'empty':
        top = 6.2 if state == 'milk' else 7.0
        lathe('milk', [(0.0001, 2.0), (2.85, 2.0), (2.85, top), (0.0001, top + (0.25 if state == 'foam' else 0))],
              toon('milk', '#f6ecdc' if state == 'milk' else '#fffaf0', 'gloss'), outline=0)
    handle = smooth_curve([(3.2, 0, 6.6), (5.4, 0, 6.2), (5.6, 0, 3.6), (3.4, 0, 1.6)], 6)
    tube('handle', handle, 0.42, st)
    render('pitcher-' + state, 170, tilt=22)


for s in ('empty', 'milk', 'foam'):
    job('pitcher-' + s)(lambda s=s: pitcher(s))


def paper_cup(name, h, r_top, r_bot, z0=0.0, sleeve=True, outline=0.05):
    c = toon('paper', PAPER, 'gloss')
    lathe(name, [(0.0001, z0), (r_bot, z0), (r_top, z0 + h), (r_top + 0.18, z0 + h + 0.08), (r_top - 0.05, z0 + h + 0.12)], c, cap_top=False, outline=outline)
    lathe(name + 'in', [(r_top - 0.08, z0 + h), (r_bot - 0.1, z0 + 0.4), (0.0001, z0 + 0.4)], toon('cupin', '#e9e2d8'), outline=0, cap_top=False)
    if sleeve:
        a, b = z0 + h * 0.32, z0 + h * 0.66
        ra = r_bot + (r_top - r_bot) * 0.32 + 0.08; rb = r_bot + (r_top - r_bot) * 0.66 + 0.08
        lathe(name + 'sl', [(ra, a), (rb, b)], toon('kraft', '#b88a5c'), outline=0.1, cap_top=False, cap_bot=False)
        # corrugated sleeve ribs and the café's pink band
        for j in range(1, 6):
            zz = a + (b - a) * j / 6; rr = ra + (rb - ra) * j / 6 + 0.02
            lathe(name + 'rib%d' % j, [(rr, zz - 0.05), (rr, zz + 0.05)], toon('kraftd', '#94673f'), outline=0, cap_top=False, cap_bot=False)
        za, zb = z0 + h * 0.74, z0 + h * 0.82
        lathe(name + 'band', [(r_bot + (r_top - r_bot) * 0.74 + 0.03, za), (r_bot + (r_top - r_bot) * 0.82 + 0.03, zb)],
              toon('blush', BLUSH), outline=0, cap_top=False, cap_bot=False)


CUPS = {'S': (5.6, 2.8, 2.1), 'M': (7.0, 3.1, 2.25), 'L': (8.4, 3.4, 2.4)}


def cup_stack(sz):
    reset()
    h, rt, rb = CUPS[sz]
    for i in range(3):
        paper_cup('c%d' % i, h, rt, rb, z0=i * 0.9, sleeve=(i == 0))
    render('cup-' + sz, {'S': 84, 'M': 96, 'L': 108}[sz], tilt=20)


for sz in CUPS:
    job('cup-' + sz)(lambda sz=sz: cup_stack(sz))


MILK_CAP = {'whole': '#4f9ec8', 'oat': '#d9b45a', 'almond': '#b5754b'}
MILK_COL = {'whole': '#fbf8f2', 'oat': '#efe0c0', 'almond': '#f5e9da'}


def milk_bottle(k):
    reset()
    prof = [(0.0001, 0), (2.2, 0), (2.4, 0.4), (2.4, 6.0), (1.6, 8.0), (1.1, 8.8), (1.1, 9.6)]
    lathe('milk', [(0.0001, 0.15), (2.25, 0.15), (2.25, 5.9), (1.5, 7.8), (0.0001, 7.8)], toon('m' + k, MILK_COL[k], 'gloss'), outline=0)
    lathe('glass', prof, toon('glass', '#dfeef2', 'glass', alpha=0.35), outline=0.05, cap_top=False)
    lathe('label', [(2.46, 2.0), (2.46, 4.6)], toon('label', '#fffaf3'), outline=0.03, cap_top=False, cap_bot=False)
    lathe('stripe', [(2.48, 3.0), (2.48, 3.6)], toon('cap' + k, MILK_CAP[k]), outline=0, cap_top=False, cap_bot=False)
    cyl('cap', 1.25, 0.9, toon('cap' + k, MILK_CAP[k], 'gloss'), loc=(0, 0, 9.4))
    render('milk-' + k, 76, tilt=12)


for k in MILK_CAP:
    job('milk-' + k)(lambda k=k: milk_bottle(k))


SYRUP = {'vanilla': '#f3e2a8', 'caramel': '#d9964a', 'hazelnut': '#a9714a'}
SYRUP_DEEP = {'vanilla': '#ecc764', 'caramel': '#c46a22', 'hazelnut': '#7a4526'}


def syrup_bottle(k):
    reset()
    # a square glass bottle with rounded edges, the syrup filling most of it, a plain paper label
    box('glass', (4.0, 4.0, 10.0), toon('glass', '#e6f1f3', 'glass', alpha=0.06), loc=(0, 0, 5.0), bevel=0.9, outline=0.16)
    box('syrup', (3.7, 3.7, 8.4), toon('s' + k, SYRUP_DEEP[k], 'gloss'), loc=(0, 0, 4.4), bevel=0.75, outline=0)
    box('label', (4.08, 4.08, 3.2), toon('label', '#fffaf3'), loc=(0, 0, 4.4), bevel=0.75, outline=0.08)
    box('lstripe', (4.12, 4.12, 0.55), toon('s' + k, SYRUP_DEEP[k], 'gloss'), loc=(0, 0, 5.4), bevel=0.75, outline=0)
    box('lstripe2', (4.12, 4.12, 0.25), toon('s' + k, SYRUP_DEEP[k], 'gloss'), loc=(0, 0, 3.3), bevel=0.75, outline=0)
    cyl('neck', 0.9, 1.6, toon('glass', '#e6f1f3', 'glass', alpha=0.06), loc=(0, 0, 10.0))
    blk = toon('pump', '#2a2523', 'gloss')
    cyl('collar', 1.25, 1.0, blk, loc=(0, 0, 10.8))
    cyl('stem', 0.35, 2.0, toon('steel', CHROME, 'metal'), loc=(0, 0, 11.8))
    cyl('head', 0.95, 1.1, blk, loc=(0, 0, 13.4))
    box('nozzle', (2.6, 0.8, 0.6), blk, loc=(-1.4, 0, 14.0), bevel=0.2)
    render('syrup-' + k, 92, tilt=12, yaw=-24)


for k in SYRUP:
    job('syrup-' + k)(lambda k=k: syrup_bottle(k))


@job('top-whip')
def whip():
    reset()
    st = toon('steel', CHROME, 'metal')
    lathe('can', [(0.0001, 0), (2.2, 0), (2.3, 0.4), (2.3, 7.6), (1.6, 8.6), (0.6, 8.9)], st)
    lathe('head', [(0.0001, 8.8), (1.1, 8.8), (1.0, 10.0), (0.0001, 10.1)], toon('pump', '#2a2523', 'gloss'))
    lathe('noz', [(0.0001, 10.0), (0.5, 10.0), (0.35, 11.6), (0.0001, 11.7)], toon('white', '#fffaf3', 'gloss'), loc=(0.4, 0, 0))
    lathe('band', [(2.36, 3.0), (2.36, 4.6)], toon('blush', BLUSH), outline=0.03, cap_top=False, cap_bot=False)
    render('top-whip', 70, tilt=12)


def shaker(name, powder):
    reset()
    lathe('jar', [(0.0001, 0), (2.0, 0), (2.1, 0.3), (2.1, 5.0)], toon('glass', '#e6f1f3', 'glass', alpha=0.3), cap_top=False)
    lathe('powder', [(0.0001, 0.2), (1.95, 0.2), (1.95, 3.6), (1.2, 4.0), (0.0001, 4.1)], toon(name, powder), outline=0)
    lathe('cap', [(2.15, 4.8), (2.2, 6.0), (1.8, 6.9), (0.0001, 7.1)], toon('steel', CHROME, 'metal'))
    dots = toon('holes', '#2a2523')
    for i in range(7):
        a = i / 7 * 2 * math.pi
        sphere('h', 0.16, dots, loc=(0.9 * math.cos(a), 0.9 * math.sin(a), 6.95 - 0.05), outline=0, segs=8)
    sphere('h', 0.16, dots, loc=(0, 0, 7.1), outline=0, segs=8)
    render('top-' + name, 66, tilt=26)


job('top-cocoa')(lambda: shaker('cocoa', '#6b3b26'))
job('top-cinnamon')(lambda: shaker('cinnamon', '#b5652e'))


@job('hopper')
def hopper():
    reset()
    random.seed(4)
    bean = toon('bean', '#6b3d26')
    beans = []
    for i in range(420):
        z = random.uniform(0.5, 6.4); r = 1.2 + (z / 9.0) * 3.2 - 0.45
        a = random.uniform(0, 2 * math.pi); d = math.sqrt(random.random()) * r
        o = sphere('b', 0.42, bean, loc=(d * math.cos(a), d * math.sin(a), z), scale=(1, 0.75, 0.55), outline=0.04, segs=10)
        o.rotation_euler = (random.uniform(0, 3), random.uniform(0, 3), random.uniform(0, 3))
    lathe('glass', [(0.0001, 0), (1.2, 0), (4.4, 9.0), (4.5, 9.2)], toon('hopglass', '#e6f1f3', 'glass', alpha=0.02, edge=0.22), cap_top=False, segs=56)
    lathe('lid', [(4.7, 9.2), (4.7, 9.9), (4.2, 10.4), (0.6, 10.7), (0.0001, 10.7)], toon('lid', '#2d2827', 'gloss'))
    cyl('throat', 1.4, 1.2, toon('steel', STEEL, 'metal'), loc=(0, 0, -1.1))
    render('hopper', 170, tilt=8)


@job('knockbox')
def knockbox():
    reset()
    rub = toon('rubber', '#2d2827', 'gloss')
    box('box', (8.0, 6.0, 6.0), rub, loc=(0, 0, 3.0), bevel=1.1)
    box('hole', (6.4, 4.4, 0.4), toon('dark', '#140f0e'), loc=(0, 0, 5.95), bevel=0.5, outline=0)
    g = toon('puck', '#5b3423')
    for i, (x, y, rx) in enumerate(((-1.7, 0.6, 0.35), (0.3, -0.5, -0.25), (2.0, 0.7, 0.15))):
        cyl('puck%d' % i, 1.35, 0.75, g, loc=(x, y, 5.45), rot=(rx, 0.25 * (i - 1), 0), outline=0.08)
    # the knock bar: a rubber-sleeved steel bar across the box
    cyl('bar', 0.55, 7.6, toon('barsleeve', '#3d3634', 'gloss'), loc=(-3.8, 0, 6.3), rot=(0, math.radians(90), 0), outline=0.1)
    for x in (-3.9, 3.9):
        box('post', (0.5, 1.2, 1.2), toon('steel', STEEL, 'metal'), loc=(x, 0, 6.2), bevel=0.15, outline=0.08)
    render('knockbox', 140, tilt=40)


def trash_bin(part):
    """the pedal bin in two renders, so the game can flip the lid open when something goes in"""
    reset()
    st = toon('steel', STEEL, 'metal')
    if part == 'can':
        lathe('can', [(0.0001, 0), (3.6, 0), (3.8, 0.4), (4.0, 10.0)], st, cap_top=False)
        lathe('inside', [(0.0001, 1.0), (3.75, 1.0), (3.95, 9.9)], toon('dark', '#2d2827'), outline=0, cap_top=False)
        box('pedal', (2.6, 1.6, 0.5), toon('pedal', '#2d2827'), loc=(0, -4.0, 0.5), bevel=0.2)
        lathe('ring', [(4.05, 1.2), (4.05, 1.8)], toon('rubber', '#2d2827'), outline=0.08, cap_top=False, cap_bot=False)
        render('bin', 58, tilt=14)
    else:
        lathe('lid', soft([(0.0001, 11.9), (2.0, 11.8), (3.6, 11.4), (4.15, 10.8), (4.15, 10.0)]), toon('lid', CHROME, 'metal'), segs=56)
        render('binlid', 62, tilt=14)


job('bin')(lambda: trash_bin('can'))
job('binlid')(lambda: trash_bin('lid'))


@job('bell')
def bell():
    reset()
    brass = toon('brass', '#e0a52c', 'metal')
    lathe('base', [(0.0001, 0), (3.4, 0), (3.5, 0.5), (3.2, 0.9), (0.0001, 0.9)], toon('base', '#2d2827', 'gloss'))
    lathe('dome', [(3.0, 0.9), (2.9, 1.6), (2.2, 3.2), (1.0, 3.9), (0.0001, 4.0)], brass)
    cyl('stem', 0.3, 0.8, toon('steel', CHROME, 'metal'), loc=(0, 0, 3.9))
    sphere('btn', 0.65, toon('steel', CHROME, 'metal'), loc=(0, 0, 4.9), scale=(1, 1, 0.6))
    render('bell', 100, tilt=16)


@job('grouphead')
def grouphead():
    reset()
    st = toon('chrome', CHROME, 'metal')
    box('plate', (7.0, 0.6, 4.2), toon('steel', STEEL, 'metal'), loc=(0, 2.2, 3.6), bevel=0.25)
    lathe('dome', soft([(0.0001, 5.6), (1.2, 5.55), (2.0, 5.0), (2.3, 4.2), (2.35, 3.2)]), st, segs=56)
    lathe('body', soft([(2.35, 3.2), (2.6, 2.9), (2.7, 1.9), (3.1, 1.5), (3.2, 0.6), (2.9, 0.15), (2.4, 0.0)]), st, segs=56, cap_top=False)
    lathe('gasket', [(2.4, -0.12), (2.4, 0.04)], toon('rubber', '#2d2827'), outline=0.04, cap_top=False, cap_bot=False)
    for a in (0, math.pi):  # bayonet ears
        box('ear', (1.2, 0.8, 0.5), st, loc=(3.1 * math.cos(a), 3.1 * math.sin(a) * 0.3, 0.6), bevel=0.15, outline=0.1)
    cyl('lever', 0.3, 3.6, toon('knob', '#2d2827', 'gloss'), loc=(2.0, -0.6, 5.0), rot=(0, math.radians(70), 0), outline=0.08)
    sphere('leverball', 0.6, toon('knob', '#2d2827', 'gloss'), loc=(5.4, -0.6, 6.2), outline=0.08)
    render('grouphead', 150, tilt=10)


@job('wand')
def wand():
    reset()
    st = toon('chrome', CHROME, 'metal')
    pts = smooth_curve([(0, 0, 12), (0.6, 0, 10.5), (1.0, -0.4, 6.5), (1.2, -0.6, 0.6)], 8)
    tube('pipe', pts, 0.32, st)
    lathe('tip', [(0.0001, -0.4), (0.36, -0.2), (0.4, 0.6)], st, loc=(1.2, -0.6, 0), cap_top=False)
    cyl('valve', 0.9, 1.8, toon('steel', STEEL, 'metal'), loc=(0, 0, 11.6))
    box('lever', (0.6, 0.6, 2.8), toon('knob', '#2d2827', 'gloss'), loc=(0, -0.4, 13.8), bevel=0.25, rot=(math.radians(-25), 0, 0))
    render('wand', 64, tilt=8)


@job('hotwater')
def hotwater():
    reset()
    st = toon('chrome', CHROME, 'metal')
    pts = smooth_curve([(0, 0, 6), (0.2, 0, 4), (0.6, -0.3, 1.2), (0.7, -0.4, 0)], 6)
    tube('pipe', pts, 0.36, st)
    cyl('valve', 0.85, 1.4, toon('steel', STEEL, 'metal'), loc=(0, 0, 5.8))
    lathe('knob', [(0.0001, 7.2), (1.0, 7.2), (1.1, 7.8), (0.0001, 8.0)], toon('knob', '#2d2827', 'gloss'))
    render('hotwater', 40, tilt=8)


@job('warmer')
def cup_warmer():
    reset()
    cer = toon('ceramic', '#fbf8f3', 'gloss'); pink = toon('pink', BLUSH, 'gloss')
    box('rail', (40, 6, 0.6), toon('steel', STEEL, 'metal'), loc=(0, 0, 0), bevel=0.2)
    for i, x in enumerate((-15, -9, -3, 3, 9, 15)):
        m = pink if i in (2, 4) else cer
        lathe('cup', [(0.0001, 3.4), (1.5, 3.4), (2.4, 0.3), (2.0, 0.3)], m, loc=(x, 0, 0), cap_bot=False)
        lathe('cup2', [(0.0001, 6.4), (1.4, 6.4), (2.2, 3.6), (1.8, 3.6)], m, loc=(x + 3, 0.5, 0), cap_bot=False) if i in (1, 3) else None
    render('warmer', 360, tilt=10)


@job('gauge')
def gauges():
    reset()
    st = toon('chrome', CHROME, 'metal')
    face = toon('face', '#fffdf8')
    red = toon('red', '#e8968c'); tick = toon('tick', '#4b2e2b')
    for gx in (0,):
        lathe('bezel', [(0.0001, 0), (2.9, 0), (3.0, 0.5), (2.6, 0.8), (2.4, 0.7)], st, loc=(gx, 0, 0)).rotation_euler = (math.radians(90), 0, 0)
        cyl('face', 2.45, 0.2, face, loc=(gx, -0.55, 0), rot=(math.radians(90), 0, 0), outline=0)
        for i in range(9):
            a = math.radians(-135 + i * 33.75)
            box('t', (0.14, 0.1, 0.5), red if i >= 6 else tick, loc=(gx + 1.9 * math.sin(a), -0.8, 1.9 * math.cos(a)), bevel=0, outline=0, rot=(0, -a, 0))
    render('gauge', 48, tilt=0)  # the needle is drawn by CSS on top


# ---------------------------------------------------------------- customers (issue #9)
# Customers are rendered as grey layers that the game tints per customer (skin, hair, clothes) and stacks:
# hair-back, torso, collar, skin, scarf, beard, hair-front, hat, pom. The face (eyes, brows, mouth) is drawn
# on top in the canvas so it can blink and change with the mood. 1 Blender unit = 10 canvas px; the head is
# centred at canvas (0, -118) -> (x 0, z 11.8). Every layer uses the same fixed frame: canvas x -80..80, y -185..55.
FRAME = (0.0, 6.5, 24.0)    # centre x, centre z, ortho height
WHITE = '#ffffff'


def holdout_head():
    """an invisible head that hides whatever is behind it: the inside of hair caps and hats, the back of collars"""
    m = bpy.data.materials.new('holdout'); m.use_nodes = True
    N = m.node_tree.nodes
    for n in list(N):
        N.remove(n)
    out = N.new('ShaderNodeOutputMaterial'); h = N.new('ShaderNodeHoldout')
    m.node_tree.links.new(h.outputs[0], out.inputs[0])
    o = sphere('holdout', 1.0, m, loc=(0, 0, 11.8), scale=(3.78, 3.58, 4.08), outline=0, segs=48)
    cyl('holdneck', 1.22, 3.6, m, loc=(0, 0.3, 6.6), outline=0)
    return o


def render_fixed(name, res=2.5, hold=True):
    sc = bpy.context.scene; cam = sc.camera
    if hold:
        holdout_head()
    cam.rotation_euler = (math.radians(90), 0, 0)
    cam.location = (FRAME[0], -60, FRAME[1])
    cam.data.ortho_scale = FRAME[2]
    sc.render.resolution_x = int(160 * res); sc.render.resolution_y = int(240 * res)
    sc.render.filepath = os.path.join(OUT, name + '.webp')
    bpy.ops.render.render(write_still=True)
    print('rendered', name, sc.render.resolution_x, 'x', sc.render.resolution_y)


def keep(o, test, edge=None):
    """delete the faces of a sphere-based mesh whose centre fails test(x, y, z) (cuts hair and hats out of spheres).
    edge(x, y) -> z, when given, slides the cut's border vertices along the surface onto that line, so the
    hairline or hat rim is a clean curve instead of a staircase of faces."""
    bm = bmesh.new(); bm.from_mesh(o.data)
    mw = o.matrix_world; mi = mw.inverted()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not test(*(mw @ f.calc_center_median()))], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    if edge:
        for v in bm.verts:
            if not v.is_boundary:
                continue
            for _ in range(3):
                w = mw @ v.co
                tz = (mi @ Vector((w.x, w.y, edge(w.x, w.y)))).z
                tz = max(-0.999, min(0.999, tz))
                rxy = math.hypot(v.co.x, v.co.y) or 1e-6
                k = math.sqrt(max(0.0, 1 - tz * tz)) / rxy
                v.co = Vector((v.co.x * k, v.co.y * k, tz))
    bm.to_mesh(o.data); bm.free()


def shell(o, t):
    so = o.modifiers.new('thick', 'SOLIDIFY'); so.thickness = t; so.offset = 1
    o.modifiers.move(len(o.modifiers) - 1, 0)   # thickness before the outline hull


def head_sphere(name, mat, grow=0.0, outline=0.14):
    o = sphere(name, 1.0, mat, loc=(0, 0, 11.8), scale=(3.8 + grow, 3.6 + grow, 4.1 + grow), outline=outline, segs=96)
    bpy.context.view_layer.update()
    return o


def hairline_z(x, y):
    # high on the forehead, down at the temples, low at the back of the head
    zf = 13.4 - 0.11 * x * x
    if y < -1.2:
        return zf
    if y > 1.2:
        return 9.0
    k = (y + 1.2) / 2.4
    return zf + (9.0 - zf) * k


def hairline(x, y, z):
    return z > hairline_z(x, y)


def hair_job(style):
    def fn():
        for part in ('back', 'front'):
            reset()
            h = toon('hair', WHITE, 'gloss')
            made = False
            if part == 'back' and style in ('long', 'straight'):
                low = 6.2 if style == 'long' else 3.0
                o = lathe('hb', soft([(0.0001, 15.4), (3.0, 15.0), (4.4, 12.6), (4.7, 10.0), (4.6, low + 1.2), (4.0, low), (0.0001, low)]), h, segs=48)
                o.location = (0, 1.4, 0); o.scale = (1, 0.55, 1); made = True
            if part == 'back' and style == 'curly':
                for i in range(14):
                    a = math.pi + i / 13 * math.pi
                    sphere('cb', 1.5, h, loc=(4.1 * math.cos(a), 1.6, 11.8 - 4.1 * math.sin(a) * 0.95), outline=0.12, segs=20)
                made = True
            if part == 'front':
                if style in ('short', 'bun', 'long', 'straight'):
                    o = head_sphere('cap', h, grow=0.16, outline=0.1)
                    keep(o, hairline, hairline_z); shell(o, 0.14)
                    # a soft sweep of fringe over the forehead
                    f = sphere('fringe', 1.0, h, loc=(-0.8, -3.0, 14.5), scale=(3.0, 1.0, 1.1), outline=0.12)
                    f.rotation_euler = (math.radians(-20), math.radians(14), 0)
                    made = True
                if style == 'bun':
                    sphere('bun', 1.7, h, loc=(0, 0.8, 16.3), outline=0.14)
                if style == 'straight':
                    for sx in (-1, 1):   # curtains framing the face
                        c = sphere('curtain', 1.0, h, loc=(sx * 3.75, -1.4, 9.8), scale=(0.9, 1.4, 4.3), outline=0.12)
                        c.rotation_euler = (0, math.radians(sx * -6), 0)
                if style == 'curly':
                    for i in range(11):
                        a = math.pi * 1.05 + i / 10 * math.pi * 0.9
                        sphere('c', 1.45, h, loc=(3.7 * math.cos(a), -1.2, 12.3 - 3.9 * math.sin(a)), outline=0.12, segs=20)
                    for x in (-1.8, 0.2, 2.1):
                        sphere('c', 1.5, h, loc=(x, -0.6, 16.1), outline=0.12, segs=20)
                    made = True
            if made:
                render_fixed('cust-hair-%s-%s' % (style, part))
    return fn


for _st in ('short', 'bun', 'long', 'curly', 'straight'):
    job('cust-hair-' + _st)(hair_job(_st))


@job('cust-skin')
def cust_skin():
    reset()
    sk = toon('skin', WHITE, lo=0.8)   # skin is shaded gently so the drawn face reads clearly
    head_sphere('head', sk)
    for sx in (-1, 1):
        sphere('ear', 1.0, sk, loc=(sx * 3.85, 0.2, 11.4), scale=(0.55, 0.45, 0.9), outline=0.12)
    cyl('neck', 1.25, 3.6, sk, loc=(0, 0.3, 6.6), outline=0.12)
    render_fixed('cust-skin', hold=False)


@job('cust-torso')
def cust_torso():
    reset()
    m = toon('shirt', WHITE)
    # chest and shoulders: a turned profile squashed front to back, sloping shoulders into the neck
    o = lathe('torso', soft([(0.0001, -6.0), (4.6, -6.0), (5.0, -1.0), (5.2, 3.0), (4.9, 5.6), (3.6, 7.0), (1.6, 7.6), (0.0001, 7.7)]), m, segs=56)
    o.location = (0, 0.6, 0); o.scale = (1, 0.58, 1)
    for sx in (-1, 1):   # upper arms hanging at the sides, a little apart from the chest
        a = sphere('arm', 1.0, m, loc=(sx * 5.25, 0.5, 1.6), scale=(1.25, 1.35, 5.2), outline=0.14)
        a.rotation_euler = (0, math.radians(sx * 6), 0)
        sphere('shoulder', 1.0, m, loc=(sx * 4.6, 0.5, 5.4), scale=(1.6, 1.5, 1.4), outline=0)
    render_fixed('cust-torso')


@job('cust-collar')
def cust_collar():
    for kind in ('round', 'v'):
        reset()
        m = toon('collar', WHITE)
        if kind == 'round':
            lathe('collar', soft([(1.35, 7.0), (1.75, 6.9), (2.1, 6.5), (2.0, 6.2), (1.4, 6.5)]), m, segs=40).location = (0, 0.3, 0)
        else:
            me = bpy.data.meshes.new('v'); bm = bmesh.new()
            vs = [bm.verts.new(v) for v in ((-1.9, -2.9, 7.1), (1.9, -2.9, 7.1), (0, -3.3, 3.7))]
            bm.faces.new(vs); bm.to_mesh(me); bm.free()
            o = link(bpy.data.objects.new('v', me)); finish(o, m, outline=0.1)
            shell(o, 0.15)
        render_fixed('cust-collar-' + kind)


@job('cust-scarf')
def cust_scarf():
    reset()
    m = toon('scarf', WHITE)
    lathe('wrap', soft([(1.3, 8.2), (2.6, 8.4), (3.0, 7.4), (2.6, 6.3), (1.3, 6.5)]), m, segs=40).location = (0, 0.1, 0)
    box('tail', (1.6, 0.8, 4.2), m, loc=(1.4, -2.6, 4.6), bevel=0.35, rot=(0, math.radians(-8), 0))
    render_fixed('cust-scarf')


@job('cust-beard')
def cust_beard():
    reset()
    o = head_sphere('beard', toon('beard', WHITE, 'gloss'), grow=0.22)
    # a short boxed beard along the jaw, leaving the mouth free
    keep(o, lambda x, y, z: z < 10.3 - 0.06 * x * x and y < -0.4 and not (abs(x) < 1.5 and z > 8.7 and y < -2.5))
    shell(o, 0.22)
    render_fixed('cust-beard')


@job('cust-beanie')
def cust_beanie():
    reset()
    m = toon('hat', WHITE)
    o = head_sphere('dome', m, grow=0.45)
    keep(o, lambda x, y, z: z > 12.4, lambda x, y: 12.4)
    shell(o, 0.2)
    lathe('cuff', soft([(4.25, 12.0), (4.45, 12.4), (4.45, 13.6), (4.2, 13.9)]), m, segs=48)
    render_fixed('cust-hat-beanie')
    reset()
    sphere('pom', 1.0, toon('pom', WHITE), loc=(0, 0, 16.6), outline=0.14)
    render_fixed('cust-hat-pom')


@job('cust-cap')
def cust_cap():
    reset()
    m = toon('cap', WHITE)
    o = head_sphere('crown', m, grow=0.35)
    keep(o, lambda x, y, z: z > 13.0, lambda x, y: 13.0)
    shell(o, 0.2)
    b = sphere('brim', 1.0, m, loc=(-1.6, -3.0, 13.2), scale=(3.6, 2.4, 0.32), outline=0.12)
    b.rotation_euler = (math.radians(-8), 0, math.radians(18))
    sphere('button', 0.4, m, loc=(0, 0, 16.3), outline=0.1)
    render_fixed('cust-hat-cap')


# ---------------------------------------------------------------- recipe shop drinks (issue #21)
@job('icebucket')
def ice_bucket():
    # a brushed steel ice bucket heaped with ice cubes, a steel scoop resting in it
    reset()
    random.seed(7)
    st = toon('steel', CHROME, 'metal')
    # taller than wide, flaring out to a rolled rim: a bucket, not a pot
    lathe('bucket', [(0.0001, 0), (2.9, 0), (3.1, 0.3), (3.9, 6.4), (4.2, 6.7), (4.0, 6.85)], st, cap_top=False, segs=56)
    lathe('inner', [(3.85, 6.7), (3.0, 0.6), (0.0001, 0.6)], toon('inner', '#7f8b92', 'metal'), outline=0, cap_top=False, cap_bot=False)
    lathe('ringa', [(3.33, 1.8), (3.36, 2.1)], toon('steeld', '#6f7b82', 'metal'), outline=0, cap_top=False, cap_bot=False)
    for a in (0, math.pi):  # two little handles
        tube('ear', smooth_curve([(3.8 * math.cos(a), -1.0, 5.6), (4.9 * math.cos(a), 0, 5.4), (3.8 * math.cos(a), 1.0, 5.6)], 5), 0.18, st)
    # a heap of cubes over the rim
    ice = toon('ice', '#e4f4fb', 'glass', alpha=0.85)
    for i in range(44):
        r = math.sqrt(random.uniform(0, 1)) * 3.4; a = random.uniform(0, 2 * math.pi)
        z = 6.0 + random.uniform(0, 0.7) + (3.4 - r) * 0.45
        box('cube', (1.15, 1.15, 1.0), ice, loc=(r * math.cos(a), r * math.sin(a), z), bevel=0.32, outline=0.07,
            rot=(random.uniform(-0.6, 0.6), random.uniform(-0.6, 0.6), random.uniform(0, 3)))
    lathe('scoop', [(0.0001, 0), (1.2, 0), (1.35, 1.6), (1.4, 2.6)], st, cap_top=False, loc=(1.4, -1.2, 7.2)).rotation_euler = (math.radians(70), 0, math.radians(-30))
    tube('scoopgrip', smooth_curve([(2.1, -0.4, 8.0), (3.2, 1.2, 9.2), (4.1, 2.4, 10.2)], 5), 0.32, toon('pump', '#2a2523', 'gloss'))
    render('icebucket', 110, tilt=30)


@job('cocoatin')
def cocoa_tin():
    # a round tin of cocoa powder with its lid off and a spoon in it
    reset()
    tin = toon('tin', '#5b3423', 'gloss')
    lathe('tin', [(0.0001, 0), (2.6, 0), (2.7, 0.3), (2.7, 5.6), (2.55, 5.8)], tin, cap_top=False, segs=56)
    lathe('rim', [(2.55, 5.8), (2.75, 5.9), (2.6, 6.05)], toon('steel', CHROME, 'metal'), outline=0.05, cap_top=False, cap_bot=False)
    lathe('band', [(2.74, 2.0), (2.74, 4.2)], toon('label', '#fffaf3'), outline=0.05, cap_top=False, cap_bot=False)
    lathe('stripe', [(2.76, 2.85), (2.76, 3.35)], toon('blush', BLUSH), outline=0, cap_top=False, cap_bot=False)
    lathe('powder', [(0.0001, 5.1), (2.5, 5.1), (2.45, 5.5), (1.2, 5.75), (0.0001, 5.8)], toon('cocoa', '#6b3b26'), outline=0)
    st = toon('steel', CHROME, 'metal')
    sphere('bowl', 0.8, st, loc=(0.6, -0.4, 5.6), scale=(1, 0.75, 0.35), outline=0.08)
    tube('handle', smooth_curve([(1.2, 0, 5.8), (2.6, 1.0, 7.0), (3.6, 1.8, 8.2)], 4), 0.2, st)
    render('cocoatin', 86, tilt=24)


# ---------------------------------------------------------------- upgrades on show (issue #21)
@job('tipjar')
def tip_jar():
    # a big glass jar with coins and a folded note, a paper "TIPS" tag tied on
    reset()
    random.seed(11)
    lathe('jar', [(0.0001, 0), (2.6, 0), (2.8, 0.4), (2.8, 5.6), (2.3, 6.4), (2.2, 7.0), (2.4, 7.2)], toon('glass', '#e6f1f3', 'glass', alpha=0.28),
          outline=0.08, cap_top=False, segs=56)
    coin = toon('coin', '#e2b23c', 'gloss')
    for i in range(30):
        r = math.sqrt(random.uniform(0, 1)) * 2.2; a = random.uniform(0, 2 * math.pi)
        cyl('coin', 0.55, 0.14, coin, loc=(r * math.cos(a), r * math.sin(a), 0.3 + random.uniform(0, 2.2)),
            rot=(random.uniform(-0.5, 0.5), random.uniform(-0.5, 0.5), 0), segs=20, outline=0.04)
    box('note', (2.2, 0.08, 1.2), toon('note', '#9fd3a8'), loc=(0.4, 0.2, 3.6), bevel=0.04, outline=0.05, rot=(0.2, 0.1, 0.5))
    lathe('band', [(2.82, 3.4), (2.82, 4.6)], toon('label', '#fffaf3'), outline=0.04, cap_top=False, cap_bot=False)
    lathe('stripe', [(2.84, 3.85), (2.84, 4.15)], toon('blush', BLUSH), outline=0, cap_top=False, cap_bot=False)
    render('tipjar', 80, tilt=16)


@job('stool')
def bar_stool():
    # a café bar stool: round walnut seat with a soft blush cushion, steel legs and a foot ring
    reset()
    st = toon('steel', CHROME, 'metal')
    lathe('cushion', soft([(0.0001, 15.2), (3.6, 15.2), (3.9, 15.8), (3.6, 16.6), (0.0001, 16.9)]), toon('blush', BLUSH, 'gloss'), segs=56)
    lathe('seat', [(0.0001, 14.4), (3.8, 14.4), (3.9, 15.3), (0.0001, 15.3)], toon('walnut', WALNUT, 'gloss'), segs=56)
    for i in range(4):
        a = i * math.pi / 2 + math.pi / 4
        tube('leg', [(1.6 * math.cos(a), 1.6 * math.sin(a), 14.4), (3.0 * math.cos(a), 3.0 * math.sin(a), 0)], 0.32, st)
    lathe('ring', [(2.25, 5.2), (2.55, 5.2), (2.55, 5.6), (2.25, 5.6)], st, outline=0.08, cap_top=False, cap_bot=False)
    render('stool', 90, tilt=10)


# ---------------------------------------------------------------- run
if __name__ == '__main__':
    for name, fn in JOBS:
        if ONLY and name not in ONLY:
            continue
        fn()
    print('done ->', OUT)
