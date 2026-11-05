"""Render-quality version of the same sculpt for Blender (not exported to the web GLB).

Uses half_hr.npz from make_highres.py -> ~150k-triangle symmetric mesh, same MouthOpen jaw deformation,
same MouthDark rule and the same pivot as the web mesh -> ../_build/hires_data.npz
Usage: python build_hires.py [half_faces=75000]
"""
import os, sys, json
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import pymeshlab
import mesher, deform
from decimate import boundary_vertices


def build(half_faces=75000):
    d = np.load(os.path.join(HERE, 'half_hr.npz')); v, f = d['v'], d['f']
    ms = pymeshlab.MeshSet()
    ms.add_mesh(pymeshlab.Mesh(vertex_matrix=v.astype(np.float64), face_matrix=f.astype(np.int32)))
    ms.meshing_remove_duplicate_vertices()
    ms.apply_coord_taubin_smoothing(lambda_=0.5, mu=-0.53, stepsmoothnum=6)
    ms.meshing_decimation_quadric_edge_collapse(targetfacenum=half_faces, qualitythr=0.6, preserveboundary=False,
                                                boundaryweight=1.0, preservenormal=True, preservetopology=True,
                                                optimalplacement=True, planarquadric=True, planarweight=0.001,
                                                autoclean=True)
    m = ms.current_mesh()
    V = m.vertex_matrix().copy(); F = m.face_matrix().copy()
    bmask, _ = boundary_vertices(F, len(V))
    V[bmask, 0] = 0.0; V[:, 0] = np.maximum(V[:, 0], 0.0)
    Vf, Ff = mesher.mirror_weld(V, F, eps=1e-9)
    _, open_e = boundary_vertices(Ff, len(Vf))
    return Vf, Ff, len(open_e)


if __name__ == '__main__':
    hf = int(sys.argv[1]) if len(sys.argv) > 1 else 75000
    V, F, open_edges = build(hf)
    a0 = deform.closing_angle()
    Vb = deform.deform(V, -a0)
    Vo = deform.deform(V, deform.THETA_OPEN - a0)
    dark = deform.dark_faces(V, F)
    # same pivot as the web mesh so both sit exactly on SpinRoot
    piv = np.load(os.path.join(HERE, '..', '_build', 'blender_data.npz'))['pivot_mm']
    np.savez(os.path.join(HERE, '..', '_build', 'hires_data.npz'),
             Vb=((Vb - piv) * 0.001).astype(np.float32), Vo=((Vo - piv) * 0.001).astype(np.float32),
             F=F.astype(np.int32), dark=dark.astype(np.int8))
    # fold check (faces whose orientation flips or nearly flips relative to the authored pose)
    def fn(P):
        c = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
        return c / (np.linalg.norm(c, axis=1, keepdims=True) + 1e-12)
    na = fn(V)
    flips = {t: int(((fn(Vb + t * (Vo - Vb)) * na).sum(1) < 0.0)[~dark].sum()) for t in (0.0, 0.5, 1.0)}
    print(json.dumps(dict(tris=int(len(F)), verts=int(len(V)), open_edges=open_edges, dark=int(dark.sum()),
                          pivot_mm=piv.tolist(), flipped_silver_faces=flips)))
