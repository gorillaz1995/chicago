import bpy, sys, time, json
import numpy as np
a = sys.argv[sys.argv.index('--') + 1:]
inp, out, target, mode = a[0], a[1], int(a[2]), a[3]
fac = float(a[4]) if len(a) > 4 else 1.0
sym = (a[5] == '1') if len(a) > 5 else True
t0 = time.time()
d = np.load(inp); V = d['V'].astype(np.float32); F = d['F'].astype(np.int32); W = d['W'].astype(np.float32)
me = bpy.data.meshes.new('hi')
me.from_pydata(V.tolist(), [], F.tolist())
me.update()
ob = bpy.data.objects.new('hi', me); bpy.context.scene.collection.objects.link(ob)
if mode in ('w', 'inv'):
    vg = ob.vertex_groups.new(name='w')
    q = np.round(W * 50).astype(int)
    for lv in np.unique(q):
        idx = np.nonzero(q == lv)[0].tolist()
        vg.add(idx, float(lv) / 50.0, 'REPLACE')
m = ob.modifiers.new('dec', 'DECIMATE'); m.decimate_type = 'COLLAPSE'; m.ratio = target / len(F)
m.use_collapse_triangulate = True
if mode in ('w', 'inv'):
    m.vertex_group = 'w'; m.vertex_group_factor = fac; m.invert_vertex_group = (mode == 'inv')
if sym:
    m.use_symmetry = True; m.symmetry_axis = 'X'
dg = bpy.context.evaluated_depsgraph_get(); ev = ob.evaluated_get(dg); em = ev.to_mesh()
nv = len(em.vertices); co = np.empty(nv * 3, np.float32); em.vertices.foreach_get('co', co)
nt = len(em.polygons); idx = np.empty(nt * 3, np.int32)
em.polygons.foreach_get('vertices', idx) if False else None
tri = np.empty(len(em.loop_triangles) * 3, np.int32)
em.calc_loop_triangles(); lt = em.loop_triangles
tv = np.empty(len(lt) * 3, np.int32); lt.foreach_get('vertices', tv)
np.savez(out, V=co.reshape(-1, 3), F=tv.reshape(-1, 3))
print(json.dumps(dict(nv=nv, ntri=len(lt), time=round(time.time() - t0, 1))))
sys.stdout.flush()
