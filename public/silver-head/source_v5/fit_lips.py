import sys, time, json, numpy as np
sys.path.insert(0, '.')
import head5 as OLD, head6 as NEW
from scipy.optimize import minimize
XS = np.array([0, 4, 8, 12, 16, 20, 24.0, 28.0, 32.0]); YS = np.arange(-88.0, -35.9, 1.5)
ZG = np.arange(112.0, 80.0, -0.15)
PT = np.array([(x, y) for x in XS for y in YS])
G = np.stack([np.repeat(PT[:, 0], len(ZG)), np.repeat(PT[:, 1], len(ZG)), np.tile(ZG, len(PT))], 1)
def surf(mod):
    d = mod.head_sdf(G, with_mouth=False).reshape(len(PT), len(ZG))
    i = np.argmax(d < 0, axis=1)
    i0 = np.clip(i - 1, 0, len(ZG) - 1)
    d0 = d[np.arange(len(PT)), i0]; d1 = d[np.arange(len(PT)), i]
    t = np.where(d0 != d1, d0 / (d0 - d1 + 1e-12), 0.0)
    return ZG[i0] + t * (ZG[i] - ZG[i0])
T = surf(OLD)
from PIL import Image
_im = np.array(Image.open('../refs/prof.png').convert('RGBA'))[:, :, 3] > 128
def zref(y):
    py = int(round(599.5 - y / 0.2366)); row = np.nonzero(_im[py])[0]; return (row.max() - 570) * 0.2366
c0 = PT[:, 0] == 0
for i in np.nonzero(c0)[0]: T[i] = zref(PT[i, 1]) if PT[i, 1] < -41 else T[i]
W = np.where(c0, 3.0, np.where(PT[:, 0] <= 12, 1.0, 0.7))
names = ['UXO', 'UV', 'UZ', 'URX', 'URY', 'URZ', 'LV', 'LZ', 'LRX', 'LRY', 'LRZ', 'TV', 'TZ', 'UPB_A', 'UPB_V', 'UPB_RY', 'LOB_A', 'LOB_V', 'LOB_RY', 'TAP']
import os, json as _j
if os.path.exists('lip_fit.json'): NEW.LIP.update(_j.load(open('lip_fit.json')))
p0 = np.array([NEW.LIP[k] for k in names])
def setp(p):
    for k, v in zip(names, p): NEW.LIP[k] = float(v)
def obj(p):
    if p[1] < 2 or p[4] < 3 or p[5] < 2.5 or p[9] < 3 or p[10] < 2.5 or p[0] < 2 or p[0] > 14 or p[12] < 94 or p[15] < 2.5 or p[18] < 2 or p[19] < 0 or p[19] > 4.5 or p[8] > 30 or p[3] > 22 or p[3] + p[0] > 28: return 1e3
    setp(p)
    r = surf(NEW) - T
    return float(np.sqrt(np.sum(W * r * r) / np.sum(W)))
print('start rms', round(obj(p0), 3), flush=True)
t0 = time.time()
res = minimize(obj, p0, method='Nelder-Mead', options=dict(maxfev=int(sys.argv[1]) if len(sys.argv) > 1 else 400, xatol=0.02, fatol=0.002, adaptive=True))
setp(res.x); print('rms', round(res.fun, 3), 'time', round(time.time() - t0), 's')
json.dump({k: float(v) for k, v in zip(names, res.x)}, open('lip_fit.json', 'w'), indent=1)
print({k: round(float(v), 2) for k, v in zip(names, res.x)})
r = (surf(NEW) - T).reshape(len(XS), len(YS))
np.set_printoptions(linewidth=250, precision=1, suppress=True)
print('resid (rows x=0,4,8,12,16,20,24; cols y -88..-36 step 1.5)'); print(r)
