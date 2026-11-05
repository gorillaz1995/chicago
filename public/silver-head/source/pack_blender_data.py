"""Step 4 - convert the deformed mesh (mm, Blender axes) to metres around the skull pivot -> ../_build/blender_data.npz"""
import os, sys, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
d = np.load(os.path.join(HERE, 'final_deform.npz'))
Vb, Vo = d['Vb'], d['Vo']
band = (Vb[:, 2] > 25) & (Vb[:, 2] < 55)                    # forehead height: skull front/back midpoint
piv = np.array([0.0, 0.5 * (Vb[band, 1].min() + Vb[band, 1].max()), 0.5 * (Vb[:, 2].min() + Vb[:, 2].max())])
os.makedirs(os.path.join(HERE, '..', '_build'), exist_ok=True)
np.savez(os.path.join(HERE, '..', '_build', 'blender_data.npz'), Vb=(Vb - piv) * 0.001, Vo=(Vo - piv) * 0.001,
         F=d['F'].astype(np.int32), Nb=d['Nb'], No=d['No'], dark=d['dark'].astype(np.int32), W=d['W'], pivot_mm=piv)
print('pivot (mm, Blender axes):', piv)
