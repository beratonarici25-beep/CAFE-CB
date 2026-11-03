"""CAFE C&B: the customers in style B (issue #18): MPFB2 / MakeHuman bodies, real hair, hats, scarves and collars.

Same idea as models.py's customer layers: grey, toon-shaded pieces that the game tints per customer (skin, hair, shirt,
hat) and stacks. The face (eyes, brows, mouth) stays drawn by the game so it can blink and follow the mood.
Two bodies, `m` and `f` (a customer picks one), each with its own layers: assets/models/cust-<layer>-<m|f>.webp.

Layers (all in one fixed frame, canvas x -80..80, y -185..55, like models.py):
  skin, torso (the shirt), collar-round, collar-v, scarf, beard (m), hair-<style>-front/back, hat-beanie, hat-pom, hat-cap

Run:  blender -b -P tools/blender/customers_b.py -- <out dir> <mpfb data dir> [layers] [m,f]
The MPFB2 add-on is not in this repository (see helper_style.py); only its CC0 base mesh and targets are read.
"""
import bpy, bmesh, math, os, sys, random
from mathutils import Vector

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'assets/models')
MPFB = ARGS[1] if len(ARGS) > 1 else ''
ONLY = set(ARGS[2].split(',')) if len(ARGS) > 2 and ARGS[2] else None
GENDERS = ARGS[3].split(',') if len(ARGS) > 3 else ['f', 'm']
RES = float(os.environ.get('RES', '2.5'))

os.environ['HELPER_NO_BUILD'] = '1'
sys.argv = [sys.argv[0], '--', OUT, MPFB]
import importlib.util
spec = importlib.util.spec_from_file_location('helper_style', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'helper_style.py'))
HS = importlib.util.module_from_spec(spec); spec.loader.exec_module(HS)
M = HS.M
toon, tube, smooth_curve, lathe, link = M.toon, M.tube, M.smooth_curve, M.lathe, M.link


def bake(o):
    """apply the object's scale to its mesh, so outline and shell thicknesses (local units) are real thicknesses"""
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); o.select_set(False)
    return o


def sphere(*a, **k):
    return bake(M.sphere(*a, **k))

WHITE = '#ffffff'
HEAD_HALF_W = 3.85          # the head's half width in game units (1 unit = 10 canvas px), like models.py
EYE_Z = 11.3                # where the eyes are drawn: canvas y -113
FRAME = (0.0, 6.5, 24.0)    # centre x, centre z, ortho height (game units)

S = 1.0                     # game units per body unit (set per body)
H = None
BODY = None
SIDES = (-1, 1)


# ---------------------------------------------------------------- scene and body
def setup(male):
    global S, H, BODY, _BVH
    _BVH = None
    M.reset()
    HS.CUSTOMER = {'male': male}
    k = {'v': 1.0}
    orig = M.finish

    def finish(o, mat, outline=0.16, **kw):          # outlines are drawn in body units: thicker than in the game's units
        return orig(o, mat, outline=outline * k['v'], **kw)
    M.finish = finish; HS.finish = finish
    H = HS.body_B()
    S = HEAD_HALF_W / H['rx']
    print('H', {k: round(v, 2) for k, v in H.items()}, 'S', S)
    k['v'] = 1.0 / S
    BODY = HS.BODYOBJ
    BODY.data.materials.append(M.ink_mat())
    BODY.modifiers['sub'].levels = 2; BODY.modifiers['sub'].render_levels = 2
    # rebuild the outline with the new thickness
    BODY.modifiers['outline'].thickness = 0.14 / S
    # no outline over the face: the base mesh has pockets for the eyes and mouth that the game covers with its own face
    vg = BODY.vertex_groups.new(name='nohull')
    for v in BODY.data.vertices:
        x, y, z = v.co
        dx = max(0.0, abs(x) - 5.6); dz = max(0.0, H['mz'] - 3.2 - z, z - (H['eye_z'] + 3.4)); dy = max(0.0, y - (H['nose_y'] + 8.0))
        vg.add([v.index], min(1.0, math.hypot(dx, dz, dy) / 0.8), 'REPLACE')
    BODY.modifiers['outline'].vertex_group = 'nohull'; BODY.modifiers['outline'].thickness_vertex_group = 0.0
    mats = {}
    for mode in ('skin', 'shirt'):
        mats[mode] = HS.body_mat(*HS.MATARGS, mode=mode)
        mats[mode + '-ink'] = HS.body_mat(*HS.MATARGS, mode=mode + '-ink')
        mats[mode + '-ink'].use_backface_culling = True; mats[mode + '-ink'].use_backface_culling_shadow = True
    hold = bpy.data.materials.new('holdout'); hold.use_nodes = True
    N = hold.node_tree.nodes
    for n in list(N):
        N.remove(n)
    out = N.new('ShaderNodeOutputMaterial'); ho = N.new('ShaderNodeHoldout'); hold.node_tree.links.new(ho.outputs[0], out.inputs[0])
    mats['hold'] = hold
    return mats


def body_as(mats, kind):
    """kind: skin | shirt | hold (an invisible body that hides whatever is behind it)"""
    me = BODY.data
    me.materials.clear()
    if kind == 'hold':
        me.materials.append(mats['hold']); me.materials.append(mats['hold'])
        BODY.modifiers['outline'].show_render = False
    else:
        me.materials.append(mats[kind]); me.materials.append(mats[kind + '-ink'])
        BODY.modifiers['outline'].show_render = not os.environ.get('NOHULL')
    BODY.modifiers['outline'].material_offset = 1


def snap(name, mats, body, build, res=None):
    """render one layer: `body` is skin | shirt | hold | None (the body is hidden), `build` makes its objects"""
    before = set(bpy.data.objects)
    if body:
        BODY.hide_render = False; body_as(mats, body)
    else:
        BODY.hide_render = True
    built = build() if build else None
    sc = bpy.context.scene; cam = sc.camera
    z0 = H['eye_z'] + (FRAME[1] - EYE_Z) / S
    cam.rotation_euler = (math.radians(90), 0, 0)
    cam.location = (FRAME[0], -400, z0)
    cam.data.ortho_scale = FRAME[2] / S
    cam.data.clip_end = 2000
    r = res or RES
    sc.render.resolution_x = int(160 * r); sc.render.resolution_y = int(240 * r)
    sc.render.filepath = os.path.join(OUT, name + '.webp')
    bpy.ops.render.render(write_still=True)
    print('rendered', name)
    for o in set(bpy.data.objects) - before:
        bpy.data.objects.remove(o, do_unlink=True)
    BODY.hide_render = False
    return built


def holdout_for_layer(mats):
    """layers that sit behind or on the body hide whatever the body covers: the body stays in as a holdout"""
    body_as(mats, 'hold')


def snap_over(name, mats, build):
    """a layer made of loose parts (hair, hats, scarf) that the body hides where it covers them"""
    before = set(bpy.data.objects)
    BODY.hide_render = False; body_as(mats, 'hold')
    snap_inner = build()
    snap(name, mats, 'hold', None)
    for o in set(bpy.data.objects) - before:
        bpy.data.objects.remove(o, do_unlink=True)


def over(name, mats, build):
    """render loose parts with the body as a holdout"""
    state = {}

    def b():
        body_as(mats, 'hold')
        return build()
    snap(name, mats, 'hold', b)


# ---------------------------------------------------------------- measurements
def keep(o, test, edge=None):
    bpy.context.view_layer.update()
    M.keep(o, test, edge)


def shell(o, t):
    M.shell(o, t)


# ---------------------------------------------------------------- face patches
def face_patches():
    """the base mesh has pockets for the eyes, mouth and nostrils (they show up as dark slits): skin discs lie over them,
    and the game draws the real eyes and mouth on top"""
    from mathutils.bvhtree import BVHTree
    bvh = BVHTree.FromObject(BODY, bpy.context.evaluated_depsgraph_get())
    sk = bpy.data.materials.new('patch'); sk.use_nodes = True
    N = sk.node_tree.nodes
    for n in list(N):
        N.remove(n)
    po = N.new('ShaderNodeOutputMaterial'); pe = N.new('ShaderNodeEmission'); pe.inputs[0].default_value = M.srgb('#e7e5ea') + (1,)
    sk.node_tree.links.new(pe.outputs[0], po.inputs[0])   # a flat tone: the face around the sockets is almost flat-lit

    def at(x, z, off=0.12):
        hit = bvh.ray_cast(Vector((x, -400, z)), Vector((0, 1, 0)))
        return (x, (hit[0].y if hit[0] else H['face_y']) - off, z)
    ex, ez = H['eye_x'], H['eye_z']
    for s in SIDES:
        sphere('pe', 1.0, sk, loc=at(s * ex, ez + 0.3), scale=(3.0, 0.2, 2.1), outline=0, segs=24)
    sphere('pm', 1.0, sk, loc=at(0, H['mz']), scale=(3.7, 0.22, 1.5), outline=0, segs=24)
    for s in SIDES:
        sphere('pn', 1.0, sk, loc=at(s * 1.2, H['nose_z'] - 0.9, 0.05), scale=(0.9, 0.2, 0.7), outline=0, segs=12)
    return True


# ---------------------------------------------------------------- hair
# The skull is an ellipsoid (without the ears and nose): a point on it is (azimuth phi from the front, angle eps from the
# top: 0 = crown, 90 = ear level). Hair is a cap down to a hairline plus strands that run along meridians.
def skull():
    return dict(rx=H['rx'] - 1.7, ry=H['ry'] - 1.6, cy=H['cy'] + 1.6, cz=H['cz'], hz=H['top'] - H['cz'])


def pt(phi, eps, g=0.0, k=None):
    k = k or skull()
    e, f = math.radians(eps), math.radians(phi)
    return ((k['rx'] + g) * math.sin(e) * math.sin(f), k['cy'] - (k['ry'] + g) * math.sin(e) * math.cos(f), k['cz'] + (k['hz'] + g) * math.cos(e))


def hair_mat():
    return toon('hair', WHITE, 'gloss', lo=0.55)


def strand(phi0, e0, e1, sweep, r, m, g=1.0, fall=None, taper=0.3, outline=0.08, spread=0.0):
    """a lock of hair along a meridian from eps e0 to e1 (turning by `sweep` degrees of azimuth on the way); with
    `fall` it carries on straight down to that height. `spread` pushes the tail outward (hair resting on the shoulders)"""
    pts = []
    n = 9
    for t in range(n):
        f = t / (n - 1)
        pts.append(pt(phi0 + sweep * f * f, e0 + (e1 - e0) * f, g))
    if fall is not None:
        x0, y0, z0 = pts[-1]
        for t in range(1, 8):
            z = z0 - t * (z0 - fall) / 7
            drop = max(0.0, H['sh_z'] + 6 - z)
            pts.append((x0 * (1 + spread * drop), y0 + (0.03 * drop if abs(phi0) > 100 else -0.0), z))
    return tube('lock', smooth_curve(pts, 4), r, m, outline=outline, taper=taper)


def hair_cap(m, front_eps=60, side_eps=96, back_eps=128, g=0.8):
    """a skull cap of hair: closed over the crown, down to a hairline that is high at the front, lower at the sides and back"""
    k = skull()
    o = sphere('cap', 1.0, m, loc=(0, k['cy'], k['cz']), scale=(k['rx'] + g, k['ry'] + g, k['hz'] + g), outline=0.1, segs=64)
    bpy.context.view_layer.update()

    def lim_of(x, y):
        px, py = x / (k['rx'] + g), (k['cy'] - y) / (k['ry'] + g)
        c = py / max(1e-6, math.hypot(px, py))                      # +1 front .. -1 back
        return front_eps + (side_eps - front_eps) * (1 - c * c) if c > 0 else side_eps + (back_eps - side_eps) * (c * c)

    def test(x, y, z):
        pz = (z - k['cz']) / (k['hz'] + g)
        return math.degrees(math.acos(max(-1.0, min(1.0, pz)))) < lim_of(x, y)
    keep(o, test, lambda x, y: k['cz'] + (k['hz'] + g) * math.cos(math.radians(lim_of(x, y))))
    shell(o, 0.4)
    return o


def hair_front(style, m):
    k = skull()
    cap = hair_cap(m, front_eps=58 if style != 'curly' else 50)
    n = 15
    # fringe: strands from a part near the crown down over the forehead, swept to one side
    for j in range(n):
        u = j / (n - 1)
        phi = -66 + 132 * u
        sw = 14 if style in ('short', 'bun') else 9
        strand(phi, 12 + 6 * abs(u - 0.5), 60 + 5 * math.sin(j * 1.7), sw * (1 if u > 0.15 else -0.5), 1.7, m, g=1.0, taper=0.35)
    if style == 'short':
        for sd in SIDES:   # short sideburns in front of the ears
            strand(sd * 82, 52, 98, 0, 1.5, m, g=0.9, taper=0.5)
    elif style == 'bun':
        sphere('bun', 3.3, m, loc=pt(180, 12, 3.0), outline=0.12, segs=32)
        # the pulled-back strands towards the bun
        for sd in SIDES:
            strand(sd * 70, 40, 14, sd * -50, 1.5, m, g=1.0, taper=0.4)
    elif style in ('long', 'straight'):
        end = H['sh_z'] - 8 if style == 'long' else H['neck_z'] + 1.5
        for sd in SIDES:
            for q, phi in enumerate((74, 92, 112, 134)):
                strand(sd * phi, 14 + 3 * q, 99, sd * 6, 2.5 - 0.2 * q, m, g=1.1, fall=end + 1.8 * math.sin((q + (sd > 0)) * 2.3), spread=0.011 if q < 2 else 0.006, taper=0.2, outline=0.1)
    elif style == 'curly':
        rnd = random.Random(5)
        for _ in range(70):
            f = rnd.uniform(-105, 105); e = rnd.uniform(6, 92)
            if e > 60 and abs(f) < 62:          # keep the face free
                continue
            sphere('c', rnd.uniform(1.9, 2.7), m, loc=pt(f, e, rnd.uniform(1.0, 2.0)), outline=0.1, segs=14)
    return True


def hair_back(style, m):
    k = skull()
    if style in ('long', 'straight'):
        end = H['sh_z'] - 12 if style == 'long' else H['neck_z'] + 0.5
        bm = bmesh.new(); rows = []
        n = 11
        for zi in range(n):
            z = H['eye_z'] + 3 - zi * (H['eye_z'] + 3 - end) / (n - 1)
            w = k['rx'] + 1.1 + max(0.0, H['sh_z'] + 4 - z) * 0.2
            rows.append([bm.verts.new((-w + 2 * w * xi / 10, k['cy'] + k['ry'] * 0.55 + 0.05 * (xi - 5) ** 2, z)) for xi in range(11)])
        for a_, b_ in zip(rows, rows[1:]):
            for i in range(10):
                bm.faces.new((a_[i], a_[i + 1], b_[i + 1], b_[i]))
        me = bpy.data.meshes.new('back'); bm.to_mesh(me); bm.free()
        o = link(bpy.data.objects.new('backhair', me)); M.finish(o, m, outline=0.0)
        shell(o, 0.5)
        sphere('nape', 1.0, m, loc=(0, k['cy'] + 0.4, k['cz'] - 0.5), scale=(k['rx'] + 1.0, k['ry'] + 1.0, k['hz'] + 0.5), outline=0.1, segs=48)
    elif style == 'curly':
        rnd = random.Random(9)
        for _ in range(80):
            sphere('cb', rnd.uniform(2.2, 3.0), m, loc=pt(180 + rnd.uniform(-95, 95), rnd.uniform(15, 118), rnd.uniform(1.3, 2.4)), outline=0.1, segs=14)
        sphere('nape', 1.0, m, loc=(0, k['cy'] + 0.4, k['cz'] - 0.5), scale=(k['rx'] + 1.2, k['ry'] + 1.2, k['hz'] + 0.7), outline=0.1, segs=48)
    else:
        return False
    return True


# ---------------------------------------------------------------- hats, scarf, collars, beard
def head_ell(name, m, grow=0.0, outline=0.1, segs=64):
    k = skull()
    return sphere(name, 1.0, m, loc=(0, k['cy'], k['cz']), scale=(k['rx'] + grow, k['ry'] + grow, k['hz'] + grow), outline=outline, segs=segs)


def hat_beanie():
    m = toon('hat', WHITE)
    o = head_ell('dome', m, grow=0.95)
    z = H['eye_z'] + 3.3
    keep(o, lambda x, y, zz: zz > z, lambda x, y: z)
    shell(o, 0.4)
    # a folded cuff: a band around the head at the rim
    pts = []
    for i in range(49):
        a = i / 48 * 2 * math.pi
        pts.append(((H['rx'] + 1.15) * math.cos(a), H['cy'] + (H['ry'] + 1.15) * math.sin(a), z))
    t = tube('cuff', pts, 1.15, m, outline=0.1)
    return True


def hat_pom():
    sphere('pom', 2.6, toon('pom', WHITE), loc=(0, H['cy'], H['top'] + 2.6), outline=0.12)
    return True


def hat_cap():
    m = toon('cap', WHITE)
    o = head_ell('crown', m, grow=0.8)
    z = H['eye_z'] + 3.6
    keep(o, lambda x, y, zz: zz > z, lambda x, y: z)
    shell(o, 0.4)
    b = sphere('brim', 1.0, m, loc=(-1.6, H['face_y'] - 2.6, z + 0.2), scale=(H['rx'] * 0.92, 4.2, 0.55), outline=0.1)
    b.rotation_euler = (math.radians(-10), 0, math.radians(14))
    sphere('button', 0.7, m, loc=(0, H['cy'], H['top'] + 0.7), outline=0.1)
    return True


def surf(x, z, off=0.0):
    """a point on the front of the body (skin or shirt) at (x, z), `off` in front of it"""
    from mathutils.bvhtree import BVHTree
    global _BVH
    if _BVH is None:
        BODY.hide_render = False
        _BVH = BVHTree.FromObject(BODY, bpy.context.evaluated_depsgraph_get())
    hit = _BVH.ray_cast(Vector((x, -400, z)), Vector((0, 1, 0)))
    return (x, (hit[0].y if hit[0] else H['chest_y']) - off, z)


_BVH = None


def neckline(x):
    return H['neck_z'] - 5.0 + 0.14 * x * x      # the same curve as the shirt's mask in helper_style.body_mat


def scarf():
    m = toon('scarf', WHITE)
    nz = H['neck_z']
    # a thick wrap round the neck, a knot at the front and a tail hanging down the chest
    lathe('wrap', M.soft([(3.4, nz + 4.6), (6.4, nz + 5.0), (7.6, nz + 2.8), (7.0, nz - 0.6), (3.6, nz + 0.2)]), m, segs=48).location = (0, H['cy'] * 0.25 + 1.2, 0)
    sphere('knot', 2.5, m, loc=(2.6, surf(2.6, nz + 1.0)[1] - 0.6, nz + 0.6), outline=0.1, segs=20)
    M.box('tail', (3.4, 1.2, 11.0), m, loc=(2.6, surf(2.6, nz - 6, 0.7)[1], nz - 1.5 - 5.5), bevel=0.55, rot=(math.radians(8), math.radians(-5), 0))
    return True


def collar(kind):
    m = toon('collar', WHITE)
    nz = H['neck_z']
    xs = [i * 0.5 for i in range(-12, 13)]
    if kind == 'round':       # a ribbed crew neck following the neckline
        tube('rib', [surf(x, neckline(x) + 0.2, 0.55) for x in xs], 0.85, m, outline=0.1)
    else:                     # a shirt collar: a neck ring, two flaps and the open V
        tube('rib', [surf(x, neckline(x) + 0.9, 0.5) for x in xs if abs(x) < 5.6], 0.7, m, outline=0.08)
        for sd in SIDES:
            pts = [surf(sd * 3.4, nz + 0.2, 0.7), surf(sd * 4.6, nz - 2.6, 0.9), surf(sd * 2.0, nz - 8.5, 0.9)]
            me = bpy.data.meshes.new('fl'); bm = bmesh.new()
            vs = [bm.verts.new(v) for v in (surf(sd * 3.2, nz + 0.8, 0.5), surf(sd * 7.4, nz - 1.4, 0.7), surf(sd * 1.6, nz - 9.8, 0.8))]
            bm.faces.new(vs if sd > 0 else vs[::-1]); bm.to_mesh(me); bm.free()
            o = link(bpy.data.objects.new('flap', me)); M.finish(o, m, outline=0.1); shell(o, 0.25)
    return True


def beard():
    """a short beard: the face's own surface from the sideburns round the chin, pushed out a little, with an oval left open for the mouth"""
    m = toon('beard', WHITE, 'gloss', lo=0.55)
    mz = H['mz']; ch = 2 * mz - H['nose_z']      # the chin: as far below the mouth as the nose tip is above it
    dg = bpy.context.evaluated_depsgraph_get()
    ev = BODY.evaluated_get(dg); src = ev.to_mesh()
    bm = bmesh.new(); bm.from_mesh(src); ev.to_mesh_clear()
    bm.faces.ensure_lookup_table()

    def zt(x):
        return mz + 3.6 - 0.05 * x * x

    def keepface(f):
        c = f.calc_center_median()
        if f.material_index != 0 or c.y > H['nose_y'] + 9.0 or c.z < ch - 1.2 or c.z > zt(c.x) or abs(c.x) > 8.6:
            return False
        if (c.x / 4.0) ** 2 + ((c.z - mz) / 2.0) ** 2 < 1.0:      # the mouth
            return False
        return True
    near = [f for f in bm.faces if f.material_index == 0 and f.calc_center_median().y < H['nose_y'] + 9.0 and ch - 3 < f.calc_center_median().z < mz + 6]
    bmesh.ops.subdivide_edges(bm, edges=list({e for f in near for e in f.edges}), cuts=3, use_grid_fill=True)   # finer cuts: smoother edges
    bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not keepface(f)], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * 0.5
    me = bpy.data.meshes.new('beard'); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new('beard', me)); M.finish(o, m, outline=0.12)
    return True


# ---------------------------------------------------------------- run
def run():
    for g in GENDERS:
        male = g == 'm'
        mats = setup(male)
        want = lambda n: not ONLY or n in ONLY or n.split('-')[0] in ONLY

        def L(name, fn=None, body=None):
            if want(name):
                snap('cust-%s-%s' % (name, g), mats, body, fn)

        # body layers
        L('skin', None, 'skin')
        L('torso', None, 'shirt')
        for k in ('round', 'v'):
            if want('collar-' + k):
                snap('cust-collar-%s-%s' % (k, g), mats, 'hold', lambda k=k: collar(k))
        if want('scarf'):
            snap('cust-scarf-%s' % g, mats, 'hold', scarf)
        if male and want('beard'):
            snap('cust-beard-%s' % g, mats, 'hold', beard)
        for st in ('short', 'bun', 'long', 'curly', 'straight'):
            if not want('hair-' + st) and not want('hair'):
                continue
            if st == 'bun' and male or st == 'short' and not male and False:
                pass
            m = hair_mat()
            snap('cust-hair-%s-front-%s' % (st, g), mats, 'hold', lambda st=st, m=m: hair_front(st, m))
            if st in ('long', 'curly', 'straight'):
                snap('cust-hair-%s-back-%s' % (st, g), mats, 'hold', lambda st=st, m=m: hair_back(st, m))
        if want('hat-beanie'): snap('cust-hat-beanie-%s' % g, mats, 'hold', hat_beanie)
        if want('hat-pom'): snap('cust-hat-pom-%s' % g, mats, None, hat_pom)
        if want('hat-cap'): snap('cust-hat-cap-%s' % g, mats, 'hold', hat_cap)
    print('done ->', OUT)


run()
