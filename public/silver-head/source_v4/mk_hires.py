"""closed hi-res head (head5 SDF) + decimation density weights -> hires_v4.npz"""
import sys, time, numpy as np
sys.path.insert(0, '.')
import head5 as head, run_preview as rp
from prims import sstep

def density(V):
    x, y, z = V[:, 0], V[:, 1], V[:, 2]; ax = np.abs(x)
    face = sstep(25, 55, z) * (1 - sstep(54, 70, ax)) * sstep(-122, -100, y) * (1 - 0.6 * sstep(38, 80, y))
    def ell(c, r):
        d = np.sqrt(((ax - c[0]) / r[0]) ** 2 + ((y - c[1]) / r[1]) ** 2 + ((z - c[2]) / r[2]) ** 2)
        return 1 - sstep(0.75, 1.35, d)
    feat = np.maximum.reduce([ell((0, -62, 95), (40, 28, 32)), ell((0, -10, 100), (26, 38, 32)), ell((33, 6, 85), (24, 14, 26)),
                              ell((30, 20, 88), (32, 14, 26)), ell((76, -5, -8), (16, 40, 30))])
    return np.clip(0.15 + 0.45 * face + 0.40 * feat, 0.05, 1.0)

if __name__ == '__main__':
    h = float(sys.argv[1]); t0 = time.time()
    f = lambda P: head.head_sdf(P, with_mouth=False)
    v, fc = rp.mesh_half(f, h); V, F = rp.mirror_weld(v, fc)
    W = density(V)
    np.savez('hires_v4.npz', V=V.astype(np.float32), F=F.astype(np.int32), W=W.astype(np.float32))
    print('verts', len(V), 'faces', len(F), 'time', round(time.time() - t0, 1), 'W mean', W.mean().round(3))
