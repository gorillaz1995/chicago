"""Lossless-looking size pass for the v6 GLB (no decoder needed in three.js):
 - NORMAL -> normalized int8 (KHR_mesh_quantization), padded to 4-byte stride
 - MouthOpen morph deltas -> sparse accessors (only the moving vertices are stored)
 - Turntable clip 1201 samples -> 5 (quarter turns, linear slerp is exactly uniform)
usage: python slim_glb.py in.glb out.glb"""
import sys, json, struct, numpy as np
src, dst = sys.argv[1], sys.argv[2]
b = open(src, 'rb').read()
jl = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + jl]); off = 20 + jl
bl = struct.unpack('<I', b[off:off + 4])[0]; binc = b[off + 8:off + 8 + bl]
CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
def read(ai):
    a = j['accessors'][ai]; bv = j['bufferViews'][a['bufferView']]; dt = np.dtype(CT[a['componentType']]); n = NC[a['type']]
    stride = bv.get('byteStride', dt.itemsize * n); start = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    raw = np.frombuffer(binc, np.uint8, count=stride * (a['count'] - 1) + dt.itemsize * n, offset=start)
    out = np.empty((a['count'], n), dt)
    for i in range(n):
        out[:, i] = np.ndarray((a['count'],), dt, binc, start + i * dt.itemsize, (stride,))
    return out
new_bin = bytearray(); new_views = []
def add_view(arr, target=None, stride=None):
    while len(new_bin) % 4: new_bin.append(0)
    v = dict(buffer=0, byteOffset=len(new_bin), byteLength=arr.nbytes)
    if target: v['target'] = target
    if stride: v['byteStride'] = stride
    new_bin.extend(arr.tobytes()); new_views.append(v); return len(new_views) - 1
acc = []
def add_acc(**kw): acc.append(kw); return len(acc) - 1
cache = {}
def copy_acc(ai, target=None):
    if ai in cache: return cache[ai]
    a = dict(j['accessors'][ai]); data = read(ai)
    a['bufferView'] = add_view(np.ascontiguousarray(data), target); a.pop('byteOffset', None)
    cache[ai] = add_acc(**a); return cache[ai]
def quant_normals(ai):
    n = read(ai).astype(np.float32); q = np.zeros((len(n), 4), np.int8)
    q[:, :3] = np.clip(np.round(n * 127.0), -127, 127)
    return add_acc(bufferView=add_view(q, 34962, 4), componentType=5120, normalized=True, count=len(n), type='VEC3')
def sparse_delta(ai, nz, quant=False):
    a = j['accessors'][ai]; data = read(ai).astype(np.float32)
    idx = nz.astype(np.uint16 if len(data) < 65536 else np.uint32)
    vals = np.ascontiguousarray(data[nz])
    out = dict(componentType=5126, count=len(data), type='VEC3',
               sparse=dict(count=int(len(nz)), indices=dict(bufferView=add_view(idx), componentType=5123 if idx.dtype == np.uint16 else 5125),
                           values=dict(bufferView=add_view(vals))))
    if 'min' in a: out['min'] = a['min']; out['max'] = a['max']
    return add_acc(**out)
report = {}
for m in j['meshes']:
    for p in m['primitives']:
        at = p['attributes']
        newat = {}
        for k, ai in at.items():
            newat[k] = quant_normals(ai) if k == 'NORMAL' else copy_acc(ai, 34962)
        p['attributes'] = newat
        if 'indices' in p: p['indices'] = copy_acc(p['indices'], 34963)
        if p.get('targets'):
            nt = []
            for t in p['targets']:
                dpos = read(t['POSITION']).astype(np.float32); dn = read(t['NORMAL']).astype(np.float32) if 'NORMAL' in t else None
                nz = np.nonzero((np.abs(dpos).max(1) > 0) | ((np.abs(dn).max(1) > 1e-4) if dn is not None else False))[0]
                tt = {'POSITION': sparse_delta(t['POSITION'], nz)}
                if dn is not None: tt['NORMAL'] = sparse_delta(t['NORMAL'], nz)
                nt.append(tt); report[f"{m['name']}/{p.get('material')}"] = f'{len(nz)}/{len(dpos)} moving'
            p['targets'] = nt
for an in j['animations']:
    for ch, sm in zip(an['channels'], an['samplers']):
        pass
    if an['name'] == 'Turntable':
        s = an['samplers'][0]; t = read(s['input'])[:, 0]; q = read(s['output'])
        keep = np.searchsorted(t, np.linspace(t[0], t[-1], 5)); keep = np.clip(keep, 0, len(t) - 1)
        tt = t[keep].astype(np.float32)[:, None]; qq = q[keep].astype(np.float32)
        s['input'] = add_acc(bufferView=add_view(np.ascontiguousarray(tt)), componentType=5126, count=len(tt), type='SCALAR', min=[float(tt.min())], max=[float(tt.max())])
        s['output'] = add_acc(bufferView=add_view(np.ascontiguousarray(qq)), componentType=5126, count=len(qq), type='VEC4')
        report['Turntable'] = f'{len(t)} -> {len(tt)} keys'
    else:
        for s in an['samplers']:
            s['input'] = copy_acc(s['input']); s['output'] = copy_acc(s['output'])
j['accessors'] = acc; j['bufferViews'] = new_views
while len(new_bin) % 4: new_bin.append(0)
j['buffers'] = [dict(byteLength=len(new_bin))]
for k in ('extensionsUsed', 'extensionsRequired'):
    j[k] = sorted(set(j.get(k, [])) | {'KHR_mesh_quantization'})
js = json.dumps(j, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
with open(dst, 'wb') as f:
    f.write(struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(new_bin)))
    f.write(struct.pack('<I4s', len(js), b'JSON')); f.write(js)
    f.write(struct.pack('<I4s', len(new_bin), b'BIN\0')); f.write(bytes(new_bin))
report['bytes'] = f'{len(b)} -> {12 + 8 + len(js) + 8 + len(new_bin)}'
print(json.dumps(report, indent=1))
