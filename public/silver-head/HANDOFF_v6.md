# Silver head v6 - glass, wire, diamond eyes - handoff

v6 is a fine-tune of v5: a slimmer head, a glass shell, a skull that peels into wireframe in one place while it rebuilds in another, open almond eye holes with a marquise diamond in each. MouthOpen and the turn are untouched. **v5 and v4 stay as fallbacks.**

## Files
| where | what |
|---|---|
| `public/silver-head/silver-head_v6.glb` | the model (255 KB, md5 `7c157eba6a8993128e1ebc514196f3e7`) |
| `public/silver-head/silver-head_v6.blend` | Blender source of that export |
| `public/silver-head/silver-head-poster_v6.webp`, `-512.webp` | transparent poster rendered in a browser with the real glass shader, at the first-frame state |
| `public/silver-head/_build/v6_renders/` | 8 views, open front/profile, eye close-up, contact sheet |
| `public/silver-head/source_v6/` | pipeline scripts and the browser test harness |
| `src/components/silver-head/glassHead.ts` | **new**: glass, wire build/deconstruct and diamond materials |
| `src/components/silver-head/SilverHeadCanvas.tsx` | **+5 lines**: import, `applyGlassHead(gltf.scene, chamber)` after `tuneHeadMaterials`, `updateGlassHead(...)` in `useFrame` |
| `src/components/silver-head/SilverHeadHero.tsx` | **2 strings**: `SILVER_HEAD_ASSETS` now points at the v6 GLB and poster |

Roll back: point the two strings at the `_v5` files and delete the two `glassHead` calls (or leave them: with the v5 GLB they only turn the shell to glass).

## Model (glTF, Y-up, face +Z, metres, same pivot as v5)
- Nodes: `SpinRoot` > `Head` (mesh `Head`: primitives `Silver` 11,208 tris + `MouthDark` 556 tris, morph `MouthOpen`) > `Gems` (224 tris, material `Gem`). Clips `Turntable` (20 s) and `MouthOpen` (0.75 s) kept.
- 11,988 triangles in all. Bounds x +-0.0721 (was +-0.0831), y +-0.1175, z -0.0887 .. +0.1078.
- Slimmer: the face column (nose, mouth, lips) keeps its width; cheeks and jaw are narrowed 20 %, the skull 14 %; cheek hollows deeper, jowls lighter.
- Eyes: no eyeballs. A socket bowl falls into an open almond hole (about 23 x 11 mm) with a 3 mm inward rim; a marquise-cut diamond (22.8 x 8.6 mm, 56 facets) sits in each hole with blank space around it.
- Size pass (no decoder needed): int8 normals (KHR_mesh_quantization), sparse MouthOpen deltas, 5-key Turntable. Renders identical to the unpacked export (mean pixel difference 0.08/255).

## Mouth (unchanged contract)
Open MouthDark bbox min (-0.02525, -0.08927, 0.0340), max (0.02525, -0.05362, 0.09663); approach (0, -0.07145, 0.12663), end (0, -0.07145, 0.0791), look (0, -0.07145, 0.0434). `FALLBACK_APPROACH` in the canvas already matches. Camera-path ray test from `end`: every ray within +-45 degrees hits MouthDark only.

## How the look works (glassHead.ts)
- Glass shell: the GLB's `Silver` material is replaced by a transparent `MeshStandardMaterial` drawn double-sided (three.js does back faces then front faces), fresnel alpha, chamber reflections plus three crisp camera-fixed highlights. No transmission pass, no post-processing.
- Build / deconstruct: only rigid skull triangles (crown, back, temples; never the face or anything MouthOpen moves) take part. Three slow travelling waves decide per triangle whether it is glass or peeled; peeling triangles shrink to their centre and drift out while glowing, rebuilding ones fly back in. A `LineSegments` wire (one draw) over the same zone brightens where the glass is gone; far-side lines are dimmed. 15-35 % of the zone is peeled at any time.
- Diamonds: flat-faceted physical material (ior 2.42, light iridescence), facet glints from three camera-fixed lights with a twinkle, soft white-to-rainbow fire.
- Mouth cavity is drawn after the glass so it only shows through the open lips, not through the face.
- Cost per frame: 5 draw calls for the head (glass back + front, wire, cavity, gems), about 23.7k triangles and 3k line segments. The shell is converted to per-triangle vertices once at load (~34k vertices).
- Clock: advances only on rendered frames (the idle turn already renders), frozen when the hero is paused or `prefers-reduced-motion` is on. The poster is rendered at the same start time (`GLASS.startTime = 22`), so the crossfade matches.
- Tuning: all numbers are in `GLASS` at the top of the file (alpha, highlight, wire brightness, drift, sparkle, speed).

## Press burst (added after v6)
- Click or tap the head: it breaks into ~2,200 glass cubes with glowing edges, starting from the pressed spot, hangs, and reassembles 1.5 s after the press (whole cycle about 2.4 s). Holding the press (mouse button, or a still finger for 0.4 s) loops it; a swipe stays a scroll. The diamonds pop forward and settle back.
- Only at rest: ignored during the dive, when paused, with reduced motion, and on links/buttons. If the visitor scrolls mid-burst it goes straight to reassembly, so the dive always starts from a whole head.
- Cost: one instanced draw of 2,200 cubes animated entirely in the vertex shader; while idle it draws zero instances (compiled at load, so the first press has no shader hitch). The canvas only renders extra frames while a burst runs.
- Code: `startHeadBurst`, `hitGlassHead` and the `BURST` settings (count, sizes, distance, timing) in `glassHead.ts`; pointer handling and the hold loop in `SilverHeadCanvas.tsx`. The glass material is now named `SilverGlass` so `tuneHeadMaterials` leaves it alone on remounts.
- Tested live on your `localhost:3000` (click, hold-loop, release, scroll during a burst, mouth dive): no console errors.

## Checks done / not done
Done: watertight head + cavity before the eye cut; camera-path ray test; clean re-import of the final GLB in a separate Blender (names, hierarchy, materials, MouthOpen, both clips, 11,764 + 224 tris); loaded and rendered in headless Chromium with the site's exact three.js r187, the site's `chamberEnvironment.ts`, `tuneHeadMaterials` then `applyGlassHead` in the same order as the site, including a second call (remount) and MouthOpen 0 / 0.5 / 1; checksums of every file written to your folders; v4/v5/old assets and the root `public/silver-head.glb` untouched.
Not done: `next dev` / `next build` / `tsc` on your project (I could not install your dependencies here, so the new TypeScript is checked by review only), real-GPU or phone frame-rate measurement (the test browser renders in software), the scroll dive and lamp handoff with the glass head.

## Known gaps
The far side of the head shows through the glass by design; at some angles the wire on the back reads through the face. Glass on the near-black chamber looks dark-tinted; for clearer glass raise `alphaFace`/`highlight` or brighten the chamber. The poster is 134 KB (transparency and wire detail), heavier than the v5 poster.
