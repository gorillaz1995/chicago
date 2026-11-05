// Model data layer: loads the Blender export (format v2) into GPU-ready typed arrays.
// Expands wire edges into solid branch prisms and phoenix feather ribbons for lit rendering.

/** Normal build: header .json + sibling .bin in parallel. Embedded build: header carries `binBase64`. */
export async function loadModel(
  jsonUrl = "data/sakura_phoenix.json",
  { embedded = false } = {},
) {
  let header, buffer;
  if (embedded) {
    header = await fetch(jsonUrl).then(okJson);
    buffer = Uint8Array.from(atob(header.binBase64), (c) =>
      c.charCodeAt(0),
    ).buffer;
    delete header.binBase64;
  } else {
    [header, buffer] = await Promise.all([
      fetch(jsonUrl).then(okJson),
      fetch(jsonUrl.replace(/\.json$/, ".bin")).then(okBuf),
    ]);
  }
  if (header.format !== "sakura-phoenix-flight")
    throw new Error("Unknown scene format");
  const view = (name, Ctor) => {
    const L = header.buffers[name];
    return new Ctor(buffer, L.offset, L.count * L.size);
  };

  // tree: position(3) + flex(1)
  const n = header.counts.treeVertices,
    q = view("treePos", Int16Array),
    flex = view("treeFlex", Uint8Array);
  const tree = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++)
      tree[i * 4 + c] =
        header.quant.min[c] +
        ((q[i * 3 + c] + 32767) / 65534) * header.quant.scale[c];
    tree[i * 4 + 3] = flex[i] / 255;
  }

  // Per-vertex radius from bundle part names — slender / minimal ink-like solid tubes
  const radii = new Float32Array(n);
  const PART_RADIUS = {
    trunk: 0.032,
    root: 0.024,
    streamer: 0.012,
    main: 0.016,
    side: 0.01,
    upper: 0.01,
    leader: 0.014,
    twig: 0.007,
    crest: 0.007,
  };
  for (const b of header.bundles || []) {
    const r = PART_RADIUS[b.part] ?? 0.008;
    for (let i = b.start; i < b.start + b.count && i < n; i++) radii[i] = r;
  }
  for (let i = 0; i < n; i++) if (!radii[i]) radii[i] = 0.008;

  const treeEdges = new Uint16Array(view("treeEdges", Uint16Array));
  const solidTree = buildBranchPrisms(tree, treeEdges, radii);

  // bird: local position(3) + side, tail, accent
  const bn = header.counts.birdVertices,
    bp = view("birdPos", Float32Array),
    ba = view("birdAttr", Float32Array);
  const bird = new Float32Array(bn * 6);
  for (let i = 0; i < bn; i++) {
    bird.set(bp.subarray(i * 3, i * 3 + 3), i * 6);
    bird.set(ba.subarray(i * 3, i * 3 + 3), i * 6 + 3);
  }
  const birdEdges = new Uint16Array(view("birdEdges", Uint16Array));
  const solidBird = buildFeatherRibbons(bird, birdEdges);

  // blossoms: pos(3) scale rot(3) ember  -> 8 floats per instance; duplicate once for denser canopy
  const flowers = header.blossoms.filter((b) => b.kind === "flower");
  const inst = new Float32Array(flowers.length * 2 * 8);
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  flowers.forEach((b, j) => {
    inst.set(b.p, j * 8);
    inst[j * 8 + 3] = b.s;
    inst.set(b.r, j * 8 + 4);
    inst[j * 8 + 7] = b.ember || 0;
  });
  // Second copy: slight world offset + scale jitter so petals read fuller without a new asset
  const base = flowers.length;
  flowers.forEach((b, j) => {
    const o = (base + j) * 8;
    inst[o] = b.p[0] + (rnd() - 0.5) * 0.08;
    inst[o + 1] = b.p[1] + (rnd() - 0.5) * 0.06;
    inst[o + 2] = b.p[2] + (rnd() - 0.5) * 0.08;
    inst[o + 3] = b.s * (0.72 + rnd() * 0.28);
    inst[o + 4] = b.r[0] + (rnd() - 0.5) * 0.4;
    inst[o + 5] = b.r[1] + (rnd() - 0.5) * 0.4;
    inst[o + 6] = b.r[2] + rnd() * Math.PI;
    inst[o + 7] = 0; // duplicates stay non-ember so rebirth stays on the original cluster
  });

  // ember fragment pool: 3 petal fragments per ember blossom -> origin(3) dir(3) spin(3) order
  const emberBlossoms = flowers
    .filter((b) => b.ember)
    .sort((a, b) => a.ember - b.ember);
  const frags = [];
  seed = 7;
  for (const b of emberBlossoms)
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + rnd() * 1.2;
      frags.push(
        ...b.p,
        Math.cos(a) * 0.75,
        0.55 + rnd() * 0.5,
        Math.sin(a) * 0.6 + 0.25,
        rnd() * 3 - 1.5,
        rnd() * 3 - 1.5,
        rnd() * 4 - 2,
        b.ember + k * 0.12,
      );
    }

  const meshes = {};
  for (const [kind, m] of Object.entries(header.meshes)) {
    const nv = m.pos.length / 3,
      v = new Float32Array(nv * 7);
    for (let i = 0; i < nv; i++) {
      v.set(m.pos.slice(i * 3, i * 3 + 3), i * 7);
      v.set(m.nrm.slice(i * 3, i * 3 + 3), i * 7 + 3);
      v[i * 7 + 6] = m.tint[i];
    }
    meshes[kind] = {
      vertices: v,
      indices: new Uint16Array(m.idx),
      count: m.idx.length,
    };
  }

  // Dark ground disc under the trunk for contact shadow / grounding
  meshes.ground = buildGroundDisc(1.85, 48);

  const lo = [Infinity, Infinity, Infinity],
    hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++)
    for (let c = 0; c < 3; c++) {
      const v = tree[i * 4 + c];
      lo[c] = Math.min(lo[c], v);
      hi[c] = Math.max(hi[c], v);
    }

  return {
    header,
    tree,
    treeEdges,
    solidTree,
    bird,
    birdEdges,
    solidBird,
    blossoms: { data: inst, count: flowers.length * 2 },
    fragments: { data: new Float32Array(frags), count: frags.length / 10 },
    meshes,
    path: header.path,
    stations: header.stations,
    timing: header.timing,
    emberCentre: header.emberCentre,
    services: header.services,
    bounds: { min: lo, max: hi },
    bytes: buffer.byteLength,
  };
}

/**
 * Expand each tree edge into a hexagonal prism (smoother than 4-gon, still one draw).
 * Vertex layout: pos(3) + normal(3) + flex(1) = 7 floats.
 */
function buildBranchPrisms(tree, edges, radii) {
  const SIDES = 6;
  const edgeCount = edges.length / 2;
  const verts = new Float32Array(edgeCount * SIDES * 2 * 7);
  const indices = new Uint32Array(edgeCount * SIDES * 6);
  let vi = 0,
    ii = 0,
    base = 0;

  for (let e = 0; e < edgeCount; e++) {
    const ia = edges[e * 2],
      ib = edges[e * 2 + 1];
    const ax = tree[ia * 4],
      ay = tree[ia * 4 + 1],
      az = tree[ia * 4 + 2],
      af = tree[ia * 4 + 3];
    const bx = tree[ib * 4],
      by = tree[ib * 4 + 1],
      bz = tree[ib * 4 + 2],
      bf = tree[ib * 4 + 3];
    const dx = bx - ax,
      dy = by - ay,
      dz = bz - az;
    const len = Math.hypot(dx, dy, dz) || 1;
    const fx = dx / len,
      fy = dy / len,
      fz = dz / len;

    // Build a stable frame around the edge direction
    let ux, uy, uz;
    if (Math.abs(fy) < 0.9) {
      ux = fz;
      uy = 0;
      uz = -fx;
    } else {
      ux = 0;
      uy = fz;
      uz = -fy;
    }
    const ul = Math.hypot(ux, uy, uz) || 1;
    ux /= ul;
    uy /= ul;
    uz /= ul;
    const vx = fy * uz - fz * uy,
      vy = fz * ux - fx * uz,
      vz = fx * uy - fy * ux;

    const ra = radii[ia],
      rb = radii[ib];

    for (let k = 0; k < SIDES; k++) {
      const a0 = (k / SIDES) * Math.PI * 2;
      const ca = Math.cos(a0),
        sa = Math.sin(a0);
      const nx = ux * ca + vx * sa,
        ny = uy * ca + vy * sa,
        nz = uz * ca + vz * sa;

      verts[vi++] = ax + nx * ra;
      verts[vi++] = ay + ny * ra;
      verts[vi++] = az + nz * ra;
      verts[vi++] = nx;
      verts[vi++] = ny;
      verts[vi++] = nz;
      verts[vi++] = af;

      verts[vi++] = bx + nx * rb;
      verts[vi++] = by + ny * rb;
      verts[vi++] = bz + nz * rb;
      verts[vi++] = nx;
      verts[vi++] = ny;
      verts[vi++] = nz;
      verts[vi++] = bf;
    }

    for (let k = 0; k < SIDES; k++) {
      const i0 = base + k * 2;
      const i1 = base + k * 2 + 1;
      const i2 = base + ((k + 1) % SIDES) * 2;
      const i3 = base + ((k + 1) % SIDES) * 2 + 1;
      indices[ii++] = i0;
      indices[ii++] = i1;
      indices[ii++] = i2;
      indices[ii++] = i2;
      indices[ii++] = i1;
      indices[ii++] = i3;
    }
    base += SIDES * 2;
  }

  return { vertices: verts, indices, count: indices.length };
}

/**
 * Expand each bird edge into a lit ribbon quad.
 * Vertex layout: pos(3) + attr(3) + sideOffset(1) = 7 floats.
 * sideOffset is ±half-width so the vertex shader can widen along a local normal.
 */
function buildFeatherRibbons(bird, edges) {
  const edgeCount = edges.length / 2;
  const verts = new Float32Array(edgeCount * 4 * 7);
  const indices = new Uint32Array(edgeCount * 6);
  let vi = 0,
    ii = 0,
    base = 0;

  for (let e = 0; e < edgeCount; e++) {
    const ia = edges[e * 2],
      ib = edges[e * 2 + 1];
    const ax = bird[ia * 6],
      ay = bird[ia * 6 + 1],
      az = bird[ia * 6 + 2];
    const bx = bird[ib * 6],
      by = bird[ib * 6 + 1],
      bz = bird[ib * 6 + 2];
    const side =
        (Math.abs(bird[ia * 6 + 3]) + Math.abs(bird[ib * 6 + 3])) * 0.5,
      tail = (bird[ia * 6 + 4] + bird[ib * 6 + 4]) * 0.5,
      accent = Math.max(bird[ia * 6 + 5], bird[ib * 6 + 5]);

    const dx = bx - ax,
      dy = by - ay,
      dz = bz - az;
    const len = Math.hypot(dx, dy, dz) || 1;
    // Prefer expand in bird-local Z (out of wing plane) then fall back
    let px = -dy / len,
      py = dx / len,
      pz = 0;
    if (Math.hypot(px, py, pz) < 0.2) {
      px = -dz / len;
      py = 0;
      pz = dx / len;
    }
    const pl = Math.hypot(px, py, pz) || 1;
    px /= pl;
    py /= pl;
    pz /= pl;

    // Width: thicker on body, thinner on outer wing / tip of tail
    const half = 0.012 + 0.018 * (1 - Math.min(1, Math.abs(side) * 2 + tail));

    const push = (x, y, z, s, t, a, off) => {
      verts[vi++] = x + px * off;
      verts[vi++] = y + py * off;
      verts[vi++] = z + pz * off;
      verts[vi++] = s;
      verts[vi++] = t;
      verts[vi++] = a;
      verts[vi++] = off >= 0 ? 1 : -1;
    };

    const sa = bird[ia * 6 + 3],
      ta = bird[ia * 6 + 4],
      aa = bird[ia * 6 + 5];
    const sb = bird[ib * 6 + 3],
      tb = bird[ib * 6 + 4],
      ab = bird[ib * 6 + 5];
    push(ax, ay, az, sa, ta, aa, -half);
    push(ax, ay, az, sa, ta, aa, half);
    push(bx, by, bz, sb, tb, ab, -half);
    push(bx, by, bz, sb, tb, ab, half);

    indices[ii++] = base;
    indices[ii++] = base + 1;
    indices[ii++] = base + 2;
    indices[ii++] = base + 2;
    indices[ii++] = base + 1;
    indices[ii++] = base + 3;
    base += 4;
  }

  return { vertices: verts, indices, count: indices.length };
}

/** Flat disc on XZ at y≈0 for grounding the trunk. Layout matches flower meshes: pos+nrm+tint. */
function buildGroundDisc(radius, segments) {
  const nv = segments + 1;
  const v = new Float32Array(nv * 7);
  // Center
  v[0] = 0;
  v[1] = -0.08;
  v[2] = 0;
  v[3] = 0;
  v[4] = 1;
  v[5] = 0;
  v[6] = 0;
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const o = (i + 1) * 7;
    v[o] = Math.cos(a) * radius;
    v[o + 1] = -0.08;
    v[o + 2] = Math.sin(a) * radius;
    v[o + 3] = 0;
    v[o + 4] = 1;
    v[o + 5] = 0;
    v[o + 6] = 1;
  }
  const idx = new Uint16Array(segments * 3);
  for (let i = 0; i < segments; i++) {
    idx[i * 3] = 0;
    idx[i * 3 + 1] = 1 + i;
    idx[i * 3 + 2] = 1 + ((i + 1) % segments);
  }
  return { vertices: v, indices: idx, count: idx.length };
}

function okJson(r) {
  if (!r.ok) throw new Error(`Scene header failed to load (${r.status})`);
  return r.json();
}
function okBuf(r) {
  if (!r.ok) throw new Error(`Scene data failed to load (${r.status})`);
  return r.arrayBuffer();
}
