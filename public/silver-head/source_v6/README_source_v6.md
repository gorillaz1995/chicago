# source_v6 - pipeline (mm, glTF frame x right / y up / z face, until pack)
1. `head7.py` = `head6.py` (v5 sculpt with leaner cheeks and eye sockets instead of eyeballs) seen through a lateral slimming warp (face column |x| < 28 mm unchanged, cheeks/jaw narrowed to 0.80, skull to 0.86).
2. `python mk_hires.py 0.75` -> `hires_v6.npz`; weights `W -> 1 - 0.9 W`; Blender: `blender -b --factory-startup --python decim_job.py -- hires_v6u.npz dec_v6.npz 10800 w 3.0 1`
3. `python build_v4.py dec_v6.npz` (mouth slit, lens gap, cavity, MouthOpen morph) -> `v6_mesh.npz`; `python camcheck.py v6_mesh.npz`
4. `python eyecut.py` - clips the almond eye holes through the shell, adds a 3 mm inward rim, builds the two marquise gems -> `v6_eyes.npz`
5. `python pack_v4.py` -> `blender_data_v6.npz`, `mouth_report_v6.json`
6. In Blender: `blender_build_v6.build()`, save `silver-head_v6.blend`, `blender_export_render_v6.export_glb()` -> raw GLB
7. `python bake_glb_normals.py raw.glb blender_data_v6.npz baked.glb` then `python slim_glb.py baked.glb silver-head_v6.glb` (int8 normals, sparse MouthOpen deltas, 5-key Turntable)
8. `harness/`: headless-Chromium test page (three r187 + the site's chamberEnvironment.ts + glassHead.ts), used for the poster and the renders.
