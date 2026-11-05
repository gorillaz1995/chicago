# Silver head — Blender asset + web hero

A calm, bald, all-silver head with blank sculpted eyes, a working mouth (one shape key) and two clips.
Built from scratch (procedural sculpt → mesh → Blender), no stock geometry.

## Files

| File | What it is |
|---|---|
| `silver-head.blend` | Blender 5.2 scene: `SpinRoot` › `Head` (10k web mesh, hidden) + `Head_HiRes` (150k render mesh, visible), materials, shape keys, actions, studio world, render camera |
| `silver-head.glb` | Web asset (Y-up, face +Z), two clips, morph target `MouthOpen` |
| `studio-env.hdr` | 1024×512 RGBE studio environment (the only lighting the web version uses) |
| `silver-head-poster.webp` / `-512.webp` | Front poster with alpha, rendered from the GLB with the hero camera (loading/fallback image) |
| `renders/` | Eevee PNGs (ray-traced reflections) of `Head_HiRes` with alpha, fixed camera/lights/pivot/scale: closed 0°…315° in 45° steps, open front + open profile, front |
| `silver-head-contact-sheet.jpg` | All renders on one sheet |
| `integration/` | `SilverHeadHero.tsx` + `SilverHeadCanvas.tsx` (Next.js client hero) |
| `source/` | Sculpt + mesh pipeline and the Blender build/export scripts (see `source/PIPELINE.md`) |
| `_build/` | `blender_data.npz` + `hires_data.npz` (inputs to `blender_build.py`), `silver-head.raw.glb` (export before the normal bake) |

## Model facts (measured)

- **Units / size:** metres. Rest pose 0.158 W × 0.235 H × 0.221 D. glTF bounds x ±0.079, y −0.117…+0.117, z −0.098 (back of skull) … +0.123 (nose tip). At full open the chin reaches y = −0.142.
- **Pivot:** `SpinRoot` sits at the origin = skull centre (front/back midpoint of the skull at forehead height, vertical centre of the head). `Head` has an identity transform under it, so a Y rotation spins in place.
- **Orientation:** Blender Z-up, face −Y → glTF Y-up, face **+Z** (standard exporter axis conversion). Rest pose faces the camera.
- **Mesh:** one mesh `Head`, **10,000 triangles** (Silver 9,360 + MouthDark 640), 5,000 vertices in Blender / 5,040 exported (split at the material seam). Closed, manifold, mirror-symmetric. Eyes, ears and mouth interior are part of it.
- **Draw calls:** 2 (one per material). No textures, no UVs.
- **Materials:** `Silver` metallic 1, roughness 0.25, base (0.86, 0.87, 0.90). `MouthDark` matte graphite (0.018), roughness 0.85, metallic 0. Both opaque.
- **Shape key `MouthOpen` (0–1):** 0 = relaxed closed lips. 1 = jaw rotated 22° about a left–right hinge just in front of the ears, plus a 10 mm forward glide (as a real jaw does), revealing a recessed dark cavity with no teeth or tongue. Skull and upper face stay still. The lips are modelled as separate upper/lower surfaces (authored 3 mm apart, closed by the basis), so there is no tearing. Checked at 0, 0.25, 0.5, 0.75, 1: no folded faces from closed to half-open on either mesh. At full open, about 10 sub-millimetre faces at the very corners of the mouth fold where they are stretched (not visible in the renders).
- **Normals:** smooth normals sampled from the sculpt are stored as custom normals in the .blend. In the GLB they are written for both the closed and open poses by `source/bake_glb_normals.py`.

## In Blender

- Two meshes of the **same sculpt** share `SpinRoot`:
  - **`Head_HiRes`** (collection *Silver Head (render)*): 150,000 triangles, smooth. This is the polished model you see and render in Blender.
  - **`Head`** (collection *Silver Head (web GLB)*): the 10k mesh that goes into the GLB. It is hidden, and the export script un-hides it only while exporting.
- `Head_HiRes`'s `MouthOpen` key follows `Head`'s `MouthOpen` through a driver, so one slider or clip moves both. The driver is Blender-only; the GLB never relies on it.
- The viewport is set to Material Preview lit by the scene's studio world. The render camera is `RenderCam` (85 mm, 1024×1024, transparent film). Eevee ray tracing is on for renders, so the chrome reflects its own features.
- To see the web mesh, un-hide `Head` (the eye icon) and hide `Head_HiRes`.

## Animations (in the .blend and the GLB)

- **`Turntable`**, 20.0 s, `SpinRoot` rotation only. 1,201 sampled keys (60 fps), constant 18°/s, a full 360° with no reverse and no seam (359.82° at 19.99 s → 0.18° at 0.01 s). Mouth stays closed.
- **`MouthOpen`**, 0.75 s = 45 frames at 60 fps. Morph weight 0 → 1, ease in/out (0.156 at ¼, 0.5 at ½, 0.844 at ¾), ends open. No rotation track.
- The clips are separate glTF animations with disjoint targets, so playing one never resets the other. In the .blend, `MouthOpen` sits on a **muted NLA track** of the shape keys so the timeline previews the turntable with a closed mouth. Un-mute it to preview, or set the slider. The exporter (Actions mode) exports it either way.
- Re-import of the GLB into an empty scene shows the same hierarchy, 10,000 tris, both materials, shape keys `Basis`/`MouthOpen` and both actions.

## Budgets (measured)

| Item | Result | Target |
|---|---|---|
| Triangles | 10,000 | 6–10k, < 12k |
| Draw calls (head) | 2 | 2–3 |
| GLB | 292 KB (171 KB gzip) | < 1 MB |
| GLB + environment | 0.80 MB (0.42 MB gzip) | < 2 MB |
| Poster | 22 KB (1024 px) / 15 KB (512 px) | — |
| Lazy 3D JavaScript (three r169 + R3F 8.17) | ≈ 225 KB gzip, not in first load (page first load stays ~90 KB) | — |

No mesh compression is applied. At 171 KB gzipped the GLB wouldn't gain enough from Draco or meshopt to pay for a decoder.
If you want to cut the environment download further, a 512×256 HDR is about a quarter of the size and still fine for these broad highlights (`python source/envmap.py studio-env.hdr 512`).

**Frame rate: not measured on a phone or GPU.** The only measurement was headless Chromium with SwiftShader, i.e. CPU software WebGL on a 2-vCPU cloud container: about 14 fps idle at a 640×480 viewport. That says nothing about real devices. Please measure on a representative mid-range Android phone (Chrome remote debugging → Rendering → FPS meter) and on desktop.

## Website integration (Next.js 14 / React 18)

Not wired into the site yet. The components were built and tested in a minimal Next 14.2 + React 18 app.

1. `npm i three@^0.169 @react-three/fiber@^8.17` and `npm i -D @types/three@^0.169`. (R3F v8 is the line for React 18; v9 needs React 19.)
2. Copy `silver-head.glb`, `studio-env.hdr` and `silver-head-poster.webp` to `public/silver-head/`.
3. Copy `integration/*.tsx` to `src/components/silver-head/`.
4. Use it at the top of the page, and mark the first content section:

```tsx
import SilverHeadHero from '@/components/silver-head/SilverHeadHero';

<SilverHeadHero />
<section data-head-reveal> …first content… </section>
```

What it does:
- The poster `<img>` is server-rendered in a square stage, so there is no layout jump. The canvas is a client-only chunk (`next/dynamic`, `ssr:false`) that fades in over the poster once the GLB and environment are loaded.
- **Idle:** one runtime controller turns `SpinRoot` around Y with delta time (20 s per turn). Pointer tilt (max 3–4°) only applies on hover-capable fine pointers. The GLB's own clips are not played, so no mixer competes with the direct writes.
- **Reveal:** fires once per page visit, on the first downward scroll of more than 12 px. It runs on real elapsed time, not scroll distance. 0–0.45 s settles to the nearest front-facing angle (the short way). 0.15–0.60 s opens `MouthOpen`. Over 0–0.75 s the head scales up 10% and drifts up slightly. 0.45–0.75 s fades the head out while `[data-head-reveal]` fades in and rises 28 px. One easing family throughout (JS easeInOutCubic = CSS `cubic-bezier(.65,0,.35,1)`). Scrolling, touch and keyboard are never intercepted.
- Back at the top it shows the settled, closed-mouth head with no second reveal. Later scroll-aways only fade it.
- **Rendering:** on demand, continuous only while something moves. Stops completely off-screen or in a hidden tab (no time build-up). DPR is 1 on touch devices and up to 1.5 on desktop. A visible "Pause motion" button is provided.
- **Reduced motion:** static front-facing head, no tilt, no pause button, plain content fade.
- **Fallbacks:** no WebGL, a failed asset load, or under 20 fps for the first 4 idle seconds → the poster stays and the page works normally.
- **Tone mapping:** Khronos PBR Neutral in both Blender and three.js, so the poster and the live head match.

Scenarios tested in headless Chromium: poster → 3D fade, the reveal timeline (frame-logged), repeated wheel events, back to top, second scroll, pause, off-screen, reduced motion, WebGL disabled (mobile portrait), GLB request blocked, mobile portrait at DPR 3 (canvas renders at DPR 1), keyboard PageDown. No console errors.

## Known limitations

- **Topology:** the mesh is a feature-weighted, decimated triangle mesh generated from the procedural sculpt, not hand-built quad loops. That is fine for one baked mouth morph, but if you later want a full facial rig, retopologise first.
- **Faceting (web mesh only):** at 10k triangles the sharpest ridges (brow edge, cheek line) facet slightly in extreme close-ups. About 14k triangles would smooth them (`build_mesh2.py 7000 …`). The Blender render mesh is 150k triangles and smooth.
- **Mouth corners:** at full open, the few tiny faces at each extreme mouth corner stretch and fold. They are not visible at normal viewing distance.
- **Eevee vs web look:** the Eevee PNGs (150k mesh, ray-traced) are crisper and more contrasty than the browser. The web poster is therefore rendered from the GLB in three.js, for a seamless crossfade.
- **Neck termination:** the underside is flat with rounded edges. At full open the chin drops 2.4 cm below it and the underside tilts smoothly.

## Rebuilding

See `source/PIPELINE.md`. In short: sculpt (`sdf2.py`) → mesh (`make_highres.py`, `build_mesh2.py`) → mouth (`deform.py`) → `pack_blender_data.py` → in Blender `blender_build.py` + `blender_export_render.py` → `bake_glb_normals.py`.
