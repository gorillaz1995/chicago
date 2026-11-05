"""Silver head — procedural SDF sculpt (units: millimetres).

Coordinate frame (Blender): x lateral (+x = head's left), y depth (face points -Y), z up.
Eye level is z = 0.  The sculpt is authored with the mouth slit slightly open
(gap G) so upper and lower lips are separate surfaces; the shape-key stage closes it.
"""
import numpy as np

# ---------------------------------------------------------------- primitives
def length(v):
    return np.sqrt(np.sum(v * v, axis=-1))


def smin(a, b, k):
    if k <= 0:
        return np.minimum(a, b)
    h = np.maximum(k - np.abs(a - b), 0.0) / k
    return np.minimum(a, b) - h * h * k * 0.25


def smax(a, b, k):
    return -smin(-a, -b, k)


def ellipsoid(P, c, r):
    r = np.asarray(r, float)
    q = (P - np.asarray(c, float)) / r
    k0 = length(q)
    k1 = length(q / r)
    return k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)


def sphere(P, c, r):
    return length(P - np.asarray(c, float)) - r


def capsule(P, a, b, r):
    a = np.asarray(a, float); b = np.asarray(b, float)
    pa = P - a; ba = b - a
    h = np.clip((pa @ ba) / (ba @ ba), 0.0, 1.0)
    return length(pa - h[:, None] * ba) - r


def round_cone(P, a, b, r1, r2):
    a = np.asarray(a, float); b = np.asarray(b, float)
    ba = b - a
    l2 = ba @ ba
    rr = r1 - r2
    a2 = l2 - rr * rr
    il2 = 1.0 / l2
    pa = P - a
    y = pa @ ba
    z = y - l2
    xv = pa * l2 - y[:, None] * ba
    x2 = np.sum(xv * xv, axis=1)
    y2 = y * y * l2
    z2 = z * z * l2
    k = np.sign(rr) * rr * rr * x2
    d3 = (np.sqrt(np.maximum(x2 * a2 * il2, 0)) + y * rr) * il2 - r1
    d1 = np.sqrt(x2 + z2) * il2 - r2
    d2 = np.sqrt(x2 + y2) * il2 - r1
    out = d3
    c2 = np.sign(y) * a2 * y2 < k
    out = np.where(c2, d2, out)
    c1 = np.sign(z) * a2 * z2 > k
    out = np.where(c1, d1, out)
    return out


def vesica_wide(px, pz, half_w, half_h):
    """2D vesica (almond) lying horizontally: width 2*half_w, height 2*half_h."""
    # IQ vesica is vertical: circles at (+-d,0) radius r, tips at (0,+-b).
    b = half_w
    r = (b * b + half_h * half_h) / (2 * half_h)  # r - d = half_h, r^2 - d^2 = b^2
    d = r - half_h
    X = np.abs(pz)  # swap axes: vertical vesica in (pz, px)
    Y = np.abs(px)
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


# ---------------------------------------------------------------- parameters
P0 = dict(
    G=3.0,            # authored mouth-slit gap (mm)
    ZM=-66.0,         # mouth line height
    KAPPA=0.021,      # lip bend (how fast the mouth wraps back)
)


def bent(P, kappa):
    """Coordinates bent around the face so lip shapes follow the dental arch."""
    Q = P.copy()
    Q[:, 1] = P[:, 1] - kappa * P[:, 0] ** 2
    return Q


def mouth_parts(P, prm=P0):
    """Return (slit_sdf, cavity_sdf) in authoring space."""
    G, ZM, K = prm['G'], prm['ZM'], prm['KAPPA']
    B = bent(P, K)
    u, v, w = B[:, 0], B[:, 1], B[:, 2]
    rc = G * 0.5
    du = np.abs(u) - 21.0 + rc
    dw = np.abs(w - ZM) - G * 0.5 + rc
    d2 = np.sqrt(np.maximum(du, 0) ** 2 + np.maximum(dw, 0) ** 2) + np.minimum(np.maximum(du, dw), 0) - rc
    dv = v - (-76.0)
    slit = np.maximum(d2, dv)
    cav = ellipsoid(P, (0, -63, -70.5), (23, 24, 12.5))
    return slit, cav


def head_sdf(P, prm=P0, with_mouth=True):
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    Q = np.stack([np.abs(x), y, z], axis=1)  # mirrored copy for bilateral features

    # ---- cranium (egg: wide high crown, narrower at the jaw)
    d = ellipsoid(P, (0, 8, 30), (72, 97, 90))
    d = smin(d, ellipsoid(P, (0, 38, 18), (64, 70, 82)), 20)          # occiput fullness
    d = smin(d, ellipsoid(P, (0, -40, 52), (58, 50, 52)), 18)         # forehead

    # ---- face mass + temples
    d = smin(d, ellipsoid(P, (0, -30, -24), (57, 60, 66)), 30)
    # ---- cheekbones (zygomatic) and arches toward the ear
    d = smin(d, ellipsoid(Q, (48, -57, -10), (17, 16, 12)), 18)
    d = smin(d, capsule(Q, (52, -50, -10), (65, -8, -6), 5.0), 20)

    # ---- lower face / mandible (broad masses, no tubes)
    d = smin(d, ellipsoid(P, (0, -38, -78), (47, 55, 31)), 22)
    d = smin(d, ellipsoid(Q, (46, 2, -70), (10, 16, 16)), 18)                    # jaw angle
    d = smin(d, round_cone(Q, (47, 0, -78), (22, -80, -100), 7, 8), 22)          # jaw line
    d = smin(d, ellipsoid(P, (0, -84, -100), (22, 15, 14)), 14)                   # chin
    d = smin(d, ellipsoid(P, (0, -94, -100), (15, 9.5, 11)), 9)                      # mental protuberance

    # ---- tiny neck termination with rounded underside
    neck = (length(np.stack([x / 40.0, (y - 22) / 44.0], 1)) - 1.0) * 40.0
    neck = smax(neck, z - (-30), 4)
    neck = smax(neck, -112.0 - z, 10)
    d = smin(d, neck, 22)

    # ---- muzzle (dental arch) under the nose + cheek fill
    d = smin(d, ellipsoid(P, (0, -72, -61), (35, 29, 26)), 14)
    d = smin(d, ellipsoid(P, (0, -60, -30), (48, 32, 55)), 18)                   # front face plane
    d = smin(d, ellipsoid(Q, (33, -74, -38), (19, 14, 19)), 18)                  # cheek fill

    # ---- brow ridge: understated, plus smooth sculpted eyebrow forms
    d = smin(d, round_cone(Q, (12, -90, 13), (48, -76, 13), 8, 5), 14)
    d = smin(d, capsule(P, (-12, -90, 13), (12, -90, 13), 8), 12)
    brow = round_cone(Q, (13, -95.0, 16.5), (31, -93.2, 20.5), 3.4, 2.9)
    brow = smin(brow, round_cone(Q, (31, -93.2, 20.5), (48, -83.5, 17.0), 2.9, 1.8), 2)
    d = smin(d, brow, 5.0)

    # ---- eye sockets (gentle)
    d = smax(d, -ellipsoid(Q, (31.5, -88, 3), (16, 7, 10)), 10)
    EC = np.array([31.5, -71.5, 0.5])
    eye = sphere(Q, EC, 12.8)
    lidball = sphere(Q, EC, 13.9)
    lx = Q[:, 0] - (EC[0] + 0.5)
    lz = Q[:, 2] - (EC[2] + 0.4)
    ang = np.radians(6.0)
    rx = lx * np.cos(ang) + lz * np.sin(ang)
    rz = -lx * np.sin(ang) + lz * np.cos(ang)
    opening = vesica_wide(rx, rz, 14.5, 5.0)
    lids = smax(lidball, -opening, 1.6)
    lids = smax(lids, Q[:, 1] - (EC[1] + 6.0), 3)
    d = smin(d, lids, 5.0)
    d = smin(d, eye, 0.6)

    # ---- nose: dorsum, broad base, tip, alae
    d = smin(d, round_cone(P, (0, -90, 6), (0, -110, -32), 6.0, 9.0), 8)
    d = smin(d, ellipsoid(P, (0, -100, -41), (17, 11, 8.5)), 8)
    d = smin(d, ellipsoid(P, (0, -111, -37.5), (10, 10, 9.5)), 5)
    d = smin(d, ellipsoid(Q, (13.5, -99, -42.5), (7.5, 9, 7)), 6)
    d = smax(d, -ellipsoid(Q, (7.6, -102.5, -50.2), (3.5, 5.6, 2.5)), 1.2)   # nostrils
    d = smax(d, -capsule(Q, (21.0, -95.5, -37), (20.0, -97.0, -47), 1.0), 3.0)  # alar crease

    # ---- lips (bent around the arch)
    K = prm['KAPPA']
    B = bent(P, K)
    BQ = np.stack([np.abs(B[:, 0]), B[:, 1], B[:, 2]], 1)
    upper = ellipsoid(B, (0, -102.5, -61.0), (23.5, 6.8, 5.3))
    upper = smax(upper, -ellipsoid(B, (0, -106.5, -55.2), (2.6, 4.0, 1.6)), 1.2)  # cupid's bow notch
    lower = ellipsoid(B, (0, -100.0, -71.8), (20.5, 7.0, 6.2))
    d = smin(d, upper, 2.5)
    d = smin(d, lower, 2.8)
    # philtrum: very shallow groove
    d = smax(d, -capsule(P, (0, -101.5, -50.5), (0, -105.5, -56.0), 1.5), 3.0)
    # mentolabial sulcus
    d = smax(d, -capsule(B, (-13, -101.0, -83.5), (13, -101.0, -83.5), 2.2), 5)

    # ---- ears
    d = smin(d, ear_sdf(Q), 4.0)

    if with_mouth:
        slit, cav = mouth_parts(P, prm)
        d = smax(d, -slit, 1.0)
        d = smax(d, -cav, 2.0)
    return d


def ear_sdf(Q):
    """Simplified ear in a local frame (a: forward, b: up, c: outward)."""
    E = np.array([70.0, 15.0, 1.0])
    R = rot_z(-10.0) @ rot_x(14.0)   # flare outward at the back, tilt back
    L = (Q - E) @ R                  # columns: local (a=x? ) -> we use world axes rotated
    # local axes: L[:,0] ~ outward(x), L[:,1] ~ depth(y), L[:,2] ~ up(z)
    c, a, b = L[:, 0], L[:, 1], L[:, 2]
    Pl = np.stack([a, b, c], 1)
    body = ellipsoid(Pl, (1.5, 5, 3.0), (16, 25.5, 6.0))
    lobe = ellipsoid(Pl, (-1.0, -20.5, 2.6), (8.5, 9.5, 4.6))
    ear = smin(body, lobe, 6)
    # bowl (scapha + fossa) leaving the helix rim
    ear = smax(ear, -ellipsoid(Pl, (2.5, 6.5, 9.4), (11.5, 19.5, 4.4)), 1.4)
    # antihelix ridge
    ear = smin(ear, round_cone(Pl, (3.5, -9.5, 5.6), (5.0, 14.0, 5.8), 2.3, 1.6), 2.0)
    # concha (deeper bowl in front-lower part)
    ear = smax(ear, -ellipsoid(Pl, (-3.0, -4.0, 7.8), (6.5, 8.5, 4.8)), 1.6)
    # tragus
    ear = smin(ear, ellipsoid(Pl, (-11.0, -6.0, 3.0), (3.0, 4.0, 2.6)), 2.0)
    # root: connect to head
    ear = smin(ear, ellipsoid(Pl, (-6.0, 2.0, -4.0), (8, 18, 6)), 4)
    return ear
