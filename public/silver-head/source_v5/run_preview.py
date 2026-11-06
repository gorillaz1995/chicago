import sys, time, json, numpy as np, cv2
sys.path.insert(0, '.')
import head5 as head4, viz
from skimage import measure

BOUNDS = (0.0, 92.0, -122.0, 122.0, -100.0, 125.0)   # x half only

def sample_grid(f, h, bounds=BOUNDS, band=3.5, chunk=300000):
    x0, x1, y0, y1, z0, z1 = bounds
    xs = np.arange(x0, x1 + 1e-6, h); ys = np.arange(y0, y1 + 1e-6, h); zs = np.arange(z0, z1 + 1e-6, h)
    hc = h * 4
    cx = np.arange(x0, x1 + hc, hc); cy = np.arange(y0, y1 + hc, hc); cz = np.arange(z0, z1 + hc, hc)
    CG = np.stack(np.meshgrid(cx, cy, cz, indexing='ij'), -1).reshape(-1, 3)
    dc = np.concatenate([f(CG[i:i + chunk]) for i in range(0, len(CG), chunk)]).reshape(len(cx), len(cy), len(cz))
    from scipy import ndimage
    fi = np.stack(np.meshgrid((xs - x0) / hc, (ys - y0) / hc, (zs - z0) / hc, indexing='ij'), 0)
    dfine = ndimage.map_coordinates(dc, fi.reshape(3, -1), order=1, mode='nearest').reshape(len(xs), len(ys), len(zs))
    near = np.abs(dfine) < (band + hc)
    idx = np.nonzero(near.ravel())[0]
    G = np.stack(np.meshgrid(xs, ys, zs, indexing='ij'), -1).reshape(-1, 3)
    vals = np.empty(len(idx), np.float32)
    for i in range(0, len(idx), chunk): vals[i:i + chunk] = f(G[idx[i:i + chunk]])
    out = dfine.ravel().astype(np.float32); out[idx] = vals
    return out.reshape(len(xs), len(ys), len(zs)), (xs, ys, zs)

def mesh_half(f, h):
    vol, (xs, ys, zs) = sample_grid(f, h)
    v, fc, n, _ = measure.marching_cubes(vol, 0.0, spacing=(h, h, h), allow_degenerate=False)
    v += np.array([xs[0], ys[0], zs[0]])
    return v, fc

def mirror_weld(v, f, eps=1e-4):
    vm = v.copy(); vm[:, 0] *= -1
    fm = f[:, ::-1] + len(v)
    V = np.vstack([v, vm]); F = np.vstack([f, fm])
    on = np.nonzero(np.abs(v[:, 0]) < eps)[0]
    remap = np.arange(len(V)); remap[on + len(v)] = on
    V[on, 0] = 0.0
    F = remap[F]
    used = np.unique(F); ni = -np.ones(len(V), int); ni[used] = np.arange(len(used))
    return V[used], ni[F]

if __name__ == '__main__':
    h = float(sys.argv[1]) if len(sys.argv) > 1 else 1.2
    tag = sys.argv[2] if len(sys.argv) > 2 else 'p'
    t0 = time.time()
    v, f = mesh_half(head4.head_sdf, h)
    V, F = mirror_weld(v, f)
    print('mesh', len(V), len(F), 'time', round(time.time() - t0, 1))
    np.savez(f'mesh_{tag}.npz', V=V, F=F)
