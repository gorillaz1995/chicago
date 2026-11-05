"""Export silver-head.glb and render the fixed-camera PNG set (run inside Blender after blender_build.py)."""
import os, math
import bpy

ROOT = os.environ.get("SILVER_HEAD_ROOT", r"C:\Users\tedyf\OneDrive\Documents\KoeiTecmo\chicago_projekt\silver-head")


def export_glb(path=None):
    path = path or os.path.join(ROOT, "_build", "silver-head.raw.glb")
    spin = bpy.data.objects["SpinRoot"]; head = bpy.data.objects["Head"]
    was_hidden = head.hide_get()
    head.hide_set(False)                      # the 10k web mesh may be hidden in favour of Head_HiRes
    bpy.ops.object.select_all(action='DESELECT')
    spin.select_set(True); head.select_set(True)   # Head_HiRes is not selected -> not exported
    bpy.context.view_layer.objects.active = spin
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
        export_texcoords=False, export_normals=True, export_tangents=False, export_materials='EXPORT',
        export_morph=True, export_morph_normal=True, export_morph_tangent=False,
        export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=True, export_frame_step=1,
        export_anim_slide_to_zero=True, export_optimize_animation_size=False,
        export_cameras=False, export_lights=False, export_extras=False, export_skins=False)
    # the exporter evaluates each clip; restore the rest pose afterwards
    head.data.shape_keys.key_blocks["MouthOpen"].value = 0.0
    head.select_set(False)
    head.hide_set(was_hidden)
    bpy.context.scene.frame_set(0)
    return path


def render_set(outdir=None, engine='BLENDER_EEVEE'):
    """8 closed-mouth turntable views + front/profile open, fixed camera/lighting/pivot, alpha PNG.
    Renders whatever head is render-visible (Head_HiRes when present; its mouth follows Head via a driver)."""
    outdir = outdir or os.path.join(ROOT, "renders")
    os.makedirs(outdir, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = engine
    spin = bpy.data.objects["SpinRoot"]; head = bpy.data.objects["Head"]
    key = head.data.shape_keys
    kb = key.key_blocks["MouthOpen"]
    # detach animation while posing (restored afterwards)
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

    for a in range(0, 360, 45):
        shot(f"silver-head_closed_{a:03d}.png", a, 0.0)
    shot("silver-head_open_front.png", 0, 1.0)
    shot("silver-head_open_profile.png", 90, 1.0)
    shot("silver-head_poster_src.png", 0, 0.0)
    spin.rotation_euler = (0.0, 0.0, 0.0)
    kb.value = 0.0
    if spin.animation_data:
        spin.animation_data.action = spin_action
    scene.frame_set(0)
    return files
