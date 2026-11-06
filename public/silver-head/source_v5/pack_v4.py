"""v5_mesh.npz (mm, glTF frame) -> blender_data_v5.npz (metres, Blender frame, pivot applied) + mouth-target report"""
import json, numpy as np
d = np.load('v5_mesh.npz'); Vb, Vo, F, mat, Nb, No, W = (d[k] for k in ('Vb', 'Vo', 'F', 'mat', 'Nb', 'No', 'W')); nH = int(d['nH'])
band = (Vb[:nH, 1] > 25) & (Vb[:nH, 1] < 55)
piv = np.array([0.0, 0.5 * (Vb[:nH, 1].min() + Vb[:nH, 1].max()), 0.5 * (Vb[:nH][band, 2].min() + Vb[:nH][band, 2].max())])   # glTF-frame pivot (mm)
Vb_, Vo_ = Vb - piv, Vo - piv
tob = lambda v: np.stack([v[:, 0], -v[:, 2], v[:, 1]], 1)           # glTF (x,y,z) -> Blender (x,-z,y)
np.savez('blender_data_v5.npz', Vb=tob(Vb_) * 1e-3, Vo=tob(Vo_) * 1e-3, F=F.astype(np.int32), Nb=tob(Nb), No=tob(No), dark=mat.astype(np.int32),
         W=W.astype(np.float32), pivot_mm=piv)
dark_v = np.unique(F[mat == 1])
rep = dict(pivot_mm=piv.round(3).tolist())
for name, V in (('closed', Vb_), ('open', Vo_)):
    p = V[dark_v] * 1e-3; lo, hi = p.min(0), p.max(0); size = hi - lo; c = (lo + hi) / 2
    inset = max(size[2] * 0.28, 0.008)
    rep[name] = dict(bbox_min_m=lo.round(5).tolist(), bbox_max_m=hi.round(5).tolist(), centre_m=c.round(5).tolist(),
                     approach_m=[round(c[0], 5), round(c[1], 5), round(hi[2] + 0.03, 5)], end_m=[round(c[0], 5), round(c[1], 5), round(hi[2] - inset, 5)],
                     look_m=[round(c[0], 5), round(c[1], 5), round(lo[2] + 0.15 * size[2], 5)], depth_m=round(size[2], 5))
H = Vb_[:nH]; rep['head_bounds_mm'] = dict(min=H.min(0).round(1).tolist(), max=H.max(0).round(1).tolist())
# lips / chin reference points (centre line)
cl = np.abs(Vb_[:nH, 0]) < 0.6
rep['tris'] = dict(total=int(len(F)), silver=int((mat == 0).sum()), dark=int((mat == 1).sum()), verts=int(len(Vb)))
print(json.dumps(rep, indent=1)); json.dump(rep, open('mouth_report_v5.json', 'w'), indent=1)
