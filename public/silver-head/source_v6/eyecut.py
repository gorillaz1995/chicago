"""v6_mesh.npz -> v6_eyes.npz: clip open almond eye holes through the shell, add an inward rim wall, build two marquise gems.
All mm, glTF frame (x right, y up, z face)."""
import json, numpy as np
import head7, post
RIM_D = 3.0          # rim wall depth into the head (mm)
d = np.load('v6_mesh.npz')
Vb, Vo, F, mat, Nb, No, W = (d[k].copy() for k in ('Vb', 'Vo', 'F', 'mat', 'Nb', 'No', 'W')); nH = int(d['nH'])
phi = np.full(len(Vb), 1e3)
eye_zone = (np.abs(Vb[:, 0]) > 8) & (np.abs(Vb[:, 0]) < 62) & (Vb[:, 1] > -16) & (Vb[:, 1] < 26) & (Vb[:, 2] > 45)
phi[eye_zone] = head7.hole_sd_out(Vb[eye_zone])
assert (np.abs(Vo - Vb)[phi < 4.0].max() < 1e-6), 'hole surroundings must be rigid'
newV = []; newVo = []; newW = []; ekey = {}
def cut_vertex(a, b):
    k = (min(a, b), max(a, b))
    if k in ekey: return ekey[k]
    t = phi[a] / (phi[a] - phi[b])
    p = Vb[a] + t * (Vb[b] - Vb[a]); po = Vo[a] + t * (Vo[b] - Vo[a]); w = W[a] + t * (W[b] - W[a])
    idx = len(Vb) + len(newV); newV.append(p); newVo.append(po); newW.append(w); ekey[k] = idx
    return idx
keep = []; removed = 0
for fi, (a, b, c) in enumerate(F):
    if mat[fi] != 0: keep.append((a, b, c, mat[fi])); continue
    s = [phi[a] >= 0, phi[b] >= 0, phi[c] >= 0]
    if all(s): keep.append((a, b, c, 0)); continue
    if not any(s): removed += 1; continue
    tri = [a, b, c]
    # rotate so the odd vertex is first
    for r in range(3):
        if sum(s) == 1 and s[0]: break
        if sum(s) == 2 and not s[0]: break
        tri = tri[1:] + tri[:1]; s = s[1:] + s[:1]
    p0, p1, p2 = tri
    if sum(s) == 1:          # only p0 outside: keep a triangle
        keep.append((p0, cut_vertex(p0, p1), cut_vertex(p0, p2), 0))
    else:                    # p0 inside, p1 p2 outside: keep a quad
        q1, q2 = cut_vertex(p0, p1), cut_vertex(p0, p2)
        keep.append((q1, p1, p2, 0)); keep.append((q1, p2, q2, 0))
newV = np.array(newV); newVo = np.array(newVo); newW = np.array(newW)
Vb = np.vstack([Vb, newV]); Vo = np.vstack([Vo, newVo]); W = np.concatenate([W, newW])
nb_new = post.sdf_normals(newV, e=0.2)
Nb = np.vstack([Nb, nb_new]); No = np.vstack([No, nb_new])
K = np.array(keep); F = K[:, :3].astype(np.int64); mat = K[:, 3].astype(np.int64)
# ---- boundary loops of the holes
E = np.vstack([F[mat == 0][:, [0, 1]], F[mat == 0][:, [1, 2]], F[mat == 0][:, [2, 0]]])
from collections import Counter
cnt = Counter(map(tuple, np.sort(E, 1)))
bd = [e for e in map(tuple, E) if cnt[tuple(sorted(e))] == 1]
nxt = {a: b for a, b in bd}
loops = []; seen = set()
for a in list(nxt):
    if a in seen: continue
    L = [a]; seen.add(a); x = nxt[a]
    while x != a: L.append(x); seen.add(x); x = nxt[x]
    loops.append(L)
loops = [L for L in loops if len(L) > 8 and Vb[L][:, 1].mean() > -20]
loops.sort(key=lambda L: Vb[L][:, 0].mean())
assert len(loops) == 2, [len(L) for L in loops]
# ---- rim wall: duplicate the loop (split normals) and an inner copy pushed into the head
rimV, rimN, rimF = [], [], []
base = len(Vb)
gems = []
for L in loops:
    P = Vb[L]; Nn = post.sdf_normals(P, e=0.2); c = P.mean(0); nbar = Nn.mean(0); nbar /= np.linalg.norm(nbar)
    n = len(L); top = []; bot = []
    for i in range(n):
        p = P[i] - Nn[i] * 0.02
        q = P[i] - Nn[i] * RIM_D + (c - P[i]) * 0.10       # slight funnel toward the hole axis
        top.append(base + len(rimV)); rimV.append(p)
        bot.append(base + len(rimV)); rimV.append(q)
    for i in range(n):
        j = (i + 1) % n
        rimF += [(top[i], bot[i], top[j]), (top[j], bot[i], bot[j])]
    # gem frame
    e1 = np.linalg.svd((P - c) - np.outer((P - c) @ nbar, nbar))[2][0]; e1 -= nbar * (e1 @ nbar); e1 /= np.linalg.norm(e1)
    if e1[0] * np.sign(c[0]) < 0: e1 = -e1
    e2 = np.cross(nbar, e1); e2 /= np.linalg.norm(e2)
    if e2[1] < 0: e2 = -e2
    u = (P - c) @ e1; v = (P - c) @ e2
    ng = 0.45 * nbar + 0.55 * np.array([0.0, 0.0, 1.0]); ng /= np.linalg.norm(ng)
    gems.append(dict(c=c, n=ng, e1=e1, e2=e2, L=float(np.abs(u).max()), Hu=float(v.max()), Hl=float(-v.min())))
rimV = np.array(rimV); rimF = np.array(rimF)
# rim normals: per vertex average of its wall faces (wall faces the hole axis)
fn = np.cross(rimV[rimF[:, 1] - base] - rimV[rimF[:, 0] - base], rimV[rimF[:, 2] - base] - rimV[rimF[:, 0] - base])
# orient walls so normals point toward the loop axis (into the hole)
cen = np.array([g['c'] for g in gems])
fc = rimV[rimF - base].mean(1); near = cen[np.argmin(np.linalg.norm(fc[:, None] - cen[None], axis=2), 1)]
flip = (np.einsum('ij,ij->i', fn, near - fc) < 0)
rimF[flip] = rimF[flip][:, [0, 2, 1]]; fn[flip] *= -1
rn = np.zeros_like(rimV); np.add.at(rn, rimF - base, fn[:, None, :].repeat(3, 1) if False else np.repeat(fn[:, None, :], 3, 1))
rn /= np.linalg.norm(rn, axis=1, keepdims=True)
# keep the outer surface winding consistent with the head (outward normals): check one kept face near a loop
Vb = np.vstack([Vb, rimV]); Vo = np.vstack([Vo, rimV]); Nb = np.vstack([Nb, rn]); No = np.vstack([No, rn])
W = np.concatenate([W, np.zeros(len(rimV))])
F = np.vstack([F, rimF]); mat = np.concatenate([mat, np.zeros(len(rimF), np.int64)])
# ---- compact: drop unused vertices, keep head (+eye) vertices first, cavity after
used = np.zeros(len(Vb), bool); used[F.ravel()] = True
is_cav = np.zeros(len(Vb), bool); is_cav[nH:len(d['Vb'])] = True
order = np.concatenate([np.nonzero(used & ~is_cav)[0], np.nonzero(used & is_cav)[0]])
remap = -np.ones(len(Vb), np.int64); remap[order] = np.arange(len(order))
F = remap[F]; Vb, Vo, Nb, No, W = Vb[order], Vo[order], Nb[order], No[order], W[order]
nH2 = int((used & ~is_cav).sum())
# ---- marquise gems (flat shaded, unwelded), mm
def marquise(g, N=28):
    L, H = 0.80 * g['L'], 0.74 * min(g['Hu'], g['Hl'] * 1.6, (g['Hu'] + g['Hl']) / 2)
    R = (L * L + H * H) / (2 * H)
    us = np.concatenate([np.linspace(-L, L, N // 2 + 1)[:-1], np.linspace(L, -L, N // 2 + 1)[:-1]])
    vs = np.sqrt(np.maximum(R * R - us ** 2, 0)) - (R - H)
    vs[N // 2:] *= -1
    # resample by angle for even facet sizes
    ang = np.arctan2(vs / H, us / L); o = np.argsort(ang); us, vs = us[o], vs[o]
    W_ = 2 * H; hc, pd = 0.20 * W_, 0.48 * W_
    zg = 1.8                                   # girdle plane just in front of the hole loop (mm along n)
    def P3(u, v, w): return g['c'] + u * g['e1'] + v * g['e2'] + (w + zg) * g['n']
    gir = [P3(u, v, 0) for u, v in zip(us, vs)]
    M = N // 2
    tab = [P3(0.52 * us[2 * k], 0.46 * vs[2 * k], hc) for k in range(M)]
    pav = [P3(0.50 * us[2 * k], 0.44 * vs[2 * k], -0.55 * pd) for k in range(M)]
    top_c = P3(0, 0, hc); cul = P3(0, 0, -pd)
    T = []
    for k in range(M):
        k1 = (k + 1) % M; g0, g1, g2 = gir[2 * k], gir[2 * k + 1], gir[(2 * k + 2) % N]
        T += [(g0, g1, tab[k]), (g1, g2, tab[k1]), (tab[k], g1, tab[k1]), (tab[k], tab[k1], top_c)]
        T += [(g1, g0, pav[k]), (g2, g1, pav[k1]), (pav[k1], g1, pav[k]), (pav[k1], pav[k], cul)]
    T = np.array(T)
    nrm = np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0]); cen_ = T.mean(1)
    gc = g['c'] + (zg + 0.1 * hc) * g['n']
    out = np.einsum('ij,ij->i', nrm, cen_ - gc) < 0
    T[out] = T[out][:, [0, 2, 1]]; nrm[out] *= -1
    nrm /= np.linalg.norm(nrm, axis=1, keepdims=True)
    return T.reshape(-1, 3), np.repeat(nrm, 3, 0), dict(length=2 * L, width=2 * H, crown=hc, pavilion=pd, tris=len(T))
GV, GN, GI = [], [], []
for g in gems:
    v, n, info = marquise(g); GV.append(v); GN.append(n); GI.append(info)
GV = np.vstack(GV); GN = np.vstack(GN); GF = np.arange(len(GV)).reshape(-1, 3)
np.savez('v6_eyes.npz', Vb=Vb, Vo=Vo, F=F, mat=mat, Nb=Nb, No=No, W=W, nH=nH2, GV=GV, GN=GN, GF=GF)
rep = dict(removed_tris=removed, added_cut_verts=len(newV), loops=[len(L) for L in loops], rim_tris=len(rimF), tris=dict(total=len(F), silver=int((mat == 0).sum()), dark=int((mat == 1).sum()), gems=len(GF)),
           verts=len(Vb), gems=[dict(centre=[round(float(x), 2) for x in g['c']], normal=[round(float(x), 3) for x in g['n']], **{k: round(float(v), 2) for k, v in i.items()}) for g, i in zip(gems, GI)])
print(json.dumps(rep, indent=1)); json.dump(rep, open('eyecut_report.json', 'w'), indent=1)
