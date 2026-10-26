"""CAFE C&B style test (issue #16): the two-group espresso machine in three takes on style B, to pick one before the
whole café is rebuilt (#17). Same model every time; only the shading, the outline and the light change.

  toon   the game's current cel look (models.py), softened: four tone bands, a thin outline
  pbr    Cycles, real materials (brushed steel, chrome, enamel, walnut, glass), soft studio light, thin soft outline
  clean  Cycles, the same materials, no outline, a warmer key light and a punchier look

Nothing is downloaded: the studio light is the procedural soft-box world from models.py.
The owner picked B (2026-10-26); its settings are in style_b.py for the rebuild (#17).
Run:  blender -b -P tools/blender/style_test.py -- tools/style-test [toon,pbr,clean] [res]
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import models as M  # noqa: E402  (helpers: lathe, box, cyl, tube, render, toon...)
import style_b as SB  # noqa: E402  (the picked look: materials, light and line for takes B and C)

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else 'tools/style-test')
ONLY = set(ARGS[1].split(',')) if len(ARGS) > 1 and ARGS[1] else None
M.RES = float(ARGS[2]) if len(ARGS) > 2 else 1.0
M.OUT = OUT
os.makedirs(OUT, exist_ok=True)

STYLE = 'toon'


# one palette, three shadings
def mat(kind):
    if STYLE == 'toon':
        return {
            'steel': lambda: M.toon('steel', '#a9b4ba', 'metal'), 'chrome': lambda: M.toon('chrome', M.CHROME, 'metal'),
            'dark': lambda: M.toon('dark', '#3a3533', 'gloss'), 'enamel': lambda: M.toon('enamel', '#e8968c', 'gloss'),
            'walnut': lambda: M.toon('walnut', M.WALNUT, 'gloss'), 'glass': lambda: M.toon('glass', '#26302e', 'gloss'),
            'lcd': lambda: M.toon('lcd', '#9fe0a6', 'flat'), 'mint': lambda: M.toon('mint', '#8cc7ae', 'gloss'),
            'cream': lambda: M.toon('cream', '#fffaf3', 'gloss'), 'ceramic': lambda: M.toon('ceramic', '#fbf7f0', 'gloss'),
            'blush': lambda: M.toon('blush', M.BLUSH), 'rubber': lambda: M.toon('rubber', '#2b2422'),
            'face': lambda: M.toon('face', '#fffaf3'), 'ink': lambda: M.toon('needle', '#4b2e2b'),
            'brass': lambda: M.toon('brass', '#d9a83c', 'metal'), 'coffee': lambda: M.toon('coffee', '#5b3423'),
        }[kind]()
    return SB.mat(kind)


def OL(t):
    # outline thickness per style: the game's look keeps a thin one, the clean take has none
    # (Cycles ignores the back-face culling the inverted-hull outline needs: the pbr take draws Freestyle lines instead)
    return {'toon': t * 0.55, 'pbr': 0, 'clean': 0}[STYLE]


def front(o, x, z, y=-7.0):
    # a disc / knob facing the camera (the machine's front is at -y)
    o.rotation_euler = (math.radians(90), 0, 0); o.location = (x, y, z)
    return o


def machine():
    steel, chrome, dark = mat('steel'), mat('chrome'), mat('dark')
    # feet, plinth, body with enamel side panels
    for x in (-11, 11):
        for y in (-5.5, 5.5):
            M.cyl('foot', 0.7, 0.8, mat('rubber'), loc=(x, y, 0), outline=OL(0.08))
    M.box('plinth', (26, 15, 1.3), dark, loc=(0, 0, 1.45), bevel=0.3, outline=OL(0.14))
    M.box('body', (23, 14, 13.6), steel, loc=(0, 0, 8.9), bevel=0.6, outline=OL(0.16))
    for s in (-1, 1):
        M.box('side', (0.7, 14.6, 14.2), mat('enamel'), loc=(s * 11.9, 0, 8.9), bevel=0.3, outline=OL(0.14))
    # cup warmer on top: a dark grille in a chrome rail, three cups upside down
    M.box('warmer', (22, 13, 0.4), dark, loc=(0, 0, 15.9), bevel=0.1, outline=OL(0.08))
    rail = [(-11, -6.5, 16.6), (11, -6.5, 16.6), (11, 6.5, 16.6), (-11, 6.5, 16.6), (-11, -6.5, 16.6)]
    M.tube('rail', rail, 0.28, chrome, outline=OL(0.08))
    for x in (-6, 0, 6):
        M.lathe('cup', [(1.3, 16.1), (1.7, 18.2), (0.0001, 18.2)], mat('ceramic'), loc=(x, 1.5, 0), outline=OL(0.08))
        M.lathe('band', [(1.48, 16.9), (1.6, 17.4)], mat('blush'), loc=(x, 1.5, 0), outline=0, cap_top=False, cap_bot=False)
    # control panel: black glass with the shot display, the brew button, the foam keys and the steam button
    M.box('panel', (20, 0.5, 3.4), mat('glass'), loc=(0, -7.05, 13.4), bevel=0.25, outline=OL(0.1))
    M.box('lcd', (3.0, 0.3, 1.3), mat('lcd'), loc=(-7.2, -7.35, 13.4), bevel=0.1, outline=OL(0.06))
    front(M.cyl('brew', 1.15, 0.6, mat('mint'), outline=OL(0.08)), -3.2, 13.4, y=-7.3)
    for i in range(3):
        M.box('key', (1.25, 0.35, 0.8), mat('cream'), loc=(2.6 + i * 1.6, -7.35, 14.1), bevel=0.12, outline=OL(0.05))
    M.box('steam', (4.4, 0.35, 0.8), mat('cream'), loc=(4.2, -7.35, 12.75), bevel=0.3, outline=OL(0.05))
    # logo plate and two gauges between the groups
    M.box('plate', (3.4, 0.25, 1.2), chrome, loc=(0, -7.05, 11.0), bevel=0.15, outline=OL(0.06))
    t = bpy.data.curves.new('logo', 'FONT'); t.body = 'C&B'; t.size = 0.9; t.align_x = 'CENTER'; t.extrude = 0.04
    to = M.link(bpy.data.objects.new('logo', t)); to.rotation_euler = (math.radians(90), 0, 0); to.location = (0, -7.25, 10.7)
    to.data.materials.append(mat('ink'))
    for x in (-1.6, 1.6):
        front(M.cyl('gauge', 1.1, 0.5, chrome, outline=OL(0.06)), x, 8.9, y=-7.0)
        front(M.cyl('dial', 0.9, 0.1, mat('face'), outline=0), x, 8.9, y=-7.5)
        n = M.box('needle', (0.12, 0.08, 0.75), mat('ink'), loc=(x + 0.18, -7.62, 9.1), bevel=0, outline=0)
        n.rotation_euler = (0, math.radians(35 if x < 0 else -20), 0)
    # two group heads, a portafilter locked into the left one, a cup on the drip tray under it
    for x in (-6.2, 6.2):
        # a chrome group head: the bayonet ring at the bottom, a waisted body, a collar where it meets the machine
        g = M.lathe('group', [(0.0001, 0), (2.25, 0), (2.25, 0.75), (1.75, 0.95), (1.6, 1.9), (2.05, 2.2), (2.05, 2.85), (1.5, 3.05), (0.0001, 3.05)], chrome, loc=(x, -8.2, 5.6), outline=OL(0.1))
        M.box('neck', (2.6, 1.6, 1.6), chrome, loc=(x, -7.3, 8.1), bevel=0.4, outline=OL(0.08))
    M.lathe('basket', [(2.0, -0.6), (2.15, 0.2), (2.0, 0.25)], chrome, loc=(-6.2, -8.2, 5.2), outline=OL(0.08))
    M.tube('pfh', [(-6.2, -10.2, 5.4), (-6.6, -14.6, 4.9)], 0.42, chrome, outline=OL(0.08))
    M.lathe('handle', M.soft([(0.0001, 0), (0.6, 0), (0.75, 1.2), (0.8, 4.0), (0.7, 5.2), (0.0001, 5.4)]), mat('walnut'), outline=OL(0.1)) \
        .rotation_euler = (math.radians(96), 0, math.radians(-5))
    bpy.data.objects['handle'].location = (-6.65, -14.3, 4.85)
    for xx in (-6.6, -5.8):
        M.cyl('spout', 0.22, 0.7, chrome, loc=(xx, -8.2, 4.5), outline=OL(0.05))
    M.lathe('tcup', [(0.0001, 2.4), (1.35, 2.4), (1.75, 4.6), (1.8, 4.7)], mat('ceramic'), loc=(-6.2, -8.6, 0), cap_top=False, outline=OL(0.1))
    M.lathe('crema', [(0.0001, 4.25), (1.68, 4.25)], mat('coffee'), loc=(-6.2, -8.6, 0), outline=0)
    M.tube('cuph', M.smooth_curve([(-4.5, -8.6, 4.2), (-3.6, -8.6, 3.8), (-3.7, -8.6, 2.9), (-4.6, -8.6, 2.7)], 4), 0.22, mat('ceramic'), outline=OL(0.06))
    # drip tray: a chrome grille on a dark tray across the front
    M.box('tray', (21, 5.4, 0.9), dark, loc=(0, -9.4, 2.2), bevel=0.2, outline=OL(0.1))
    for i in range(12):
        M.box('slat', (0.9, 4.6, 0.25), chrome, loc=(-9.35 + i * 1.7, -9.4, 2.75), bevel=0.05, outline=0)
    # steam wand on the right, hot-water spout on the left
    M.tube('wand', M.smooth_curve([(10.6, -7.2, 12.0), (11.2, -8.6, 11.2), (11.4, -9.6, 8.0), (11.0, -10.2, 4.6)], 6), 0.32, chrome, outline=OL(0.08))
    front(M.cyl('wknob', 0.7, 0.9, mat('dark'), outline=OL(0.06)), 10.6, 12.6, y=-7.1)
    M.tube('hot', M.smooth_curve([(-10.6, -7.2, 11.6), (-10.9, -8.6, 10.6), (-11.0, -9.2, 7.2)], 5), 0.3, chrome, outline=OL(0.08))
    front(M.cyl('hknob', 0.7, 0.9, mat('dark'), outline=OL(0.06)), -10.6, 12.6, y=-7.1)


def setup(style):
    global STYLE
    STYLE = style
    M.reset()
    if style != 'toon':
        SB.setup(line=style == 'pbr', warm=style == 'clean')

for style in ('toon', 'pbr', 'clean'):
    if ONLY and style not in ONLY:
        continue
    setup(style)
    machine()
    M.render('machine-' + style, 420, tilt=10, yaw=-14)
print('done ->', OUT)
