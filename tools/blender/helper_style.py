"""CAFE C&B: style test for the helper character Ülkü / Jesica (issues #16, #18).

Renders the same character two ways so the owner can pick one:
  A  face and body built from our own primitives (like tools/blender/models.py)
  B  face and body from the MPFB2 / MakeHuman base mesh (CC0), made a little cuter (bigger head and eyes)
Hair (long, straight, middle part, dark roots fading to caramel ends), round black glasses with gold temples,
black top, apron and name badge, the light and the ink outline are shared, so only the body differs.

Run:  blender -b -P tools/blender/helper_style.py -- <out dir> <mpfb data dir> [A,B]
The MPFB2 add-on is not in this repository: download it from extensions.blender.org/add-ons/mpfb and pass its
`data` folder. Only its CC0 base mesh and targets are read; the renders are ours.
"""
import bpy, bmesh, math, os, sys, gzip
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUTDIR = os.path.abspath(ARGS[0] if ARGS else 'style')
MPFB = ARGS[1] if len(ARGS) > 1 else ''
WHICH = (ARGS[2] if len(ARGS) > 2 else 'all').split(',')

# reuse the game's toon materials, outline and helpers
sys.argv = [sys.argv[0], '--', OUTDIR]
import importlib.util
spec = importlib.util.spec_from_file_location('models', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models.py'))
M = importlib.util.module_from_spec(spec); spec.loader.exec_module(M)
toon, finish, link, sphere, tube, smooth_curve, lathe, srgb = M.toon, M.finish, M.link, M.sphere, M.tube, M.smooth_curve, M.lathe, M.srgb

SKIN = '#f3cfae'; TOP = '#2b2524'; APRON = '#d9b07c'; FRAMEC = '#1d1a1a'; GOLD = '#d4a94c'
HAIR_STOPS = [(0.0, '#2e1c14'), (0.32, '#4a2c1c'), (0.62, '#8f5a32'), (1.0, '#d39a5e')]


def toon_grad(name, stops, z_top, z_bot, kind='gloss'):
    """toon material whose base colour runs top -> bottom along world Z (the ombre)"""
    m = toon(name, '#ffffff', kind).copy(); m.name = name
    nt = m.node_tree; N = nt.nodes; L = nt.links
    mul = next(n for n in N if n.bl_idname == 'ShaderNodeMixRGB' and n.blend_type == 'MULTIPLY')
    geo = N.new('ShaderNodeNewGeometry'); sep = N.new('ShaderNodeSeparateXYZ'); L.new(geo.outputs['Position'], sep.inputs[0])
    mr = N.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = z_top; mr.inputs['From Max'].default_value = z_bot
    L.new(sep.outputs['Z'], mr.inputs[0])
    ramp = N.new('ShaderNodeValToRGB'); cr = ramp.color_ramp; cr.interpolation = 'EASE'
    cr.elements[0].position = stops[0][0]; cr.elements[0].color = srgb(stops[0][1]) + (1,)
    cr.elements[1].position = stops[-1][0]; cr.elements[1].color = srgb(stops[-1][1]) + (1,)
    for p, c in stops[1:-1]:
        e = cr.elements.new(p); e.color = srgb(c) + (1,)
    L.new(mr.outputs[0], ramp.inputs[0]); L.new(ramp.outputs[0], mul.inputs[2])
    return m


# ---------------------------------------------------------------- body A: our own primitives
def body_A():
    skin = toon('skin', SKIN, lo=0.72)
    H = dict(cz=73.5, rx=7.4, ry=8.6, top=86.0, chin=61.2, eye_z=73.4, eye_x=3.1, face_y=-8.3, neck_z=58.0,
             sh_x=15.5, sh_z=52.0, chest_y=-9.5)
    # head: an egg narrowing to a soft chin, a little flatter at the face
    prof = M.soft([(0.0001, -12.3), (0.32, -11.6), (0.62, -9.6), (0.84, -6.5), (0.96, -2.5), (1.0, 1.5), (0.93, 6.5),
                   (0.7, 10.3), (0.0001, 12.5)], 6)
    head = lathe('head', [(r, z) for r, z in prof], skin, segs=64, outline=0.14)
    head.location = (0, 0.3, H['cz']); head.scale = (H['rx'], H['ry'], 1.0)
    # ears (mostly under the hair)
    for s in (-1, 1):
        e = sphere('ear', 1.0, skin, loc=(s * 7.2, 0.8, 72.6), scale=(1.0, 1.7, 2.6), outline=0.1)
    # nose: a small soft bump
    sphere('nose', 1.0, skin, loc=(0, -8.45, 70.4), scale=(0.95, 1.0, 1.25), outline=0)
    sphere('nosetip', 1.0, toon('nosesh', '#e2aa86', lo=0.8), loc=(0, -8.3, 69.45), scale=(0.75, 0.6, 0.28), outline=0)
    # neck, shoulders and the body inside the top
    M.cyl('neck', 4.0, 9.0, skin, loc=(0, 0.6, 54.5), outline=0.12)
    top = toon('top', TOP, lo=0.6)
    torso = lathe('torso', M.soft([(0.0001, 22), (10.8, 22), (11.4, 30), (12.6, 40), (13.4, 47), (12.2, 52.5), (6.5, 56),
                                   (0.0001, 56.5)], 6), top, segs=64, outline=0.16)
    torso.scale = (1.0, 0.68, 1.0)
    for s in (-1, 1):
        sphere('shoulder', 1.0, top, loc=(s * 13.6, 0.6, 50.8), scale=(4.4, 4.6, 4.0), outline=0.14)
        # arms hang down at the sides: sleeve, then skin
        tube('sleeve', smooth_curve([(s * 15.6, 0.8, 50), (s * 17.0, 1.0, 43.5), (s * 17.6, 1.0, 38)], 6), 4.0, top, outline=0.14)
        tube('arm', smooth_curve([(s * 17.6, 1.0, 38.5), (s * 18.1, 0.6, 30), (s * 18.2, 0.0, 18)], 6), 3.3, skin, outline=0.12)
    face_A(H)
    return H


def eyeball(name, c, r):
    """a whole eyeball sitting in a MakeHuman eye socket: the iris is on its front"""
    sphere(name + 'w', r, toon('sclera', '#fbf7f2', lo=0.85), loc=c, outline=0.0, segs=32)
    f = c.y - r * 0.93
    sphere(name + 'i', 1.0, toon('iris', '#5a3420', 'gloss', lo=0.7), loc=(c.x, f, c.z), scale=(r * 0.56, r * 0.14, r * 0.56), outline=0.0)
    sphere(name + 'p', 1.0, toon('pupil', '#1a0f0b', lo=1.0), loc=(c.x, f - r * 0.08, c.z), scale=(r * 0.27, r * 0.1, r * 0.27), outline=0.0)
    sphere(name + 'h', 1.0, toon('hi', '#ffffff', 'flat', lo=1.0), loc=(c.x - r * 0.18, f - r * 0.16, c.z + r * 0.2), scale=(r * 0.1, r * 0.04, r * 0.1), outline=0.0)


def eye(name, x, z, y, r, look=(0, 0)):
    """a cartoon-but-real eye: white, warm brown iris, pupil, two catch lights"""
    sphere(name + 'w', 1.0, toon('sclera', '#fbf7f2', lo=0.85), loc=(x, y, z), scale=(r * 1.25, r * 0.6, r), outline=0.0, segs=32)
    sphere(name + 'i', 1.0, toon('iris', '#5a3420', 'gloss', lo=0.7), loc=(x + look[0], y - r * 0.5, z + look[1]), scale=(r * 0.72, r * 0.2, r * 0.78), outline=0.0)
    sphere(name + 'p', 1.0, toon('pupil', '#1a0f0b', lo=1.0), loc=(x + look[0], y - r * 0.62, z + look[1]), scale=(r * 0.36, r * 0.12, r * 0.4), outline=0.0)
    sphere(name + 'h', 1.0, toon('hi', '#ffffff', 'flat', lo=1.0), loc=(x + look[0] - r * 0.25, y - r * 0.72, z + look[1] + r * 0.3), scale=(r * 0.16, r * 0.05, r * 0.16), outline=0.0)
    sphere(name + 'h2', 1.0, toon('hi', '#ffffff', 'flat', lo=1.0), loc=(x + look[0] + r * 0.22, y - r * 0.72, z + look[1] - r * 0.25), scale=(r * 0.07, r * 0.04, r * 0.07), outline=0.0)


def face_A(H):
    ex, ez, y = H['eye_x'], H['eye_z'], -7.55
    lid = toon('lid', '#3a2318', lo=1.0); brow = toon('brow', '#3f2619', lo=0.8)
    lip = toon('lip', '#cf6f6a', 'gloss', lo=0.7); blush = toon('blush', '#f2948a', alpha=0.0, edge=0.45)
    for s in (-1, 1):
        x = s * ex
        eye('eye' + str(s), x, ez, y, 1.3)
        # upper lid line with a little lash flick at the outer corner
        tube('lid', smooth_curve([(x - s * 1.7, y - 0.2, ez - 0.1), (x, y - 0.75, ez + 1.25), (x + s * 1.75, y - 0.1, ez + 0.3), (x + s * 2.25, y + 0.3, ez + 0.75)], 6), 0.22, lid, outline=0)
        tube('brow', smooth_curve([(x - s * 1.6, y - 0.4, ez + 2.4), (x + s * 0.2, y - 0.7, ez + 3.0), (x + s * 2.1, y + 0.1, ez + 2.6)], 6), 0.32, brow, outline=0)
        bx = s * 4.3; by = 0.3 - 8.5 * math.sqrt(max(0.05, 1 - (4.3 / 7.4) ** 2))
        sphere('blush', 1.0, blush, loc=(bx, by - 0.05, 69.4), scale=(1.5, 0.22, 0.85), outline=0)
    # soft closed smile, rosy lips
    tube('smile', smooth_curve([(-1.9, -7.9, 66.75), (0, -8.45, 66.3), (1.9, -7.9, 66.75)], 8), 0.17, toon('lipline', '#a9524c', lo=0.9), outline=0)
    sphere('lowlip', 1.0, lip, loc=(0, -8.05, 65.85), scale=(1.15, 0.3, 0.38), outline=0)


# ---------------------------------------------------------------- body B: MPFB2 / MakeHuman base mesh (CC0)
def read_obj(path):
    vs, faces, grp = [], {}, None
    with open(path) as f:
        for l in f:
            if l.startswith('v '):
                vs.append([float(t) for t in l.split()[1:4]])
            elif l.startswith('g '):
                grp = l.split()[1]
            elif l.startswith('f '):
                faces.setdefault(grp, []).append([int(t.split('/')[0]) - 1 for t in l.split()[1:]])
    return vs, faces


def apply_target(vs, path, w):
    with gzip.open(path, 'rt') as f:
        for l in f:
            p = l.split()
            if len(p) == 4 and not l.startswith('#'):
                i = int(p[0]); vs[i][0] += float(p[1]) * w; vs[i][1] += float(p[2]) * w; vs[i][2] += float(p[3]) * w


def body_B():
    vs, faces = read_obj(os.path.join(MPFB, '3dobjs', 'base.obj'))
    T = os.path.join(MPFB, 'targets')
    # a young woman, fair skin; slightly bigger eyes and a softer face for the game's cute-but-real look
    for t, w in (('macrodetails/caucasian-female-young', 1.0), ('macrodetails/universal-female-young-averagemuscle-averageweight', 1.0),
                 ('eyes/l-eye-scale-incr', 1.0), ('eyes/r-eye-scale-incr', 1.0), ('chin/chin-width-decr', 0.4) if os.path.exists(os.path.join(T, 'chin/chin-width-decr.target.gz')) else (None, 0)):
        if t and os.path.exists(os.path.join(T, t + '.target.gz')):
            apply_target(vs, os.path.join(T, t + '.target.gz'), w)
    # MakeHuman: decimetres, Y up, +Z forward -> centimetres, Z up, -Y forward
    P = [Vector((v[0] * 10, -v[2] * 10, v[1] * 10)) for v in vs]
    def centre(g):
        ids = {i for f in faces[g] for i in f}
        return sum((P[i] for i in ids), Vector()) / len(ids)
    eyeL, eyeR = centre('helper-l-eye'), centre('helper-r-eye')
    sh = centre('joint-l-shoulder'); neck = centre('joint-neck'); headj = centre('joint-head')
    body_ids = {i for f in faces['body'] for i in f}
    # arms down along the sides: turn everything outside the shoulder about the shoulder joint, blended in
    ang = math.radians(38)
    def armdown(p):
        ax = abs(p.x)
        if ax < sh.x * 0.72 or (p.z < 0 and ax < sh.x * 1.2):   # not the legs
            return p
        k = min(1.0, (ax - sh.x * 0.72) / (sh.x * 0.42)); k = k * k * (3 - 2 * k)
        sg = 1 if p.x > 0 else -1
        c = Vector((sg * sh.x, p.y, sh.z))
        d = p - c
        a = -sg * ang * k
        return c + Vector((d.x * math.cos(a) - d.z * math.sin(a), d.y, d.x * math.sin(a) + d.z * math.cos(a)))
    P0 = list(P)
    for i in body_ids:
        P[i] = armdown(P[i])
    # a slightly bigger head (cute proportions), grown from the neck
    hk = 1.1
    for i in body_ids:
        p = P[i]
        if p.z > neck.z + 2:
            t = min(1.0, (p.z - neck.z - 2) / 4.0)
            f = 1 + (hk - 1) * t
            P[i] = Vector((p.x * f * (1 + 0.09 * t), (p.y - neck.y) * f + neck.y, (p.z - neck.z) * f + neck.z))
    me = bpy.data.meshes.new('mh'); bm = bmesh.new()
    idx = {}
    for i in sorted(body_ids):
        idx[i] = bm.verts.new(P[i])
    for f in faces['body']:
        try:
            bm.faces.new([idx[i] for i in f])
        except ValueError:
            pass
    bm.normal_update(); bm.to_mesh(me); bm.free()
    # where each point is in the arms-down rest pose: the shirt and lip masks read it, so they stay put when she moves
    order = sorted(body_ids)
    at = me.attributes.new('rest', 'FLOAT_VECTOR', 'POINT')
    for k, i in enumerate(order):
        at.data[k].vector = P[i]
    o = link(bpy.data.objects.new('mpfb', me))
    global ARM
    ARM = make_rig(o, order, P0, faces, armdown)
    sub = o.modifiers.new('sub', 'SUBSURF'); sub.levels = 1; sub.render_levels = 1
    front = [P[i] for i in body_ids if abs(P[i].x) < 0.8 and P[i].z > neck.z + 2]
    nose = min(front, key=lambda p: p.y)
    chinp = min((p for p in front if p.y < nose.y + 4.5), key=lambda p: p.z)
    mz = nose.z - 0.37 * (nose.z - chinp.z)
    finish(o, body_mat(sh, mz, nose.y + 3.0, neck.z), outline=0.14)
    # eyes in the sockets (scaled the same way as the head)
    def headpt(p):
        t = min(1.0, max(0.0, (p.z - neck.z - 2) / 4.0)); f = 1 + (hk - 1) * t
        return Vector((p.x * f * (1 + 0.09 * t), (p.y - neck.y) * f + neck.y, (p.z - neck.z) * f + neck.z))
    eL, eR = headpt(eyeL), headpt(eyeR)
    r = 1.22 * hk
    bvh = BVHTree.FromObject(o, bpy.context.evaluated_depsgraph_get())
    lid = toon('lid', '#3a2318', lo=1.0); brow = toon('brow', '#3f2619', lo=0.8)
    for s, e in ((1, eL), (-1, eR)):
        eyeball("eye" + str(s), e, 1.4 * hk)
        def onface(x, z, off=0.25):
            hit = bvh.ray_cast(Vector((x, -60, z)), Vector((0, 1, 0)))
            return (x, (hit[0].y if hit[0] else e.y - 1) - off, z)
        tube('lid', smooth_curve([onface(e.x - s * 1.7 * hk, e.z - 0.1, 0.05), onface(e.x, e.z + 1.15 * hk, 0.15), onface(e.x + s * 1.75 * hk, e.z + 0.25, 0.1), onface(e.x + s * 2.3 * hk, e.z + 0.75, 0.1)], 6), 0.22, lid, outline=0)
        tube('brow', smooth_curve([onface(e.x - s * 1.7, e.z + 2.5 + BROW), onface(e.x + s * 0.3, e.z + 3.1 + BROW * 0.5), onface(e.x + s * 2.2, e.z + 2.6 - BROW * 0.3)], 6), 0.3, brow, outline=0)
        bl = onface(s * (abs(e.x) + 1.3), e.z - 3.6, -0.05)
        sphere('blush', 1.0, toon('blush', '#f2948a', alpha=0.0, edge=0.45), loc=bl, scale=(1.5, 0.22, 0.85), outline=0)
    mouth(onface, mz)
    # landmarks for the shared parts
    zs = [P[i].z for i in body_ids if P[i].z > neck.z]
    top = max(zs)
    head_pts = [P[i] for i in body_ids if P[i].z > neck.z + 3]
    rx = max(abs(p.x) for p in head_pts); ry_front = min(p.y for p in head_pts if abs(p.x) < 1.5)
    chin = min(P[i].z for i in body_ids if abs(P[i].x) < 1.0 and P[i].y < ry_front + 4 and P[i].z > neck.z - 2)
    torso_pts = [P[i] for i in body_ids if 40 < P[i].z < 48 and abs(P[i].x) < 4]
    chest_y = min(p.y for p in torso_pts) if torso_pts else -10
    H = dict(cz=(top + chin) / 2 + 0.5, rx=rx + 0.2, ry=(max(p.y for p in head_pts) - ry_front) / 2, top=top, chin=chin,
             eye_z=eL.z, eye_x=abs(eL.x), face_y=ry_front, neck_z=neck.z, sh_x=sh.x, sh_z=sh.z, chest_y=chest_y,
             cy=(max(p.y for p in head_pts) + ry_front) / 2)
    return H


ARM = None
MOUTH = 'smile'   # 'smile' | 'open' | 'o' | 'flat'
BROW = 0.0        # tilts the inner ends of the brows up (worried) or down


def mouth(onface, mz):
    ink = toon('lipline', '#a9524c', lo=0.9)
    if MOUTH == 'smile':       # a soft closed smile along the lips
        tube('smile', smooth_curve([onface(-1.55, mz + 0.3, 0.05), onface(0, mz - 0.12, 0.12), onface(1.55, mz + 0.3, 0.05)], 8), 0.15, ink, outline=0)
    elif MOUTH == 'open':      # an open, laughing mouth with a little tongue
        x, y, z = onface(0, mz - 0.2, -0.05)
        sphere('mouth', 1.0, toon('mouthin', '#5b1d22', lo=1.0), loc=(x, y + 0.05, z + 0.1), scale=(1.45, 0.3, 0.8), outline=0)
        sphere('teeth', 1.0, toon('teeth', '#fbf6ee', lo=0.9), loc=(x, y - 0.12, z + 0.5), scale=(1.15, 0.12, 0.22), outline=0)
        sphere('tongue', 1.0, toon('tongue', '#e07a7a', lo=0.8), loc=(x, y - 0.1, z - 0.35), scale=(0.8, 0.16, 0.32), outline=0)
    elif MOUTH == 'o':         # a small worried "o"
        x, y, z = onface(0, mz - 0.1, -0.05)
        sphere('mouth', 1.0, toon('mouthin', '#5b1d22', lo=1.0), loc=(x, y + 0.05, z), scale=(0.75, 0.3, 0.7), outline=0)
    else:                      # a flat line
        tube('flat', smooth_curve([onface(-1.3, mz, 0.05), onface(0, mz - 0.05, 0.1), onface(1.3, mz, 0.05)], 6), 0.15, ink, outline=0)


def make_rig(o, order, P0, faces, armdown):
    """MPFB2's default rig, rebuilt from this mesh: bones from the joint helpers, skin weights from weights.default.json"""
    import json
    rig = json.load(open(os.path.join(MPFB, 'rigs', 'standard', 'rig.default.json')))
    wts = json.load(open(os.path.join(MPFB, 'rigs', 'standard', 'weights.default.json')))['weights']
    def spot(sp):
        if 'cube_name' in sp and sp['cube_name'] in faces:
            ids = {i for f in faces[sp['cube_name']] for i in f}
            c = sum((P0[i] for i in ids), Vector()) / len(ids)
        elif 'vertex_indices' in sp:
            c = sum((P0[i] for i in sp['vertex_indices']), Vector()) / len(sp['vertex_indices'])
        else:
            c = Vector(sp['default_position']) * 10
            c = Vector((c.x, -c.z, c.y))
        return armdown(c)
    arm = bpy.data.armatures.new('rig'); ao = link(bpy.data.objects.new('rig', arm))
    bpy.context.view_layer.objects.active = ao
    bpy.ops.object.mode_set(mode='EDIT')
    eb = {}
    for n, d in rig.items():
        if not isinstance(d, dict) or 'head' not in d or n not in wts:
            continue
        e = arm.edit_bones.new(n); e.head = spot(d['head']); e.tail = spot(d['tail'])
        if (e.tail - e.head).length < 0.05:
            e.tail = e.head + Vector((0, 0, 0.1))
        eb[n] = (e, d.get('parent'))
    for n, (e, par) in eb.items():
        if par in eb:
            e.parent = eb[par][0]
    bpy.ops.object.mode_set(mode='OBJECT')
    pos = {i: k for k, i in enumerate(order)}
    for n, lst in wts.items():
        if n not in eb:
            continue
        vg = o.vertex_groups.new(name=n)
        for i, w in lst:
            if i in pos and w > 0:
                vg.add([pos[i]], w, 'REPLACE')
    # which points are forearm and hand: the sleeve ends above the elbow however the arm is bent
    hand = o.data.attributes.new('hand', 'FLOAT', 'POINT')
    for n, lst in wts.items():
        if n in eb and n.split('.')[0].rstrip('0123456789-') in ('lowerarm', 'wrist', 'metacarpal', 'finger'):
            for i, w in lst:
                if i in pos:
                    hand.data[pos[i]].value = min(1.0, hand.data[pos[i]].value + w)
    md = o.modifiers.new('arm', 'ARMATURE'); md.object = ao
    return ao


def rot(bone, axis, deg):
    """turn a bone about its own joint (world axis X, Y or Z); its children come along"""
    pb = ARM.pose.bones[bone]
    c = pb.head.copy()
    R = Matrix.Translation(c) @ Matrix.Rotation(math.radians(deg), 4, axis) @ Matrix.Translation(-c)
    pb.matrix = R @ pb.matrix
    bpy.context.view_layer.update()


def raise_arm(side, up=0, fwd=0, elbow_up=0, elbow_fwd=0):
    """side 'L' is on the right of the picture. up: out and up from hanging (90 = level); fwd: forward;
    elbow_up bends the forearm up in the picture, elbow_fwd bends it toward the viewer"""
    s = 1 if side == 'L' else -1
    if fwd: rot('upperarm01.' + side, 'X', -fwd)
    if up: rot('upperarm01.' + side, 'Y', -s * up)
    if elbow_fwd: rot('lowerarm01.' + side, 'X', -elbow_fwd)
    if elbow_up: rot('lowerarm01.' + side, 'Y', -s * elbow_up)


def body_mat(sh, mz, lip_y, neck_z):
    """skin, the black short-sleeved top and rosy lips on the one MakeHuman mesh, split by smooth masks on the
    position (so the borders are clean curves, not the mesh's faces)"""
    m = toon('skinB', SKIN, lo=0.72).copy(); m.name = 'skinB'
    nt = m.node_tree; N = nt.nodes; L = nt.links
    mul = next(n for n in N if n.bl_idname == 'ShaderNodeMixRGB' and n.blend_type == 'MULTIPLY')
    geo = N.new('ShaderNodeAttribute'); geo.attribute_name = 'rest'; sep = N.new('ShaderNodeSeparateXYZ'); L.new(geo.outputs['Vector'], sep.inputs[0])
    X, Y, Z = sep.outputs['X'], sep.outputs['Y'], sep.outputs['Z']
    def op(o_, a, b=None):
        n = N.new('ShaderNodeMath'); n.operation = o_
        for k, v in enumerate((a, b)):
            if v is None:
                continue
            if isinstance(v, (int, float)):
                n.inputs[k].default_value = v
            else:
                L.new(v, n.inputs[k])
        return n.outputs[0]
    def step(v, edge, soft):            # 0 below edge, 1 above, over a soft band
        mr = N.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = edge - soft; mr.inputs['From Max'].default_value = edge + soft
        L.new(v, mr.inputs[0]); return mr.outputs[0]
    ax = op('ABSOLUTE', X)
    # top: below a scooped neckline; sleeves end a little above the elbow
    neckline = op('SUBTRACT', neck_z - 3.2, op('MULTIPLY', op('MULTIPLY', X, X), 0.09))
    below = op('MAXIMUM', step(op('SUBTRACT', neckline, Z), 0.0, 0.25),
               op('MULTIPLY', step(ax, 6.2, 0.3), step(op('SUBTRACT', neck_z - 1.0, Z), 0.0, 0.25)))
    arm = step(ax, sh.x * 0.93, 0.3)
    bare_arm = op('MULTIPLY', arm, step(op('SUBTRACT', sh.z - 10.5, Z), 0.0, 0.25))
    hn = N.new('ShaderNodeAttribute'); hn.attribute_name = 'hand'
    bare_arm = op('MAXIMUM', bare_arm, step(hn.outputs['Fac'], 0.5, 0.2))
    top = op('MULTIPLY', below, op('SUBTRACT', 1.0, bare_arm))
    # lips: an ellipse on the front of the face
    ex = op('DIVIDE', X, 2.25); ez = op('DIVIDE', op('SUBTRACT', Z, mz), 0.62)
    d = op('ADD', op('MULTIPLY', ex, ex), op('MULTIPLY', ez, ez))
    lips = op('MULTIPLY', op('SUBTRACT', 1.0, step(d, 1.0, 0.15)), op('SUBTRACT', 1.0, step(Y, lip_y, 0.3)))
    def mix(fac, a, b):
        n = N.new('ShaderNodeMixRGB'); L.new(fac, n.inputs[0])
        for k, v in ((1, a), (2, b)):
            if isinstance(v, tuple):
                n.inputs[k].default_value = v
            else:
                L.new(v, n.inputs[k])
        return n.outputs[0]
    c = mix(top, srgb(SKIN) + (1,), srgb(TOP) + (1,))
    c = mix(lips, c, srgb('#cf6f6a') + (1,))
    L.new(c, mul.inputs[2])
    return m


# ---------------------------------------------------------------- shared: hair, glasses, apron, badge
def hair(H):
    """long straight hair, middle part, framing the face and falling over the shoulders to the chest"""
    cz, rx, ry, top = H['cz'], H['rx'], H['ry'], H['top']
    cy = H.get('cy', 0.3)
    end = 30.0
    m = toon_grad('hair', HAIR_STOPS, top, end + 4, kind='toon')
    def head_surf(theta, z, grow):
        # ellipse around the head, rounded over the crown
        hz = top - cz
        k = max(0.0, 1 - ((z - cz) / (hz + grow)) ** 2) if z > cz else 1.0
        return (math.sin(theta) * (rx + grow) * math.sqrt(k), cy - math.cos(theta) * (ry + grow) * math.sqrt(k))
    locks = []
    n = 32
    for j in range(n):
        u = (j + 0.5) / n                      # 0..1: left side front to back, then right side front to back
        s = -1 if u < 0.5 else 1
        a = (u if u < 0.5 else 1 - u) * 2      # 0 = the lock beside the face, 1 = the middle of the back
        theta = s * (0.82 + a * 2.32)          # angle around the head from the front: the face stays free
        pts = []
        # a meridian from the part line on top, over the crown, down to the ear level
        for t in range(10):
            z = top + 0.4 - t * (top - H['eye_z']) / 9
            x, y = head_surf(theta, z, 0.9 + 0.5 * a)
            if t == 0:
                x = s * 0.25
            pts.append((x, y, z))
        # down the sides: in front of the shoulder for the front locks, behind for the back ones
        x0, y0, z0 = pts[-1]
        front = abs(theta) < 1.6
        L = end + (2 if front else 0) + 2.0 * math.sin(j * 2.3)   # uneven tips
        for t in range(1, 10):
            z = z0 - t * (z0 - L) / 9
            drop = max(0.0, H['sh_z'] + 5 - z)
            if front:
                # framing the face, then resting on the shoulder and falling over the chest
                x = s * max(abs(x0), rx + 0.6 + max(0.0, H['chin'] - z) * 0.12) + s * min(drop, 6) * 0.35
                y = y0 if z > H['sh_z'] + 5 else min(y0, H['chest_y'] - 1.4 - 0.6 * abs(theta - s * 0.82))
            else:
                x = x0 * (1 + 0.025 * drop)
                y = y0 + 0.08 * drop
            pts.append((x, y, z))
        locks.append(tube('lock', smooth_curve(pts, 4), 1.45 if front else 1.9, m, outline=0.1))
    # a cap under the locks so no scalp shows between them
    cap = sphere('cap', 1.0, m, loc=(0, cy + 0.6, cz + 0.2), scale=(rx + 0.7, ry + 0.9, top - cz + 0.7), outline=0.1, segs=64)
    M.keep(cap, lambda x, y, z: (z > H['eye_z'] + 6.0 - 0.07 * x * x or y > cy - 1.0) and z > H['eye_z'] - 1.5)
    # long hair hanging down the back, seen between the neck and the side locks
    back = bpy.data.meshes.new('back'); bm = bmesh.new(); rows = []
    for zi in range(11):
        z = H['eye_z'] + 1 - zi * (H['eye_z'] + 1 - end) / 10
        w = rx + 0.5 + max(0.0, H['sh_z'] + 4 - z) * 0.25
        rows.append([bm.verts.new((-w + 2 * w * xi / 8, cy + ry * 0.55 + 0.05 * (xi - 4) ** 2, z)) for xi in range(9)])
    for a_, b_ in zip(rows, rows[1:]):
        for i in range(8):
            bm.faces.new((a_[i], a_[i + 1], b_[i + 1], b_[i]))
    bm.to_mesh(back); bm.free()
    bo = link(bpy.data.objects.new('backhair', back)); finish(bo, m, outline=0)
    # the parting: a thin dark line on top
    tube('part', smooth_curve([(0, cy - ry * 0.75, top - 1.2), (0, cy - ry * 0.2, top + 0.65), (0, cy + ry * 0.4, top + 0.5)], 6), 0.28, toon('partc', '#24160f', lo=1.0), outline=0)


def glasses(H):
    ez, ex, fy = H['eye_z'], H['eye_x'], H['face_y']
    fr = toon('frame', FRAMEC, 'gloss', lo=0.8); gold = toon('gold', GOLD, 'metal')
    lens = toon('lens', '#dfe9ee', 'glass', alpha=0.08, edge=0.35)
    y = fy - 1.1
    R = 2.45
    for s in (-1, 1):
        cx = s * (ex + 0.25)
        ring = [(cx + R * math.cos(a), y + 0.25 * abs(math.cos(a)), ez - 0.15 + R * 1.0 * math.sin(a)) for a in [i * 2 * math.pi / 40 for i in range(41)]]
        tube('rim', ring, 0.36, fr, outline=0.06)
        disc = sphere('lens', 1.0, lens, loc=(cx, y + 0.15, ez - 0.15), scale=(R, 0.12, R), outline=0)
        # temples back to the ears, gold near the hinge
        hx = s * (ex + 0.25 + R)
        tube('hinge', [(hx, y + 0.2, ez + 0.6), (s * (H['rx'] + 0.2), y + 2.4, ez + 0.9)], 0.3, gold, outline=0.04)
        tube('temple', [(s * (H['rx'] + 0.2), y + 2.4, ez + 0.9), (s * (H['rx'] + 0.5), H.get('cy', 0.3) + 1.0, ez + 0.4)], 0.3, fr, outline=0.04)
    tube('bridge', smooth_curve([(-ex + R - 0.1, y, ez + 0.4), (0, y - 0.25, ez + 0.9), (ex - R + 0.1, y, ez + 0.4)], 6), 0.3, fr, outline=0.05)


BODY = []


def apron(H):
    ap = toon('apron', APRON, lo=0.66)
    # rays from the front onto the body (not the hair) so the bib lies on the chest
    import bmesh as _b
    dg = bpy.context.evaluated_depsgraph_get(); bm = _b.new()
    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH' and ob.name.split('.')[0] in ('torso', 'mpfb', 'shoulder'):
            me = ob.evaluated_get(dg).to_mesh(); tmp = me.copy(); tmp.transform(ob.matrix_world); bm.from_mesh(tmp)
            bpy.data.meshes.remove(tmp); ob.evaluated_get(dg).to_mesh_clear()
    BODY[:] = [BVHTree.FromBMesh(bm)]; bm.free()
    hit = BODY[0].ray_cast(Vector((0, -80, 40.5)), Vector((0, 1, 0)))
    cy = hit[0].y if hit[0] else H['chest_y']
    # bib: a gently curved panel over the chest, a strap round the neck
    me = bpy.data.meshes.new('bib'); bm = bmesh.new()
    rows = []
    for zi in range(13):
        z = 22 + zi * (H['sh_z'] - 3.5 - 22) / 12
        half = 7.2 + (12.5 - 7.2) * max(0.0, (36 - z) / 14) if z < 36 else 7.2
        row = []
        for xi in range(9):
            x = -half + 2 * half * xi / 8
            hit = BODY[0].ray_cast(Vector((x, -80, z)), Vector((0, 1, 0))) if BODY else (None,)
            y = (hit[0].y - 0.5) if hit[0] else cy - 0.9 + 0.026 * x * x
            row.append(bm.verts.new((x, y, z)))
        rows.append(row)
    for a, b in zip(rows, rows[1:]):
        for i in range(8):
            bm.faces.new((a[i], a[i + 1], b[i + 1], b[i]))
    bm.normal_update(); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new('bib', me))
    so = o.modifiers.new('th', 'SOLIDIFY'); so.thickness = 0.45; so.offset = 1
    finish(o, ap, outline=0.12)
    for s in (-1, 1):
        tube('strap', smooth_curve([(s * 6.8, cy - 0.6, H['sh_z'] - 4), (s * 5.2, cy + 2.5, H['neck_z'] - 0.5), (s * 3.6, 1.5, H['neck_z'] + 1.5)], 6), 0.55, ap, outline=0.08)
    # pocket seam and the name badge
    tube('seam', [(-5.5, cy - 1.2, 27.5), (5.5, cy - 1.2, 27.5)], 0.18, toon('seamc', '#a77b4c', lo=0.9), outline=0)
    M.box('badge', (6.4, 0.5, 2.3), toon('badge', '#fffaf3', lo=0.85), loc=(0, cy - 1.35, 40.5), bevel=0.25, outline=0.1)
    # the name on the badge is HTML text over the picture (#hlName), so it follows the language


# ---------------------------------------------------------------- render: waist up, front, like the game's helper
def render(name, H):
    """one fixed frame for every pose (so the head never jumps between them): waist up, wide enough for raised arms"""
    sc = bpy.context.scene; cam = sc.camera
    z0, z1, half = 26.0, 104.0, 62.0
    cam.rotation_euler = (math.radians(90), 0, 0)
    cam.location = (0, -80, (z0 + z1) / 2)
    cam.data.ortho_scale = 2 * half   # Blender sizes the longer side
    sc.render.resolution_x = int(RES * 2 * half / (z1 - z0)); sc.render.resolution_y = RES
    sc.render.image_settings.file_format = 'PNG'
    sc.render.filepath = os.path.join(OUTDIR, name + '.png')
    bpy.ops.render.render(write_still=True)
    print('rendered', name)


RES = 720


# name: (mouth, brows, arms)  arms: [(side, kwargs)], side 'L' is on the right of the picture
POSES = {
    'talk':   ('smile', 0.0, [('L', dict(up=4)), ('R', dict(up=4))]),
    'wave':   ('smile', 0.0, [('L', dict(up=28, fwd=35, elbow_fwd=75)), ('R', dict(up=4))]),
    'cheer':  ('open', 0.0, [('L', dict(up=126, elbow_up=8)), ('R', dict(up=126, elbow_up=8))]),
    'warn':   ('o', 0.9, [('R', dict(up=22, elbow_fwd=115)), ('L', dict(up=4))]),
}
for _ang, _up in (('down', 45), ('level', 90), ('up', 135)):
    POSES['point-L-' + _ang] = ('smile', 0.0, [('L', dict(up=_up, fwd=12)), ('R', dict(up=5))])
    POSES['point-R-' + _ang] = ('smile', 0.0, [('R', dict(up=_up, fwd=12)), ('L', dict(up=5))])
# the talking mouth: the same poses with the mouth open
for _k in [k for k, v in POSES.items() if v[0] == 'smile']:
    POSES[_k + '-open'] = ('open',) + POSES[_k][1:]


def build(name):
    global MOUTH, BROW
    M.reset()
    MOUTH, BROW, arms = POSES[name]
    H = body_B()
    hair(H); glasses(H); apron(H)
    for side, kw in arms:
        raise_arm(side, **kw)
    render(name, H)


os.makedirs(OUTDIR, exist_ok=True)
for w in (list(POSES) if WHICH == ['all'] else WHICH):
    build(w)
print('done ->', OUTDIR)
