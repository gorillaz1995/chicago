"""Procedural studio environment (equirect, three.js convention), written as RLE Radiance .hdr."""
import sys
import numpy as np

def make_env(W=1024, H=512):
    v = (np.arange(H) + 0.5) / H          # 0 bottom .. 1 top (row 0 written = top)
    u = (np.arange(W) + 0.5) / W
    U, V = np.meshgrid(u, v[::-1])         # image row 0 = top (v=1)
    phi = (U - 0.5) * 2 * np.pi            # three: u = atan2(z, x)/(2pi) + 0.5
    th = (V - 0.5) * np.pi                 # v = asin(y)/pi + 0.5
    D = np.stack([np.cos(th) * np.cos(phi), np.sin(th), np.cos(th) * np.sin(phi)], -1)
    y = D[..., 1]
    # base: dark studio cyclorama, slightly lighter above
    col = 0.035 + 0.05 * np.clip(y, 0, 1) + 0.02 * np.exp(-(y / 0.12) ** 2)
    col = np.repeat(col[..., None], 3, -1) * np.array([0.95, 0.98, 1.05])

    def softbox(center, up, half_w, half_h, inten, soft=0.06, tint=(1, 1, 1)):
        c = np.asarray(center, float); c /= np.linalg.norm(c)
        upv = np.asarray(up, float); upv -= c * (upv @ c); upv /= np.linalg.norm(upv)
        rt = np.cross(upv, c)
        dc = D @ c
        a = np.arctan2(D @ rt, dc); b = np.arctan2(D @ upv, dc)
        def edge(x, h):
            return 1.0 / (1.0 + np.exp((np.abs(x) - h) / (soft * 0.5)))
        m = edge(a, half_w) * edge(b, half_h) * (dc > 0)
        return m[..., None] * inten * np.asarray(tint)

    # key: large softbox above-front (toward the viewer, three +Z), slightly to the viewer's left
    col += softbox((-0.35, 0.55, 0.75), (0, 1, 0), 0.42, 0.30, 5.0)
    # fill: broad dim panel front-right
    col += softbox((0.75, 0.15, 0.65), (0, 1, 0), 0.35, 0.45, 1.2)
    # rim strips left and right, slightly behind
    col += softbox((-0.95, 0.10, -0.30), (0, 1, 0), 0.07, 0.75, 4.0, soft=0.04)
    col += softbox((0.95, 0.10, -0.30), (0, 1, 0), 0.07, 0.75, 4.0, soft=0.04)
    # overhead panel
    col += softbox((0.0, 1.0, 0.05), (0, 0, -1), 0.45, 0.45, 1.6, soft=0.12)
    # back strip high
    col += softbox((0.0, 0.35, -0.94), (0, 1, 0), 0.55, 0.05, 2.0, soft=0.04)
    # soft floor bounce
    col += (0.06 * np.clip(-y, 0, 1) ** 0.5)[..., None] * np.array([1.0, 0.98, 0.95])
    return col.astype(np.float32)


def write_hdr_rle(path, img):
    H, W, _ = img.shape
    m = np.max(img, axis=2)
    e = np.zeros_like(m, dtype=np.int32)
    mant, ex = np.frexp(m)
    ok = m > 1e-32
    scale = np.where(ok, mant * 256.0 / np.maximum(m, 1e-32), 0)
    rgbe = np.zeros((H, W, 4), np.uint8)
    rgbe[..., :3] = np.clip(img * scale[..., None], 0, 255).astype(np.uint8)
    rgbe[..., 3] = np.where(ok, ex + 128, 0).astype(np.uint8)
    out = bytearray(f"#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y {H} +X {W}\n".encode())
    for row in rgbe:
        out += bytes([2, 2, W >> 8, W & 255])
        for ch in range(4):
            data = row[:, ch]
            i = 0
            while i < W:
                # find run
                run = 1
                while i + run < W and run < 127 and data[i + run] == data[i]:
                    run += 1
                if run >= 3:
                    out += bytes([128 + run, data[i]]); i += run
                else:
                    j = i; lit = []
                    while j < W and len(lit) < 128:
                        r2 = 1
                        while j + r2 < W and r2 < 3 and data[j + r2] == data[j]:
                            r2 += 1
                        if r2 >= 3:
                            break
                        lit.append(data[j]); j += 1
                    out += bytes([len(lit)]) + bytes(lit); i = j
    open(path, 'wb').write(out)


if __name__ == '__main__':
    W = int(sys.argv[2]) if len(sys.argv) > 2 else 1024
    img = make_env(W, W // 2)
    write_hdr_rle(sys.argv[1], img)
    from PIL import Image
    tm = img / (1 + img)
    Image.fromarray((np.clip(tm, 0, 1) ** (1 / 2.2) * 255).astype(np.uint8)).save(sys.argv[1].replace('.hdr', '_preview.png'))
