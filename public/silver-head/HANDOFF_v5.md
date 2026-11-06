# Silver head v5 - handoff

v5 is the facial-definition pass on top of v4: same runtime contract, same mouth rig, new lips, nose, eyes and brow, more triangles where the face needs them. **v4 stays untouched as a fallback.**

## Canonical files (all in `public/silver-head/`)
| file | what |
|---|---|
| `silver-head_v5.blend` | authoritative source (web mesh, shape key, clips, studio world, render camera) |
| `silver-head_v5.glb` | matching export of that .blend (Blender glTF exporter, then exact analytic normals baked in, incl. morph normals). md5 `3fb0684c6e6d81bfaa72266efe4ebc4a` |
| `silver-head-poster_v5.webp`, `silver-head-poster_v5-512.webp` | transparent front poster (1024 / 512 px) rendered from the re-imported GLB |
| `_build/v5_renders/` | 8 closed views (000-315), open front, open profile, 3 close-ups, `silver-head_v5_contact_sheet.jpg`, `silver-head_v5_vs_references.jpg`, `silver-head_v5_vs_v4.jpg` |
| `source_v5/` | pipeline scripts + `README_source_v5.md` (run order) |

Not touched: every `_v4` file, `silver-head.blend`, `silver-head.glb`, `silver-head-poster.webp`, root `public/silver-head.glb` (orphan), `src/`.
`*.blend1` files are Blender's automatic backups, ignore them. `_build/v5_work/` holds intermediates; the ones in `_build/v5_work/_superseded/` are earlier passes, the final inputs are the `*_v5g.npz` files.

## Runtime contract (unchanged names and hierarchy)
Scene > `SpinRoot` (node) > `Head` (node, mesh `Head`). Primitives: `Silver` (11,098 tris) and `MouthDark` (538 tris). Morph target `MouthOpen` on both primitives (relative, 0 = closed relaxed lips, 1 = open). Clips: `Turntable` (SpinRoot rotation, 20.0 s, 1201 samples, linear, seamless) and `MouthOpen` (Head weights, 0.75 s, 46 samples, ends open, eased).

## Numbers
- **11,636 triangles** (Silver 11,098 + MouthDark 538), 5,940 GLB vertices, 2 materials / 2 draw calls, **374 KB** (382,900 B). v4 was 11,554 tris / 371 KB.
- Materials: `Silver` base (0.89, 0.89, 0.90), metallic 1, **roughness 0.33** (v4: 0.28, softened because the finer relief sparkled in chrome); `MouthDark` base (0.018, 0.018, 0.022), metallic 0, roughness 0.85. Both doubleSided, no textures, no baked lighting. `tuneHeadMaterials` still overrides MouthDark as before.
- Frame: glTF Y-up, face toward +Z, metres, origin = skull centre (vertical bbox centre, front/back midpoint at forehead height).
- Bounds (MouthOpen 0): x +-0.0831, y +-0.1175, z -0.0887 .. +0.1078 m (nose tip). At MouthOpen 1 the chin reaches y = -0.1320.

## What changed against v4
- Lips: two soft pillow lobes with a peaked upper lip, fuller lower lip and rounded corners (fitted to the reference crops), cavity unchanged.
- Nose: narrower bridge, broader tip lobule, alar wings blended into the tip, small soft nostril openings (no pods or beads), alar groove.
- Eyes: almond lids with a wider, softer rim so they survive at ~3 mm mesh spacing. Brow: smooth arch instead of a band; sulcus softened.
- Mesh: triangle density moved toward eyes, nose and mouth (nose ~2.4 mm, eyes ~2.5 mm edges); sculpt normals are pre-filtered to the mesh scale and baked into the GLB.
- Box-shaped mask edges around the nose that showed as rectangles in v4 are gone.

## Mouth
- Closed basis: upper and lower lips are separate geometry with a 0.76 mm lens-shaped gap, visible as a thin black line.
- Jaw: rigid hinge on +X at (0, -0.0240, 0.0165) m, 22 degrees at MouthOpen = 1 plus a small glide (0, -1.5, +6.0) mm, per-vertex weights (upper lip and skull 0, lower lip/jaw 1, corners and cheeks blended). Lip gap at full open about 31 mm tall (centre line) by 52 mm wide.
- Interior: enclosed pocket behind the lips (watertight, silver rim band then `MouthDark`), pure black, no teeth, tongue or glow.
- Open-mouth numbers (what `measureCavity` reads, exported local space, metres): MouthDark bbox min (-0.0258, -0.08927, 0.0336), max (0.0258, -0.05362, 0.09661); centre (0, -0.07145, 0.0651); entrance faces +Z (camera travels -Z along x = 0, y = -0.07145); cavity depth 0.06301 m. Derived: approach (0, -0.07145, 0.12661), end (0, -0.07145, 0.07896), look (0, -0.07145, 0.04305). Identical to v4 within 0.1 mm, so `FALLBACK_APPROACH` (0, -0.0714, 0.1266) needs no change if you set it for v4.
- Closed pose: MouthDark bbox min (-0.0258, -0.06239, 0.03795), max (0.0258, -0.05362, 0.09746).

## Integration (only two strings)
In `SilverHeadHero.tsx`, `SILVER_HEAD_ASSETS`: `glb: '/silver-head/silver-head_v5.glb?v=v5'` and `poster: '/silver-head/silver-head-poster_v5.webp'`. Nothing else changes: camera path, scroll timeline, handoff and fonts all read the model. To roll back, point both strings at the `_v4` files.

## Telling the right asset from the old ones
- New: file names end `_v5`; Silver/MouthDark = 11,098 / 538 tris; 382,900 B; z max 0.1078; roughness 0.33.
- v4: 11,070 / 484 tris, 379,908 B, roughness 0.28. Old deployed `silver-head.glb`: 9,360 / 640 tris, 292 KB. Root `public/silver-head.glb` (27.6k tris) is an unreferenced orphan.

## Checks done / not done
Done: watertight head + cavity (0 boundary / 0 non-manifold edges, 0 flipped faces on the skin or cavity); worst skin stretch 2.9x at the mouth corners, worst compression 0.68; ray-cast simulation of the site's camera path (11 camera depths from the approach point down to `end`; from `end`, every ray within +-45 degrees hits `MouthDark` only, no silver and no see-through, crossing parity 0 everywhere); GLB re-import into a clean Blender scene (names, hierarchy, materials, shape key, both clips, 11,636 tris, bounds, mouth bbox); EEVEE renders from the re-imported GLB; silhouette overlap against the reference renders in my preview renderer (front 0.987, profile 0.993, three-quarter 0.980); files in the project folder verified against the originals (the GLB by checksum; images pixel-identical, the copy tool embeds a ~5.8 KB content-credentials block in them, so poster file sizes read about 6 KB larger than the 22.7 KB / 14.8 KB I rendered).
Not done: any run in a real browser (three.js, `tuneHeadMaterials`, scroll dive, handoff timing, reverse/replay), GPU or mobile performance. My sandbox cannot load three.js, so please open the page once and scrub MouthOpen / the dive.

## Known gaps against the approved references
Silhouette, proportions, lips and nose now follow the references, but the face is still softer and flatter than them: eyelids and brow are subtle, nostrils are small, and at ~11.6k triangles the relief around the eyes and nostrils is limited by the mesh (edges 2.4-2.5 mm), so a chrome close-up shows some faceting there. Under the studio environment the brow still catches a faint horizontal reflection in three-quarter and profile views. Open-mouth gap is ~31 mm (reference ~22 mm); the contract's 22 degrees was kept. Ears are simplified as briefed. Going further needs more triangles than the 12k budget or a normal map, which the two-material, no-texture contract rules out.
