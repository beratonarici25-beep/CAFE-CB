"""CAFE C&B (issue #17): the whole café as Blender scenes in style B (tools/blender/style_b.py), rendered to assets/cafe/.

Every picture is shot from the same studio light (warm key from the upper left, cool fill) so the café reads as one place:

  backbar      the wall behind the barista: tiles, two walnut shelves with cups, jars, bags, syrups, cartons, chalk board
  counter-top  marble bar top (tiles sideways), counter-front the walnut panels under it
  machine, grinder, fridge   the bodies of the bench machines (the controls stay HTML on top of them)
  wall, seating  the customer view: brick + windows + shelves, and the tables and plants in front of them

One command rebuilds all of them (needs Blender 4.2+ with a GPU, about 3 minutes):
    blender -b -P tools/blender/cafe.py -- assets/cafe [only1,only2]
"""
import bpy, math, os, sys, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import models as M  # noqa: E402
import style_b as SB  # noqa: E402
from mathutils import Vector  # noqa: E402

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'assets/cafe')
ONLY = set(ARGS[1].split(',')) if len(ARGS) > 1 and ARGS[1] else None
os.makedirs(OUT, exist_ok=True)
JOBS = []


def job(name):
    def deco(fn):
        JOBS.append((name, fn)); return fn
    return deco


# ---------------------------------------------------------------- materials
def mix_mat(name, builder):
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links
    b = N.get('Principled BSDF')
    builder(N, L, b)
    return m


def tex_mat(name, kind, **kw):
    key = ('tex', name)
    if key in SB.PBR:
        return SB.PBR[key]

    def build(N, L, b):
        tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = kw.get('scale', (1, 1, 1))
        mp.inputs['Rotation'].default_value = kw.get('rot', (0, 0, 0))
        L.new(tc.outputs['Object'], mp.inputs[0])
        if kind == 'brick':
            br = N.new('ShaderNodeTexBrick')
            br.inputs['Color1'].default_value = M.srgb(kw['c1']) + (1,); br.inputs['Color2'].default_value = M.srgb(kw['c2']) + (1,)
            br.inputs['Mortar'].default_value = M.srgb(kw['mortar']) + (1,)
            br.inputs['Scale'].default_value = kw.get('bs', 1.0); br.inputs['Mortar Size'].default_value = kw.get('ms', 0.03)
            br.inputs['Bias'].default_value = 0.0; br.inputs['Brick Width'].default_value = kw.get('bw', 0.5)
            br.inputs['Row Height'].default_value = kw.get('bh', 0.25); br.offset = kw.get('off', 0.5)
            nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 6
            mx = N.new('ShaderNodeMixRGB'); mx.blend_type = 'MULTIPLY'; mx.inputs[0].default_value = 0.18
            L.new(mp.outputs[0], br.inputs['Vector']); L.new(mp.outputs[0], nz.inputs['Vector'])
            L.new(br.outputs['Color'], mx.inputs[1]); L.new(nz.outputs['Color'], mx.inputs[2])
            L.new(mx.outputs[0], b.inputs['Base Color'])
            bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = kw.get('bump', 0.5); bump.inputs['Distance'].default_value = 0.05
            L.new(br.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs[0], b.inputs['Normal'])
        elif kind == 'marble':
            # soft ivory with thin winding grey veins: |noise - 0.5| is small along a wandering line
            nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.05; nz.inputs['Detail'].default_value = 4
            nz.inputs['Distortion'].default_value = 0.6
            sb = N.new('ShaderNodeMath'); sb.operation = 'SUBTRACT'; sb.inputs[1].default_value = 0.5
            ab = N.new('ShaderNodeMath'); ab.operation = 'ABSOLUTE'
            rp = N.new('ShaderNodeValToRGB'); rp.color_ramp.interpolation = 'EASE'
            rp.color_ramp.elements[0].position = 0.0; rp.color_ramp.elements[0].color = M.srgb('#cfc6bb') + (1,)
            rp.color_ramp.elements[1].position = 0.03; rp.color_ramp.elements[1].color = M.srgb('#f7f2ea') + (1,)
            e = rp.color_ramp.elements.new(0.3); e.color = M.srgb('#efe8dd') + (1,)
            L.new(mp.outputs[0], nz.inputs['Vector']); L.new(nz.outputs['Fac'], sb.inputs[0]); L.new(sb.outputs[0], ab.inputs[0])
            L.new(ab.outputs[0], rp.inputs[0]); L.new(rp.outputs[0], b.inputs['Base Color'])
            b.inputs['Roughness'].default_value = 0.14; b.inputs['Coat Weight'].default_value = 0.6
        elif kind == 'noisecol':
            nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = kw.get('nscale', 3); nz.inputs['Detail'].default_value = 8
            rp = N.new('ShaderNodeValToRGB')
            rp.color_ramp.elements[0].color = M.srgb(kw['c1']) + (1,); rp.color_ramp.elements[1].color = M.srgb(kw['c2']) + (1,)
            L.new(mp.outputs[0], nz.inputs['Vector']); L.new(nz.outputs['Fac'], rp.inputs[0]); L.new(rp.outputs[0], b.inputs['Base Color'])
        b.inputs['Roughness'].default_value = kw.get('rough', b.inputs['Roughness'].default_value)
    SB.PBR[key] = mix_mat(name, build)
    return SB.PBR[key]


def col(name, hexcol, **kw):
    return SB.pbr(name, hexcol, **kw)


def sky(name='sky', strength=3.0):
    """a bright emissive daylight panel: windows show a soft street, not a hole"""
    def build(N, L, b):
        for n in list(N):
            N.remove(n)
        out = N.new('ShaderNodeOutputMaterial'); em = N.new('ShaderNodeEmission')
        tc = N.new('ShaderNodeTexCoord'); sep = N.new('ShaderNodeSeparateXYZ'); rp = N.new('ShaderNodeValToRGB')
        rp.color_ramp.elements[0].position = 0.0; rp.color_ramp.elements[0].color = M.srgb('#ecdcc0') + (1,)
        rp.color_ramp.elements[1].position = 1.0; rp.color_ramp.elements[1].color = M.srgb('#a9c8d6') + (1,)
        L.new(tc.outputs['Object'], sep.inputs[0]); L.new(sep.outputs['Z'], rp.inputs[0]); L.new(rp.outputs[0], em.inputs[0])
        em.inputs['Strength'].default_value = strength; L.new(em.outputs[0], out.inputs[0])
    return mix_mat(name, build)


# ---------------------------------------------------------------- building blocks (centred boxes, base-anchored cylinders)
def bx(w, d, h, loc, mat, bevel=0.05, rot=(0, 0, 0)):
    """box w (x) by d (y, depth) by h (z); loc is its bottom-centre"""
    return M.box('b', (w, d, h), mat, loc=(loc[0], loc[1], loc[2] + h / 2), bevel=min(bevel, w / 2.2, d / 2.2, h / 2.2), outline=0, rot=rot)


def cy(r, h, loc, mat, r2=None, segs=36):
    return M.cyl('c', r, h, mat, loc=loc, segs=segs, outline=0, r2=r2)


def lt(prof, loc, mat, segs=40, **kw):
    return M.lathe('l', prof, mat, segs=segs, outline=0, loc=loc, **kw)


def ball(r, loc, mat, scale=(1, 1, 1)):
    return M.sphere('s', r, mat, loc=loc, scale=scale, outline=0)


def stage(line=1.2, samples=64):
    """fresh scene in style B; the shadow-catcher floor of style_b stays out (these are walls and counters)"""
    M.reset(); SB.setup()
    sc = bpy.context.scene
    for o in list(bpy.data.objects):
        if o.get('noframe'):
            bpy.data.objects.remove(o)
    sc.render.film_transparent = True
    sc.cycles.samples = samples
    if sc.render.use_freestyle:
        ls = bpy.context.view_layer.freestyle_settings.linesets[0]
        ls.linestyle.thickness = line; ls.linestyle.alpha = 0.55
        ls.select_by_collection = False
    sc.render.line_thickness = line
    sc.render.image_settings.quality = 90
    return sc


def lights(key=2.2, fill=900, x=-30):
    k = bpy.data.objects['key']; k.data.energy = key
    k.rotation_euler = (math.radians(58), math.radians(-28), math.radians(-30))
    for o in bpy.data.objects:
        if o.name.startswith('fill'):
            o.data.energy = fill


def shoot(name, w_px, h_px, width_units, center, tilt=0, dist=120):
    """ortho picture of the world: width_units wide, centred on `center` (x, z at y=0), tilted `tilt` degrees down"""
    sc = bpy.context.scene; cam = sc.camera
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = width_units * max(1.0, h_px / w_px); cam.data.clip_end = 1000; cam.data.clip_start = 0.1
    rx = math.radians(90 - tilt)
    cam.rotation_euler = (rx, 0, 0)
    view = Vector((0, 0, -1)); view.rotate(cam.rotation_euler)
    cam.location = Vector((center[0], 0, center[1])) - view * dist
    sc.render.resolution_x = w_px; sc.render.resolution_y = h_px; sc.render.resolution_percentage = 100
    sc.render.filepath = os.path.join(OUT, name + '.webp')
    bpy.ops.render.render(write_still=True)
    print('rendered', name, w_px, 'x', h_px)


# ---------------------------------------------------------------- things on shelves
def paper_cup(x, y, z, kraft=False, h=3.0):
    body = col('cupwhite', '#fbf7f0', rough=0.45)
    lt([(0.0001, z), (1.35, z), (1.7, z + h), (0.0001, z + h)], (x, y, 0), body, cap_top=False)
    lt([(1.45, z + h * 0.34), (1.62, z + h * 0.74)], (x, y, 0), col('sleeve', '#b88a5c', rough=0.7), cap_top=False, cap_bot=False)


def jar(x, y, z, beans='#5b3423', h=5.0, r=1.7):
    glass = col('jarglass', '#e8f1f3', rough=0.05, trans=1.0)
    lt([(0.0001, z), (r, z), (r, z + h)], (x, y, 0), glass, cap_top=False)
    lt([(0.0001, z + 0.25), (r - 0.12, z + 0.25), (r - 0.12, z + h * 0.78), (0.0001, z + h * 0.82)], (x, y, 0), col('beans', beans, rough=0.55))
    cy(r + 0.06, 0.7, (x, y, z + h), col('lidsteel', '#c9d2d7', metal=1, rough=0.3))


def bag(x, y, z, c='#b88a5c', w=3.4, h=5.2):
    bx(w, 1.5, h, (x, y, z), col('bag' + c, c, rough=0.75), bevel=0.2)
    bx(w * 0.7, 1.55, h * 0.3, (x, y - 0.02, z + h * 0.32), col('baglabel', '#fffaf3', rough=0.6), bevel=0.05)
    bx(w, 0.5, 0.5, (x, y, z + h), col('bagtop', c, rough=0.8), bevel=0.1)


def syrup(x, y, z, c, h=6.4):
    lt([(0.0001, z), (1.15, z), (1.25, z + 0.3), (1.25, z + h * 0.75), (0.5, z + h * 0.95), (0.45, z + h)], (x, y, 0),
       col('syr' + c, c, rough=0.08, coat=0.8, trans=0.5), cap_top=False)
    bx(1.9, 1.6, 1.6, (x, y - 0.1, z + 1.6), col('lab', '#fffaf3', rough=0.5), bevel=0.05).scale.y = 0.2
    cy(0.5, 0.9, (x, y, z + h), col('pump', '#2b2422', rough=0.3, coat=0.5), r2=0.4)
    bx(1.5, 0.35, 0.3, (x + 0.5, y, z + h + 0.65), col('pump', '#2b2422', rough=0.3), bevel=0.08)


def carton(x, y, z, c):
    bx(2.6, 2.4, 4.6, (x, y, z), col('car' + c, c, rough=0.5), bevel=0.12)
    bx(2.4, 1.2, 1.0, (x, y, z + 4.6), col('car' + c, c, rough=0.5), bevel=0.1, rot=(0, 0, 0))
    bx(1.8, 2.45, 1.3, (x, y, z + 1.6), col('carlab', '#fffaf3', rough=0.5), bevel=0.05)


def plant(x, y, z, scale=1.0, c='#5f9c58'):
    """a trailing ivy in a little pot"""
    random.seed(int(x * 7))
    lt([(0.0001, z), (1.1 * scale, z), (1.4 * scale, z + 1.8 * scale), (0.0001, z + 1.8 * scale)], (x, y, 0), col('pot', '#e8968c', rough=0.5, coat=0.4), cap_top=False)
    leaf = col('leaf' + c, c, rough=0.45)
    for i in range(14):
        a = random.uniform(0, 6.28); r = random.uniform(0.3, 1.3) * scale
        ball(0.5 * scale, (x + math.cos(a) * r * 1.2, y + math.sin(a) * 0.3, z + 1.9 * scale + random.uniform(0, 1.1) * scale), leaf, scale=(1, 0.5, 0.8))


# ---------------------------------------------------------------- 1. the wall behind the barista
@job('backbar')
def backbar():
    sc = stage(line=1.3); lights(key=2.4)
    sc.world.node_tree.nodes['Background'].inputs[1].default_value = 1.1
    W, H = 160, 20
    tile = tex_mat('tile', 'brick', c1='#f3ece0', c2='#e7dccb', mortar='#a9988a', bs=1.0, bw=0.9, bh=0.45, ms=0.04, off=0.5, scale=(1, 1, 1), rot=(math.pi / 2, 0, 0), bump=0.6, rough=0.18)
    bx(W + 4, 1, H + 2, (W / 2, 2.6, -1), tile, bevel=0.01)
    wal = col('shelfwood', '#6a3f25', rough=0.35, coat=0.5, wood=True)
    for zz in (11.2, 2.2):
        bx(W, 3.2, 0.8, (W / 2, 0.4, zz - 0.8), wal, bevel=0.15)
        for xx in (14, 56, 100, 146):
            bx(0.5, 1.4, 1.7, (xx, 1.6, zz - 2.5), col('brk', '#2e2a28', rough=0.4), bevel=0.05)
    # upper shelf
    z = 11.2
    for i in range(6):
        cx = 7 + (i % 3) * 3.8 + (1.9 if i >= 3 else 0)
        paper_cup(cx, 0.3, z + (3.1 if i >= 3 else 0), h=3.0)
    for k, x in enumerate((25, 30.6, 36.2)):
        jar(x, 0.6, z, beans=('#5b3423', '#4a2a1c', '#7a4a2c')[k])
    for x in (46, 50.4):
        bag(x, 0.6, z, '#c9a06e')
    for x in (110, 114.4):
        bag(x, 0.6, z, '#d9b45a' if x < 112 else '#8cc7ae')
    for x in (122, 127.6):
        jar(x, 0.6, z, beans='#5b3423')
    for i in range(7):
        paper_cup(137 + (i % 4) * 3.6 + (1.8 if i >= 4 else 0), 0.3, z + (3.1 if i >= 4 else 0), h=3.0)
    # lower shelf
    z = 2.2
    for i, c in enumerate(('#e8968c', '#8cc7ae', '#d9b45a')):
        syrup(5 + i * 3.2, 0.6, z, c)
    for i, c in enumerate(('#4f9ec8', '#4f9ec8', '#d9b45a', '#b5754b')):
        carton(26 + i * 4.8, 0.6, z, c)
    jar(48, 0.6, z, h=4.2)
    bag(100, 0.6, z, '#8cc7ae'); bag(104.6, 0.6, z, '#d9b45a')
    plant(116, 0.6, z, 1.1)
    jar(131, 0.6, z, h=4.2); jar(136.6, 0.6, z, h=4.2)
    plant(150, 0.6, z, 0.9, '#6f9a5c')
    # the chalk menu board in the middle: same place as the SVG it replaces (the writing stays live HTML over it)
    frame = col('boardwood', '#6a3f25', rough=0.35, coat=0.5, wood=True)
    bx(31.6, 1.2, 12.4, (80, -1.0, 7.0), frame, bevel=0.25)
    bx(29.6, 0.5, 11.2, (80, -1.7, 7.6), col('slate', '#303735', rough=0.85), bevel=0.1)
    # a little warm light over the board
    sp = bpy.data.lights.new('boardlamp', 'SPOT'); sp.energy = 900; sp.spot_size = 1.6; sp.spot_blend = 1; sp.color = (1, 0.82, 0.6)
    lo = M.link(bpy.data.objects.new('boardlamp', sp)); lo.location = (80, -30, 24); lo.rotation_euler = (math.radians(75), 0, 0)
    shoot('backbar', 2400, 300, W, (W / 2, H / 2), tilt=6)


# ---------------------------------------------------------------- 2. marble bar top and walnut front (tile sideways)
@job('counter-top')
def counter_top():
    sc = stage(line=0); lights(key=2.0)
    sc.render.use_freestyle = False; sc.view_settings.exposure = 0.7
    W, D = 100, 40
    mar = tex_mat('marbletop', 'marble', scale=(1, 1, 1))
    # the bar top, seen from above: the front lip is a bevelled edge that catches the light
    bx(W, 2.4, D, (W / 2, 1.2, 0), mar, bevel=0.5)
    shoot('counter-top', 1600, 640, W, (W / 2, D / 2), tilt=0)


@job('counter-front')
def counter_front():
    sc = stage(line=0); lights(key=2.0)
    sc.render.use_freestyle = False
    wal = tex_mat('frontwood', 'noisecol', c1='#5a341f', c2='#7e4d2e', scale=(0.5, 1, 6), nscale=2.0, rough=0.38)
    W, H = 18, 10
    bx(W, 1.2, H, (W / 2, 0.6, 0), wal, bevel=0.1)
    # raised panels every 9 units, with a thin shadow gap between them
    for i in range(2):
        x = 4.5 + i * 9
        bx(7.2, 0.5, H - 2.6, (x, -0.1, 1.2), tex_mat('panelwood', 'noisecol', c1='#68402a', c2='#8a5736', scale=(0.5, 1, 6), nscale=2.0, rough=0.32), bevel=0.3)
    bx(W, 1.6, 0.9, (W / 2, -0.2, H - 0.9), tex_mat('lipwood', 'noisecol', c1='#4a2716', c2='#6a3f25', scale=(0.5, 1, 6), nscale=2.0, rough=0.35), bevel=0.2)
    shoot('counter-front', 720, 400, W, (W / 2, H / 2), tilt=0)


# ---------------------------------------------------------------- 3. machine bodies (the controls stay HTML on top)
def brushed():
    return col('brushed', '#cfd7dc', metal=1, rough=0.34, aniso=0.6)


@job('machine')
def machine():
    sc = stage(line=1.3); lights(key=2.4)
    W, H = 30, 42.1
    st = brushed(); en_l = col('enamelL', '#f0a79e', rough=0.3, coat=0.9); en_r = col('enamelR', '#c96f66', rough=0.3, coat=0.9)
    dark = col('trayd', '#6e7a81', metal=1, rough=0.45)
    bx(W, 5, H - 1.2, (W / 2, 0, 0.6), st, bevel=0.9)                       # steel housing
    bx(0.9, 5.2, H - 4, (0.5, -0.1, 1.2), en_l, bevel=0.3)                  # pink side panels
    bx(0.9, 5.2, H - 4, (W - 0.5, -0.1, 1.2), en_r, bevel=0.3)
    bx(W - 1.4, 5.4, 1.1, (W / 2, -0.2, H - 1.6), st, bevel=0.4)            # top plate lip
    # the recessed drip tray under the groups, with a grill along its front
    bx(26.4, 1.2, 17.2, (W / 2, -2.6, 1.2), dark, bevel=0.5)
    for i in range(24):
        bx(0.5, 0.5, 1.8, (2.7 + i * 1.0, -3.4, 1.6), col('grill', '#2e3a40' if i % 2 else '#dfe6e9', metal=1, rough=0.3), bevel=0.1)
    bx(W - 2, 5.2, 0.7, (W / 2, 0, 0), col('foot', '#2b2422', rough=0.7), bevel=0.2)
    shoot('machine', 600, 842, W + 1.2, (W / 2, H / 2), tilt=4)


@job('grinder')
def grinder():
    sc = stage(line=1.2); lights(key=2.4)
    W, H = 17, 11
    dk = col('grinddark', '#3a2523', rough=0.28, coat=0.9)
    bx(W, 5, H, (W / 2, 0, 0), dk, bevel=1.1)
    bx(W - 1.6, 5.2, 0.35, (W / 2, -0.1, H - 0.9), col('trim', '#c9d2d7', metal=1, rough=0.2), bevel=0.1)
    bx(3.0, 3, 1.4, (W / 2, -1.5, -0.3), brushed(), bevel=0.35)
    shoot('grinder', 340, 220, W + 0.4, (W / 2, H / 2), tilt=5)


@job('fridge')
def fridge():
    sc = stage(line=1.2); lights(key=2.4)
    W, H = 20.1, 20.9
    st = col('fridgesteel', '#c9d2d7', metal=1, rough=0.32, aniso=0.6)
    bx(W, 5, H, (W / 2, 0, 0), st, bevel=0.9)
    bx(W - 2.0, 0.6, H - 2.0, (W / 2, -2.6, 1.0), col('inside', '#d6e9ef', rough=0.3), bevel=0.3)
    bx(0.55, 0.7, H - 3.4, (W - 1.3, -3.2, 1.7), st, bevel=0.2)
    shoot('fridge', 402, 418, W + 0.4, (W / 2, H / 2), tilt=3)


# ---------------------------------------------------------------- 4. the customers' side: wall with windows, and the seating
@job('wall')
def wall():
    # shown full-bleed behind the customers (about 1.9:1): windows in the middle, brick with a shelf and a board on the sides
    sc = stage(line=1.5); lights(key=2.2)
    sc.world.node_tree.nodes['Background'].inputs[1].default_value = 1.2
    W, H = 160, 86
    # warm plaster above, sage painted panelling below, a walnut beam under the ceiling: lived-in, but soft and rounded
    conc = tex_mat('plaster', 'noisecol', c1='#e3d3b8', c2='#efe2cb', nscale=1.2, scale=(0.3, 0.3, 0.3), rough=0.85)
    brick = tex_mat('bricks', 'brick', c1='#c0694a', c2='#a8553a', mortar='#e2cfb4', bs=1.0, bw=1.4, bh=0.55, ms=0.06, off=0.5,
                    rot=(math.pi / 2, 0, 0), bump=0.9, rough=0.8)
    bx(W + 4, 1, H + 2, (W / 2, 2.6, -1), conc, bevel=0.01)
    for x0, x1 in ((0, 26), (136, 160)):
        bx(x1 - x0, 1.2, H + 2, ((x0 + x1) / 2, 2.0, -1), brick, bevel=0.01)
    sage = col('sage', '#8fae96', rough=0.5, coat=0.3)
    trim = col('trim', '#f1e6d2', rough=0.4, coat=0.3)
    beam = col('beam', '#6a3f25', rough=0.35, coat=0.5, wood=True)
    F = 19.0   # the floor line: the seating render stands its chairs on it (its z=0 lands here)
    bx(W - 52, 1.0, 17.5, (80, 1.9, F), sage, bevel=0.2)              # wainscot panels
    for xp in range(30, 134, 13):
        bx(11.4, 0.3, 13.0, (xp + 6.5, 1.5, F + 2.2), trim, bevel=0.15)   # raised panel fields: cream frame, sage inset
        bx(9.4, 0.3, 11.0, (xp + 6.5, 1.25, F + 3.2), sage, bevel=0.2)
    bx(W - 50, 1.6, 1.3, (80, 1.5, F + 17.5), trim, bevel=0.3)        # chair rail
    bx(W - 50, 1.6, 2.4, (80, 1.5, F), trim, bevel=0.3)               # skirting board
    bx(W + 4, 3.4, 4.2, (W / 2, 1.2, H - 4.2), beam, bevel=0.5)       # ceiling beam
    for x0 in (32, 82):
        xc, ww, z0, hh = x0 + 22, 44, 40, 40
        bx(ww, 0.4, hh, (xc, 1.6, z0), sky(), bevel=0.01)
        # a pastel little street instead of grey boxes: houses with window dots, a tree on a trunk
        for bxn, (bw, bh, bxo) in enumerate(((11, 22, -16), (14, 32, -4), (12, 17, 9), (9, 26, 17))):
            hc = ('#f2c9b4', '#e9d9a8', '#c9dccb', '#f0b9b2')[bxn]
            bx(bw, 0.5, bh, (xc + bxo, 1.45, z0), col('bld' + str(bxn), hc, rough=0.9), bevel=0.15)
            wd = col('bldw' + str(bxn), '#8fb3c4', rough=0.3, coat=0.5)
            for wi in range(int(bw // 4.5)):
                for wj in range(int((bh - 6) // 6)):
                    bx(2.2, 0.3, 3.0, (xc + bxo - bw / 2 + 3.0 + wi * 4.4, 1.2, z0 + 5.0 + wj * 6.2), wd, bevel=0.2)
        cy(0.7, 7.5, (xc + 12, 1.1, z0), col('trunk', '#6a4a35', rough=0.8))
        ball(5.2, (xc + 12, 1.0, z0 + 11.0), col('tree', '#8fb08a', rough=0.8))
        ball(3.4, (xc + 8.4, 1.0, z0 + 8.4), col('tree2', '#a3c29a', rough=0.8))
        fr = col('frame', '#2a2220', rough=0.45, coat=0.4)
        bx(ww + 1.6, 1.0, 1.0, (xc, 0.9, z0 - 0.5), fr, bevel=0.1); bx(ww + 1.6, 1.0, 1.0, (xc, 0.9, z0 + hh - 0.5), fr, bevel=0.1)
        for xx in (xc - ww / 2, xc, xc + ww / 2):
            bx(1.0 if xx != xc else 0.6, 1.0, hh, (xx, 0.9, z0), fr, bevel=0.1)
        bx(ww, 0.5, 0.45, (xc, 0.9, z0 + hh * 0.55), fr, bevel=0.05)
        bx(ww + 3, 2.4, 1.1, (xc, -0.4, z0 - 1.6), col('sill', '#e7dccb', rough=0.4), bevel=0.2)
    wal = col('wwood', '#6a3f25', rough=0.35, coat=0.5, wood=True)
    for z in (60.0, 48.0):
        bx(21, 2.6, 0.8, (12.5, 0.0, z - 0.8), wal, bevel=0.15)
    jar(6, 0.4, 60.0); jar(11.6, 0.4, 60.0, beans='#4a2a1c'); bag(17, 0.4, 60.0, '#c9a06e'); bag(21.4, 0.4, 60.0, '#8cc7ae')
    for i in range(3):
        paper_cup(6 + i * 3.6, 0.2, 48.0, h=2.6)
    plant(19, 0.4, 48.0, 1.0)
    bx(18, 1.0, 12, (148, 0.0, 44), col('cbwood', '#6a3f25', rough=0.4, coat=0.5, wood=True), bevel=0.25)
    bx(16, 0.5, 10, (148, -0.7, 45), col('slate', '#303735', rough=0.85), bevel=0.1)
    shoot('wall', 2400, 1290, W, (W / 2, H / 2), tilt=0)


@job('seating')
def seating():
    sc = stage(line=1.4); lights(key=2.2)
    W, H = 160, 86
    leather = col('leather', '#9a5a36', rough=0.35, coat=0.6)
    dark = col('legs', '#1f1a19', rough=0.4)
    top = col('tabletop', '#b7814f', rough=0.3, coat=0.5, wood=True)
    # honey oak plank floor under everything, so chairs and tables sit on something and cast soft contact shadows
    planks = tex_mat('floor', 'brick', c1='#c99562', c2='#b98450', mortar='#8f5f38', bs=1.0, bw=9.0, bh=1.4, ms=0.03, off=0.35, bump=0.3, rough=0.4)
    bx(W + 8, 600, 1.0, (W / 2, -296, -1.0), planks, bevel=0.02)
    bx(46, 22, 0.35, (82, -4.5, 0.0), col('rug', '#e8b8a8', rough=0.9), bevel=0.15)
    bx(40, 17, 0.4, (82, -4.5, 0.0), col('rug2', '#f4e3cf', rough=0.9), bevel=0.15)

    def table(x, y):
        cy(0.45, 5.6, (x, y, 0), dark); cy(2.0, 0.5, (x, y, 0), dark)
        cy(4.4, 0.7, (x, y, 5.6), top, segs=48)
        paper_cup(x - 1.3, y, 6.3, h=1.5)
        bx(1.4, 1.4, 1.1, (x + 1.5, y - 0.3, 6.3), col('pinkmug', '#f4b9b2', rough=0.3, coat=0.8), bevel=0.3)

    def chair(x, y, flip=1):
        bx(8.6, 3.4, 1.6, (x, y, 4.2), leather, bevel=0.5)
        bx(8.6, 1.2, 5.4, (x, y + 1.9 * flip, 5.4), leather, bevel=0.6)
        for dx in (-3.6, 3.6):
            bx(0.5, 0.5, 4.2, (x + dx, y, 0), dark, bevel=0.1)

    for tx in (30, 82, 124):
        table(tx, 0.0)
        chair(tx - 10.5, 0.8); chair(tx + 10.5, 0.8)
    for px_, sc_, c in ((6, 1.8, '#4f8a4d'), (149, 2.0, '#5f9c58')):
        lt([(0.0001, 0), (2.4, 0), (3.0, 4.5), (0.0001, 4.5)], (px_, 0, 0), col('bigpot', '#f5efe6', rough=0.4, coat=0.5), cap_top=False)
        random.seed(int(px_))
        leaf = col('mleaf' + c, c, rough=0.4)
        for i in range(16):
            a = random.uniform(-1.1, 1.1); r = random.uniform(0.5, 1.0) * 6 * sc_ / 2
            ball(1.6 * random.uniform(0.8, 1.2), (px_ + math.sin(a) * r, 0.2 + random.uniform(-0.6, 0.6), 4.5 + math.cos(a) * r * 1.5 + random.uniform(0, 1.5)), leaf, scale=(1.0, 0.35, 1.3))
    shoot('seating', 2400, 1290, W, (W / 2, H / 2 - 19), tilt=8)


# ---------------------------------------------------------------- run
if __name__ == '__main__':
    for name, fn in JOBS:
        if ONLY and name not in ONLY:
            continue
        fn()
    print('done ->', OUT)
