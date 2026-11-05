import bpy, sys, os, time
W = r"C:\Users\tedyf\OneDrive\Documents\KoeiTecmo\chicago_projekt\public\silver-head\_build\v4_work"
sys.path.insert(0, W)
import blender_export_render_v4 as E
out = r"C:\Users\tedyf\OneDrive\Documents\KoeiTecmo\chicago_projekt\public\silver-head\_build\v4_renders"
t0 = time.time()
files = E.render_set(out)
print("RENDERED", len(files), round(time.time() - t0, 1), "s")
sys.stdout.flush()
