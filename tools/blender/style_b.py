"""CAFE C&B look, style B as picked in issue #16 (take B of tools/style-test): real materials in Cycles with a thin,
soft ink line. Use it for every model of the café rebuild (#17):

    import models as M, style_b as SB
    M.reset(); SB.setup()            # Cycles on the GPU, AgX, studio light, contact shadow, the ink line
    ...build with M.lathe / M.box / M.cyl / M.tube, materials from SB.mat('steel') ... and outline=0
    M.render(name, width_px)

  render     Cycles, OptiX (CUDA as a fallback), 96 samples + denoise, AgX "Base Contrast", transparent film
  light      the procedural soft-box world of models.reset() at 0.9, a warm sun key from the upper left (2.6,
             #fff0d6-ish), a cool 900 W area fill from the right; no HDRI (downloading one needs the owner's yes)
  shadow     a shadow-catcher floor under the model (marked noframe, so render() frames the model only)
  line       Freestyle silhouette + borders + creases over 120°, #4b2e2b at 75 %, 1.3 px x RES; the floor is
             left out of it. (The inverted-hull outline of models.py does not work in Cycles.)
  materials  the MATERIALS palette below: brushed steel, chrome, enamel, walnut, glass, ceramic...
"""
import bpy, math
import models as M

PBR = {}


def pbr(name, hexcol, metal=0.0, rough=0.4, aniso=0.0, coat=0.0, emit=0.0, trans=0.0, wood=False):
    """a Principled material; wood=True gives walnut growth rings"""
    key = (name, hexcol, metal, rough, aniso, coat, emit, trans, wood)
    if key in PBR:
        return PBR[key]
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links
    b = N.get('Principled BSDF')
    col = M.srgb(hexcol) + (1,)
    b.inputs['Base Color'].default_value = col
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if aniso:
        b.inputs['Anisotropic'].default_value = aniso
    if coat:
        b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = 0.08
    if emit:
        b.inputs['Emission Color'].default_value = col; b.inputs['Emission Strength'].default_value = emit
    if trans:
        b.inputs['Transmission Weight'].default_value = trans; b.inputs['IOR'].default_value = 1.45
    if wood:
        # walnut: soft growth rings from a wave texture
        tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1, 1, 6)
        wv = N.new('ShaderNodeTexWave'); wv.wave_type = 'RINGS'; wv.inputs['Scale'].default_value = 2.2; wv.inputs['Distortion'].default_value = 6
        rp = N.new('ShaderNodeValToRGB')
        rp.color_ramp.elements[0].color = M.srgb('#4a2716') + (1,); rp.color_ramp.elements[1].color = M.srgb('#8a5634') + (1,)
        L.new(tc.outputs['Object'], mp.inputs[0]); L.new(mp.outputs[0], wv.inputs[0]); L.new(wv.outputs['Fac'], rp.inputs[0])
        L.new(rp.outputs[0], b.inputs['Base Color'])
    PBR[key] = m
    return m


# the café's palette in style B (name -> pbr() arguments)
MATERIALS = {
    'steel': dict(hexcol='#c9d2d7', metal=1, rough=0.32, aniso=0.6), 'chrome': dict(hexcol='#e4e9ec', metal=1, rough=0.08),
    'dark': dict(hexcol='#2e2a28', rough=0.35, coat=0.6), 'enamel': dict(hexcol='#e8968c', rough=0.3, coat=0.9),
    'walnut': dict(hexcol='#6a3f25', rough=0.35, coat=0.5, wood=True), 'glass': dict(hexcol='#1d2523', rough=0.1, coat=1),
    'lcd': dict(hexcol='#9fe0a6', emit=1.5), 'mint': dict(hexcol='#8cc7ae', rough=0.25, coat=0.8),
    'cream': dict(hexcol='#fff6ea', rough=0.4), 'ceramic': dict(hexcol='#fbf7f0', rough=0.15, coat=0.9),
    'blush': dict(hexcol=M.BLUSH, rough=0.4), 'rubber': dict(hexcol='#2b2422', rough=0.8),
    'face': dict(hexcol='#fffaf3', rough=0.5), 'ink': dict(hexcol='#4b2e2b', rough=0.5),
    'brass': dict(hexcol='#d9a83c', metal=1, rough=0.25), 'coffee': dict(hexcol='#5b3423', rough=0.2),
}


def mat(kind):
    return pbr(kind, **MATERIALS[kind])


def setup(line=True, warm=False):
    """after models.reset(): Cycles, light, contact shadow and (line=True) the ink line.
    warm=True is take C of the test (warmer, punchier key); style B is warm=False, line=True."""
    PBR.clear()
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for dev in ('OPTIX', 'CUDA'):
        try:
            prefs.compute_device_type = dev; prefs.get_devices()
            for d in prefs.devices:
                d.use = True
            sc.cycles.device = 'GPU'
            break
        except Exception:
            continue
    sc.cycles.samples = 96; sc.cycles.use_denoising = True
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Punchy' if warm else 'AgX - Base Contrast'
    # the soft-box world lights the steel; a warm key from the upper left and a cool fill from the right
    sc.world.node_tree.nodes['Background'].inputs[1].default_value = 0.9
    key = bpy.data.objects['key']; key.data.energy = 3.2 if warm else 2.6
    key.data.color = (1.0, 0.88, 0.74) if warm else (1.0, 0.93, 0.84)
    fill = bpy.data.lights.new('fill', 'AREA'); fill.energy = 900; fill.size = 30; fill.color = (0.86, 0.92, 1.0)
    fo = M.link(bpy.data.objects.new('fill', fill)); fo.location = (40, -30, 25)
    fo.rotation_euler = (math.radians(60), 0, math.radians(55))
    # a soft contact shadow under the model, in a collection of its own so the line leaves its edges alone
    bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, 0))
    fl = bpy.context.active_object; fl.is_shadow_catcher = True; fl['noframe'] = True
    floor = bpy.data.collections.new('floor'); sc.collection.children.link(floor)
    sc.collection.objects.unlink(fl); floor.objects.link(fl)
    if line:
        # a thin, soft ink line drawn at render time (silhouette, borders, sharp creases), the game's outline colour
        sc.render.use_freestyle = True; sc.render.line_thickness_mode = 'ABSOLUTE'; sc.render.line_thickness = 1.3 * M.RES
        fs = bpy.context.view_layer.freestyle_settings; fs.crease_angle = math.radians(120)
        ls = fs.linesets[0] if len(fs.linesets) else fs.linesets.new('ink')
        ls.select_silhouette = True; ls.select_border = True; ls.select_crease = True
        ls.select_by_collection = True; ls.collection = floor; ls.collection_negation = 'EXCLUSIVE'
        if ls.linestyle is None:
            ls.linestyle = bpy.data.linestyles.new('ink')
        ls.linestyle.color = M.srgb('#4b2e2b'); ls.linestyle.alpha = 0.75; ls.linestyle.thickness = 1.3
