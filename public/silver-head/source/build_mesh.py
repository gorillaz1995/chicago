"""Final authoring mesh: adaptive isotropic remesh of the SDF surface, mirrored, with SDF normals."""
import sys, json, time
import numpy as np
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pymeshlab, sdf2, mesher
from decimate import boundary_vertices

PRM = dict(sdf2.P0)  # G=3.0 authored gap


def sdf_fn(p):
    return sdf2.head_sdf(p, PRM)


def sdf_normals(V, e=0.15):
    f = sdf_fn
    n = np.stack([f(V + [e, 0, 0]) - f(V - [e, 0, 0]),
                  f(V + [0, e, 0]) - f(V - [0, e, 0]),
                  f(V + [0, 0, e]) - f(V - [0, 0, e])], 1)
    return n / (np.linalg.norm(n, axis=1, keepdims=True) + 1e-12)


def project(V, iters=3):
    """Pull vertices exactly onto the SDF zero set."""
    for _ in range(iters):
        d = sdf_fn(V)
        n = sdf_normals(V)
        V = V - np.clip(d, -0.5, 0.5)[:, None] * n   # bounded step (distance estimates are approximate)
    return V


def build(targetlen=7.0, msd=0.3, hr=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'half_hr.npz')):
    d = np.load(hr); v, f = d['v'], d['f']
    ms = pymeshlab.MeshSet()
    ms.add_mesh(pymeshlab.Mesh(vertex_matrix=v.astype(np.float64), face_matrix=f.astype(np.int32)))
    ms.meshing_remove_duplicate_vertices()
    ms.meshing_decimation_quadric_edge_collapse(targetfacenum=60000, preserveboundary=True, boundaryweight=4.0,
                                                preservenormal=True, preservetopology=True, optimalplacement=True, qualitythr=0.6)
    ms.meshing_isotropic_explicit_remeshing(iterations=14, adaptive=True, targetlen=pymeshlab.PureValue(targetlen),
                                            featuredeg=60, checksurfdist=True, maxsurfdist=pymeshlab.PureValue(msd),
                                            splitflag=True, collapseflag=True, swapflag=True, smoothflag=True, reprojectflag=True)
    m = ms.current_mesh()
    V = m.vertex_matrix().copy(); F = m.face_matrix().copy()
    bmask, _ = boundary_vertices(F, len(V))
    drift = float(np.abs(V[bmask, 0]).max())
    V[bmask, 0] = 0.0
    V[:, 0] = np.maximum(V[:, 0], 0.0)
    # project interior vertices onto the true surface (boundary keeps x=0 since sdf is symmetric)
    Vp = project(V)
    Vp[bmask, 0] = 0.0
    Vf, Ff = mesher.mirror_weld(Vp, F, eps=1e-9)
    _, bfull = boundary_vertices(Ff, len(Vf))
    N = sdf_normals(Vf)
    # exact symmetry for normals on the plane
    on = np.abs(Vf[:, 0]) < 1e-9
    N[on, 0] = 0.0; N /= np.linalg.norm(N, axis=1, keepdims=True)
    info = dict(faces=int(len(Ff)), verts=int(len(Vf)), open_edges=int(len(bfull)), boundary_drift_mm=drift)
    return Vf, Ff, N, info


def write_ply_n(path, V, F, N):
    with open(path, 'wb') as fh:
        fh.write((f"ply\nformat binary_little_endian 1.0\nelement vertex {len(V)}\nproperty float x\nproperty float y\nproperty float z\n"
                  f"property float nx\nproperty float ny\nproperty float nz\n"
                  f"element face {len(F)}\nproperty list uchar int vertex_indices\nend_header\n").encode())
        fh.write(np.hstack([V, N]).astype('<f4').tobytes())
        rec = np.empty(len(F), dtype=[('n', 'u1'), ('i', '<i4', (3,))])
        rec['n'] = 3; rec['i'] = F
        fh.write(rec.tobytes())


if __name__ == '__main__':
    tl = float(sys.argv[1]) if len(sys.argv) > 1 else 7.0
    msd = float(sys.argv[2]) if len(sys.argv) > 2 else 0.3
    V, F, N, info = build(tl, msd)
    np.savez('head_final.npz', V=V, F=F, N=N)
    write_ply_n('head_final.ply', V, F, N)
    print(json.dumps(info))
