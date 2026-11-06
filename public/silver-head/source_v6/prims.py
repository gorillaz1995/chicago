"""SDF primitives (mm). Distances are approximate Euclidean; smin/smax are polynomial smooth min/max."""
import numpy as np

def length(v): return np.sqrt(np.sum(v * v, axis=-1))

def smin(a, b, k):
    k = np.maximum(k, 1e-6)
    h = np.maximum(k - np.abs(a - b), 0.0) / k
    return np.minimum(a, b) - h * h * k * 0.25

def smax(a, b, k): return -smin(-a, -b, k)

def ellipsoid(P, c, r):
    r = np.asarray(r, float)
    q = (P - np.asarray(c, float)) / r
    k0 = length(q); k1 = length(q / r)
    return k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)

def sphere(P, c, r): return length(P - np.asarray(c, float)) - r

def capsule(P, a, b, r):
    a = np.asarray(a, float); b = np.asarray(b, float)
    pa = P - a; ba = b - a
    h = np.clip((pa @ ba) / (ba @ ba), 0.0, 1.0)
    return length(pa - h[:, None] * ba) - r

def round_cone(P, a, b, r1, r2):
    a = np.asarray(a, float); b = np.asarray(b, float)
    ba = b - a; l2 = ba @ ba; rr = r1 - r2; a2 = l2 - rr * rr; il2 = 1.0 / l2
    pa = P - a; y = pa @ ba; z = y - l2
    xv = pa * l2 - y[:, None] * ba
    x2 = np.sum(xv * xv, axis=1); y2 = y * y * l2; z2 = z * z * l2
    k = np.sign(rr) * rr * rr * x2
    d3 = (np.sqrt(np.maximum(x2 * a2 * il2, 0)) + y * rr) * il2 - r1
    d1 = np.sqrt(x2 + z2) * il2 - r2
    d2 = np.sqrt(x2 + y2) * il2 - r1
    out = d3
    out = np.where(np.sign(y) * a2 * y2 < k, d2, out)
    out = np.where(np.sign(z) * a2 * z2 > k, d1, out)
    return out

def vesica_wide(px, pz, half_w, half_h):
    b = half_w; r = (b * b + half_h * half_h) / (2 * half_h); d = r - half_h
    X = np.abs(pz); Y = np.abs(px)
    cond = (Y - b) * d > X * b
    return np.where(cond, np.sqrt(X * X + (Y - b) ** 2), np.sqrt((X + d) ** 2 + Y * Y) - r)

def rot_x(deg):
    t = np.radians(deg); c, s = np.cos(t), np.sin(t)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
def rot_y(deg):
    t = np.radians(deg); c, s = np.cos(t), np.sin(t)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
def rot_z(deg):
    t = np.radians(deg); c, s = np.cos(t), np.sin(t)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])

def sstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)

def dist_polyline2(x, y, pts):
    """distance from 2D points (x,y) to an open polyline"""
    pts = np.asarray(pts, float)
    best = np.full_like(x, 1e9)
    for a, b in zip(pts[:-1], pts[1:]):
        ab = b - a; l2 = ab @ ab
        t = np.clip(((x - a[0]) * ab[0] + (y - a[1]) * ab[1]) / l2, 0, 1)
        dx = x - (a[0] + t * ab[0]); dy = y - (a[1] + t * ab[1])
        best = np.minimum(best, np.sqrt(dx * dx + dy * dy))
    return best

def gauss2(x, y, cx, cy, rx, ry, ang=0.0):
    c, s = np.cos(np.radians(ang)), np.sin(np.radians(ang))
    u = (x - cx) * c + (y - cy) * s
    v = -(x - cx) * s + (y - cy) * c
    return np.exp(-0.5 * ((u / rx) ** 2 + (v / ry) ** 2))
