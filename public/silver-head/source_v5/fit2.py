import sys, time, json, numpy as np
sys.path.insert(0, '.')
import head5 as OLD, head6 as NEW
from PIL import Image
from scipy.optimize import minimize
NEW.LIP_ON = True; NEW.TABLE_ON = False
XS = np.array([0, 4, 8, 12, 16, 20, 24.0, 28.0]); YS = np.arange(-88.0, -35.9, 1.5)
ZG = np.arange(112.0, 80.0, -0.15)
PT = np.array([(x, y) for x in XS for y in YS])
G = np.stack([np.repeat(PT[:, 0], len(ZG)), np.repeat(PT[:, 1], len(ZG)), np.tile(ZG, len(PT))], 1)
def surf(mod):
    d = mod.head_sdf(G, with_mouth=False).reshape(len(PT), len(ZG))
    i = np.argmax(d < 0, axis=1); i0 = np.clip(i - 1, 0, len(ZG) - 1)
    d0 = d[np.arange(len(PT)), i0]; d1 = d[np.arange(len(PT)), i]
    t = np.where(d0 != d1, d0 / (d0 - d1 + 1e-12), 0.0)
    return ZG[i0] + t * (ZG[i] - ZG[i0])
T = surf(OLD)
_im = np.array(Image.open('../refs/prof.png').convert('RGBA'))[:, :, 3] > 128
def zref(y):
    py = int(round(599.5 - y / 0.2366)); row = np.nonzero(_im[py])[0]; return (row.max() - 570) * 0.2366
c0 = PT[:, 0] == 0
for i in np.nonzero(c0)[0]:
    if PT[i, 1] < -41: T[i] = zref(PT[i, 1])
W = np.where(c0, 4.0, np.where(PT[:, 0] <= 12, 0.6, 0.35))
# lateral taper target: lips must not be puffier than the old surface at |x|>=16
over = PT[:, 0] >= 16
names = ['UXO', 'UV', 'UZ', 'URX', 'URY', 'URZ', 'LV', 'LZ', 'LRX', 'LRY', 'LRZ', 'TV', 'TZ', 'TRX', 'TRY', 'TRZ', 'UPB_A', 'UPB_V', 'UPB_RY', 'LOB_A', 'TAP']
lo = dict(UXO=3, UV=3.5, URY=3.0, URX=10, URZ=2.5, LV=3.5, LRY=3.0, LRX=14, LRZ=2.5, TV=2, TRX=2.5, TRY=2, TRZ=2, UPB_A=0, UPB_RY=3, LOB_A=0, TAP=0)
hi = dict(UXO=9, UV=7.5, URY=5.8, URX=20, URZ=6, LV=7.5, LRY=6.5, LRX=25, LRZ=7, TV=8, TRX=8, TRY=5, TRZ=6, UPB_A=3.5, UPB_RY=7, LOB_A=1.5, TAP=4.5)
NEW.LIP.update(dict(UXO=6.5, UV=5.8, UZ=98.2, URX=19.0, URY=5.2, URZ=4.4, LV=5.8, LZ=97.2, LRX=23.0, LRY=5.6, LRZ=5.0, TV=4.5, TZ=98.4, TRX=5.0, TRY=3.5, TRZ=4.0,
                   UPB_A=1.5, UPB_V=15.0, UPB_RY=5.5, LOB_A=0.4, LOB_V=-14.5, LOB_RY=2.5, TAP=2.0, TX0=8.0, TX1=26.0))
p0 = np.array([NEW.LIP[k] for k in names])
def setp(p):
    for k, v in zip(names, p): NEW.LIP[k] = float(v)
def obj(p):
    for k, v in zip(names, p):
        if k in lo and v < lo[k]: return 1e3
        if k in hi and v > hi[k]: return 1e3
    if p[0] + p[3] > 26.5: return 1e3
    setp(p)
    r = surf(NEW) - T
    pen = np.mean(np.clip(r[over], 0, None) ** 2) * 3.0           # not puffier than the old surface at the sides
    return float(np.sqrt((np.sum(W * r * r) / np.sum(W)) + pen))
print('start', round(obj(p0), 3), flush=True)
t0 = time.time()
res = minimize(obj, p0, method='Nelder-Mead', options=dict(maxfev=int(sys.argv[1]), xatol=0.02, fatol=0.002, adaptive=True))
setp(res.x); print('rms', round(res.fun, 3), 'time', round(time.time() - t0), 's')
json.dump({k: float(v) for k, v in zip(names, res.x)}, open('lip_fit2.json', 'w'), indent=1)
print({k: round(float(v), 2) for k, v in zip(names, res.x)})
r = (surf(NEW) - T).reshape(len(XS), len(YS)); np.set_printoptions(linewidth=250, precision=1, suppress=True); print(r[:, 8:30])
