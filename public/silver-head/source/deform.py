"""Jaw-hinge deformation for the MouthOpen shape key + MouthDark face assignment.

Authoring mesh has the lips parted by G = 3 mm.  Basis (MouthOpen = 0) rotates the jaw region
closed by A0; the MouthOpen key rotates it open by THETA_OPEN - A0 (total 22 deg from closed).
"""
import sys, json
import numpy as np
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sdf2
from sdf import bent

H = np.array([0.0, 2.0, -10.0])      # hinge point (axis parallel to X), just in front of the ears
THETA_OPEN = np.radians(22.0)
GLIDE = np.array([0.0, -10.0, -3.0])   # condyle glide at full opening (mm)
ZM = sdf2.P0['ZM']; G = sdf2.P0['G']; KAPPA = sdf2.P0['KAPPA']


def sstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def jaw_weight(P):
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    ax = np.abs(x)
    B = bent(P, KAPPA)
    q = sstep(23.0, 62.0, ax)                     # 0 at the mouth, 1 at the side of the face
    zb = ZM + (H[2] - ZM) * q                      # split height: mouth line -> hinge
    inner = sstep(-88.0, -55.0, y) * (1 - q)       # deeper inside the mouth
    corner = sstep(22.5, 30.0, ax)
    delta = 0.8 + np.maximum(np.maximum(6.0 * inner, 15.0 * q), 5.0 * corner)
    # >= 2 mm so the rounded ends of the lip slit compress (3 mm -> 0.3 mm) without folding
    delta = np.maximum(delta, 2.0)
    # inside the lip zone use bent-space height so the split follows the arch
    zz = np.where(ax < 30, B[:, 2], z)
    w = sstep(-delta, delta, zb - zz)
    # fade toward the hinge/ear; under the jaw fade smoothly from chin to nape so the underside tilts as one surface
    low = sstep(-72.0, -96.0, z)
    hinge_f = (1 - low) * (1.0 - sstep(-35.0, 8.0, y)) + low * (1.0 - sstep(-84.0, 45.0, y))
    w *= hinge_f
    return w


def rotate_jaw(P, w, phi):
    a = w * phi
    c, s = np.cos(a), np.sin(a)
    r = P - H
    out = P.copy()
    out[:, 1] = H[1] + r[:, 1] * c - r[:, 2] * s
    out[:, 2] = H[2] + r[:, 1] * s + r[:, 2] * c
    out += (w * (phi / THETA_OPEN))[:, None] * GLIDE[None]
    return out


def closing_angle():
    # close the authored gap at the stomion to ~0.3 mm
    stom = np.array([0.0, -104.0, ZM])
    r = stom - H
    return (G - 0.3) / abs(r[1])


def deform(P, phi):
    return rotate_jaw(P, jaw_weight(P), phi)


def transform_normals(P, N, phi, e=0.05):
    """n' = J^-T n using a finite-difference Jacobian of the deformation."""
    J = np.zeros((len(P), 3, 3))
    for k in range(3):
        d = np.zeros(3); d[k] = e
        J[:, :, k] = (deform(P + d, phi) - deform(P - d, phi)) / (2 * e)
    JinvT = np.linalg.inv(J).transpose(0, 2, 1)
    n = np.einsum('nij,nj->ni', JinvT, N)
    return n / np.linalg.norm(n, axis=1, keepdims=True)


def dark_faces(V, F):
    c = V[F].mean(1)
    d_closed = sdf2.head_sdf(c, with_mouth=False)
    # only inside the mouth region (the loft's distance estimate is unreliable near the crown)
    region = (np.abs(c[:, 0]) < 32) & (c[:, 1] < -35) & (c[:, 2] > -95) & (c[:, 2] < -50)
    return (d_closed < -1.5) & region


if __name__ == '__main__':
    src = sys.argv[1]
    d = np.load(src)
    V, F, N = d['V'], d['F'], d['N']
    a0 = closing_angle()
    Vb = deform(V, -a0)
    Vo = deform(V, THETA_OPEN - a0)
    Nb = transform_normals(V, N, -a0)
    No = transform_normals(V, N, THETA_OPEN - a0)
    dark = dark_faces(V, F)
    np.savez(sys.argv[2], Vb=Vb, Vo=Vo, F=F, Nb=Nb, No=No, dark=dark, W=jaw_weight(V))
    print(json.dumps(dict(a0_deg=float(np.degrees(a0)), dark_faces=int(dark.sum()), faces=int(len(F)),
                          max_disp_mm=float(np.linalg.norm(Vo - Vb, axis=1).max()))))
