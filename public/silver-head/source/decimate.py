"""High-res half mesh -> symmetric decimated full mesh (~target tris)."""
import sys, json, time
import numpy as np
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pymeshlab
import sdf2, mesher


def boundary_vertices(F, nv):
    e = np.sort(np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]), axis=1)
    u, c = np.unique(e, axis=0, return_counts=True)
    b = u[c == 1]
    mask = np.zeros(nv, bool); mask[b.ravel()] = True
    return mask, b


def build(h=0.6, G=3.0, half_faces=4500, out='head_dec.npz', seed_mesh=None):
    t0 = time.time()
    prm = dict(sdf2.P0); prm['G'] = G
    v, f, st = mesher.mesh_half(lambda p: sdf2.head_sdf(p, prm), h)
    t1 = time.time()
    ms = pymeshlab.MeshSet()
    ms.add_mesh(pymeshlab.Mesh(vertex_matrix=v.astype(np.float64), face_matrix=f.astype(np.int32)))
    ms.meshing_remove_duplicate_vertices()
    ms.meshing_remove_unreferenced_vertices()
    # light smoothing to remove marching-cubes terracing (keeps boundary)
    ms.apply_coord_taubin_smoothing(lambda_=0.5, mu=-0.53, stepsmoothnum=6, selected=False)
    ms.meshing_decimation_quadric_edge_collapse(targetfacenum=half_faces, qualitythr=0.5, preserveboundary=True,
                                                boundaryweight=4.0, preservenormal=True, preservetopology=True,
                                                optimalplacement=True, planarquadric=True, planarweight=0.002,
                                                autoclean=True)
    m = ms.current_mesh()
    V = m.vertex_matrix().copy(); F = m.face_matrix().copy()
    bmask, _ = boundary_vertices(F, len(V))
    # boundary vertices should lie on the symmetry plane: snap them
    drift = np.abs(V[bmask, 0]).max() if bmask.any() else 0
    V[bmask, 0] = 0.0
    # any vertex crossing to x<0 -> clamp (should not happen)
    V[:, 0] = np.maximum(V[:, 0], 0.0)
    # mark boundary as on-plane so mirror_weld welds exactly
    Vf, Ff = mesher.mirror_weld(V, F, eps=1e-9)
    # sanity: closed manifold?
    _, bfull = boundary_vertices(Ff, len(Vf))
    info = dict(half_hr_faces=len(f), faces=len(Ff), verts=len(Vf), open_edges=int(len(bfull)),
                boundary_drift_mm=float(drift), secs=round(time.time() - t0, 1), mc_secs=round(t1 - t0, 1))
    np.savez(out, V=Vf, F=Ff)
    return Vf, Ff, info


if __name__ == '__main__':
    hf = int(sys.argv[1]) if len(sys.argv) > 1 else 4500
    V, F, info = build(half_faces=hf)
    mesher.write_ply('head_dec.ply', V, F)
    print(json.dumps(info))
