"""Step 1 - sample the SDF sculpt (sdf2.head_sdf, lips authored 3 mm apart) and extract the
high-resolution x>=0 half mesh with narrow-band marching cubes (0.6 mm voxels) -> half_hr.npz"""
import os, sys, time
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sdf2, mesher

if __name__ == '__main__':
    t = time.time()
    v, f, st = mesher.mesh_half(lambda p: sdf2.head_sdf(p, dict(sdf2.P0)), 0.6)
    np.savez(os.path.join(HERE, 'half_hr.npz'), v=v, f=f)
    print('half mesh', len(f), 'faces', round(time.time() - t, 1), 's')
