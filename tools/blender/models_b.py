"""CAFE C&B: the bench objects (cups, portafilter, pitcher, bottles, hopper, bin...) in style B with a real camera.

models.py builds the same objects with toon shading and an orthographic camera, which made them look like flat stickers
next to the café's Cycles renders. This script runs the same model jobs but:
  - every toon() material becomes a real material (steel, chrome, glass, ceramic...) from style_b.py, in Cycles,
    with the soft studio light, a contact shadow and the thin ink line;
  - the camera is a perspective one at barista eye height (a long lens, so the verticals only lean a little), turned a few
    degrees so a side face shows next to the top, like the machine bodies of cafe.py.
Customers, the stool and the tip jar keep their toon look (they are layered sprites for the customer view).

    blender -b -P tools/blender/models_b.py -- assets/models [only1,only2] [res]
"""
import bpy, math, os, sys
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import models as M  # noqa: E402
import style_b as SB  # noqa: E402

SKIP = ('cust-', 'stool', 'tipjar', 'gauge')
EXTRA_TILT = 6.0    # looks down a little more than models.py did
YAW = -11.0         # a few degrees to the right: the right-hand face shows next to the top
LENS = 70.0         # mm on a 36 mm sensor, mild perspective

_mats = {}


def toon_b(name, hexcol, kind='toon', alpha=1.0, edge=0.6, lo=None):
    key = (name, hexcol, kind, alpha)
    if key in _mats:
        return _mats[key]
    if kind == 'glass' or alpha < 1:
        m = SB.pbr(name + 'g', hexcol, rough=0.06, trans=1.0)
        m.use_nodes = True
        m.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = max(0.35, alpha)
    elif kind == 'metal':
        m = SB.pbr(name, hexcol, metal=1, rough=0.26, aniso=0.5)
    elif kind == 'gloss':
        m = SB.pbr(name, hexcol, rough=0.28, coat=0.7)
    elif kind == 'flat':
        m = SB.pbr(name, hexcol, rough=0.7)
    else:
        m = SB.pbr(name, hexcol, rough=0.5)
    _mats[key] = m
    return m


_finish = M.finish
_reset = M.reset


def finish_b(o, mat, outline=0.16, **kw):
    # the inverted-hull outline does not work in Cycles; style_b draws a Freestyle line instead
    return _finish(o, mat, outline=0, **kw)


def reset_b():
    _reset()
    _mats.clear()
    SB.setup(line=True)
    sc = bpy.context.scene
    # no shadow-catcher floor: its shadow would be cut off at the sprite's edge; the game draws the ground shadows (css/bar.css)
    for o in list(bpy.data.objects):
        if o.get('noframe'):
            bpy.data.objects.remove(o)
    sc.cycles.samples = 128


def render_b(name, width_px, tilt=14, pad=0.07, yaw=0):
    sc = bpy.context.scene; cam = sc.camera; cd = cam.data
    cd.type = 'PERSP'; cd.lens = LENS; cd.sensor_width = 36; cd.sensor_fit = 'AUTO'
    cd.shift_x = cd.shift_y = 0; cd.clip_start = 1; cd.clip_end = 3000
    cam.rotation_euler = (math.radians(90 - (tilt + EXTRA_TILT)), 0, math.radians(yaw + YAW))
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in sc.objects:
        if o.type != 'MESH' or o.get('noframe') or o.hide_render:
            continue
        oe = o.evaluated_get(dg); me = oe.to_mesh()
        pts += [oe.matrix_world @ v.co for v in me.vertices]
        oe.to_mesh_clear()
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    centre = (lo + hi) / 2; diag = (hi - lo).length
    view = Vector((0, 0, -1)); view.rotate(cam.rotation_euler)
    cam.location = centre - view * diag * 3.5
    sc.render.resolution_x = sc.render.resolution_y = 1000
    bpy.context.view_layer.update()
    ndc = [world_to_camera_view(sc, cam, p) for p in pts]
    x0, x1 = min(n.x for n in ndc), max(n.x for n in ndc)
    y0, y1 = min(n.y for n in ndc), max(n.y for n in ndc)
    w, h = x1 - x0, y1 - y0
    k = max(w, h) * (1 + 2 * pad)
    cd.lens = LENS / k
    cd.shift_x = ((x0 + x1) / 2 - 0.5) / k
    cd.shift_y = ((y0 + y1) / 2 - 0.5) / k
    px = width_px * M.RES
    sc.render.resolution_x = int(px) if w >= h else max(8, int(px * w / h))
    sc.render.resolution_y = max(8, int(px * h / w)) if w >= h else int(px)
    sc.render.filepath = os.path.join(M.OUT, name + '.webp')
    bpy.ops.render.render(write_still=True)
    print('rendered', name, sc.render.resolution_x, 'x', sc.render.resolution_y)


M.toon = toon_b
M.finish = finish_b
M.reset = reset_b
M.render = render_b

if __name__ == '__main__':
    for name, fn in M.JOBS:
        if M.ONLY and name not in M.ONLY:
            continue
        if name.startswith(SKIP):
            continue
        fn()
    print('done ->', M.OUT)
