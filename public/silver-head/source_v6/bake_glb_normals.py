"""Replace the NORMAL and morph-target NORMAL data in the Blender-exported GLB with the
high-quality normals sampled from the sculpt (closed + open poses).

Why: Blender's glTF exporter derives normals from the raw low-poly geometry whenever morph
normals are exported (custom split normals are ignored), which facets the chrome look.
Usage:  python bake_glb_normals.py in.glb blender_data.npz out.glb
Pure numpy + stdlib, so it also runs inside Blender's bundled Python.
"""
import sys, json, struct
import numpy as np


def read_glb(path):
    b = open(path, 'rb').read()
    magic, ver, total = struct.unpack('<4sII', b[:12])
    assert magic == b'glTF'
    jlen, jtype = struct.unpack('<I4s', b[12:20])
    j = json.loads(b[20:20 + jlen])
    off = 20 + jlen
    blen, btype = struct.unpack('<I4s', b[off:off + 8])
    binc = bytearray(b[off + 8:off + 8 + blen])
    return j, binc


def write_glb(path, j, binc):
    js = json.dumps(j, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4)
    binc = bytes(binc) + b'\0' * ((4 - len(binc) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(binc)
    with open(path, 'wb') as f:
        f.write(struct.pack('<4sII', b'glTF', 2, total))
        f.write(struct.pack('<I4s', len(js), b'JSON')); f.write(js)
        f.write(struct.pack('<I4s', len(binc), b'BIN\0')); f.write(binc)


def acc_view(j, binc, ai):
    a = j['accessors'][ai]
    bv = j['bufferViews'][a['bufferView']]
    assert a['componentType'] == 5126 and a['type'] == 'VEC3'
    stride = bv.get('byteStride', 12)
    assert stride == 12, 'expected tightly packed VEC3'
    start = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    return start, a['count']


def get_vec3(j, binc, ai):
    s, n = acc_view(j, binc, ai)
    return np.frombuffer(bytes(binc[s:s + n * 12]), '<f4').reshape(n, 3).copy()


def set_vec3(j, binc, ai, arr):
    s, n = acc_view(j, binc, ai)
    assert arr.shape == (n, 3)
    binc[s:s + n * 12] = arr.astype('<f4').tobytes()


def to_gltf(v):   # Blender (x, y, z) -> glTF Y-up (x, z, -y)
    return np.stack([v[:, 0], v[:, 2], -v[:, 1]], 1)


def main(src, data, dst):
    j, binc = read_glb(src)
    d = np.load(data)
    Pb = to_gltf(d['Vb']); Nb = to_gltf(d['Nb']); No = to_gltf(d['No'])
    # spatial hash for exact-ish matching
    key = lambda p: np.round(p / 1e-5).astype(np.int64)
    kb = key(Pb)
    lut = {tuple(k): i for i, k in enumerate(kb)}
    report = []
    for m in j['meshes']:
        if m.get('name') != 'Head':
            continue          # gems keep their flat facet normals
        for p in m['primitives']:
            pos = get_vec3(j, binc, p['attributes']['POSITION'])
            idx = np.empty(len(pos), np.int64)
            miss = 0
            for i, k in enumerate(key(pos)):
                t = tuple(k)
                if t in lut:
                    idx[i] = lut[t]
                else:
                    dd = np.linalg.norm(Pb - pos[i], axis=1); idx[i] = int(dd.argmin()); miss += 1
            err = float(np.linalg.norm(Pb[idx] - pos, axis=1).max())
            set_vec3(j, binc, p['attributes']['NORMAL'], Nb[idx])
            for t in p.get('targets', []):
                if 'NORMAL' in t:
                    set_vec3(j, binc, t['NORMAL'], (No[idx] - Nb[idx]))
            report.append(dict(material=p.get('material'), verts=len(pos), hash_misses=miss, max_pos_err_m=err))
    write_glb(dst, j, binc)
    return report


if __name__ == '__main__':
    print(json.dumps(main(sys.argv[1], sys.argv[2], sys.argv[3]), indent=1))
