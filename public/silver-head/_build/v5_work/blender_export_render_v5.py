"""Export silver-head_v5 GLB and render the fixed-camera PNG set (run inside Blender after blender_build_v4.py)."""
import os, math
import bpy

ROOT = os.environ.get("SILVER_HEAD_ROOT", r"C:\Users\tedyf\OneDrive\Documents\KoeiTecmo\chicago_projekt\public\silver-head")


def export_glb(path=None):
    path = path or os.path.join(ROOT, "_build", "v5_work", "silver-head_v5.raw.glb")
    spin = bpy.data.objects["SpinRoot"]; head = bpy.data.objects["Head"]
    bpy.ops.object.select_all(action='DESELECT')
    spin.select_set(True); head.select_set(True)
    bpy.context.view_layer.objects.active = spin
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
              export_texcoords=False, export_normals=True, export_tangents=False, export_materials='EXPORT',
              export_morph=True, export_morph_normal=True, export_morph_tangent=False,
              export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=True, export_frame_step=1,
              export_anim_slide_to_zero=True, export_optimize_animation_size=False,
              export_cameras=False, export_lights=False, export_extras=False, export_skins=False)
    try:
        bpy.ops.export_scene.gltf(export_try_sparse_sk=False, **kw)
    except TypeError:
        bpy.ops.export_scene.gltf(**kw)
    head.data.shape_keys.key_blocks["MouthOpen"].value = 0.0
    head.select_set(False)
    bpy.context.scene.frame_set(0)
    return path


def render_set(outdir, prefix="silver-head_v5", engine='BLENDER_EEVEE', which=None):
    os.makedirs(outdir, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = engine
    spin = bpy.data.objects["SpinRoot"]; head = bpy.data.objects["Head"]
    kb = head.data.shape_keys.key_blocks["MouthOpen"]
    spin_action = spin.animation_data.action if spin.animation_data else None
    if spin.animation_data:
        spin.animation_data.action = None
    files = []

    def shot(name, yaw_deg, mouth):
        spin.rotation_euler = (0.0, 0.0, math.radians(yaw_deg))
        kb.value = mouth
        scene.render.filepath = os.path.join(outdir, name)
        bpy.ops.render.render(write_still=True)
        files.append(scene.render.filepath)

    jobs = [(f"{prefix}_closed_{a:03d}.png", a, 0.0) for a in range(0, 360, 45)]
    jobs += [(f"{prefix}_open_front.png", 0, 1.0), (f"{prefix}_open_profile.png", 90, 1.0), (f"{prefix}_poster_src.png", 0, 0.0)]
    for name, yaw, mouth in jobs:
        if which is None or name in which:
            shot(name, yaw, mouth)
    spin.rotation_euler = (0.0, 0.0, 0.0)
    kb.value = 0.0
    if spin.animation_data:
        spin.animation_data.action = spin_action
    scene.frame_set(0)
    return files
