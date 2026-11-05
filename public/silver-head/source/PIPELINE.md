# Regenerating the head

Python 3.11+ with numpy, scipy, scikit-image, pymeshlab, pillow (container build used numpy 2.5, scikit-image 0.26).

1. `python make_highres.py` - sculpt SDF (`sdf2.py`) -> high-res half mesh `half_hr.npz` (~25 s)
2. `python build_mesh2.py 5000 1 final_auth.ply 1.0` - feature-weighted decimation to 9,998 tris, mirrored, sculpt normals -> `final_auth.npz`
3. `python deform.py final_auth.npz final_deform.npz` - jaw-hinge deformation: closed basis + MouthOpen (22 deg + 10 mm glide), MouthDark faces
4. `python pack_blender_data.py` - metres around the skull pivot -> `../_build/blender_data.npz`
4b. `python build_hires.py 75000` - 150k-triangle render mesh of the same sculpt, same mouth deformation -> `../_build/hires_data.npz`
5. In Blender (Scripting tab): run `blender_build.py` (then `set_viewport()` for the preview), then `blender_export_render.py` functions `export_glb()` and `render_set()`
6. `python bake_glb_normals.py ../_build/silver-head.raw.glb ../_build/blender_data.npz ../silver-head.glb`
7. `python envmap.py ../studio-env.hdr 1024` (only if you change the studio lighting)

Tuning: proportions live in the MAIN/JAW loft tables and feature blocks of `sdf2.py`; jaw angle, hinge and glide in `deform.py`.
