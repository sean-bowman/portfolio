'''
pySurf cases for the portfolio exporters.

The four pySurf exporters in this folder draw on pySurf checked out beside the site: the default
thruster for the Showcase model, and the Surf Ranch soliton of Feddersen et al. (2024) for the
overturn drawing, the splash-up video and the peeling-breaker video. The soliton is set up exactly
as pySurf's validation test sets it up (tests/testValidationOverturning.py, surfRanchWave), so the
frames the site shows are the run that test compares with the DNS. The overturn and splash-up start
from pySurf's default Green-Naghdi solitary wave; the peeling breaker starts from the exact
potential-flow solitary wave, which travels unchanged over the flat bed as its construction needs.
Each boundary element run takes about 20 minutes; the runs are pickled in the export folder and
reused.

Author: Sean Bowman
Date:   10/29/2026
'''

import pickle
import sys
import tempfile
from pathlib import Path

siteRoot = Path(__file__).resolve().parents[1]
pySurfRoot = siteRoot.parent / 'pySurf'
workDir = Path(tempfile.gettempdir()) / 'pySurfShowcaseExport'
waveCaches = {'serre': workDir / 'surfRanchWave.pkl', 'exact': workDir / 'surfRanchExactWave.pkl'}

def importPySurf():
    '''
    Put pySurf's source tree on the path and return its package.
    '''
    source = pySurfRoot / 'src'
    if not source.exists():
        raise FileNotFoundError(f'pySurf not found at {pySurfRoot}; check it out beside the site.')
    if str(source) not in sys.path:
        sys.path.insert(0, str(source))
    import pysurf
    return pysurf

def surfRanchWave(startingWave: str = 'serre'):
    '''
    The Surf Ranch soliton run to the jet's impact: a solitary wave of a0/h0 = 0.6 starting at
    x0/h0 = 15, a flat bed to x/h0 = 30, a 0.0693 face up to a flat 0.371 h0 deep, and walls at 0
    and 60 h0, with h0 = 1 m. Loaded from the export folder when a previous run left it there.

    Parameters:
    -----------
    startingWave : str
        'serre' for the Green-Naghdi solitary wave, 'exact' for the exact potential-flow one

    Returns:
    --------
    OverturningWave
        The run wave, its frames recorded from the start to the impact
    '''
    importPySurf()
    waveCache = waveCaches[startingWave]
    if waveCache.exists():
        return pickle.loads(waveCache.read_bytes())

    from pysurf.bathymetry import Bathymetry
    from pysurf.OverturningWave import OverturningWave

    slope, shallowDepth = 0.0693, 0.371
    reefLength = 60.0 - (30.0 + (1.0 - shallowDepth) / slope)
    bed = Bathymetry.reefBreak(depth = 1.0, toeX = 30.0, faceSlope = slope, reefDepth = shallowDepth,
                               reefLength = reefLength)
    wave = OverturningWave(depth = 1.0, waveHeight = 0.6, bathymetry = bed, beachSlope = slope, startX = 15.0,
                           crestSpacingRatio = 0.02, startingWave = startingWave)
    print('Running the Surf Ranch overturn (boundary elements, about 20 minutes)...')
    wave.run(progress = False)
    workDir.mkdir(parents = True, exist_ok = True)
    waveCache.write_bytes(pickle.dumps(wave))

    return wave
