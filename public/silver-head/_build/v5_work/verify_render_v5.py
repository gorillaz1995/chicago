"""Run in background Blender:  blender -b silver-head_v5.blend --python verify_render_v5.py
Replaces the built Head/SpinRoot with a fresh import of silver-head_v5.glb, writes verify_v5.json, renders the PNG set."""
import bpy, sys, os, json, math, time
ROOT = r"C:\Users\tedyf\OneDrive\Documents\KoeiTecmo\chicago_projekt\public\silver-head"
W = os.path.join(ROOT, "_build", "v5_work")
sys.path.insert(0, W)
import blender_export_render_v5 as E
t0 = time.time()
for n in ("Head", "SpinRoot"):
    if n in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects[n], do_unlink=True)
for blocks in (bpy.data.meshes, bpy.data.materials, bpy.data.actions, bpy.data.shape_keys):
    for b in list(blocks):
        try: blocks.remove(b)
        except Exception: pass
bpy.data.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, "silver-head_v5.glb"))
bpy.data.objects["SpinRoot"].rotation_mode = "XYZ"       # the glTF importer uses quaternions; render_set drives rotation_euler
rep = {"objects": [(o.name, o.type, o.parent.name if o.parent else None) for o in bpy.data.objects]}
head = bpy.data.objects["Head"]; me = head.data
me.calc_loop_triangles()
rep["tris"] = len(me.loop_triangles); rep["verts"] = len(me.vertices)
rep["materials"] = [(m.name, [round(v, 3) for v in m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value[:3]],
                     m.node_tree.nodes["Principled BSDF"].inputs["Metallic"].default_value, round(m.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value, 3)) for m in bpy.data.materials]
rep["shape_keys"] = [k.name for k in me.shape_keys.key_blocks]
rep["actions"] = [(a.name, [round(a.frame_range[0], 2), round(a.frame_range[1], 2)]) for a in bpy.data.actions]
rep["fps"] = bpy.context.scene.render.fps
kb = me.shape_keys.key_blocks["MouthOpen"]
import numpy as np
def dark_bbox(val):
    kb.value = val
    dg = bpy.context.evaluated_depsgraph_get(); ev = head.evaluated_get(dg); em = ev.to_mesh()
    co = np.array([v.co[:] for v in em.vertices])
    idx = np.unique(np.array([v for p in em.polygons if p.material_index == 1 for v in p.vertices]))
    out = (co[idx].min(0).tolist(), co[idx].max(0).tolist()); ev.to_mesh_clear(); return out
def to_gltf(b): return [b[0], b[2], -b[1]]
for val in (0.0, 1.0):
    lo, hi = dark_bbox(val)
    # blender (x, y, z) -> glTF (x, z, -y)
    a = np.array([to_gltf(lo), to_gltf(hi)]); rep[f"dark_bbox_open{int(val)}_gltf_m"] = [a.min(0).round(5).tolist(), a.max(0).round(5).tolist()]
kb.value = 0.0
# clips are recorded above; for stills drop the imported animation (NLA tracks would override rotation_euler / the shape key)
for ob in (bpy.data.objects["SpinRoot"], head):
    ad = ob.animation_data
    if ad:
        ad.action = None
        for t in list(ad.nla_tracks): ad.nla_tracks.remove(t)
sk = me.shape_keys
if sk.animation_data:
    sk.animation_data.action = None
    for t in list(sk.animation_data.nla_tracks): sk.animation_data.nla_tracks.remove(t)
rep["rot_mode"] = head.parent.rotation_mode if head.parent else None
json.dump(rep, open(os.path.join(W, "verify_v5.json"), "w"), indent=1)
print("VERIFIED", round(time.time() - t0, 1), "s"); sys.stdout.flush()
files = E.render_set(os.path.join(ROOT, "_build", "v5_renders"))
print("RENDERED", len(files), round(time.time() - t0, 1), "s"); sys.stdout.flush()

# close-ups for feature review (not deliverables)
scene = bpy.context.scene; cam = bpy.data.objects["RenderCam"]; spin = bpy.data.objects["SpinRoot"]
cam.location = (0.0, -0.40, -0.012)
for name, yaw in (("closeup_000", 0), ("closeup_035", 35), ("closeup_090", 90)):
    spin.rotation_euler = (0.0, 0.0, math.radians(yaw)); kb.value = 0.0
    scene.render.filepath = os.path.join(ROOT, "_build", "v5_renders", f"silver-head_v5_{name}.png")
    bpy.ops.render.render(write_still=True)
print("CLOSEUPS done"); sys.stdout.flush()
