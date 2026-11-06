"""v6 sculpt = head6 (leaner cheeks, eye sockets) seen through a lateral slimming warp.
Output x -> sculpt x:  u = |x| + (1/s(y) - 1) * softplus_k(|x| - A).  The face column |x| < A keeps its width
(nose, mouth and its rig unchanged); everything lateral of it is narrowed by s (cheeks/jaw more than the skull)."""
import numpy as np
import head6 as H
from prims import sstep
A, K = 28.0, 3.0
def s_of(y): return 0.80 + 0.06 * sstep(10.0, 60.0, y)
def _sp(t): return K * np.logaddexp(0.0, t / K)
def to_sculpt(P):
    P = np.asarray(P, float); x, y, z = P[:, 0], P[:, 1], P[:, 2]
    ax = np.abs(x); u = ax + (1.0 / s_of(y) - 1.0) * _sp(ax - A)
    return np.stack([np.sign(x) * u, y, z], 1)
def to_output_x(u, y):
    """inverse warp for |x| (Newton), used to place things defined in sculpt space."""
    v = np.array(u, float)
    for _ in range(30):
        t = (v - A) / K; g = v + (1.0 / s_of(y) - 1.0) * _sp(v - A) - u
        dg = 1.0 + (1.0 / s_of(y) - 1.0) / (1.0 + np.exp(-t))
        v = v - g / dg
    return v
def head_sdf(P, prm=None, with_mouth=True):
    Q = to_sculpt(P)
    d = H.head_sdf(Q, with_mouth=with_mouth) if prm is None else H.head_sdf(Q, prm, with_mouth)
    return d * 0.9                       # warp stretches distances by <= 1/0.8; keep a conservative estimate
def hole_sd_out(P):
    Q = to_sculpt(P); return H.hole_sd(np.abs(Q[:, 0]), Q[:, 1])
