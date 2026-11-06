"""Silver head v4 - sculpt SDF (units mm).  Frame = glTF frame: x lateral, y up, z forward (face +z).
Origin: y=0 vertical centre of the head, z=0 front/back midpoint of the skull at forehead height.
Proportions measured from the approved silver renders (front: 0.2302 mm/px, profile: 0.2366 mm/px, head height 235 mm).
"""
import numpy as np
from scipy.interpolate import PchipInterpolator
from prims import *

Y_TOP, Y_BOT = 117.5, -117.5

# ---------------------------------------------------------------- base loft (cranium + face + jaw + underside)
#            y      a     zf     zb    pf
LOFT = np.array([
    [ 117.5,  0.0,   0.0,   0.0, 2.00],
    [ 113.6, 23.6,  24.4, -25.0, 2.00],
    [ 109.0, 34.2,  37.3, -37.3, 2.00],
    [ 104.4, 41.8,  46.3, -46.0, 2.00],
    [  99.8, 47.8,  52.8, -52.4, 2.00],
    [  95.2, 52.7,  57.8, -57.4, 2.00],
    [  90.6, 56.9,  62.2, -62.1, 2.00],
    [  86.0, 60.2,  66.2, -66.0, 2.00],
    [  81.4, 63.2,  69.4, -69.3, 2.00],
    [  76.8, 65.6,  72.4, -72.4, 2.00],
    [  72.2, 67.7,  74.6, -74.9, 2.00],
    [  67.6, 69.5,  77.1, -77.3, 2.00],
    [  63.0, 70.9,  79.0, -79.4, 2.00],
    [  58.4, 72.1,  80.5, -81.2, 2.00],
    [  53.8, 73.1,  81.5, -82.7, 2.00],
    [  49.1, 73.8,  82.4, -83.9, 2.00],
    [  44.5, 74.2,  83.4, -85.0, 2.00],
    [  39.9, 74.6,  84.6, -85.9, 2.00],
    [  35.3, 74.6,  85.6, -86.4, 2.00],
    [  30.6, 74.5,  86.4, -86.8, 2.00],
    [  26.0, 74.1,  86.8, -87.1, 2.02],
    [  21.5, 73.5,  86.8, -87.1, 2.03],
    [  17.0, 73.0,  86.4, -86.6, 2.05],
    [  12.0, 71.5,  86.0, -85.9, 2.07],
    [   7.0, 70.0,  85.5, -84.9, 2.09],
    [   2.0, 69.0,  85.3, -83.8, 2.11],
    [  -3.0, 68.0,  86.0, -82.1, 2.13],
    [  -8.0, 67.2,  87.5, -79.5, 2.15],
    [ -13.0, 66.5,  89.0, -77.0, 2.17],
    [ -18.0, 66.0,  90.5, -74.0, 2.19],
    [ -23.0, 65.6,  92.0, -71.0, 2.20],
    [ -28.0, 65.3,  93.5, -67.5, 2.20],
    [ -33.0, 65.0,  95.0, -64.5, 2.20],
    [ -38.0, 64.7,  96.5, -61.0, 2.20],
    [ -43.0, 64.2,  97.5, -58.5, 2.20],
    [ -47.5, 63.7,  98.0, -56.8, 2.20],
    [ -52.1, 63.3,  98.0, -55.4, 2.20],
    [ -56.7, 62.6,  97.8, -54.2, 2.20],
    [ -61.3, 61.8,  97.5, -53.0, 2.20],
    [ -66.0, 60.5,  96.8, -51.0, 2.20],
    [ -70.6, 59.0,  96.0, -49.0, 2.20],
    [ -75.2, 57.4,  94.8, -46.5, 2.20],
    [ -79.8, 55.1,  94.5, -43.0, 2.20],
    [ -84.4, 52.3,  95.5, -39.5, 2.20],
    [ -89.0, 49.6,  97.0, -35.5, 2.20],
    [ -93.6, 46.3,  98.0, -30.5, 2.20],
    [ -98.2, 41.8,  97.8, -24.0, 2.20],
    [-102.8, 36.1,  96.0, -17.0, 2.17],
    [-107.4, 29.7,  93.0,  -8.0, 2.12],
    [-112.0, 22.0,  87.5,   0.7, 2.06],
    [-115.0, 14.0,  69.0,  15.0, 2.03],
    [-116.6,  8.6,  58.0,  24.0, 2.01],
    [-117.5,  0.0,  41.0,  41.0, 2.00],
])
LOFT = LOFT[np.argsort(LOFT[:, 0])]
_YG = np.arange(-120.0, 120.01, 0.1)

def _prep():
    y = LOFT[:, 0]
    zc = 0.5 * (LOFT[:, 2] + LOFT[:, 3]); df = 0.5 * (LOFT[:, 2] - LOFT[:, 3])
    cl = lambda v: np.clip(_YG, y[0], y[-1])
    out = {}
    out['zc'] = PchipInterpolator(y, zc)(cl(0))
    for k, v in (('a', LOFT[:, 1]), ('d', df)):
        out[k] = np.sqrt(np.maximum(PchipInterpolator(y, v ** 2)(cl(0)), 0.0))
    out['pf'] = PchipInterpolator(y, LOFT[:, 4])(cl(0))
    from scipy.ndimage import gaussian_filter1d
    for k in ('zc', 'a', 'd'):
        v = out[k] ** 2 if k != 'zc' else out[k]
        v = gaussian_filter1d(v, 28, mode='nearest')
        out[k] = np.sqrt(np.maximum(v, 0.0)) if k != 'zc' else v
    out['pf'] = gaussian_filter1d(out['pf'], 90, mode='nearest')
    out['pb'] = np.full_like(out['pf'], 2.0)
    return out
_PR = _prep()
P_Y = np.array([105.0, 80.0, 55.0, 30.0, 5.0, -20.0, -45.0, -70.0, -95.0])
def set_exponents(pf, pb):
    """pf/pb: exponent control values at P_Y (front / back superellipse exponents of the cranium+face loft)."""
    from scipy.ndimage import gaussian_filter1d
    for k, v in (('pf', pf), ('pb', pb)):
        a = PchipInterpolator(P_Y[::-1], np.asarray(v, float)[::-1])(np.clip(_YG, P_Y[-1], P_Y[0]))
        _PR[k] = gaussian_filter1d(a, 60, mode='nearest')
set_exponents([2.7, 2.6, 2.3, 2.7, 2.7, 2.7, 1.8, 1.8, 1.8], [2.0, 2.1, 2.2, 2.1, 2.2, 2.1, 1.8, 1.8, 1.8])
def _I(k, y): return np.interp(y, _YG, _PR[k])

ZW = 11.2     # z of the widest point of the lower-face cross-sections (jaw angle sits near the ears)
def _wfade(y):
    # 0 = widest point at the loft midpoint (cranium), 1 = at ZW (cheeks/jaw); back to 0 on the chin underside
    return sstep(10.0, -40.0, y) * (1.0 - sstep(-95.0, -112.0, y))

def _loft_F(P):
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    zc0 = _I('zc', y); a = np.maximum(_I('a', y), 0.3); d = np.maximum(_I('d', y), 0.3); pf = _I('pf', y); pb = _I('pb', y)
    zf_ = zc0 + d; zb_ = zc0 - d
    zc = zc0 + _wfade(y) * (ZW - zc0)
    df = np.maximum(zf_ - zc, 0.3); db = np.maximum(zc - zb_, 0.3)
    dz = z - zc
    front = dz >= 0
    ax = np.abs(x) / a
    r = np.empty_like(x)
    tf = dz[front] / df[front]; af = ax[front]
    wf = tf * tf / (af * af + tf * tf + 1e-12)
    pp = 2.0 + (pf[front] - 2.0) * wf
    r[front] = (af ** pp + tf ** pp) ** (1.0 / pp)
    tb = -dz[~front] / db[~front]; ab = ax[~front]; pq = pb[~front]
    r[~front] = (ab ** pq + tb ** pq) ** (1.0 / pq)
    return r - 1.0

def loft(P):
    e = 0.3
    F = _loft_F(P)
    gx = (_loft_F(P + [e, 0, 0]) - F) / e
    gy = (_loft_F(P + [0, e, 0]) - F) / e
    gz = (_loft_F(P + [0, 0, e]) - F) / e
    g = np.sqrt(gx * gx + gy * gy + gz * gz) + 1e-6
    d = F / g
    return np.maximum(np.maximum(d, P[:, 1] - Y_TOP), Y_BOT - P[:, 1])

# ---------------------------------------------------------------- parameters
PRM = dict(
    ZM=-60.3,        # stomion height (mouth line)
    G=3.0,           # authored slit gap (mm), closed by the basis shape
    KAPPA=0.012,     # lip arch (mm of set-back per mm^2 of lateral offset)
)
EYE = dict(x=33.4, y=6.8, z=67.8)          # eyeball centre (mm)

KY = 0.0030
def bent(P, kappa):
    Q = P.copy(); Q[:, 2] = P[:, 2] + kappa * P[:, 0] ** 2; Q[:, 1] = P[:, 1] + KY * P[:, 0] ** 2
    return Q

def face_gate(z): return sstep(18.0, 48.0, z)


ZM_ = -60.3
_LV0 = np.array([-24.0, -19.7, -15.7, -11.7, -7.7, -3.7, 0.3, 4.3, 8.3, 12.3, 16.3, 20.3, 24.0, 30.0])
_LB0 = np.array([  0.0,   0.0,   0.2,   4.4,  5.9,  5.5, 3.2, 4.3, 5.9,  4.9,  2.2,  1.4,  0.0,  0.0])
def _lip_table():
    from scipy.ndimage import gaussian_filter1d
    vv = np.arange(-24.0, 30.001, 0.05)
    b = PchipInterpolator(_LV0, _LB0)(vv)
    return vv, gaussian_filter1d(b, 14, mode='nearest')
_LV, _LB = _lip_table()

def displacement(Q):
    """Soft surface modelling in the frontal plane: positive = outward. Q = (|x|, y, z)."""
    x, y, z = Q[:, 0], Q[:, 1], Q[:, 2]
    g = face_gate(z)
    h = np.zeros_like(x)
    # supraorbital ridge / glabella: broad swelling (profile silhouette shows +2.6 mm at y~28 on the midline)
    h += 2.7 * gauss2(x, y, 0.0, 28.0, 19.0, 7.0, 0)
    ridge = [(-14, 28.0), (0, 28.0), (14, 28.0), (26, 28.6), (38, 28.2), (48, 25.5), (58, 21.0), (66, 15.5)]
    h += 0.55 * np.exp(-0.5 * (dist_polyline2(x, y, ridge) / 7.0) ** 2) * (1 - sstep(34.0, 66.0, x))
    # eyebrow band (measured centre line), slightly raised
    brow = [(9.5, 23.0), (18, 23.9), (26, 25.0), (36, 26.0), (44, 26.2), (52, 23.8), (60, 21.0), (66, 17.0)]
    taper = sstep(7.0, 14.0, x) * (1 - sstep(60.0, 70.0, x))
    dyb = y - _BROW_Y(x)
    sg = np.where(dyb < 0, BROW_SL, BROW_SU)
    h += BROW_A * np.exp(-0.5 * (dyb / sg) ** 2) * taper
    # sulcus between brow and upper lid
    sul = [(16, 17.8), (26, 19.4), (36, 20.4), (46, 19.2), (55, 15.6)]
    h -= 1.0 * np.exp(-0.5 * ((y - _SUL_Y(x)) / 2.4) ** 2) * sstep(12.0, 18.0, x) * (1 - sstep(50.0, 62.0, x))
    # soft orbit hollow + tear trough
    h -= 2.6 * gauss2(x, y, 34.0, 10.5, 19.0, 7.5, -4)
    h -= 1.8 * gauss2(x, y, 17.0, 3.0, 5.5, 9.0, 0)
    nl = [(21.5, -29.0), (25.0, -42.0), (28.0, -52.0), (30.0, -62.0)]
    h -= 1.0 * np.exp(-0.5 * (dist_polyline2(x, y, nl) / 3.4) ** 2)
    h += 0.9 * gauss2(x, y, 32.0, -38.0, 8.0, 9.0, 0)
    h -= 1.4 * gauss2(x, y, 31.0, -3.0, 15.0, 5.0, -8)
    # cheekbone and infra-zygomatic hollow
    h += 4.2 * gauss2(x, y, 46.0, -12.0, 14.0, 8.0, 25)
    h -= 4.2 * gauss2(x, y, 40.0, -35.0, 13.0, 9.0, 10)
    h += 2.2 * gauss2(x, y, 57.0, -62.0, 10.0, 9.0, 0)
    h -= 1.5 * gauss2(x, y, 48.0, -52.0, 8.0, 7.0, 0)
    # temple hollow (very light)
    h -= 1.2 * gauss2(x, y, 64.0, 32.0, 9.0, 16.0, 0)
    # mentolabial sulcus + chin pad
    h -= 0.8 * gauss2(x, y, 0.0, -77.5, 15.0, 2.6, 0)
    h += 1.2 * gauss2(x, y, 0.0, -91.0, 14.0, 7.5, 0)
    h += eye_disp(x, y)
    # lips: bump profile along the (bent) mouth-line coordinate v, tapering to the corners
    if TABLE_ON:
        v = y - ZM_ + KY * x * x
        h += np.interp(v, _LV, _LB) * (1.0 - sstep(10.0, 28.5, x))
    h += philtrum(x, y) + lip_skin(x, y)
    return h * g

BROW_A = 1.3; BROW_SL = 2.2; BROW_SU = 4.2
_BX = np.array([9.5, 18, 26, 36, 44, 52, 60, 66.0]); _BY = np.array([23.0, 23.9, 25.0, 26.0, 26.2, 23.8, 21.0, 17.0])
_BROW_Y = PchipInterpolator(_BX, _BY, extrapolate=True)
_SX = np.array([12, 16, 26, 36, 46, 55, 62.0]); _SY = np.array([17.4, 17.8, 19.4, 20.4, 19.2, 15.6, 12.0])
_SUL_Y = PchipInterpolator(_SX, _SY, extrapolate=True)
def philtrum(x, y):
    ph = [(3.0, -38.5), (4.3, -44.0), (5.0, -50.0)]
    return PHI * np.exp(-0.5 * (dist_polyline2(x, y, ph) / 1.7) ** 2) * sstep(-52.0, -47.0, y) - 0.5 * gauss2(x, y, 0.0, -44.5, 1.8, 4.6, 0)
PHI = 0.0

LIP = dict(K=0.019, UXO=6.0, UV=7.0, UZ=97.5, URX=19.5, URY=6.2, URZ=5.0, LV=6.5, LZ=96.5, LRX=24.0, LRY=7.0, LRZ=5.5,
           KSUB=0.8, KFACE=2.0, TV=4.8, TZ=99.5, TRX=3.6, TRY=3.2, TRZ=4.0)
def lip_pillows(Q):
    """upper lip (two lobes + tubercle -> cupid's bow) and lower lip, as ellipsoids in the bent (lip-arch) frame"""
    L = LIP
    B = bent(Q, L['K']); B = B - np.array([0.0, ZM_, 0.0])
    up = None
    for sx in (-1.0, 1.0):
        e = ellipsoid(B, (sx * L['UXO'], L['UV'], L['UZ']), (L['URX'], L['URY'], L['URZ']))
        up = e if up is None else smin(up, e, L['KSUB'])
    tub = ellipsoid(B, (0.0, L['TV'], L['TZ']), (L['TRX'], L['TRY'], L['TRZ']))
    up = smin(up, tub, 1.6)
    lo = ellipsoid(B, (0.0, -L['LV'], L['LZ']), (L['LRX'], L['LRY'], L['LRZ']))
    pil = smin(up, lo, L['KSUB'])
    for sx in (-1.0, 1.0):                                               # modiolus: rounds off the mouth corners
        cor = ellipsoid(B, (sx * L['CX'], -0.3, L['CZ']), (3.6, 4.6, 2.9))
        pil = smin(pil, cor, 1.6)
    return pil + L['TAP'] * sstep(L['TX0'], L['TX1'], Q[:, 0])        # lips thin out toward the mouth corners
LIP_ON = True
TABLE_ON = False
LIP.update(TAP=2.0, TX0=9.0, TX1=27.0, RID_U=0.8, GRV_U=0.5, RID_L=0.7, GRV_L=0.5, TUB_A=0.9, UPB_A=0.0, LOB_A=0.0)
LIP.update(UPB_V=17.0, UPB_RY=6.0, UPB_RX=12.0, LOB_V=-14.5, LOB_RY=4.0)
LIP.update(**{'UXO': 6.22, 'UV': 7.494, 'UZ': 100.081, 'URX': 19.912, 'URY': 5.772, 'URZ': 3.627, 'LV': 5.222, 'LZ': 98.668, 'LRX': 24.203, 'LRY': 6.469, 'LRZ': 4.417, 'TV': 4.294, 'TZ': 95.821, 'TRX': 5.193, 'TRY': 2.157, 'TRZ': 3.946, 'UPB_A': 1.9, 'UPB_V': 15.448, 'UPB_RY': 5.817, 'LOB_A': 0.405, 'TAP': 1.831})
LIP.update(RID_U=0.0, GRV_U=0.0, RID_L=0.0, GRV_L=0.0, TUB_A=0.0, TX0=8.0, TX1=26.0, CX=23.6, CZ=98.8, KFACE=3.2)
def lip_skin(x, y):
    """soft skin masses: upper-lip skin below the nose, and the fullness just under the lower lip"""
    L = LIP
    h = (L['UPB_A'] * gauss2(x, y, 0.0, ZM_ + L['UPB_V'], L['UPB_RX'], L['UPB_RY'], 0)
         + L['LOB_A'] * gauss2(x, y, 0.0, ZM_ + L['LOB_V'], 16.0, L['LOB_RY'], 0))
    v = y - ZM_ + KY * x * x
    r = np.clip(x / 27.5, 0.0, 1.0)
    vu0 = 10.2 * (1 - r ** 2.2); vl0 = 11.6 * (1 - r ** 2.0)
    bow = (1.2 * np.exp(-0.5 * ((x - 4.6) / 2.0) ** 2) - 1.7 * np.exp(-0.5 * (x / 1.4) ** 2)) * (1 - sstep(8.0, 18.0, x))
    vub = vu0 + bow
    wl = 1.0 - sstep(17.0, 27.0, x)
    h = h + wl * (L['RID_U'] * np.exp(-0.5 * ((v - vub) / 1.3) ** 2) - L['GRV_U'] * np.exp(-0.5 * ((v - vub - 2.6) / 1.4) ** 2)) * sstep(-0.5, 1.5, v)
    h = h + wl * (L['RID_L'] * np.exp(-0.5 * ((v + vl0) / 1.4) ** 2) - L['GRV_L'] * np.exp(-0.5 * ((v + vl0 + 2.8) / 1.5) ** 2)) * sstep(0.5, -1.5, v)
    h = h + L['TUB_A'] * gauss2(x, y, 0.0, ZM_ + 5.5, 3.5, 2.8, 0)           # tubercle of the upper lip
    return h

def _almond(s_, t_, b, hu, hl):
    hh = hl + (hu - hl) * sstep(-2.5, 2.5, t_)
    return vesica_wide(s_, t_, b, hh)

def eye_disp(x, y):
    """Open almond silver eye as a surface-following relief: lid rim ring, eyeball dome, lowered window groove."""
    xc, yc = 33.4, 5.9
    th = np.radians(3.2)
    s_ = (x - xc) * np.cos(th) + (y - yc) * np.sin(th)
    t_ = -(x - xc) * np.sin(th) + (y - yc) * np.cos(th)
    sdo = _almond(s_, t_, 17.8, 8.6, 2.9)
    sdi = _almond(s_, t_, 16.2, 7.4, 2.0)
    h = 1.2 * sstep(3.4, -3.4, sdo)                                      # almond proud of the socket
    h += 1.5 * np.exp(-0.5 * ((sdo + 1.3) / 2.0) ** 2)                  # lid rim ring
    h -= 1.2 * sstep(2.2, -2.2, sdi)                                    # window groove just inside the rim
    h += 3.4 * np.exp(-0.5 * ((s_ / 10.5) ** 2 + ((t_ - 2.6) / 3.8) ** 2)) * sstep(1.3, -1.3, sdi)   # eyeball dome
    return h

# nose: loft along y built from the measured profile silhouette (centre line front z) and half widths
NOSE_Y  = np.array([ 22.0, 16.0, 12.0,  8.0,  4.0,  0.0, -4.0, -8.0, -12.0, -16.0, -20.0, -24.0, -26.0, -28.0, -30.0, -32.0, -34.0, -36.0, -38.5])
NOSE_ZF = np.array([ 86.0, 86.2, 86.6, 87.8, 89.7, 92.0, 94.4, 97.2, 100.6, 104.3, 107.7, 108.7, 108.6, 107.8, 106.6, 104.8, 101.8,  98.8,  97.6])
NOSE_W  = np.array([  5.4,  5.6,  5.8,  6.0,  6.2,  6.5,  6.9,   7.5,   8.4,   9.4,  10.4,  11.4,  11.8,  12.0,  12.0,  11.8,  11.2,   9.8,   6.0])
NOSE_YA, NOSE_YB = 22.0, -38.5
def _smooth_tab(vals):
    from scipy.ndimage import gaussian_filter1d
    v = PchipInterpolator(NOSE_Y[::-1], np.asarray(vals)[::-1])(_YG[(_YG >= NOSE_YB) & (_YG <= NOSE_YA)])
    v = gaussian_filter1d(v, 22, mode='nearest')
    return v
_NY = _YG[(_YG >= NOSE_YB) & (_YG <= NOSE_YA)]
_NZF = _smooth_tab(NOSE_ZF); _NW = _smooth_tab(NOSE_W)

def nose_loft(P):
    """Half-ellipse cross-sections along y (width/height from the measured profile). Ellipse SDF approximation."""
    x = np.abs(P[:, 0]); y = P[:, 1]; z = P[:, 2]
    yc = np.clip(y, NOSE_YB, NOSE_YA)
    zb = _I('zc', yc) + _I('d', yc) - 3.0
    zf = np.interp(yc, _NY, _NZF)
    w = np.interp(yc, _NY, _NW)
    hgt = np.maximum(zf - zb, 0.6)
    zb = zb - 9.0 * sstep(5.0, 16.0, yc)                              # root sinks under the brow surface
    u = z - zb
    qx = x / w; qu = np.maximum(u, 0.0) / hgt
    k0 = np.sqrt(qx * qx + qu * qu)
    k1 = np.sqrt((qx / w) ** 2 + (qu / hgt) ** 2)
    de = k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)
    d = np.where(u >= 0, de, x - w)
    d = np.maximum(d, (zb - 12.0) - z)
    return smax(smax(d, y - NOSE_YA, 3.0), NOSE_YB - y, 3.5)

def _rot_xy(Q, cx, cy, deg):
    a = np.radians(deg); c, s = np.cos(a), np.sin(a)
    dx = Q[:, 0] - cx; dy = Q[:, 1] - cy
    return np.stack([cx + dx * c + dy * s, cy - dx * s + dy * c, Q[:, 2]], 1)

def nose(Q, P):
    d = nose_loft(Q)
    d = smin(d, ellipsoid(Q, (0.0, -26.0, 100.0), (9.6, 8.4, 8.6)), 3.0)              # tip lobule
    W = _rot_xy(Q, 12.2, -29.6, 16.0)
    d = smin(d, ellipsoid(W, (13.0, -27.8, 90.6), (6.4, 7.6, 7.4)), 4.2)              # alar wing, leaning toward the tip
    return d

def nostrils(Q):
    """soft nostril dimples (positive = carve depth in mm)"""
    W = _rot_xy(Q, 8.6, -35.4, -14.0)
    g = np.exp(-0.5 * (((W[:, 0] - 8.6) / 3.2) ** 2 + ((W[:, 1] + 35.4) / 2.4) ** 2 + ((W[:, 2] - 98.0) / 6.0) ** 2))
    return 2.6 * g

NOS_K = 3.4
NOS = dict(C=(8.0, -35.2, 97.6), A=(0.05, 0.88, -0.47), R=(3.0, 5.2, 3.0))
def nostril_pocket(Q):
    """nostril openings: oriented ellipsoid pockets entering the nose from below (up and back)"""
    C = np.array(NOS['C']); a = np.array(NOS['A']); a = a / np.linalg.norm(a)
    b = np.array([1.0, 0.0, 0.0]); b = b - a * (a @ b); b /= np.linalg.norm(b); c = np.cross(a, b)
    D = Q - C
    return ellipsoid(np.stack([D @ b, D @ a, D @ c], 1), (0.0, 0.0, 0.0), NOS['R'])

def alar_crease(Q):
    """soft alar groove (positive = carve depth in mm)"""
    pts = [(17.0, -23.5, 90.4), (20.0, -27.0, 89.8), (20.8, -31.0, 89.6), (20.6, -34.5, 89.7), (18.5, -37.2, 86.4)]
    dd = None
    for p, q in zip(pts[:-1], pts[1:]):
        c = capsule(Q, p, q, 0.0)
        dd = c if dd is None else np.minimum(dd, c)
    return 1.5 * np.exp(-0.5 * (dd / 2.1) ** 2)

EAR_TILT = dict(TY=6.0, TA=17.0, DX=-2.0, DY=-2.5, SY=1.0)

def ear(Q):
    """Simplified ear (adapted from v2) tilted so the lobe tucks toward the head (silhouette 82 mm at y~4 -> 70 mm at y=-40)."""
    T = EAR_TILT
    ta = np.radians(T['TA']); c, s = np.cos(ta), np.sin(ta)
    dx = Q[:, 0] - 70.0; dy = (Q[:, 1] - T['DY'] - T['TY']) / T['SY']
    Q = np.stack([70.0 + dx * c - dy * s + T['DX'], T['TY'] + dx * s + dy * c, Q[:, 2]], 1)
    return _ear0(Q)

def _ear0(Q):
    E = np.array([70.0, 15.0, 1.0])
    O = np.stack([Q[:, 0] - 3.0, -(Q[:, 2] - 3.0), Q[:, 1] + 13.0], 1)
    R = rot_z(-7.0) @ rot_x(12.0)
    L = (O - E) @ R
    c, a, b = L[:, 0], L[:, 1], L[:, 2]
    Pl = np.stack([a, b, c], 1)
    body = ellipsoid(Pl, (1.5, 5, 3.0), (16, 25.5, 6.0))
    lobe = ellipsoid(Pl, (-1.0, -20.5, 2.6), (8.5, 9.5, 4.6))
    e = smin(body, lobe, 6)
    e = smax(e, -ellipsoid(Pl, (2.5, 6.5, 9.4), (11.5, 19.5, 4.4)), 2.6)
    e = smin(e, round_cone(Pl, (3.5, -9.5, 5.6), (5.0, 14.0, 5.8), 2.5, 1.9), 3.0)
    e = smax(e, -ellipsoid(Pl, (-3.0, -4.0, 7.8), (6.5, 8.5, 4.8)), 2.6)
    e = smin(e, ellipsoid(Pl, (-11.0, -6.0, 3.0), (3.0, 4.0, 2.6)), 2.0)
    e = smin(e, ellipsoid(Pl, (-6.0, 2.0, -4.0), (8, 18, 6)), 4)
    e = smin(e, ellipsoid(Pl, (0.0, 3.0, -1.5), (12, 19, 5.5)), 6)
    return e

def lips(P, prm=PRM):
    K, ZM = prm['KAPPA'], prm['ZM']
    B = bent(P, K)
    upper = ellipsoid(B, (0, ZM + 7.3, 99.0), (26.5, 7.6, 5.0))
    lower = ellipsoid(B, (0, ZM - 6.2, 97.8), (24.0, 7.5, 4.9))
    return upper, lower

def mouth_cut(P, prm=PRM, z_in=76.0):
    G, ZM, K = prm['G'], prm['ZM'], prm['KAPPA']
    B = bent(P, K)
    u, v, w = B[:, 0], B[:, 1], B[:, 2]          # lateral, vertical, depth
    rc = G * 0.5
    du = np.abs(u) - 25.5 + rc
    dv = np.abs(v - ZM) - G * 0.5 + rc
    d2 = np.sqrt(np.maximum(du, 0) ** 2 + np.maximum(dv, 0) ** 2) + np.minimum(np.maximum(du, dv), 0) - rc
    slit = np.maximum(d2, z_in - w)
    cav = ellipsoid(P, (0, ZM + 0.5, 50.0), (24.0, 12.5, 27.0))
    return slit, cav

def head_sdf(P, prm=PRM, with_mouth=True):
    P = np.asarray(P, float)
    x = P[:, 0]
    Q = np.stack([np.abs(x), P[:, 1], P[:, 2]], 1)
    d = loft(P)
    d = d - displacement(Q)
    if LIP_ON:
        m = (Q[:, 2] > 60) & (Q[:, 1] < -38) & (Q[:, 1] > -90) & (Q[:, 0] < 40)
        if m.any():
            d[m] = smin(d[m], lip_pillows(Q[m]), LIP['KFACE'])
    # nose
    m = (Q[:, 2] > 55) & (Q[:, 1] < 36) & (Q[:, 1] > -54) & (Q[:, 0] < 34)
    if m.any():
        kk = (7.0 - 4.0 * sstep(-12.0, -26.0, Q[m][:, 1])) * (1.0 - 0.55 * sstep(6.0, 18.0, Q[m][:, 1]))
        gate = 1.0 - sstep(8.0, 22.0, Q[m][:, 1])
        d[m] = d[m] + gate * (smin(d[m], nose(Q[m], P[m]), kk) - d[m])
    # nostrils, alar crease
    m = (Q[:, 2] > 60) & (Q[:, 1] < -8) & (Q[:, 1] > -54) & (Q[:, 0] < 36)
    if m.any():
        dd = d[m] + nostrils(Q[m]) + alar_crease(Q[m])
        d[m] = smax(dd, -nostril_pocket(Q[m]), NOS_K)
    # ears
    m = Q[:, 0] > 50
    if m.any():
        d[m] = smin(d[m], ear(Q[m]), 4.0)
    if with_mouth:
        m = (Q[:, 2] > 20) & (Q[:, 1] < -40) & (Q[:, 1] > -85) & (Q[:, 0] < 32)
        if m.any():
            sl, cv = mouth_cut(P[m], prm)
            dd = smax(d[m], -sl, 1.0)
            dd = smax(dd, -cv, 2.0)
            d[m] = dd
    return d
