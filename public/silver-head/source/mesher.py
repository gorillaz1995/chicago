"""SDF -> symmetric triangle mesh (narrow-band marching cubes on the x>=0 half, mirrored)."""
import time
import numpy as np
from scipy import ndimage
from skimage import measure

BOUNDS = (0.0, 92.0, -132.0, 112.0, -122.0, 124.0)  # x half only


def sample_grid(f, h, bounds=BOUNDS, band=4.0, chunk=400000):
    x0, x1, y0, y1, z0, z1 = bounds
    xs = np.arange(x0, x1 + 1e-6, h)
    ys = np.arange(y0, y1 + 1e-6, h)
    zs = np.arange(z0, z1 + 1e-6, h)
    # coarse pass
    hc = h * 4
    cx = np.arange(x0, x1 + hc, hc); cy = np.arange(y0, y1 + hc, hc); cz = np.arange(z0, z1 + hc, hc)
    CG = np.stack(np.meshgrid(cx, cy, cz, indexing='ij'), -1).reshape(-1, 3)
    dc = np.concatenate([f(CG[i:i + chunk]) for i in range(0, len(CG), chunk)]).reshape(len(cx), len(cy), len(cz))
    # upsample coarse to fine index space
    fi = np.stack(np.meshgrid((xs - x0) / hc, (ys - y0) / hc, (zs - z0) / hc, indexing='ij'), 0)
    dfine = ndimage.map_coordinates(dc, fi.reshape(3, -1), order=1, mode='nearest').reshape(len(xs), len(ys), len(zs))
    near = np.abs(dfine) < (band + hc * 1.0)
    idx = np.nonzero(near.ravel())[0]
    G = np.stack(np.meshgrid(xs, ys, zs, indexing='ij'), -1).reshape(-1, 3)
    vals = np.empty(len(idx), np.float32)
    for i in range(0, len(idx), chunk):
        vals[i:i + chunk] = f(G[idx[i:i + chunk]])
    out = dfine.ravel().astype(np.float32)
    out[idx] = vals
    return out.reshape(len(xs), len(ys), len(zs)), (xs, ys, zs), near.mean()


def mesh_half(f, h, bounds=BOUNDS):
    t0 = time.time()
    vol, (xs, ys, zs), frac = sample_grid(f, h, bounds)
    t1 = time.time()
    v, fc, n, _ = measure.marching_cubes(vol, 0.0, spacing=(h, h, h), allow_degenerate=False)
    v += np.array([xs[0], ys[0], zs[0]])
    # skimage winding: make normals point outward (gradient of sdf points outward)
    pass  # skimage descent winding already outward for our sign convention
    return v, fc, dict(t_sample=t1 - t0, t_mc=time.time() - t1, band_frac=frac)


def mirror_weld(v, f, eps=1e-4):
    """Mirror the x>=0 half and weld boundary vertices on x=0."""
    vm = v.copy(); vm[:, 0] *= -1
    fm = f[:, ::-1] + len(v)
    V = np.vstack([v, vm]); F = np.vstack([f, fm])
    # weld vertices with x ~ 0
    on = np.nonzero(np.abs(v[:, 0]) < eps)[0]
    remap = np.arange(len(V))
    remap[on + len(v)] = on
    V[on, 0] = 0.0
    F = remap[F]
    # drop unused
    used = np.unique(F)
    newidx = -np.ones(len(V), int); newidx[used] = np.arange(len(used))
    return V[used], newidx[F]


def write_ply(path, V, F):
    with open(path, 'wb') as fh:
        fh.write((f"ply\nformat binary_little_endian 1.0\nelement vertex {len(V)}\nproperty float x\nproperty float y\nproperty float z\n"
                  f"element face {len(F)}\nproperty list uchar int vertex_indices\nend_header\n").encode())
        fh.write(V.astype('<f4').tobytes())
        rec = np.empty(len(F), dtype=[('n', 'u1'), ('i', '<i4', (3,))])
        rec['n'] = 3; rec['i'] = F
        fh.write(rec.tobytes())
