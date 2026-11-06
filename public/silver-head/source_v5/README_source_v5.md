# source_v5 - pipeline (all units mm, glTF frame: x lateral, y up, z face +z, until `pack_v4.py`)
Run order, from this folder (needs numpy, scipy, scikit-image, opencv, pillow; Blender 5.x for steps 3, 7-9):
1. `head6.py` - the sculpt (analytic SDF). `head5.py` is the v4 sculpt kept for `run_preview.py` and the lip fits.
2. `python mk_hires.py 0.75` - marching cubes + importance weights -> `hires_v5.npz`; then `W -> 1 - 0.9 W` -> `hires_v5u.npz` (higher group weight = more decimation in Blender).
3. Blender background: `blender -b --factory-startup --python decim_job.py -- hires_v5u.npz dec_v5.npz 10800 w 3.0 1`
4. `python build_v4.py dec_v5.npz` - slit cut, lens gap, cavity rings, jaw weights, MouthOpen morph, filtered analytic normals -> `v5_mesh.npz`
5. `python camcheck.py v5_mesh.npz` - ray-cast simulation of the site's camera path
6. `python pack_v4.py` - pivot shift, metres, Blender frame -> `blender_data_v5.npz`, `mouth_report_v5.json`
7. In Blender: `blender_build_v5.build(data=...)` (builds the scene in place; pass the .npz path), save as `silver-head_v5.blend`, then `blender_export_render_v5.export_glb()` -> `silver-head_v5.raw.glb`
8. `python bake_glb_normals.py silver-head_v5.raw.glb blender_data_v5.npz silver-head_v5.glb` - bakes the analytic normals (and morph normals)
9. `blender -b silver-head_v5.blend --python verify_render_v5.py` - re-imports the GLB into a clean scene, writes `verify_v5.json`, renders the PNG set
Lip shape was fitted with `fit_lips.py` / `fit2.py` / `bake_fit.py` (`lip_fit2.json`). The final production run used the `*_v5g.npz` file names; paths inside the Blender scripts point to this project folder, edit `ROOT` if you move it.
