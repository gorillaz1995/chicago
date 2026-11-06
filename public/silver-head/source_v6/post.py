import sys, numpy as np
sys.path.insert(0, '.')
import head7 as head
from prims import sstep
f = lambda P: head.head_sdf(P, with_mouth=False)

def sdf_normals(V, e=0.2):
    n = np.stack([f(V + [e, 0, 0]) - f(V - [e, 0, 0]), f(V + [0, e, 0]) - f(V - [0, e, 0]), f(V + [0, 0, e]) - f(V - [0, 0, e])], 1)
    return n / (np.linalg.norm(n, axis=1, keepdims=True) + 1e-12)

def project(V, iters=3, clip=0.6):
    V = V.astype(np.float64).copy()
    for _ in range(iters):
        d = f(V); n = sdf_normals(V)
        V = V - np.clip(d, -clip, clip)[:, None] * n
    return V

def tri_areas(V, F):
    return 0.5 * np.linalg.norm(np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]]), axis=1)

def region_stats(V, F):
    c = V[F].mean(1); A = tri_areas(V, F)
    x, y, z = np.abs(c[:, 0]), c[:, 1], c[:, 2]
    regs = {
        'mouth(|x|<40,-90<y<-40,z>60)': (x < 40) & (y > -90) & (y < -40) & (z > 60),
        'nose(|x|<26,-40<y<20,z>70)': (x < 26) & (y > -40) & (y < 20) & (z > 70),
        'eyes/brow(20<|x|<50,-8<y<34,z>55)': (x > 20) & (x < 50) & (y > -8) & (y < 34) & (z > 55),
        'ears(|x|>66,|y|<45)': (x > 66) & (np.abs(y) < 45) & (z < 30),
        'face rest(z>30)': (z > 30),
        'skull/back(z<=30)': (z <= 30),
    }
    out = {}
    for k, m in regs.items():
        out[k] = (int(m.sum()), round(float(A[m].sum()), 0), round(float(A[m].mean() ** 0.5 if m.any() else 0) , 2))
    return out
