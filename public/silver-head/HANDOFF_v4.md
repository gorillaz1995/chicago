# Silver head v4 - handoff

## Canonical files (all in `public/silver-head/`)
| file | what |
|---|---|
| `silver-head_v4.blend` | authoritative source (web mesh, shape key, clips, studio world, render camera) |
| `silver-head_v4.glb` | matching export of that .blend (Blender glTF exporter, then exact analytic normals baked in, incl. morph normals) |
| `silver-head-poster_v4.webp`, `silver-head-poster_v4-512.webp` | transparent front poster rendered from the final model |
| `_build/v4_renders/` | 8 closed views (000-315), open front, open profile, contact sheet, comparison sheet vs the approved references |
| `source_v4/` | pipeline scripts (sculpt SDF, decimation, slit/cavity/jaw build, Blender build/export/render, normal bake) |

Not touched: `silver-head.blend`, `silver-head.glb`, `silver-head-poster.webp`, root `public/silver-head.glb`, `src/`. Backups of the old assets are in `_build/previous/`.

## Runtime contract (unchanged names and hierarchy)
Scene > `SpinRoot` (node) > `Head` (node, mesh `Head`). Mesh primitives: `Silver` (11,070 tris) and `MouthDark` (484 tris). Morph target `MouthOpen` on both primitives (relative, 0 = closed, 1 = open). Clips: `Turntable` (SpinRoot rotation, 20.0 s, 1201 samples, linear, seamless) and `MouthOpen` (Head weights, 0.75 s, ends open, eased). No `MouthInterior` node existed in the deployed asset, so none was added.

## Numbers
- 11,554 triangles (Silver 11,070 + MouthDark 484), 5,887 GLB vertices, 2 materials / 2 draw calls, **371 KB**.
- Materials: `Silver` base (0.89, 0.89, 0.90), metallic 1, roughness 0.28; `MouthDark` base (0.018, 0.018, 0.022), metallic 0, roughness 0.85 (same as the deployed asset). Both doubleSided. No textures, no baked lighting.
- Frame: glTF Y-up, face toward +Z, metres, origin = skull centre (vertical bbox centre; front/back midpoint at forehead height), as in the deployed asset.
- Bounds (MouthOpen 0): x +-0.0831, y +-0.1175, z -0.0891 .. +0.1074 m. At MouthOpen 1 the chin reaches y = -0.1320.

## Mouth
- Closed basis: upper and lower lips are separate geometry with a 0.76 mm lens-shaped gap (not welded), visible as a thin black line.
- Jaw: rigid hinge on +X at (0, -0.0240, 0.0161) m, 22 degrees at MouthOpen = 1 plus a small glide (0, -1.5, +6.0) mm, per-vertex weights (upper lip and skull 0, lower lip/jaw 1, corners and cheeks blended). Lip gap at full open about 28 mm tall by 50 mm wide.
- Interior: enclosed pocket behind the lips (watertight, 8 mm silver rim band then `MouthDark`), pure black, no teeth, tongue or glow.
- Open-mouth numbers (what `measureCavity` reads, exported local space, metres): MouthDark bbox min (-0.02534, -0.08909, 0.03318), max (0.02534, -0.05364, 0.09657); centre (0, -0.07137, 0.06487); entrance faces +Z (camera travels -Z along x = 0, y = -0.07137); cavity depth 0.0634 m. Derived: approach (0, -0.07137, 0.12657), end (0, -0.07137, 0.07882), look (0, -0.07137, 0.04269). The old asset had centre y = -0.0875 (bigger opening); if you keep a fallback, `FALLBACK_APPROACH` becomes (0, -0.0714, 0.1266).

## Integration (only two strings)
In `SilverHeadHero.tsx`, `SILVER_HEAD_ASSETS`: `glb: '/silver-head/silver-head_v4.glb?v=v4'` and `poster: '/silver-head/silver-head-poster_v4.webp'`. Nothing else changes: camera path, scroll timeline, handoff and fonts all read the model.

## Telling the right asset from the old ones
- New: file names end `_v4`; Silver/MouthDark = 11,070 / 484 tris; 371 KB; x bound 0.0831.
- Old deployed `silver-head.glb`: 9,360 / 640 tris, 292 KB, x bound 0.0792; `.blend` and `raw.glb` held a different, wider sculpt; root `public/silver-head.glb` (27.6k tris) is an unreferenced orphan; `silver-head-poster.webp` is a stale three.js render of the old heavy-brow head.

## Checks done / not done
Done: asset-identity trace; watertight head+cavity (0 boundary / 0 non-manifold edges); morph QA over the skin (no flipped faces above 0.3 mm^2, worst skin stretch 3.1x at the mouth corners, worst compression 0.69); ray-cast simulation of the site's camera path (from `end`, every ray within +-45 degrees hits `MouthDark` only; no silver or see-through); GLB re-import into a separate Blender scene (names, hierarchy, materials, shape key, clips, 11,554 tris, bounds, morph); EEVEE renders from the final model.
Not done: any run in a real browser (three.js / the site's `tuneHeadMaterials`, scroll dive, handoff timing, reverse/replay), GPU or mobile performance. My sandbox could not load three.js, so please open the page once and scrub MouthOpen / the dive.

## Known gaps against the approved references
Silhouettes match (front IoU 0.987, profile 0.993, three-quarter 0.980 in my preview renderer) but the face is softer than the references: lips are thinner, nostrils read as small pits, eyelids and brows are subtle, and in chrome the brow ridge shows as a faint band across the forehead. Open-mouth gap is ~28 mm (reference ~22 mm, old asset ~47 mm). Further feature refinement is the natural next step.
