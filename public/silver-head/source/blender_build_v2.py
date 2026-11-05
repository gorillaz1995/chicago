"""Silver head v2 — built from Blender Studio's CC0 'Human Base Meshes' realistic animation head.

Run inside Blender 4.2+/5.x:  runpy.run_path(this)["build"]()
Result (in the current file's main scene):
  Silver Head (collection)
    SpinRoot (empty, skull centre, Turntable action)
      Head (mesh: head + blank eyes + mouth interior, materials Silver / MouthDark, shape key MouthOpen)
  RenderCam, studio world (studio-env.exr = Poly Haven 'Studio Small 09', CC0)
Then export with export_glb().
"""
import os, math, tempfile
import bpy, bmesh
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

ROOT = os.environ.get("SILVER_HEAD_ROOT", r"C:\Users\tedyf\OneDrive\Documents\KoeiTecmo\chicago_projekt\silver-head")
BUNDLE = os.environ.get("HUMAN_BASE_MESHES", os.path.join(tempfile.gettempdir(), "silverhead_basemesh",
                        "human-base-meshes-bundle-v1.4.1", "human_base_meshes_bundle.blend"))
HEAD_OBJ = "GEO-head_animation_realistic"
FPS = 60
TURN_FRAMES = 20 * FPS          # Turntable: 20 s
MOUTH_FRAMES = 45               # MouthOpen: 0.75 s
NECK_CUT_Z = 0.163              # source-mesh height of the neck termination (chin bottom is 0.179)
SUBDIV_LEVELS = 1               # Catmull-Clark levels applied to the base cage (0 = raw cage, ~7.4k tris)
REAL_SCALE = 0.885              # base mesh is ~13% oversized: scale to average adult size (chin-crown 23 cm)
HINGE = Vector((0.0, -0.035, 0.270))      # jaw hinge (source coords), just in front of the ear canal
JAW_ANGLE = math.radians(18.0)
GLIDE = Vector((0.0, -0.020, -0.006))     # forward glide of the jaw at full opening (condyle translation);
                                          # without it the chin swings back into the throat and folds
EYES = [Vector((0.0359, -0.1154, 0.31)), Vector((-0.0359, -0.1154, 0.31))]


# ----------------------------------------------------------------------------- helpers
def _override(obj):
    return bpy.context.temp_override(object=obj, active_object=obj, selected_objects=[obj], selected_editable_objects=[obj])


def fcurves_of(action):
    try:
        return list(action.fcurves)
    except AttributeError:
        return [fc for l in action.layers for s in l.strips for cb in s.channelbags for fc in cb.fcurves]


def clean_scene(scene):
    for o in list(scene.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for c in list(scene.collection.children):
        scene.collection.children.unlink(c)
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)
    bpy.data.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)


def make_material(name, color, metallic, roughness):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = roughness
    m.diffuse_color = (*color, 1.0); m.metallic = metallic; m.roughness = roughness
    m.use_backface_culling = True          # closed mesh: export single-sided
    return m


# ----------------------------------------------------------------------------- geometry
def import_head(scene, coll):
    with bpy.data.libraries.load(BUNDLE, link=False) as (df, dt):
        dt.objects = [n for n in df.objects if n.startswith(HEAD_OBJ)]
    objs = [o for o in dt.objects if o is not None]
    for o in objs:
        coll.objects.link(o)
    head = next(o for o in objs if o.name.startswith(HEAD_OBJ) and o.parent is None)
    # bake the sculpt (multires level 1) into the base cage, then drop multires: clean quad base level
    for m in list(head.modifiers):
        if m.type == 'MULTIRES':
            with _override(head):
                bpy.ops.object.multires_base_apply(modifier=m.name)
            head.modifiers.remove(m)
    # remove irises (blank eyes), keep the eyeballs (sclera) and merge them into the head
    for o in objs:
        if 'iris' in o.name:
            bpy.data.objects.remove(o, do_unlink=True)
    eyes = [o for o in coll.objects if 'sclera' in o.name]
    with bpy.context.temp_override(object=head, active_object=head, selected_objects=[head] + eyes,
                                   selected_editable_objects=[head] + eyes):
        bpy.ops.object.join()
    # keep the source mesh's local coordinates (all landmarks above are in that space); drop the bundle offset
    head.matrix_world = Matrix.Identity(4)
    head.name = "Head"; head.data.name = "Head"
    if head.data.has_custom_normals:
        with _override(head):
            bpy.ops.mesh.customdata_custom_splitnormals_clear()
    for a in ("sharp_face", "sharp_edge", ".sculpt_mask", ".sculpt_face_set"):
        if a in head.data.attributes:
            head.data.attributes.remove(head.data.attributes[a])
    head.data.materials.clear()
    return head


def trim_and_cap(head):
    """Cut the neck just under the jaw, cap it with a softly domed lid, remove hidden eyeball backs."""
    bm = bmesh.new(); bm.from_mesh(head.data)
    # eyeball backs (inside the skull, never visible)
    eye_c = []
    for comp_faces in _components(bm):
        vs = {v for f in comp_faces for v in f.verts}
        c = sum((v.co for v in vs), Vector()) / len(vs)
        if len(vs) < 1200 and min((c - e).length for e in EYES) < 0.008:   # the two eyeball shells
            eye_c.append(c)
            bmesh.ops.delete(bm, geom=[f for f in comp_faces if f.calc_center_median().y > c.y + 0.004], context='FACES')
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    # neck termination
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, NECK_CUT_Z), plane_no=(0, 0, 1), clear_inner=True)
    bnd = [e for e in bm.edges if e.is_boundary and all(abs(v.co.z - NECK_CUT_Z) < 1e-4 for v in e.verts)]
    res = bmesh.ops.holes_fill(bm, edges=bnd, sides=0)
    cap = [f for f in res["faces"]]
    if cap:
        ins = bmesh.ops.inset_region(bm, faces=cap, thickness=0.007, depth=0.0035, use_even_offset=True)
        bmesh.ops.poke(bm, faces=cap)
    bm.normal_update()
    bm.to_mesh(head.data); bm.free()
    head.data.shade_smooth()
    head.data.update()
    return eye_c


def _components(bm):
    bm.faces.ensure_lookup_table()
    seen = set(); comps = []
    for f in bm.faces:
        if f in seen: continue
        stack = [f]; comp = []; seen.add(f)
        while stack:
            g = stack.pop(); comp.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h not in seen:
                        seen.add(h); stack.append(h)
        comps.append(comp)
    return comps


def mouth_interior_faces(head, n_dirs=64):
    """Mouth bag + the lips' contact surfaces = faces in the mouth area that cannot see out:
    every ray in the hemisphere around the face normal hits the head again."""
    bm = bmesh.new(); bm.from_mesh(head.data); bm.faces.ensure_lookup_table(); bm.normal_update()
    bvh = BVHTree.FromBMesh(bm)
    # fixed, well-spread hemisphere directions (Fibonacci sphere)
    k = np.arange(2 * n_dirs) + 0.5
    phi = np.arccos(1 - 2 * k / (2 * n_dirs)); th = np.pi * (1 + 5 ** 0.5) * k
    dirs = np.stack([np.cos(th) * np.sin(phi), np.sin(th) * np.sin(phi), np.cos(phi)], 1)
    dark = np.zeros(len(bm.faces), bool)
    for f in bm.faces:
        c = f.calc_center_median()
        if not (abs(c.x) < 0.06 and 0.185 < c.z < 0.28 and c.y > -0.16):
            continue
        nrm = np.array(f.normal[:])
        hemi = dirs[dirs @ nrm > 0.05]
        o = c + f.normal * 2e-4
        escaped = False
        for d in hemi:
            if bvh.ray_cast(o, Vector(d), 0.5)[0] is None:
                escaped = True
                break
        dark[f.index] = not escaped
    # keep only the mouth interior itself (largest connected occluded region); drops isolated hits in the
    # nostrils and where the base mesh's lids/lips slightly overlap
    seen = np.zeros(len(dark), bool); best = []
    for i in np.nonzero(dark)[0]:
        if seen[i]: continue
        comp = []; stack = [int(i)]; seen[i] = True
        while stack:
            j = stack.pop(); comp.append(j)
            for e in bm.faces[j].edges:
                for g in e.link_faces:
                    if dark[g.index] and not seen[g.index]:
                        seen[g.index] = True; stack.append(g.index)
        if len(comp) > len(best): best = comp
    keep = np.zeros(len(dark), bool); keep[best] = True
    bm.free()
    return keep


def lip_contact_line(head):
    """Points where the upper lip (facing down) touches the lower lip (facing up)."""
    me = head.data; me.update()
    co = np.array([v.co[:] for v in me.vertices]); nor = np.array([v.normal[:] for v in me.vertices])
    x, y, z = co.T
    mbox = (np.abs(x) < 0.05) & (z > 0.20) & (z < 0.255) & (y < -0.11)
    up_i = np.nonzero((nor[:, 2] > 0.5) & mbox)[0]; dn_i = np.nonzero((nor[:, 2] < -0.5) & mbox)[0]
    pairs = []
    for i in dn_i:
        d = np.linalg.norm(co[up_i] - co[i], axis=1); j = d.argmin()
        if d[j] < 0.0025 and co[i, 1] < -0.115:
            pairs.append(0.5 * (co[i] + co[up_i[j]]))
    return np.array(pairs)


def extend_over_lip_contact(head, dark, behind=0.0025):
    """Mouth interior = everything reachable from deep inside the mouth without crossing the lips.
    The barrier is the outer lip surface (in front of the lip contact line); the flood fill starts at
    the occlusion-tested interior. Faces behind the contact line become dark, the lips stay silver."""
    pairs = lip_contact_line(head)
    if len(pairs) == 0:
        return dark
    order = np.argsort(np.abs(pairs[:, 0])); px = np.abs(pairs[order, 0])
    py = pairs[order, 1]; pz = pairs[order, 2]
    corner_x = px.max()
    me = head.data
    cen = np.array([p.center[:] for p in me.polygons]); ax = np.abs(cen[:, 0])
    yc = np.interp(ax, px, py); zc = np.interp(ax, px, pz)
    lipzone = (ax < corner_x + 0.006) & (np.abs(cen[:, 2] - zc) < 0.016) & (cen[:, 1] < -0.09)
    barrier = lipzone & (cen[:, 1] <= yc + behind)
    # bounding box of the mouth cavity (generous) so a leak can never flood the whole head
    box = (ax < 0.06) & (cen[:, 2] > 0.185) & (cen[:, 2] < 0.285) & (cen[:, 1] > -0.16) & (cen[:, 1] < 0.06)
    bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
    d = dark & ~barrier
    stack = list(np.nonzero(d)[0])
    while stack:
        j = int(stack.pop())
        for e in bm.faces[j].edges:
            for g in e.link_faces:
                k = g.index
                if not d[k] and not barrier[k] and box[k]:
                    # stay on surfaces hidden behind the lips: never cross to faces in front of the face plane
                    if cen[k, 1] > yc[k] + behind or not lipzone[k]:
                        d[k] = True; stack.append(k)
    # small silver islands that touch the interior (pockets inside the mouth) are interior too
    seen = d.copy()
    for i in range(len(d)):
        if seen[i]: continue
        comp = []; touches = False; stack = [i]; seen[i] = True
        while stack:
            j = stack.pop(); comp.append(j)
            for e in bm.faces[j].edges:
                for g in e.link_faces:
                    k = g.index
                    if d[k]: touches = True
                    elif not seen[k]:
                        seen[k] = True; stack.append(k)
        if touches and len(comp) < 400:
            d[comp] = True
    bm.free()
    return d


def jaw_weights(head, dark_faces):
    """Smooth 0..1 jaw weight: fixed on clearly-upper / clearly-lower regions, upper vs lower lip and
    mouth roof vs floor separated by surface orientation, everything else solved as a harmonic field."""
    me = head.data
    n = len(me.vertices)
    co = np.array([v.co[:] for v in me.vertices]); x, y, z = co.T
    me.update()
    nor = np.array([v.normal[:] for v in me.vertices])
    E = np.array([e.vertices[:] for e in me.edges])
    inner = np.zeros(n, bool)
    for p in me.polygons:
        if dark_faces[p.index]:
            inner[list(p.vertices)] = True
    # contact line of the lips: nearest down-facing / up-facing vertex pairs
    mbox = (np.abs(x) < 0.05) & (z > 0.20) & (z < 0.255) & (y < -0.11)
    up_i = np.nonzero((nor[:, 2] > 0.5) & mbox)[0]; dn_i = np.nonzero((nor[:, 2] < -0.5) & mbox)[0]
    pairs = []
    for i in dn_i:
        d = np.linalg.norm(co[up_i] - co[i], axis=1); j = d.argmin()
        if d[j] < 0.0025 and co[i, 1] < -0.115:
            pairs.append(0.5 * (co[i] + co[up_i[j]]))
    pairs = np.array(pairs)
    corner_x = float(np.abs(pairs[:, 0]).max()) if len(pairs) else 0.025
    # mouth line height as a function of |x| (from the contact pairs)
    order = np.argsort(np.abs(pairs[:, 0])); px = np.abs(pairs[order, 0]); pz = pairs[order, 2]
    zm = lambda xx: np.interp(np.abs(xx), px, pz)
    Zm0 = float(zm(0.0))
    W = np.full(n, np.nan)
    eye_or_cap = np.zeros(n, bool)
    # --- upper fixed: nose base and above, ears, back of head
    W[(z > Zm0 + 0.032)] = 0.0
    W[(y > 0.005) & (z > NECK_CUT_Z + 0.004)] = 0.0
    # upper face incl. nostrils and the skin above the upper lip (not the mouth interior)
    W[(z > zm(x) + 0.010) & (y < -0.095) & ~inner] = 0.0
    # --- lower fixed: lower lip + chin + front of the jaw
    lower_front = (z < zm(x) - 0.004) & (y < -0.075) & (np.abs(x) < corner_x + 0.006)
    W[lower_front] = 1.0
    W[(z < Zm0 - 0.030) & (y < -0.085) & ~inner] = 1.0      # chin + front jaw; the throat is free (smooth ramp)
    # --- lips near the contact: decided by height + orientation (upper lip faces down, lower faces up)
    lipzone = (np.abs(x) < corner_x - 0.002) & (y < -0.105) & (np.abs(z - zm(x)) < 0.009)
    dz = z - zm(x)
    W[lipzone & ((dz > 0.0025) | ((nor[:, 2] < -0.2) & (dz > -0.0025)))] = 0.0
    W[lipzone & ((dz < -0.0025) | ((nor[:, 2] > 0.2) & (dz < 0.0025)))] = 1.0
    # --- mouth bag: roof faces down -> stays, floor faces up -> moves with the jaw, back wall free
    W[inner & (nor[:, 2] < -0.45) & (z > Zm0 - 0.004)] = 0.0
    W[inner & (nor[:, 2] > 0.45) & (z < Zm0 + 0.004)] = 1.0
    # --- back of the neck stays put; the throat and the neck cap are left free so the underside
    #     tilts smoothly with the chin instead of creasing
    W[(y > 0.02) & (z < Zm0)] = 0.0
    # --- harmonic fill of the free vertices (Jacobi iterations on the edge graph)
    free = np.isnan(W)
    w = np.where(free, 0.5, W)
    deg = np.zeros(n); np.add.at(deg, E[:, 0], 1); np.add.at(deg, E[:, 1], 1)
    for _ in range(6000):
        acc = np.zeros(n); np.add.at(acc, E[:, 0], w[E[:, 1]]); np.add.at(acc, E[:, 1], w[E[:, 0]])
        w_new = np.where(free, acc / np.maximum(deg, 1), w)
        if np.abs(w_new - w).max() < 1e-6:
            w = w_new; break
        w = w_new
    # eyeballs are separate shells: keep them still
    comp_eye = (np.linalg.norm(co - np.array([0.0359, -0.1154, 0.31]), axis=1) < 0.03) | \
               (np.linalg.norm(co - np.array([-0.0359, -0.1154, 0.31]), axis=1) < 0.03)
    w[comp_eye] = 0.0
    return np.clip(w, 0, 1), dict(corner_x=corner_x, mouth_z=Zm0, contact_pairs=len(pairs))


def smooth_mouth_corners(head, co, w, corner_x, mouth_z, radius=0.012, iters=80):
    """Relax the jaw weight around each mouth corner so the corner stretches instead of pinching."""
    E = np.array([e.vertices[:] for e in head.data.edges]); n = len(w)
    deg = np.zeros(n); np.add.at(deg, E[:, 0], 1); np.add.at(deg, E[:, 1], 1)
    region = (np.abs(np.abs(co[:, 0]) - corner_x) < radius) & (np.abs(co[:, 2] - mouth_z) < radius) & (co[:, 1] < -0.09)
    for _ in range(iters):
        acc = np.zeros(n); np.add.at(acc, E[:, 0], w[E[:, 1]]); np.add.at(acc, E[:, 1], w[E[:, 0]])
        w = np.where(region, 0.5 * w + 0.5 * acc / np.maximum(deg, 1), w)
    return w


def jaw_deform(co, w, frac=1.0):
    a = w * JAW_ANGLE * frac
    c, s = np.cos(a), np.sin(a)
    r = co - np.array(HINGE)
    out = co.copy()
    out[:, 1] = HINGE.y + r[:, 1] * c - r[:, 2] * s
    out[:, 2] = HINGE.z + r[:, 1] * s + r[:, 2] * c
    out += (w * frac)[:, None] * np.array(GLIDE)[None]
    return out


# ----------------------------------------------------------------------------- scene
def build(env_hdr=None):
    scene = bpy.data.scenes.get("Scene") or bpy.context.scene
    bpy.context.window.scene = scene
    clean_scene(scene)
    scene.render.fps = FPS
    scene.frame_start = 0; scene.frame_end = TURN_FRAMES
    coll = bpy.data.collections.new("Silver Head"); scene.collection.children.link(coll)

    head = import_head(scene, coll)
    trim_and_cap(head)
    silver = make_material("Silver", (0.93, 0.93, 0.95), 1.0, 0.18)
    dark = make_material("MouthDark", (0.02, 0.02, 0.024), 0.0, 0.7)
    head.data.materials.append(silver); head.data.materials.append(dark)
    dark_faces = mouth_interior_faces(head)
    dark_faces = extend_over_lip_contact(head, dark_faces)
    head.data.polygons.foreach_set("material_index", dark_faces.astype(np.int32))

    # jaw weights on the base cage (stored as a vertex group so subdivision interpolates them)
    w, info = jaw_weights(head, dark_faces)
    vg = head.vertex_groups.new(name="JawWeight")
    for i in range(len(w)):
        vg.add([i], float(w[i]), 'REPLACE')
    info["cage_tris"] = sum(len(p.vertices) - 2 for p in head.data.polygons)
    # the base mesh is a cage made for one subdivision level: apply it now (before any shape key)
    if SUBDIV_LEVELS > 0:
        sub = head.modifiers.new("Subdivision", 'SUBSURF')
        sub.levels = sub.render_levels = SUBDIV_LEVELS
        sub.uv_smooth = 'PRESERVE_BOUNDARIES'
        with _override(head):
            bpy.ops.object.modifier_apply(modifier=sub.name)
    gi = head.vertex_groups["JawWeight"].index
    w = np.array([next((g.weight for g in v.groups if g.group == gi), 0.0) for v in head.data.vertices])
    co = np.array([v.co[:] for v in head.data.vertices])
    w = smooth_mouth_corners(head, co, w, info["corner_x"], info["mouth_z"])
    for i in range(len(w)):
        head.vertex_groups["JawWeight"].add([i], float(w[i]), 'REPLACE')

    # recentre on the skull: pivot = skull front/back midpoint at forehead height, vertical bbox centre
    band = (co[:, 2] > 0.33) & (co[:, 2] < 0.36)
    pivot = Vector((0.0, 0.5 * (co[band, 1].min() + co[band, 1].max()), 0.5 * (co[:, 2].min() + co[:, 2].max())))
    opened = jaw_deform(co, w, 1.0)
    head.data.transform(Matrix.Translation(-pivot))
    head.shape_key_add(name="Basis", from_mix=False)
    sk = head.shape_key_add(name="MouthOpen", from_mix=False)
    sk.data.foreach_set("co", (opened - np.array(pivot)).astype(np.float32).ravel())
    sk.slider_min, sk.slider_max, sk.value = 0.0, 1.0, 0.0
    head.data.shape_keys.name = "HeadKeys"
    head.data.transform(Matrix.Scale(REAL_SCALE, 4), shape_keys=True)   # real-world metres about the pivot
    info["scale"] = REAL_SCALE

    spin = bpy.data.objects.new("SpinRoot", None)
    spin.empty_display_type = 'PLAIN_AXES'; spin.empty_display_size = 0.06
    coll.objects.link(spin)
    head.parent = spin
    spin.rotation_mode = 'XYZ'

    # ---- animations: Turntable (SpinRoot) and MouthOpen (shape key), separate actions
    spin.rotation_euler = (0, 0, 0); spin.keyframe_insert("rotation_euler", index=2, frame=0)
    spin.rotation_euler = (0, 0, 2 * math.pi); spin.keyframe_insert("rotation_euler", index=2, frame=TURN_FRAMES)
    turn = spin.animation_data.action; turn.name = "Turntable"; turn.use_fake_user = True
    for fc in fcurves_of(turn):
        for kp in fc.keyframe_points:
            kp.interpolation = 'LINEAR'
    spin.rotation_euler = (0, 0, 0)
    key = head.data.shape_keys; kb = key.key_blocks["MouthOpen"]
    kb.value = 0.0; kb.keyframe_insert("value", frame=0)
    kb.value = 1.0; kb.keyframe_insert("value", frame=MOUTH_FRAMES)
    mouth = key.animation_data.action; mouth.name = "MouthOpen"; mouth.use_fake_user = True
    for fc in fcurves_of(mouth):
        for kp in fc.keyframe_points:
            kp.interpolation = 'BEZIER'; kp.handle_left_type = kp.handle_right_type = 'AUTO_CLAMPED'
        fc.update()
    # timeline preview in Blender: the mouth opens and closes twice during the 20 s turn
    key.animation_data.action = None
    tr = key.animation_data.nla_tracks.new(); tr.name = "MouthOpen preview"
    for start, rev in ((120, False), (300, True), (720, False), (900, True)):
        st = tr.strips.new(f"MouthOpen_{start}", start, mouth)
        st.use_reverse = rev
        st.extrapolation = 'HOLD_FORWARD'
    kb.value = 0.0

    _world_camera_render(scene, env_hdr)
    scene.frame_set(0)
    return head, spin, info, pivot


def _world_camera_render(scene, env_hdr):
    env_path = env_hdr or os.path.join(ROOT, "studio-env.exr")
    world = bpy.data.worlds.get("StudioWorld") or bpy.data.worlds.new("StudioWorld")
    scene.world = world; world.use_nodes = True
    nt = world.node_tree
    for nd in list(nt.nodes): nt.nodes.remove(nd)
    out = nt.nodes.new("ShaderNodeOutputWorld"); bg = nt.nodes.new("ShaderNodeBackground")
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(env_path, check_existing=True)
    nt.links.new(env.outputs["Color"], bg.inputs["Color"]); nt.links.new(bg.outputs["Background"], out.inputs["Surface"])
    bg.inputs["Strength"].default_value = 1.0
    cam_data = bpy.data.cameras.new("RenderCam"); cam_data.lens = 85.0; cam_data.sensor_width = 36.0; cam_data.display_size = 0.04
    cam = bpy.data.objects.new("RenderCam", cam_data); scene.collection.objects.link(cam)
    cam.location = (0.0, -0.85, 0.0); cam.rotation_euler = (math.pi / 2, 0, 0)
    scene.camera = cam
    r = scene.render
    r.engine = 'BLENDER_EEVEE'; r.resolution_x = r.resolution_y = 1024
    r.film_transparent = True; r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGBA'
    scene.view_settings.view_transform = 'AgX'
    try:
        scene.view_settings.look = 'None'
    except TypeError:
        pass
    ee = scene.eevee
    if hasattr(ee, "use_raytracing"): ee.use_raytracing = True
    if hasattr(ee, "taa_render_samples"): ee.taa_render_samples = 128


def set_viewport():
    from mathutils import Euler
    for win in bpy.context.window_manager.windows:
        for area in win.screen.areas:
            if area.type != 'VIEW_3D': continue
            sp = area.spaces.active
            sp.shading.type = 'MATERIAL'; sp.shading.use_scene_world = True; sp.shading.use_scene_lights = True
            sp.overlay.show_relationship_lines = False
            r3d = sp.region_3d
            r3d.view_perspective = 'PERSP'; r3d.view_location = (0, 0, 0)
            r3d.view_rotation = Euler((math.radians(86), 0, math.radians(28)), 'XYZ').to_quaternion()
            r3d.view_distance = 0.8; sp.lens = 70


def export_glb(path=None):
    path = path or os.path.join(ROOT, "silver-head.glb")
    spin = bpy.data.objects["SpinRoot"]; head = bpy.data.objects["Head"]
    key = head.data.shape_keys
    # the timeline preview (MouthOpen strips placed along the turntable) is Blender-only: export the
    # MouthOpen action itself as one clip, like Turntable
    nla = key.animation_data.nla_tracks
    preview = [(t.name, [(s.name, s.frame_start, s.use_reverse, s.extrapolation) for s in t.strips]) for t in nla]
    for t in list(nla):
        nla.remove(t)
    stash = nla.new(); stash.name = "MouthOpen"; stash.strips.new("MouthOpen", 0, bpy.data.actions["MouthOpen"]); stash.mute = True
    bpy.ops.object.select_all(action='DESELECT')
    spin.select_set(True); head.select_set(True)
    bpy.context.view_layer.objects.active = spin
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
        export_texcoords=False, export_normals=True, export_tangents=False, export_materials='EXPORT',
        export_morph=True, export_morph_normal=True, export_morph_tangent=False,
        export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=True, export_frame_step=1,
        export_anim_slide_to_zero=True, export_optimize_animation_size=False,
        export_cameras=False, export_lights=False, export_extras=False, export_skins=False)
    nla.remove(stash)
    for name, strips in preview:
        t = nla.new(); t.name = name
        for sname, start, rev, ext in strips:
            st = t.strips.new(sname, int(start), bpy.data.actions["MouthOpen"]); st.use_reverse = rev; st.extrapolation = ext
    head.data.shape_keys.key_blocks["MouthOpen"].value = 0.0
    bpy.context.scene.frame_set(0)
    return path


def render_set(outdir=None):
    outdir = outdir or os.path.join(ROOT, "renders"); os.makedirs(outdir, exist_ok=True)
    scene = bpy.context.scene
    spin = bpy.data.objects["SpinRoot"]; head = bpy.data.objects["Head"]
    key = head.data.shape_keys; kb = key.key_blocks["MouthOpen"]
    act = spin.animation_data.action; spin.animation_data.action = None
    nla = key.animation_data.nla_tracks; mutes = [t.mute for t in nla]
    for t in nla: t.mute = True
    files = []
    def shot(name, yaw, m):
        spin.rotation_euler = (0, 0, math.radians(yaw)); kb.value = m
        scene.render.filepath = os.path.join(outdir, name)
        bpy.ops.render.render(write_still=True); files.append(scene.render.filepath)
    for a in range(0, 360, 45):
        shot(f"silver-head_closed_{a:03d}.png", a, 0.0)
    shot("silver-head_open_front.png", 0, 1.0)
    shot("silver-head_open_profile.png", 90, 1.0)
    shot("silver-head_open_34.png", 30, 1.0)
    spin.rotation_euler = (0, 0, 0); kb.value = 0.0
    spin.animation_data.action = act
    for t, m in zip(nla, mutes): t.mute = m
    scene.frame_set(0)
    return files
