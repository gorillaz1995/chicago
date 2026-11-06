"""Build silver-head_v6.blend from _build/v5_work/blender_data_v5.npz (run inside Blender 5.x, rebuilds the open session in place).

SpinRoot (empty, pivot at skull centre) > Head (mesh 'Head': Silver + MouthDark, shape key MouthOpen)
actions Turntable (20 s, SpinRoot Z rotation) and MouthOpen (0.75 s, morph 0 -> 1, eased), studio world, fixed render camera.
Blender frame: Z up, face toward -Y.  glTF export (+Y up) gives Y up, face toward +Z.  Units: metres.
"""
import os, math
import bpy
import numpy as np

ROOT = os.environ.get("SILVER_HEAD_ROOT", r"C:\Users\tedyf\OneDrive\Documents\KoeiTecmo\chicago_projekt\public\silver-head")
DATA = os.path.join(ROOT, "_build", "v6_work", "blender_data_v6.npz")
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


def clean_session():
    scene = bpy.context.scene
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in list(bpy.data.collections):
        bpy.data.collections.remove(coll)
    for blocks in (bpy.data.meshes, bpy.data.shape_keys, bpy.data.materials, bpy.data.actions, bpy.data.cameras, bpy.data.images):
        for b in list(blocks):
            try:
                blocks.remove(b)
            except Exception:
                pass
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


def build(data=DATA):
    d = np.load(data)
    scene = clean_session()
    scene.render.fps = FPS
    scene.frame_start = 0
    scene.frame_end = TURN_FRAMES
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0

    Vb, F = d["Vb"], d["F"]
    me = bpy.data.meshes.new("Head")
    me.from_pydata(Vb.tolist(), [], F.tolist())
    changed = me.validate(clean_customdata=False)
    me.update()
    assert not changed and len(me.vertices) == len(Vb) and len(me.polygons) == len(F), "mesh validation altered the data"
    me.shade_smooth()
    silver = make_material("Silver", (0.93, 0.97, 1.0), 0.0, 0.06)        # glass fallback; the site swaps in its glass shader
    _p = silver.node_tree.nodes.get("Principled BSDF"); _p.inputs["Transmission Weight"].default_value = 1.0; _p.inputs["IOR"].default_value = 1.45
    dark = make_material("MouthDark", (0.018, 0.018, 0.022), 0.0, 0.85)
    me.materials.append(silver)
    me.materials.append(dark)
    me.polygons.foreach_set("material_index", d["dark"].astype(np.int32))
    me.normals_split_custom_set_from_vertices([tuple(n) for n in d["Nb"]])
    head = bpy.data.objects.new("Head", me)
    scene.collection.objects.link(head)

    gme = bpy.data.meshes.new("Gems")
    gme.from_pydata(d["GV"].tolist(), [], d["GF"].tolist()); gme.update(); gme.shade_flat()
    gem = make_material("Gem", (1.0, 1.0, 1.0), 0.0, 0.0)
    _g = gem.node_tree.nodes.get("Principled BSDF"); _g.inputs["Transmission Weight"].default_value = 1.0; _g.inputs["IOR"].default_value = 2.42
    gme.materials.append(gem)
    gems = bpy.data.objects.new("Gems", gme); scene.collection.objects.link(gems); gems.parent = head
    head.shape_key_add(name="Basis", from_mix=False)
    sk = head.shape_key_add(name="MouthOpen", from_mix=False)
    sk.data.foreach_set("co", d["Vo"].astype(np.float32).ravel())
    sk.slider_min, sk.slider_max, sk.value = 0.0, 1.0, 0.0
    me.shape_keys.name = "HeadKeys"
    me.update()

    vg = head.vertex_groups.new(name="JawWeight")      # reference only: the weight the MouthOpen key was built with
    W = d["W"]
    for i in np.nonzero(W > 1e-4)[0]:
        vg.add([int(i)], float(W[i]), 'REPLACE')

    spin = bpy.data.objects.new("SpinRoot", None)
    spin.empty_display_type = 'PLAIN_AXES'
    spin.empty_display_size = 0.06
    scene.collection.objects.link(spin)
    head.parent = spin
    spin.rotation_mode = 'XYZ'

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
    key.animation_data.action = None
    tr = key.animation_data.nla_tracks.new()
    tr.name = "MouthOpen"
    tr.strips.new("MouthOpen", 0, mouth)
    tr.mute = True
    kb.value = 0.0

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
    mapn.inputs["Rotation"].default_value = (0.0, 0.0, 0.0)
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
        ee.use_raytracing = True
    if hasattr(ee, "taa_render_samples"):
        ee.taa_render_samples = 128

    organise(scene, spin, head, cam)
    for c_ in gems.users_collection: c_.objects.unlink(gems)
    bpy.data.collections["Silver Head (web GLB)"].objects.link(gems)
    scene.frame_set(0)
    return head, spin


def organise(scene, spin, head, cam):
    c = bpy.data.collections.new("Silver Head (web GLB)")
    scene.collection.children.link(c)
    for o in (spin, head):
        c.objects.link(o)
        if o.name in scene.collection.objects:
            scene.collection.objects.unlink(o)


if __name__ == "__main__":
    build()
