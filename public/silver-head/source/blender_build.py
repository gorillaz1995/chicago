"""Build silver-head.blend from _build/blender_data.npz (run inside Blender 4.2+ / 5.x).

Creates: SpinRoot (empty, pivot at skull centre) > Head (mesh, Silver + MouthDark, shape key MouthOpen),
actions Turntable (20 s, SpinRoot Z rotation) and MouthOpen (0.75 s, morph 0 -> 1, eased),
studio world (studio-env.hdr), fixed render camera.
Blender frame: Z up, face toward -Y.  glTF export (+Y up) gives Y up, face toward +Z.
"""
import os, math
import bpy
import numpy as np

ROOT = os.environ.get("SILVER_HEAD_ROOT", r"C:\Users\tedyf\OneDrive\Documents\KoeiTecmo\chicago_projekt\silver-head")
FPS = 60
TURN_FRAMES = 20 * FPS        # 1200 frames = 20 s
MOUTH_FRAMES = 45             # 0.75 s at 60 fps


def fcurves_of(action):
    try:
        return list(action.fcurves)
    except AttributeError:
        out = []
        for layer in action.layers:
            for strip in layer.strips:
                for cb in strip.channelbags:
                    out.extend(cb.fcurves)
        return out


def clean_scene():
    scene = bpy.context.scene
    for o in list(scene.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)
    for w in list(bpy.data.worlds):
        if w is not scene.world:
            bpy.data.worlds.remove(w)
    bpy.data.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)
    return scene


def make_material(name, color, metallic, roughness):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = roughness
    m.diffuse_color = (*color, 1.0)
    m.metallic = metallic
    m.roughness = roughness
    return m


def build():
    d = np.load(os.path.join(ROOT, "_build", "blender_data.npz"))
    scene = clean_scene()
    scene.render.fps = FPS
    scene.frame_start = 0
    scene.frame_end = TURN_FRAMES
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0

    # ---------------------------------------------------------------- mesh
    Vb, F = d["Vb"], d["F"]
    me = bpy.data.meshes.new("Head")
    me.from_pydata(Vb.tolist(), [], F.tolist())
    me.validate(clean_customdata=False)
    me.update()
    me.shade_smooth()
    silver = make_material("Silver", (0.86, 0.87, 0.90), 1.0, 0.25)
    dark = make_material("MouthDark", (0.018, 0.018, 0.022), 0.0, 0.85)
    me.materials.append(silver)
    me.materials.append(dark)
    me.polygons.foreach_set("material_index", d["dark"].astype(np.int32))
    # high-quality normals sampled from the sculpt (custom split normals)
    me.normals_split_custom_set_from_vertices([tuple(n) for n in d["Nb"]])
    head = bpy.data.objects.new("Head", me)
    scene.collection.objects.link(head)

    # shape keys
    head.shape_key_add(name="Basis", from_mix=False)
    sk = head.shape_key_add(name="MouthOpen", from_mix=False)
    sk.data.foreach_set("co", d["Vo"].astype(np.float32).ravel())
    sk.slider_min, sk.slider_max, sk.value = 0.0, 1.0, 0.0
    me.shape_keys.name = "HeadKeys"
    me.update()

    # jaw weight used to build the shape key (reference only)
    vg = head.vertex_groups.new(name="JawWeight")
    W = d["W"]
    for i in np.nonzero(W > 1e-4)[0]:
        vg.add([int(i)], float(W[i]), 'REPLACE')

    # ---------------------------------------------------------------- pivot
    spin = bpy.data.objects.new("SpinRoot", None)
    spin.empty_display_type = 'PLAIN_AXES'
    spin.empty_display_size = 0.06
    scene.collection.objects.link(spin)
    head.parent = spin
    spin.rotation_mode = 'XYZ'

    # ---------------------------------------------------------------- animations
    spin.rotation_euler = (0.0, 0.0, 0.0)
    spin.keyframe_insert("rotation_euler", index=2, frame=0)
    spin.rotation_euler = (0.0, 0.0, 2.0 * math.pi)
    spin.keyframe_insert("rotation_euler", index=2, frame=TURN_FRAMES)
    turn = spin.animation_data.action
    turn.name = "Turntable"
    for fc in fcurves_of(turn):
        for kp in fc.keyframe_points:
            kp.interpolation = 'LINEAR'
    spin.rotation_euler = (0.0, 0.0, 0.0)

    key = me.shape_keys
    kb = key.key_blocks["MouthOpen"]
    kb.value = 0.0
    kb.keyframe_insert("value", frame=0)
    kb.value = 1.0
    kb.keyframe_insert("value", frame=MOUTH_FRAMES)
    mouth = key.animation_data.action
    mouth.name = "MouthOpen"
    for fc in fcurves_of(mouth):
        for kp in fc.keyframe_points:
            kp.interpolation = 'BEZIER'
            kp.handle_left_type = kp.handle_right_type = 'AUTO_CLAMPED'   # ease in-out
        fc.update()
    turn.use_fake_user = True
    mouth.use_fake_user = True
    # Keep MouthOpen as its own clip: stash it on a muted NLA track so the timeline previews the
    # turntable with a closed mouth. The glTF exporter (Actions mode) still exports it as a clip.
    key.animation_data.action = None
    tr = key.animation_data.nla_tracks.new()
    tr.name = "MouthOpen"
    tr.strips.new("MouthOpen", 0, mouth)
    tr.mute = True
    kb.value = 0.0

    # ---------------------------------------------------------------- world / camera / render
    world = bpy.data.worlds.new("StudioWorld")
    scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    mapn = nt.nodes.new("ShaderNodeMapping")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    env.image = bpy.data.images.load(os.path.join(ROOT, "studio-env.hdr"), check_existing=True)
    mapn.inputs["Rotation"].default_value = (0.0, 0.0, 0.0)   # Blender and three.js share the same equirect orientation
    nt.links.new(tc.outputs["Generated"], mapn.inputs["Vector"])
    nt.links.new(mapn.outputs["Vector"], env.inputs["Vector"])
    nt.links.new(env.outputs["Color"], bg.inputs["Color"])
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])
    bg.inputs["Strength"].default_value = 1.0

    cam_data = bpy.data.cameras.new("RenderCam")
    cam_data.lens = 85.0
    cam_data.sensor_fit = 'HORIZONTAL'
    cam_data.sensor_width = 36.0
    cam_data.display_size = 0.04
    cam = bpy.data.objects.new("RenderCam", cam_data)
    scene.collection.objects.link(cam)
    cam.location = (0.0, -0.80, 0.0)
    cam.rotation_euler = (math.pi / 2, 0.0, 0.0)
    scene.camera = cam

    scene.render.resolution_x = 1024
    scene.render.resolution_y = 1024
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    try:
        scene.view_settings.view_transform = 'Khronos PBR Neutral'
    except TypeError:
        scene.view_settings.view_transform = 'Standard'
    ee = scene.eevee
    if hasattr(ee, "use_raytracing"):
        ee.use_raytracing = True          # chrome reflects its own nose/brows/lips in Blender renders
    if hasattr(ee, "taa_render_samples"):
        ee.taa_render_samples = 128

    hires = add_hires(scene, spin, head, silver, dark)
    organise(scene, spin, head, hires, cam)
    scene.frame_set(0)
    return head, spin


def add_hires(scene, spin, head, silver, dark):
    """Render-quality mesh of the same sculpt (~150k tris). Not exported to the GLB.
    Its MouthOpen follows the web mesh's MouthOpen through a driver, so one slider/clip drives both."""
    p = os.path.join(ROOT, "_build", "hires_data.npz")
    if not os.path.exists(p):
        return None
    h = np.load(p)
    me = bpy.data.meshes.new("Head_HiRes")
    me.from_pydata(h["Vb"].astype(np.float64).tolist(), [], h["F"].tolist())
    me.validate(clean_customdata=False)
    me.update()
    me.shade_smooth()
    me.materials.append(silver)
    me.materials.append(dark)
    me.polygons.foreach_set("material_index", h["dark"].astype(np.int32))
    obj = bpy.data.objects.new("Head_HiRes", me)
    scene.collection.objects.link(obj)
    obj.parent = spin
    obj.shape_key_add(name="Basis", from_mix=False)
    sk = obj.shape_key_add(name="MouthOpen", from_mix=False)
    sk.data.foreach_set("co", h["Vo"].astype(np.float32).ravel())
    sk.slider_min, sk.slider_max, sk.value = 0.0, 1.0, 0.0
    me.shape_keys.name = "HeadHiResKeys"
    fc = sk.driver_add("value")
    drv = fc.driver
    drv.type = 'AVERAGE'
    var = drv.variables.new()
    var.name = "mouth"
    var.type = 'SINGLE_PROP'
    var.targets[0].id_type = 'KEY'
    var.targets[0].id = head.data.shape_keys
    var.targets[0].data_path = 'key_blocks["MouthOpen"].value'
    return obj


def organise(scene, spin, head, hires, cam):
    """Collections: 'Silver Head (web GLB)' = SpinRoot + Head (10k, hidden), 'Silver Head (render)' = Head_HiRes."""
    def coll(name):
        c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
        if c.name not in scene.collection.children:
            scene.collection.children.link(c)
        return c
    web = coll("Silver Head (web GLB)")
    for o in (spin, head):
        if o.name not in web.objects:
            web.objects.link(o)
        if o.name in scene.collection.objects:
            scene.collection.objects.unlink(o)
    if hires is not None:
        rnd = coll("Silver Head (render)")
        rnd.objects.link(hires)
        scene.collection.objects.unlink(hires)
        # show the render-quality head; the 10k web mesh stays exportable but hidden
        head.hide_set(True)
        head.hide_render = True
    for c in list(bpy.data.collections):
        if c.name == "Collection" and len(c.all_objects) == 0:
            bpy.data.collections.remove(c)


def set_viewport(frame_obj_name="Head_HiRes"):
    """Material Preview lit by the scene's studio world, framed on the head, 3/4 view."""
    from mathutils import Euler
    for win in bpy.context.window_manager.windows:
        for area in win.screen.areas:
            if area.type != 'VIEW_3D':
                continue
            sp = area.spaces.active
            sp.shading.type = 'MATERIAL'
            sp.shading.use_scene_world = True
            sp.shading.use_scene_lights = True
            sp.overlay.show_relationship_lines = False
            r3d = sp.region_3d
            r3d.view_perspective = 'PERSP'
            r3d.view_location = (0.0, 0.0, 0.0)
            r3d.view_rotation = Euler((math.radians(84), 0.0, math.radians(28)), 'XYZ').to_quaternion()
            r3d.view_distance = 0.75
            sp.lens = 70


if __name__ == "__main__":
    build()
