"""Tiny software renderer for shape review: orthographic, painter's algorithm, procedural matcap."""
import numpy as np, cv2

def vertex_normals(V, F):
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    N = np.zeros_like(V)
    for k in range(3): np.add.at(N, F[:, k], fn)
    return N / (np.linalg.norm(N, axis=1, keepdims=True) + 1e-12)

def view_basis(yaw_deg, pitch_deg=0.0):
    t = np.radians(yaw_deg); p = np.radians(pitch_deg)
    # u right, v up, w towards camera (yaw 0 = front, 90 = camera at -X, face to the right)
    u = np.array([np.cos(t), 0, np.sin(t)])
    w0 = np.array([-np.sin(t), 0, np.cos(t)])
    v0 = np.array([0, 1.0, 0])
    w = w0 * np.cos(p) + v0 * np.sin(p)
    v = v0 * np.cos(p) - w0 * np.sin(p)
    return np.stack([u, v, w])

def shade(n, mode='silver'):
    nu, nv, nw = n[:, 0], n[:, 1], n[:, 2]
    L1 = np.array([-0.45, 0.65, 0.62]); L1 /= np.linalg.norm(L1)
    L2 = np.array([0.75, 0.05, 0.55]); L2 /= np.linalg.norm(L2)
    L3 = np.array([0.0, 0.95, -0.2]); L3 /= np.linalg.norm(L3)
    d1 = np.clip(n @ L1, 0, 1); d2 = np.clip(n @ L2, 0, 1); d3 = np.clip(n @ L3, 0, 1)
    # reflection of the view vector for a soft studio lookup
    r = 2 * nw[:, None] * n - np.array([0, 0, 1.0])
    s1 = np.clip(r @ L1, 0, 1) ** 18; s2 = np.clip(r @ L2, 0, 1) ** 10
    if mode == 'zebra':
        e = 0.5 + 0.5 * np.sin(r[:, 1] * 14 + 0.6 * r[:, 0] * 6)
        return np.clip(0.15 + 0.8 * (e > 0.5), 0, 1)
    c = 0.20 + 0.42 * d1 + 0.18 * d2 + 0.12 * d3 + 0.55 * s1 + 0.25 * s2 + 0.22 * (1 - np.clip(nw, 0, 1)) ** 3
    return np.clip(c, 0, 1) ** (1 / 1.25)

def render(V, F, N=None, yaw=0.0, pitch=0.0, scale=1 / 0.2302, center_px=(628, 603.5), size=1254, ss=2,
           mode='silver', dark_faces=None, bg=(0.14, 0.14, 0.16)):
    B = view_basis(yaw, pitch)
    X = V @ B.T
    if N is None: N = vertex_normals(V, F)
    NV = N @ B.T
    S = size * ss
    px = (center_px[0] + X[:, 0] * scale) * ss
    py = (center_px[1] - X[:, 1] * scale) * ss
    tri = F
    cen_w = X[tri, 2].mean(1)
    fn = NV[tri].mean(1); fn /= (np.linalg.norm(fn, axis=1, keepdims=True) + 1e-12)
    # geometric facing (cull back faces)
    a = X[tri[:, 1]] - X[tri[:, 0]]; b = X[tri[:, 2]] - X[tri[:, 0]]
    gn = np.cross(a, b)[:, 2]
    front = gn > 0
    col = shade(fn, mode)
    if dark_faces is not None:
        col = np.where(dark_faces, 0.02 + 0.03 * col, col)
    img = np.zeros((S, S, 3), np.float32); img[:] = np.array(bg)[None, None, ::-1]
    mask = np.zeros((S, S), np.uint8)
    order = np.argsort(cen_w[front])
    idx = np.nonzero(front)[0][order]
    P = np.stack([px, py], 1)
    for i in idx:
        poly = (P[tri[i]] * 16).astype(np.int32)
        c = float(col[i])
        cv2.fillConvexPoly(img, poly, (c, c, c), lineType=cv2.LINE_8, shift=4)
        cv2.fillConvexPoly(mask, poly, 255, lineType=cv2.LINE_8, shift=4)
    img = cv2.resize(img, (size, size), interpolation=cv2.INTER_AREA)
    mask = cv2.resize(mask, (size, size), interpolation=cv2.INTER_AREA)
    return (np.clip(img, 0, 1) * 255).astype(np.uint8), mask
