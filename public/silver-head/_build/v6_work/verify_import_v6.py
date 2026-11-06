
import bpy, json, sys
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=sys.argv[sys.argv.index("--") + 1])
rep = {"objects": [(o.name, o.type, o.parent.name if o.parent else None) for o in bpy.data.objects]}
for o in bpy.data.objects:
    if o.type == "MESH":
        me = o.data; me.calc_loop_triangles()
        rep[o.name] = {"tris": len(me.loop_triangles), "verts": len(me.vertices), "materials": [m.name for m in me.materials],
                       "shape_keys": [k.name for k in me.shape_keys.key_blocks] if me.shape_keys else []}
rep["actions"] = [(a.name, [round(a.frame_range[0], 1), round(a.frame_range[1], 1)]) for a in bpy.data.actions]
h = bpy.data.objects["Head"]; kb = h.data.shape_keys.key_blocks["MouthOpen"]
mx = max((kb.data[i].co - h.data.vertices[i].co).length for i in range(len(h.data.vertices)))
rep["mouth_max_delta_m"] = round(mx, 5)
json.dump(rep, open(sys.argv[sys.argv.index("--") + 2], "w"), indent=1)
