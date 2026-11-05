"""Feature-weighted quadric decimation + mild tangential relaxation + SDF projection/normals."""
import sys, json
import numpy as np
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pymeshlab, mesher
from decimate import boundary_vertices
from build_mesh import sdf_fn, sdf_normals, project, write_ply_n

FEAT = [  # (center, sigma, weight)  -- mirrored features use |x|
    ((32.5, -80, 2), 13, 14.0),  # eye + lids
    ((28, -91, 18), 12, 6.0),    # brow
    ((0, -104, -36), 15, 5.0),   # nose
    ((0, -100, -70), 17, 6.0),   # lips
    ((72, 15, 0), 20, 4.0),      # ear
    ((0, -95, -100), 14, 1.5),   # chin
]


def feature_weight(V):
    Q = np.abs(V) * [1, 0, 0] + V * [0, 1, 1]
    w = np.ones(len(V))
    for c, s, k in FEAT:
        d2 = np.sum((Q - np.array(c)) ** 2, 1)
        w += k * np.exp(-d2 / (2 * s * s))
    return w


def vertex_neighbors(F, nv):
    e = np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]])
    e = np.concatenate([e, e[:, ::-1]])
    e = np.unique(e, axis=0)
    return e


def relax(V, F, iters=3, step=0.35, fixed_x0=None):
    nv = len(V)
    E = vertex_neighbors(F, nv)
    bmask, bedges = boundary_vertices(F, nv)
    for _ in range(iters):
        # uniform laplacian
        acc = np.zeros_like(V); cnt = np.zeros(nv)
        np.add.at(acc, E[:, 0], V[E[:, 1]]); np.add.at(cnt, E[:, 0], 1)
        # boundary: only boundary neighbours
        if bmask.any():
            accb = np.zeros_like(V); cntb = np.zeros(nv)
            be = np.concatenate([bedges, bedges[:, ::-1]])
            np.add.at(accb, be[:, 0], V[be[:, 1]]); np.add.at(cntb, be[:, 0], 1)
            acc[bmask] = accb[bmask]; cnt[bmask] = cntb[bmask]
        C = acc / cnt[:, None]
        N = sdf_normals(V)
        dv = C - V
        dv -= np.sum(dv * N, 1)[:, None] * N
        V = V + step * dv
        V = project(V, 2)
        V[bmask, 0] = 0.0
        V[:, 0] = np.maximum(V[:, 0], 0)
    return V


NE = 0.15
def build(half_faces=5000, relax_iters=2, hr=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'half_hr.npz')):
    d = np.load(hr); v, f = d['v'], d['f']
    ms = pymeshlab.MeshSet()
    m0 = pymeshlab.Mesh(vertex_matrix=v.astype(np.float64), face_matrix=f.astype(np.int32),
                        v_scalar_array=feature_weight(v).astype(np.float64))
    ms.add_mesh(m0)
    ms.meshing_remove_duplicate_vertices()
    ms.apply_coord_taubin_smoothing(lambda_=0.5, mu=-0.53, stepsmoothnum=4)
    # the seam on the mirror plane is simplified too (snapped back to x=0 below); preserving it kept
    # ~40% of all vertices on the centre line as slivers
    ms.meshing_decimation_quadric_edge_collapse(targetfacenum=half_faces, qualitythr=0.6, preserveboundary=False,
                                                boundaryweight=1.0, preservenormal=True, preservetopology=True,
                                                optimalplacement=True, planarquadric=True, planarweight=0.002,
                                                qualityweight=True, autoclean=True)
    m = ms.current_mesh()
    V = m.vertex_matrix().copy(); F = m.face_matrix().copy()
    bmask, _ = boundary_vertices(F, len(V))
    V[bmask, 0] = 0.0; V[:, 0] = np.maximum(V[:, 0], 0)
    V = project(V, 3); V[bmask, 0] = 0.0
    if relax_iters:
        V = relax(V, F, relax_iters)
    Vf, Ff = mesher.mirror_weld(V, F, eps=1e-9)
    _, bfull = boundary_vertices(Ff, len(Vf))
    N = sdf_normals(Vf, e=NE)
    # crown: the loft's distance scale is distorted near its closure, so a wide finite-difference
    # step tilts the normals there; the crown is smooth, so sample it with a tiny step instead
    wc = np.clip((Vf[:, 2] - 88.0) / 12.0, 0.0, 1.0)[:, None]
    if (wc > 0).any():
        Ns = sdf_normals(Vf, e=0.02)
        N = N * (1 - wc) + Ns * wc
        N /= np.linalg.norm(N, axis=1, keepdims=True)
    # the very apex is the loft's closure point (field singular there): use the mesh's own normals
    fn = np.cross(Vf[Ff[:, 1]] - Vf[Ff[:, 0]], Vf[Ff[:, 2]] - Vf[Ff[:, 0]])
    Ng = np.zeros_like(Vf)
    for k in range(3):
        np.add.at(Ng, Ff[:, k], fn)
    Ng /= np.linalg.norm(Ng, axis=1, keepdims=True)
    wa = np.clip((Vf[:, 2] - 112.0) / 4.0, 0.0, 1.0)[:, None]
    N = N * (1 - wa) + Ng * wa
    N /= np.linalg.norm(N, axis=1, keepdims=True)
    on = np.abs(Vf[:, 0]) < 1e-9; N[on, 0] = 0; N /= np.linalg.norm(N, axis=1, keepdims=True)
    # triangle quality stats
    a = Vf[Ff[:, 1]] - Vf[Ff[:, 0]]; b = Vf[Ff[:, 2]] - Vf[Ff[:, 0]]; c = Vf[Ff[:, 2]] - Vf[Ff[:, 1]]
    area = 0.5 * np.linalg.norm(np.cross(a, b), axis=1)
    l2 = (a * a).sum(1) + (b * b).sum(1) + (c * c).sum(1)
    qual = 4 * np.sqrt(3) * area / l2
    info = dict(faces=int(len(Ff)), verts=int(len(Vf)), open_edges=int(len(bfull)),
                q_min=float(qual.min()), q_p5=float(np.percentile(qual, 5)), q_med=float(np.median(qual)))
    return Vf, Ff, N, info


if __name__ == '__main__':
    hf = int(sys.argv[1]); ri = int(sys.argv[2]); out = sys.argv[3]; NE = float(sys.argv[4]) if len(sys.argv) > 4 else 0.15
    V, F, N, info = build(hf, ri)
    np.savez(out.replace('.ply', '.npz'), V=V, F=F, N=N)
    write_ply_n(out, V, F, N)
    print(json.dumps(info))
