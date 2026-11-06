"""Cut a lens-shaped slit into a closed triangle mesh along the bent mouth line (zero gap, topological cut)."""
import numpy as np

ZM_CUT, KY_CUT, X_C = -60.0, 0.0036, 26.0

def side_fn(V, zm=ZM_CUT, ky=KY_CUT):
    return V[:, 1] + ky * V[:, 0] ** 2 - zm

def cut_slit(V, F, zm=ZM_CUT, ky=KY_CUT, xc=X_C, zmin=70.0):
    V = np.asarray(V, float); F = np.asarray(F, np.int64)
    s = side_fn(V, zm, ky); s[np.abs(s) < 1e-9] = 1e-9
    sa, sb, sc = s[F[:, 0]], s[F[:, 1]], s[F[:, 2]]
    cand = np.nonzero((np.sign(sa) != np.sign(sb)) | (np.sign(sb) != np.sign(sc)))[0]
    new_v = []; split = {}
    def split_vertex(u, v):
        key = (min(u, v), max(u, v))
        if key in split: return split[key]
        t = s[u] / (s[u] - s[v]); P = V[u] + t * (V[v] - V[u])
        if abs(P[0]) >= xc or P[2] <= zmin: split[key] = -1; return -1
        idx = len(V) + len(new_v); new_v.append(P); split[key] = idx; return idx
    out_faces = []; seg = []
    keep = np.ones(len(F), bool)
    for fi in cand:
        a, b, c = F[fi]
        m_ab = split_vertex(a, b) if s[a] * s[b] < 0 else -1
        m_bc = split_vertex(b, c) if s[b] * s[c] < 0 else -1
        m_ca = split_vertex(c, a) if s[c] * s[a] < 0 else -1
        ns = (m_ab >= 0) + (m_bc >= 0) + (m_ca >= 0)
        if ns == 0: continue
        keep[fi] = False
        if ns == 2:
            if m_ab >= 0 and m_ca >= 0:   # apex a
                out_faces += [(a, m_ab, m_ca), (m_ab, b, c), (m_ab, c, m_ca)]; seg.append((m_ab, m_ca))
            elif m_ab >= 0 and m_bc >= 0:  # apex b
                out_faces += [(b, m_bc, m_ab), (m_bc, c, a), (m_bc, a, m_ab)]; seg.append((m_bc, m_ab))
            else:                          # apex c
                out_faces += [(c, m_ca, m_bc), (m_ca, a, b), (m_ca, b, m_bc)]; seg.append((m_ca, m_bc))
        else:
            if m_ab >= 0: out_faces += [(a, m_ab, c), (m_ab, b, c)]
            elif m_bc >= 0: out_faces += [(b, m_bc, a), (m_bc, c, a)]
            else: out_faces += [(c, m_ca, b), (m_ca, a, b)]
    V2 = np.vstack([V, np.array(new_v)]) if new_v else V.copy()
    F2 = np.vstack([F[keep], np.array(out_faces, np.int64)])
    s2 = side_fn(V2, zm, ky); s2[len(V):] = 0.0
    # path chain
    adj = {}
    for u, v in seg:
        adj.setdefault(u, []).append(v); adj.setdefault(v, []).append(u)
    ends = [k for k, v in adj.items() if len(v) == 1]
    assert len(ends) == 2, f'expected a single open chain, got {len(ends)} ends'
    start = min(ends, key=lambda k: V2[k, 0])
    chain = [start]; prev = -1
    while True:
        nxt = [n for n in adj[chain[-1]] if n != prev]
        if not nxt: break
        prev = chain[-1]; chain.append(nxt[0])
    assert len(chain) == len(adj), 'cut path is not a single chain'
    interior = chain[1:-1]
    # duplicate interior vertices onto the lower side
    pathset = set(interior)
    dup = {}
    for m in interior:
        dup[m] = len(V2) + len(dup)
    V3 = np.vstack([V2, V2[interior]])
    s3 = np.concatenate([s2, np.zeros(len(interior))])
    isp = np.zeros(len(V2), bool); isp[interior] = True
    sums = s2[F2].sum(1)
    lower = sums < 0
    lut = np.arange(len(V3)); 
    for m, d in dup.items(): lut[m] = d
    Fl = F2.copy()
    touch = isp[F2].any(1) & lower
    Fl[touch] = np.where(isp[F2[touch]], lut[F2[touch]], F2[touch])
    info = dict(chain=np.array(chain), upper=np.array(chain), lower=np.array([chain[0]] + [dup[m] for m in interior] + [chain[-1]]),
                n_new=len(new_v), n_cross=len(seg))
    return V3, Fl, info

def edge_stats(F):
    e = np.sort(np.vstack([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]), 1)
    key = e[:, 0].astype(np.int64) * (e.max() + 1) + e[:, 1]
    u, c = np.unique(key, return_counts=True)
    return dict(edges=len(u), boundary=int((c == 1).sum()), nonmanifold=int((c > 2).sum()))
