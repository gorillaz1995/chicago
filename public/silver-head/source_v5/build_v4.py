"""decimated head -> slit cut -> lens gap -> cavity rings + cap -> jaw weights / MouthOpen morph. All mm, glTF frame (x right, y up, z face)."""
import sys, json, numpy as np
sys.path.insert(0, '.')
import post, slitcut
from prims import sstep

SRC = sys.argv[1] if len(sys.argv) > 1 else 'dec_v5.npz'
ZM, KY, XC = -60.0, 0.0036, 26.0          # slit line y = ZM - KY x^2
GAP = 0.76                                 # closed-basis lens gap at the centre (mm)
THETA = np.radians(22.0)
H = np.array([0.0, -24.0, 18.0])           # jaw hinge (axis // x)
GLIDE = np.array([0.0, -1.5, 6.0])         # condyle glide at full opening (mm)
# cavity rings: depth behind the slit, x-scale, roof rise
RD = np.array([0, 2.4, 8.0, 18.0, 30.0, 48.0])
RS = np.array([1.0, 1.0, 0.98, 0.93, 0.82, 0.60])
RR = np.array([0, 0.3, 1.5, 3.8, 5.8, 6.0])
LD = 18.0
GEXP = float(__import__('os').environ.get('GEXP', '0.55'))

def surf_z(x, y, z0, iters=5):
    z = z0.copy()
    for _ in range(iters):
        d = post.f(np.stack([x, y, z], 1)); e = 0.2
        dz = (post.f(np.stack([x, y, z + e], 1)) - post.f(np.stack([x, y, z - e], 1))) / (2 * e)
        z = z - np.clip(d / np.where(np.abs(dz) < 0.2, 0.2, dz), -0.8, 0.8)
    return z

def hinge_fade(y, z):
    low = sstep(-72, -96, y)
    return (1 - low) * (1 - sstep(50, -14, z)) + low * (1 - sstep(84, -45, z))

def jaw_w(P, XT):
    """closed-basis jaw weight field. side-aware near the slit (s>=0 above the cut, s<0 below)."""
    x, y, z = P[:, 0], P[:, 1], P[:, 2]; ax = np.abs(x)
    s = y + KY * x * x - ZM
    uu = np.minimum(ax / XT, 1.0); g = (1 - uu ** 2) ** GEXP
    wu = 0.5 * (1 - g); wl = 0.5 * (1 + g)
    w_up = wu * (1 - sstep(0, LD, s)); w_dn = 1 - (1 - wl) * (1 - sstep(0, LD, -s))
    w_lip = np.where(s >= 0, w_up, w_dn)
    yy = y + KY * x * x * (1 - sstep(26, 40, ax))
    q = sstep(23, 62, ax)
    ysplit = ZM + (H[1] - ZM) * q
    inner = sstep(88, 55, z) * (1 - q)
    corner = sstep(22.5, 30, ax)
    delta = np.maximum(1.2 + np.maximum(np.maximum(6 * inner, 24 * q), 16 * corner), 2.0)
    w_old = sstep(-delta, delta, ysplit - yy)
    b = sstep(20, 38, ax)
    return ((1 - b) * w_lip + b * w_old) * hinge_fade(y, z)

def deform(P, w):
    a = w * THETA; c, s = np.cos(a), np.sin(a); r = P - H
    out = P.copy()
    out[:, 1] = H[1] + r[:, 1] * c - r[:, 2] * s
    out[:, 2] = H[2] + r[:, 1] * s + r[:, 2] * c
    return out + w[:, None] * GLIDE

def rot_normals(N, w):
    a = w * THETA; c, s = np.cos(a), np.sin(a)
    out = N.copy(); out[:, 1] = N[:, 1] * c - N[:, 2] * s; out[:, 2] = N[:, 1] * s + N[:, 2] * c
    return out

def aa_normals(V, F, N0, skip, scale=0.40, rings=(1.0,)):
    """pre-filter the analytic sculpt normals to the mesh resolution (avoids sparkle from features narrower than the triangles)"""
    n = len(V)
    E = np.unique(np.sort(np.vstack([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]), 1), axis=0)
    l = np.linalg.norm(V[E[:, 0]] - V[E[:, 1]], axis=1)
    s = np.zeros(n); c = np.zeros(n)
    np.add.at(s, E[:, 0], l); np.add.at(s, E[:, 1], l); np.add.at(c, E[:, 0], 1); np.add.at(c, E[:, 1], 1)
    r = np.clip(scale * s / np.maximum(c, 1), 0.25, 1.6)
    ref = np.where(np.abs(N0[:, [1]]) < 0.9, np.array([[0.0, 1.0, 0.0]]), np.array([[1.0, 0.0, 0.0]]))
    t1 = np.cross(N0, ref); t1 /= np.linalg.norm(t1, axis=1, keepdims=True); t2 = np.cross(N0, t1)
    acc = N0.copy()
    for rk in rings:
        for th in np.radians(np.arange(0, 360, 60)):
            P = V + (r * rk)[:, None] * (np.cos(th) * t1 + np.sin(th) * t2)
            acc += post.sdf_normals(P, e=0.2)
    out = acc / np.linalg.norm(acc, axis=1, keepdims=True)
    out[skip] = N0[skip]                                     # slit chain keeps the exact lip normals
    return out

def build():
    d = np.load(SRC); V = d['V'].astype(float); F = d['F'].astype(np.int64)
    V3, F3, info = slitcut.cut_slit(V, F, ZM, KY, XC, 70.0)
    up, lo = np.asarray(info['upper']), np.asarray(info['lower']); nc = len(up)
    XT = float(np.abs(V3[up[[0, -1]], 0]).mean())
    # exact slit curve + on-surface, then open the lens gap
    ch = np.unique(np.concatenate([up, lo]))
    V3[ch, 1] = ZM - KY * V3[ch, 0] ** 2
    V3[ch, 2] = surf_z(V3[ch, 0], V3[ch, 1], V3[ch, 2])
    g = 0.5 * GAP * np.sqrt(np.clip(1 - (V3[:, 0] / XT) ** 2, 0, 1))
    iu, il = up[1:-1], lo[1:-1]
    V3[iu, 1] += g[iu]; V3[il, 1] -= g[il]
    V3[iu, 2] = surf_z(V3[iu, 0], V3[iu, 1], V3[iu, 2]); V3[il, 2] = surf_z(V3[il, 0], V3[il, 1], V3[il, 2])
    nH = len(V3)
    # ---- analytic normals of the closed sculpt (copies sampled slightly away from the cut)
    samp = V3.copy(); samp[iu, 1] += 0.5; samp[il, 1] -= 0.5
    NH = post.sdf_normals(samp, e=0.2)
    NH = aa_normals(V3, F3, NH, np.concatenate([up, lo]))
    # ---- cavity rings (ring 0 = the slit loop itself; deeper rings use every 2nd loop vertex)
    loop = np.concatenate([up, lo[::-1][1:-1]]); m = len(loop)
    assert m % 2 == 0 and (nc - 1) % 2 == 0
    sub = np.arange(0, m, 2); ms = len(sub)
    sideL = np.concatenate([np.ones(nc), -np.ones(nc - 2)]); sideL[0] = 0; sideL[nc - 1] = 0
    P0 = V3[loop][sub]; x0 = P0[:, 0]; u = np.abs(x0) / XT; sideS = sideL[sub]
    rings = [loop]
    Vc = []; base = nH
    for k in range(1, len(RD)):
        Pk = P0.copy(); Pk[:, 0] = x0 * RS[k]; Pk[:, 2] = P0[:, 2] - RD[k]; Pk[:, 1] = P0[:, 1] + RR[k] * (1 - u ** 2)
        Vc.append(Pk); rings.append(np.arange(base, base + ms)); base += ms
    Vc = np.vstack(Vc)
    Vb = np.vstack([V3, Vc])
    # weights
    wH = jaw_w(V3, XT)
    gs = (1 - np.minimum(u, 1.0) ** 2) ** GEXP
    ws = np.where(sideS > 0, 0.5 * (1 - gs), np.where(sideS < 0, 0.5 * (1 + gs), 0.5))
    wc = np.concatenate([ws * hinge_fade(Vc[(k - 1) * ms:k * ms, 1], Vc[(k - 1) * ms:k * ms, 2]) for k in range(1, len(RD))])
    W = np.concatenate([wH, wc])
    Vo = deform(Vb, W)
    # ---- faces
    def orient(tri, inner_pt):
        ctr = Vo[list(tri)].mean(0); n = np.cross(Vo[tri[1]] - Vo[tri[0]], Vo[tri[2]] - Vo[tri[0]])
        return tri if np.dot(n, inner_pt - ctr) > 0 else (tri[0], tri[2], tri[1])
    Fc, matc = [], []
    # band: ring0 (m verts) -> ring1 (ms verts)
    r0, r1 = rings[0], rings[1]; inn = Vo[r1].mean(0)
    for a_ in range(ms):
        p = 2 * a_; q = (p + 1) % m; r_ = (p + 2) % m; a2 = (a_ + 1) % ms
        for tri in ((r0[p], r0[q], r1[a_]), (r1[a_], r0[q], r1[a2]), (r0[q], r0[r_], r1[a2])):
            Fc.append(orient(tri, Vo[np.concatenate([r0, r1])].mean(0))); matc.append(0)
    for k in range(1, len(RD) - 1):
        ra, rb = rings[k], rings[k + 1]; inn = Vo[np.concatenate([ra, rb])].mean(0)
        for i in range(ms):
            j = (i + 1) % ms
            for tri in ((ra[i], ra[j], rb[j]), (ra[i], rb[j], rb[i])):
                Fc.append(orient(tri, inn)); matc.append(1)
    # ladder cap on the deepest ring: roof index a <-> floor index (ms - a) % ms
    rk = rings[-1]; inn = Vo[rk].mean(0); half = ms // 2
    for a_ in range(half):
        i0, i1 = a_, a_ + 1; j0, j1 = (ms - a_) % ms, (ms - a_ - 1) % ms
        tris = []
        if rk[i0] == rk[j0] or i0 == j0: tris.append((rk[i0], rk[i1], rk[j1]))
        elif i1 == j1: tris.append((rk[i0], rk[i1], rk[j0]))
        else: tris += [(rk[i0], rk[i1], rk[j1]), (rk[i0], rk[j1], rk[j0])]
        for tri in tris: Fc.append(orient(tri, inn)); matc.append(1)
    Fall = np.vstack([F3, np.array(Fc)]); mat = np.concatenate([np.zeros(len(F3), int), np.array(matc)])
    # ---- normals
    Nb = np.zeros_like(Vb); Nb[:nH] = NH
    inward = np.zeros((ms, 3)); inward[:, 1] = -sideS
    for k in range(1, len(RD)):
        sl = slice(nH + (k - 1) * ms, nH + k * ms)
        if k == 1:
            nn = inward.copy(); nn[0] = [1, 0, 0]; nn[ms // 2] = [-1, 0, 0]
            Nb[sl] = nn
    fnormal = lambda Vv: (lambda fn: fn)(np.cross(Vv[Fall[:, 1]] - Vv[Fall[:, 0]], Vv[Fall[:, 2]] - Vv[Fall[:, 0]]))
    fn = fnormal(Vb); Ngeo = np.zeros_like(Vb)
    for kk in range(3): np.add.at(Ngeo, Fall[:, kk], fn)
    Ngeo /= (np.linalg.norm(Ngeo, axis=1, keepdims=True) + 1e-12)
    dark_only = np.ones(len(Vb), bool); dark_only[:nH] = False; dark_only[rings[1]] = False
    Nb[dark_only] = Ngeo[dark_only]
    # the shared tips keep a lateral normal
    Nb /= (np.linalg.norm(Nb, axis=1, keepdims=True) + 1e-12)
    # open normals: Jacobian for the sculpt vertices, rotation for the rest
    No = rot_normals(Nb, W)
    side_h = np.zeros(nH); side_h[iu] = 1; side_h[il] = -1
    e = 0.05; J = np.zeros((nH, 3, 3))
    for kx in range(3):
        dv = np.zeros(3); dv[kx] = e
        # keep copies on their own side while sampling the weight field
        def dpos(sign):
            Pq = V3 + sign * dv
            Ps = Pq.copy(); Ps[iu, 1] += 1e-3; Ps[il, 1] -= 1e-3   # copies: force the side
            Wq = jaw_w(Ps, XT); return deform(Pq, Wq)
        J[:, :, kx] = (dpos(+1) - dpos(-1)) / (2 * e)
    JiT = np.linalg.inv(J).transpose(0, 2, 1)
    nj = np.einsum('nij,nj->ni', JiT, NH[:nH]); nj /= np.linalg.norm(nj, axis=1, keepdims=True)
    No[:nH] = nj
    No[rings[1]] = rot_normals(Nb, W)[rings[1]]
    info = dict(XT=XT, nc=nc, m=m, ms=ms, nH=nH, verts=len(Vb), tris=len(Fall), silver_tris=int((mat == 0).sum()), dark_tris=int((mat == 1).sum()), n_ring=len(RD))
    return dict(Vb=Vb, Vo=Vo, F=Fall, mat=mat, Nb=Nb, No=No, W=W, loop=loop, rings=np.concatenate(rings), side_h=side_h, info=info, nH=nH, XT=XT)

def diagnostics(out, quiet=False):
    Vb, Vo, F, mat, nH = out['Vb'], out['Vo'], out['F'], out['mat'], out['nH']
    import slitcut as sc
    st = sc.edge_stats(F)
    def fnrm(V): return np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    nb, no = fnrm(Vb), fnrm(Vo); dots = (nb * no).sum(1) / (np.linalg.norm(nb, axis=1) * np.linalg.norm(no, axis=1) + 1e-12)
    ish = F.max(1) < nH
    big = (0.5 * np.linalg.norm(nb, axis=1) > 0.3)
    rep = dict(edge_stats=st, flips_head=int(((dots < 0) & ish).sum()), flips_head_big=int(((dots < 0) & ish & big).sum()),
               flips_cav=int(((dots < 0) & ~ish).sum()), low_head_big=int(((dots < 0.3) & ish & big).sum()))
    E = np.sort(np.vstack([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]), 1); E = np.unique(E, axis=0)
    eh = (E.max(1) < nH)
    lb = np.linalg.norm(Vb[E[:, 0]] - Vb[E[:, 1]], axis=1); lo_ = np.linalg.norm(Vo[E[:, 0]] - Vo[E[:, 1]], axis=1)
    r = lo_ / np.maximum(lb, 1e-6); longe = lb > 0.6
    rep['head_stretch_max'] = float(r[eh & longe].max()); rep['head_compress_min'] = float(r[eh & longe].min())
    if not quiet:
        idx = np.nonzero(eh & longe)[0]
        worst = idx[np.argsort(-r[idx])[:6]]; worstc = idx[np.argsort(r[idx])[:6]]
        rep['worst_stretch'] = [(np.round(Vb[E[i, 0]], 1).tolist(), round(float(r[i]), 2)) for i in worst]
        rep['worst_compress'] = [(np.round(Vb[E[i, 0]], 1).tolist(), round(float(r[i]), 2)) for i in worstc]
        bad = np.nonzero((dots < 0) & ish & big)[0]
        rep['flipped_head_faces'] = [np.round(Vb[F[i]].mean(0), 1).tolist() for i in bad[:8]]
    return rep

if __name__ == '__main__':
    out = build()
    np.savez('v5_mesh.npz', **{k: v for k, v in out.items() if k not in ('info',)})
    print(json.dumps(out['info']))
    print(json.dumps(diagnostics(out), indent=1))
