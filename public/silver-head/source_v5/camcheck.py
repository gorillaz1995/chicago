import sys, numpy as np
d = np.load(sys.argv[1] if len(sys.argv) > 1 else 'v4_mesh.npz'); Vb, Vo, F, mat = d['Vb'], d['Vo'], d['F'], d['mat']
def ray_hits(V, F, o, dvec):
    """count triangle crossings of the ray o + t d (t>0) and return sorted t list"""
    a, b, c = V[F[:, 0]], V[F[:, 1]], V[F[:, 2]]
    e1, e2 = b - a, c - a; p = np.cross(dvec, e2); det = (e1 * p).sum(1)
    ok = np.abs(det) > 1e-12; inv = np.where(ok, 1.0 / np.where(ok, det, 1), 0)
    tv = o - a; u = (tv * p).sum(1) * inv; q = np.cross(tv, e1); v = (q * dvec).sum(1) * inv; t = (e2 * q).sum(1) * inv
    hit = ok & (u >= 0) & (v >= 0) & (u + v <= 1) & (t > 1e-6)
    return np.sort(t[hit])
dark_v = np.unique(F[mat == 1])
for name, V in (('closed (MouthOpen=0)', Vb), ('open (MouthOpen=1)', Vo)):
    pts = V[dark_v] * 1e-3
    lo, hi = pts.min(0), pts.max(0); size = hi - lo; ctr = (lo + hi) / 2
    inset = max(size[2] * 0.28, 0.008)
    approach = np.array([ctr[0], ctr[1], hi[2] + 0.03]); end = np.array([ctr[0], ctr[1], hi[2] - inset])
    look = np.array([ctr[0], ctr[1], lo[2] + size[2] * 0.15])
    print(name, 'MouthDark bbox mm: min', np.round(lo * 1e3, 1), 'max', np.round(hi * 1e3, 1), 'size', np.round(size * 1e3, 1))
    print('   centre mm', np.round(ctr * 1e3, 2), ' approach', np.round(approach * 1e3, 1), ' end', np.round(end * 1e3, 1), ' look', np.round(look * 1e3, 1))
    if 'open' in name:
        for zz in np.linspace(approach[2], end[2], 6):
            o = np.array([ctr[0], ctr[1], zz]) * 1e3
            up = ray_hits(V, F, o, np.array([0, 1.0, 0])); dn = ray_hits(V, F, o, np.array([0, -1.0, 0]))
            rt = ray_hits(V, F, o, np.array([1.0, 0, 0])); fw = ray_hits(V, F, o, np.array([0, 0, -1.0]))
            print('   cam z=%.1f mm: parity up %d down %d right %d ; first hit up %.1f down %.1f right %.1f back(-z) %.1f mm' % (
                zz * 1e3 if zz < 1 else zz, len(up) % 2, len(dn) % 2, len(rt) % 2, up[0] if len(up) else -1, dn[0] if len(dn) else -1, rt[0] if len(rt) else -1, fw[0] if len(fw) else -1))

print('--- jittered parity + frustum first-hit material test (open pose) ---')
def first_hit(V, F, o, dvec):
    a, b, c = V[F[:, 0]], V[F[:, 1]], V[F[:, 2]]
    e1, e2 = b - a, c - a; p = np.cross(dvec, e2); det = (e1 * p).sum(1)
    ok = np.abs(det) > 1e-12; inv = np.where(ok, 1.0 / np.where(ok, det, 1), 0)
    tv = o - a; u = (tv * p).sum(1) * inv; q = np.cross(tv, e1); v = (q * dvec).sum(1) * inv; t = (e2 * q).sum(1) * inv
    hit = ok & (u >= 0) & (v >= 0) & (u + v <= 1) & (t > 1e-6)
    if not hit.any(): return None, None
    i = np.nonzero(hit)[0][np.argmin(t[hit])]; return t[i], i
Vo_ = Vo
ctr = np.array([0.0, -71.37, 66.75])
rng = np.random.default_rng(1)
for zz in (96.0, 92.0, 88.0, 84.0, 80.7):
    o = np.array([0.0137, -71.37 + 0.0091, zz])
    cnt = {0: 0, 1: 0, None: 0}; worst_sil = 0
    par = [len(ray_hits(Vo_, F, o, dv / np.linalg.norm(dv))) % 2 for dv in rng.normal(size=(12, 3))]
    for ah in np.radians(np.linspace(-45, 45, 19)):
        for av in np.radians(np.linspace(-45, 45, 19)):
            dvec = np.array([np.sin(ah), np.sin(av), -np.cos(ah) * np.cos(av)]); dvec /= np.linalg.norm(dvec)
            t, i = first_hit(Vo_, F, o, dvec)
            cnt[None if i is None else int(mat[i])] += 1
    print('cam z=%.1f: parity of 12 random rays %s ; first hit material over +-45deg fan: silver %d, dark %d, miss %d' % (zz, par, cnt[0], cnt[1], cnt[None]))
