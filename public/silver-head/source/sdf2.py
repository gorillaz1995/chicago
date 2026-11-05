"""Silver head v2 — lofted base + sculpted features (units: mm).

Blender frame: x lateral (+x = head's left), y depth (face points -Y), z up, eye level z=0.
"""
import numpy as np
from scipy.interpolate import CubicSpline as PchipInterpolator
from sdf import (smin, smax, ellipsoid, sphere, capsule, round_cone, vesica_wide,
                 rot_x, rot_z, bent, length)

P0 = dict(G=3.0, ZM=-70.0, KAPPA=0.021)

# ------------------------------------------------------------------ loft tables
# main loft (cranium + face + neck): z, yc, a, df, db, pf
MAIN = np.array([
    # z     yc     a      df     db    pf
    [-124, 21.0, 40.0,  40.0,  37.0, 2.0],
    [-112, 21.0, 40.0,  39.0,  37.0, 2.0],
    [-100, 20.0, 41.0,  41.0,  39.0, 2.0],
    [ -90, 19.0, 42.5,  50.0,  41.0, 2.0],
    [ -80, 17.0, 45.5,  66.0,  45.0, 2.1],
    [ -70, 13.0, 50.5,  92.0,  51.0, 2.3],
    [ -60,  9.0, 55.0, 106.0,  58.0, 2.5],
    [ -50,  6.0, 58.5, 103.0,  65.0, 2.6],
    [ -40,  5.0, 61.0,  98.0,  71.0, 2.7],
    [ -30,  5.0, 63.0,  94.0,  77.0, 2.7],
    [ -20,  6.0, 65.0,  93.0,  82.0, 2.7],
    [ -10,  8.0, 67.0,  94.0,  85.0, 2.6],
    [   0, 10.0, 69.0,  96.0,  87.0, 2.5],
    [  10, 12.0, 71.0, 103.0,  88.0, 2.4],
    [  20, 14.0, 72.5, 108.0,  87.0, 2.3],
    [  30, 15.0, 73.5, 108.5,  87.0, 2.2],
    [  40, 16.0, 74.0, 108.0,  86.0, 2.1],
    [  50, 16.0, 73.5, 106.5,  85.5, 2.0],
    [  60, 15.0, 72.0, 104.5,  84.0, 2.0],
    [  70, 14.0, 69.0, 100.5,  80.0, 2.0],
    [  80, 12.0, 64.0,  93.0,  74.0, 2.0],
    [  90, 10.0, 57.0,  84.0,  66.0, 2.0],
    [ 100,  8.0, 47.0,  69.0,  54.0, 2.0],
    [ 108,  7.0, 36.0,  50.0,  40.0, 2.0],
    [ 114,  6.0, 25.0,  31.0,  26.0, 2.0],
    [ 119,  6.0,  0.0,   0.0,   0.0, 2.0],
])

# jaw loft (lower face): z, y_front, y_back, a
JAW = np.array([
    [-113.0, -84.0, -80.0,  0.0],
    [-110, -90.0, -70.0, 24.0],
    [-104, -96.5, -52.0, 31.0],
    [ -97, -99.5, -30.0, 35.0],
    [ -90, -98.5, -11.0, 40.0],
    [ -82, -96.5,   3.0, 46.0],
    [ -78, -97.5,  10.0, 50.0],
    [ -70, -100.0, 13.0, 52.5],
    [ -60, -98.5,  12.0, 51.5],
    [ -50, -87.0,   6.0, 40.0],
    [ -44, -72.0,  -2.0, 26.0],
    [ -40, -52.0, -12.0,  0.0],
])

_ZF = np.arange(-130.0, 125.01, 0.1)


def _prep():
    z = MAIN[:, 0]
    out = {}
    out['yc'] = PchipInterpolator(z, MAIN[:, 1])(np.clip(_ZF, z[0], z[-1]))
    for i, k in ((2, 'a'), (3, 'df'), (4, 'db')):
        sq = PchipInterpolator(z, MAIN[:, i] ** 2)(np.clip(_ZF, z[0], z[-1]))
        out[k] = np.sqrt(np.maximum(sq, 0.0))
    out['pf'] = PchipInterpolator(z, MAIN[:, 5])(np.clip(_ZF, z[0], z[-1]))
    zj = JAW[:, 0]
    yf = PchipInterpolator(zj, JAW[:, 1])(np.clip(_ZF, zj[0], zj[-1]))
    yb = PchipInterpolator(zj, JAW[:, 2])(np.clip(_ZF, zj[0], zj[-1]))
    aj = np.sqrt(np.maximum(PchipInterpolator(zj, JAW[:, 3] ** 2)(np.clip(_ZF, zj[0], zj[-1])), 0))
    ycj = yb - 0.13 * (yb - yf)
    out['j_yc'] = ycj; out['j_a'] = aj; out['j_df'] = ycj - yf; out['j_db'] = yb - ycj
    return out


PROF = _prep()


def _interp(name, z):
    return np.interp(z, _ZF, PROF[name])


def _loft_F(P, pre):
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    yc = _interp(pre + 'yc', z)
    a = np.maximum(_interp(pre + 'a', z), 0.3)
    df = np.maximum(_interp(pre + 'df', z), 0.3)
    db = np.maximum(_interp(pre + 'db', z), 0.3)
    pf = _interp('pf', z) if pre == '' else 2.0
    dy = yc - y
    front = dy >= 0
    ax = np.abs(x) / a
    r = np.empty_like(x)
    pff = pf if np.ndim(pf) else np.full_like(x, pf)
    tf = dy[front] / df[front]; af = ax[front]
    wf = tf * tf / (af * af + tf * tf + 1e-12)
    pp = 2.0 + (pff[front] - 2.0) * wf
    rf = (af ** pp + tf ** pp) ** (1.0 / pp)
    rb = np.sqrt(ax[~front] ** 2 + (dy[~front] / db[~front]) ** 2)
    r[front] = rf; r[~front] = rb
    return r - 1.0


def loft(P, pre='', zmin=-124.0, zmax=119.0, cap_gz=False):
    e = 0.3
    F = _loft_F(P, pre)
    gx = (_loft_F(P + [e, 0, 0], pre) - F) / e
    gy = (_loft_F(P + [0, e, 0], pre) - F) / e
    gz = (_loft_F(P + [0, 0, e], pre) - F) / e
    gh = gx * gx + gy * gy
    # cap_gz: limit the vertical gradient term (only needed where a loft closes inside the head)
    g = np.sqrt(gh + (np.minimum(gz * gz, 4.0 * gh) if cap_gz else gz * gz)) + 1e-6
    d = F / g
    d = np.maximum(d, P[:, 2] - zmax)
    d = np.maximum(d, zmin - P[:, 2])
    return d


def mouth_parts(P, prm=P0):
    G, ZM, K = prm['G'], prm['ZM'], prm['KAPPA']
    B = bent(P, K)
    u, v, w = B[:, 0], B[:, 1], B[:, 2]
    rc = G * 0.5
    du = np.abs(u) - 23.5 + rc
    dw = np.abs(w - ZM) - G * 0.5 + rc
    d2 = np.sqrt(np.maximum(du, 0) ** 2 + np.maximum(dw, 0) ** 2) + np.minimum(np.maximum(du, dw), 0) - rc
    slit = np.maximum(d2, v - (-76.0))
    cav = ellipsoid(P, (0, -63, -74.5), (23, 24, 12.5))
    return slit, cav


def head_sdf(P, prm=P0, with_mouth=True):
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    Q = np.stack([np.abs(x), y, z], axis=1)

    d = loft(P, '')
    jaw = loft(P, 'j_', zmin=-113.0, zmax=-40.0, cap_gz=True)
    d = smin(d, jaw, 5.0)
    # termination plane (tiny neck end) with rounded edge
    d = smax(d, -116.0 - z, 9.0)

    # cheekbones
    d = smin(d, ellipsoid(Q, (45, -58, -10), (15, 14, 10)), 22)
    d = smin(d, ellipsoid(Q, (53, -50, 10), (9, 20, 18)), 16)    # temple fill
    d = smin(d, ellipsoid(Q, (35, -70, -38), (18, 11, 18)), 20)   # cheek fill
    # chin breadth
    d = smin(d, ellipsoid(P, (0, -93.0, -98), (18, 5.5, 9)), 10)

    # brow ridge + eyebrows
    d = smin(d, round_cone(Q, (10, -85.5, 14), (45, -74, 13), 6.5, 4.0), 14)
    brow = round_cone(Q, (13, -92.6, 19.6), (30, -91.0, 21.6), 3.2, 3.0)
    brow = smin(brow, round_cone(Q, (30, -91.0, 21.6), (46.5, -81.5, 18.0), 3.0, 2.0), 4)
    d = smin(d, brow, 9.0)

    # eye sockets + blank eyes + lids
    d = smax(d, -ellipsoid(Q, (32.5, -90, 3), (15, 6, 9)), 10)
    EC = np.array([32.5, -71.5, 0.5])
    eye = sphere(Q, EC, 12.8)
    lidball = sphere(Q, EC, 13.9)
    lx = Q[:, 0] - (EC[0] + 0.5)
    lz = Q[:, 2] - (EC[2] + 0.4)
    ang = np.radians(6.0)
    rx = lx * np.cos(ang) + lz * np.sin(ang)
    rz = -lx * np.sin(ang) + lz * np.cos(ang)
    opening = vesica_wide(rx, rz, 15.5, 5.9)
    lids = smax(lidball, -opening, 3.0)
    lids = smax(lids, Q[:, 1] - (EC[1] + 6.0), 3)
    d = smin(d, lids, 6.0)
    d = smin(d, eye, 2.2)

    # nose (base at z~-47)
    Pn = P * np.array([1 / 1.25, 1, 1])
    d = smin(d, round_cone(Pn, (0, -90, 8.5), (0, -107.5, -29.5), 6.3, 8.6), 8)
    d = smin(d, ellipsoid(P, (0, -100, -38.5), (17, 11, 8.5)), 8)
    d = smin(d, ellipsoid(P, (0, -108.5, -36.0), (9.2, 9.5, 9.0)), 5)
    d = smin(d, ellipsoid(Q, (13.0, -98.5, -40.0), (6.5, 8.5, 6.5)), 7)
    d = smax(d, -ellipsoid(Q, (7.4, -102.0, -47.6), (3.0, 5.0, 1.7)), 2.6)
    d = smax(d, -capsule(Q, (21.0, -95.5, -34.5), (20.0, -97.0, -44.5), 1.0), 4.5)

    # lips (mouth line z = -70)
    K = prm['KAPPA']
    B = bent(P, K)
    upper = ellipsoid(B, (0, -103.0, -65.0), (26.0, 7.0, 5.3))
    upper = smax(upper, -ellipsoid(B, (0, -106.5, -59.2), (2.6, 4.0, 1.6)), 2.0)
    lower = ellipsoid(B, (0, -100.0, -75.8), (23.0, 7.0, 6.2))
    phil = ellipsoid((B - np.array([0, -100.5, -54.5])) @ rot_x(-28.0), (0, 0, 0), (14.0, 4.5, 8.5))
    d = smin(d, phil, 6.0)
    d = smin(d, upper, 2.6)
    d = smin(d, lower, 2.8)
    d = smax(d, -capsule(B, (-13, -101.0, -87.5), (13, -101.0, -87.5), 2.2), 5)
    BQ = np.stack([np.abs(B[:, 0]), B[:, 1], B[:, 2]], 1)
    d = smax(d, -sphere(BQ, (25.5, -97.0, -70.3), 1.6), 3.0)   # mouth-corner dimples

    # ears
    d = smin(d, ear_sdf(Q), 4.0)

    if with_mouth:
        slit, cav = mouth_parts(P, prm)
        d = smax(d, -slit, 1.4)
        d = smax(d, -cav, 2.0)
    return d


def ear_sdf(Q):
    E = np.array([70.0, 15.0, 1.0])
    R = rot_z(-10.0) @ rot_x(14.0)
    L = (Q - E) @ R
    c, a, b = L[:, 0], L[:, 1], L[:, 2]
    Pl = np.stack([a, b, c], 1)
    body = ellipsoid(Pl, (1.5, 5, 3.0), (16, 25.5, 6.0))
    lobe = ellipsoid(Pl, (-1.0, -20.5, 2.6), (8.5, 9.5, 4.6))
    ear = smin(body, lobe, 6)
    ear = smax(ear, -ellipsoid(Pl, (2.5, 6.5, 9.4), (11.5, 19.5, 4.4)), 2.6)
    ear = smin(ear, round_cone(Pl, (3.5, -9.5, 5.6), (5.0, 14.0, 5.8), 2.5, 1.9), 3.0)
    ear = smax(ear, -ellipsoid(Pl, (-3.0, -4.0, 7.8), (6.5, 8.5, 4.8)), 2.6)
    ear = smin(ear, ellipsoid(Pl, (-11.0, -6.0, 3.0), (3.0, 4.0, 2.6)), 2.0)
    ear = smin(ear, ellipsoid(Pl, (-6.0, 2.0, -4.0), (8, 18, 6)), 4)
    ear = smin(ear, ellipsoid(Pl, (0.0, 3.0, -1.5), (12, 19, 5.5)), 6)   # back mass
    return ear
