'''
Export pySurf's peeling breaker as a short video for the portfolio Showcase.

Runs pySurf's PeelingWave on the Surf Ranch reef with its depth contours turned to 30 degrees from
the incident crest, the case of the pySurf README's peeling-breaker GIF: the exact solitary wave of
a0/h0 = 0.6 (pySurfCase.surfRanchWave('exact')), 32 particles per depth, 1.6 sqrt(h0 / g) from the
first plane's impact in 40 recorded intervals. Every cross-section of that reef sees the 2D
overturn delayed by its distance along the crest, so SPH planes join one at a time as their own
jets land. Ahead of them the drawing shows every second plane's free surface from the boundary
element run at that plane's own phase, recorded by restarting the overturn once. Each frame is
drawn at true scale from low on the shoreward side of the reef, ahead of the peel, looking back
along the crest into the tube. Particles are colored by speed from deep blue at rest to white at
twice the wave speed on the site's night-ocean ground. The frames are encoded as an H.264 MP4 with
a WebP poster.

The flow is pySurf's output and this script computes nothing physical beyond what it reports from
the run (the incident wave's speed, the peel speed, the particle count). The case is not
validated: no measurement or 3D simulation of a solitary wave peeling along an oblique reef was
found. The checks the card quotes are pySurf's consistency checks of the construction
(tests/testValidationPeelingWave.py). Strip theory's spanwise velocity is 70 percent high against
Guyenne and Grilli's (2006) 3D ridge (tests/testValidationRidgeOverturn.py).

Usage (from githubPagesSite/, with pySurf checked out beside it and numba installed):
    python tools/exportPySurfPeeling.py
The exact-start overturn takes about 20 minutes, the SPH run about 70 minutes on four threads and
the restart for the planes' phases about 12; the result is pickled in the export folder, so later
runs only redraw. It writes public/assets/video/pySurfPeeling.mp4,
public/assets/video/pySurfPeeling.webp and src/data/pySurfPeelingFacts.json.

Author: Sean Bowman
Date:   11/01/2026
'''

import json
import math
import os
import pickle

# Four threads, the timing quoted above; numba reads this when pySurf's compiled backend loads
os.environ.setdefault('NUMBA_NUM_THREADS', '4')

import numpy as np

from pySurfCase import importPySurf, siteRoot, surfRanchWave, workDir

videoPath = siteRoot / 'public' / 'assets' / 'video' / 'pySurfPeeling.mp4'
posterPath = siteRoot / 'public' / 'assets' / 'video' / 'pySurfPeeling.webp'
factsPath = siteRoot / 'src' / 'data' / 'pySurfPeelingFacts.json'
runCache = workDir / 'peelingRun.pkl'

particlesPerDepth = 32
obliqueAngle = 30.0             # [deg], the reef's depth contours against the incident crest
widthPx, heightPx, dpi = 960, 400, 100
xLimits = (41.0, 47.5)          # [h0], across the reef: the first impact is at 42.4
zLimits = (-0.45, 0.95)         # [h0], from the still water level
elevation, azimuth, zoom = 10.0, 55.0, 1.55   # low, shoreward and ahead of the peel, into the tube
fps = 9
holdSeconds = 1.5               # the last frame held before the loop restarts
posterAge = 1.0                 # [sqrt(h0 / g)], the poster's time after the first impact

# Night-ocean ground (the site's dark --bg and --text-muted); water deep blue at rest to white
# at twice the wave speed; the planes still in potential flow as faint blue lines
ground, pane, grid, ink, planeLines = '#16232A', '#1B2B33', '#2E4550', '#9FB3AE', '#5B8CC6'
waterStops = ('#1D4F91', '#2E7BC6', '#7FB8E8', '#FFFFFF')

# pySurf's consistency checks of the construction (tests/testValidationPeelingWave.py and the
# README's peeling-breaker table): the spread of the newest half of the planes' energies at four
# ages after their impact, with and without spanwise velocity; their median against the 2D
# splash-up with strip theory's spanwise velocity, to 0.8 sqrt(h0 / g) and at 1.2; the 5 percent
# criterion; and the spanwise velocity's error on Guyenne and Grilli's ridge
checks = {
    'steadyAges': [0.25, 0.5, 0.8, 1.2],
    'steadySpread': [0.006, 0.008, 0.012, 0.017],
    'twoDimensionalTo08': 0.001,
    'twoDimensionalAt12': 0.012,
    'criterion': 0.05,
    'spanwiseRidgeError': 0.70,
}

def runPeeling() -> dict:
    '''
    The peeling breaker's frames, each plane's free surface at its phase, and the numbers the
    drawing and the card need, from the cache when present.

    Returns:
    --------
    dict
        frames (time, positions, speeds, activePlanes), surfaces (plane lag index to surface),
        spacing, planes, plane lag, shear, incident and peel speeds, wave height and depth
    '''
    if runCache.exists():
        return pickle.loads(runCache.read_bytes())

    wave = surfRanchWave('exact')
    from pysurf.OverturningWave import OverturningWave
    from pysurf.PeelingWave import PeelingWave

    peel = PeelingWave(wave, obliqueAngle=obliqueAngle, particlesPerDepth=particlesPerDepth, backend='compiled')
    print('Running the peeling breaker (SPH, about 70 minutes on four threads)...')
    peel.run(progress=True)

    # Plane k at time t after the first impact is the 2D run j = k - t / lag lags before its
    # impact, so one restart recording every lag back from the impact covers every frame
    lag, impact, planes = peel.planeLag, peel.impactTime, peel.planes
    phases = impact - np.arange(planes + 1) * lag
    earliest = impact - (planes + 2) * lag
    start = [frame for frame in wave.frames if frame.potential is not None and frame.time <= earliest][-1]
    record = np.sort(phases - start.time)
    restart = OverturningWave(depth=wave.depth, waveHeight=wave.waveHeight, bathymetry=wave.bathymetry,
                              crestSpacingRatio=wave.crestSpacingRatio, surfaceSpacingRatio=wave.surfaceSpacingRatio,
                              initialState=(start.surface, start.potential), frameInterval=10.0, recordTimes=record,
                              endTime=record[-1] + 0.01)
    print('Restarting the overturn for the planes ahead of the peel (about 12 minutes)...')
    restart.run(progress=False)
    surfaces = {}
    for j, phase in enumerate(phases):
        frame = restart.frameAt(phase - start.time)
        if frame is not None:
            surfaces[j] = frame.surface.copy()

    data = {
        'frames': [{'time': frame.time, 'positions': frame.positions, 'speeds': frame.speeds,
                    'activePlanes': frame.activePlanes} for frame in peel.frames],
        'surfaces': surfaces,
        'spacing': peel.spacing,
        'planes': planes,
        'planeLag': lag,
        'shear': peel.shear,
        'incidentSpeed': peel.incidentSpeed,
        'peelSpeed': peel.peelSpeed,
        'waveHeight': wave.waveHeight,
        'depth': wave.depth,
    }
    workDir.mkdir(parents=True, exist_ok=True)
    runCache.write_bytes(pickle.dumps(data))
    return data

def surfaceOf(positions: np.ndarray, spacing: float) -> np.ndarray:
    '''
    The particles within three spacings of the top of their column (columns two spacings square)
    inside the window, so the drawing shows the free surface and not the water under it.
    '''
    cell = 2.0 * spacing
    column = (np.floor(positions[:, 0] / cell).astype(np.int64) * 100000
              + np.floor(positions[:, 1] / cell).astype(np.int64))
    order = np.argsort(column)
    starts = np.flatnonzero(np.r_[True, np.diff(column[order]) != 0])
    top = np.maximum.reduceat(positions[order, 2], starts)
    topOf = np.empty(len(positions))
    topOf[order] = np.repeat(top, np.diff(np.r_[starts, len(order)]))
    return (positions[:, 2] > topOf - 3.0 * spacing) & (positions[:, 0] > xLimits[0]) & (positions[:, 0] < xLimits[1])

def drawFrame(data: dict, frame: dict, colormap) -> np.ndarray:
    '''
    One frame as an RGB array, in depths: the SPH water's free surface behind the peel, every
    second plane's potential-flow surface ahead of it.
    '''
    import matplotlib.pyplot as plt

    d = data['depth']
    s, lag, shear = data['spacing'] / d, data['planeLag'], data['shear']
    positions = frame['positions'].astype(float) / d
    positions[:, 2] -= 1.0
    keep = surfaceOf(positions, s)
    points, speeds = positions[keep], frame['speeds'][keep] / data['incidentSpeed']

    # Grid, tick and label colors are read from the rc parameters when the axes are made
    style = {'figure.facecolor': ground, 'axes.facecolor': ground, 'axes.edgecolor': grid, 'grid.color': grid,
             'text.color': ink, 'axes.labelcolor': ink, 'xtick.color': ink, 'ytick.color': ink}
    with plt.rc_context(style):
        figure = plt.figure(figsize=(widthPx / dpi, heightPx / dpi), dpi=dpi)
        axis = figure.add_axes([0.04, -0.03, 0.96, 1.16], projection='3d')
    for side in (axis.xaxis, axis.yaxis, axis.zaxis):
        side.set_pane_color(pane)
        side.line.set_color(grid)
    axis.scatter(points[:, 0], points[:, 1], points[:, 2], c=speeds, s=0.35, cmap=colormap, vmin=0.0, vmax=2.0,
                 linewidths=0, depthshade=False)
    for k in range(frame['activePlanes'], data['planes'], 2):
        j = int(round(k - frame['time'] / lag))
        if j not in data['surfaces']:
            continue
        surface = data['surfaces'][j] / d
        y = (k + 0.5) * s
        x = surface[:, 0] + shear * y
        inside = (x > xLimits[0]) & (x < xLimits[1])
        axis.plot(x[inside], np.full(int(inside.sum()), y), surface[inside, 1] - 1.0, color=planeLines, linewidth=0.6,
                  alpha=0.5)
    span = data['planes'] * s
    axis.set_xlim(*xLimits)
    axis.set_ylim(0.0, span)
    axis.set_zlim(*zLimits)
    # One scale on all three axes
    axis.set_box_aspect((xLimits[1] - xLimits[0], span, zLimits[1] - zLimits[0]), zoom=zoom)
    axis.view_init(elev=elevation, azim=azimuth)
    axis.set_xlabel('x / h, toward shore')
    axis.set_ylabel('y / h, along the crest')
    # From this side the z label would otherwise read upside down
    axis.zaxis.set_rotate_label(False)
    axis.set_zlabel('z / h', rotation=90, labelpad=2)
    axis.set_zticks([0.0, 0.5])
    figure.canvas.draw()
    image = np.array(figure.canvas.buffer_rgba())[:, :, :3]
    plt.close(figure)
    return image

def main() -> None:
    import imageio_ffmpeg
    import matplotlib
    matplotlib.use('Agg')
    from matplotlib.colors import LinearSegmentedColormap
    from PIL import Image

    data = runPeeling()
    importPySurf()
    from pysurf import constants
    from pysurf.waveTheory import exactSolitaryWaveSpeed

    frames, d, g = data['frames'], data['depth'], constants.gravity
    colormap = LinearSegmentedColormap.from_list('peelingWater', list(waterStops))
    scale = math.sqrt(d / g)

    # A lower CRF than the splash-up's 27 keeps the one-pixel particles and plane lines sharp; at 9
    # frames per second on a still ground the file stays small
    videoPath.parent.mkdir(parents=True, exist_ok=True)
    writer = imageio_ffmpeg.write_frames(
        str(videoPath), (widthPx, heightPx), fps=fps, codec='libx264', quality=None, macro_block_size=8,
        output_params=['-crf', '22', '-preset', 'slow', '-movflags', '+faststart'])
    writer.send(None)
    for index, frame in enumerate(frames):
        image = drawFrame(data, frame, colormap)
        writer.send(np.ascontiguousarray(image))
        print(f'frame {index + 1}/{len(frames)}', flush=True)
    for _ in range(round(holdSeconds * fps)):
        writer.send(np.ascontiguousarray(image))
    writer.close()

    # Poster: the jet landing in the newest planes, the tube still open ahead of them and the
    # splash behind; also the still under reduced motion
    ages = np.array([frame['time'] for frame in frames]) / scale
    poster = int(np.argmin(np.abs(ages - posterAge)))
    Image.fromarray(drawFrame(data, frames[poster], colormap)).save(posterPath, 'WEBP', quality=82)

    duration = frames[-1]['time'] - frames[0]['time']
    facts = {
        'particlesPerDepth': particlesPerDepth,
        'obliqueAngle': obliqueAngle,
        'planes': int(frames[-1]['activePlanes']),
        'fluidParticles': int(len(frames[-1]['positions'])),
        'spanOverDepth': round(data['planes'] * data['spacing'] / d, 2),
        'durationOverScale': round(duration / scale, 2),
        'slowMotion': round((len(frames) / fps) / duration, 1),
        'incidentSpeedError': round(data['incidentSpeed'] / exactSolitaryWaveSpeed(data['waveHeight'], d, g) - 1.0, 5),
        'peelSpeedOverRootGh': round(data['peelSpeed'] / math.sqrt(g * d), 2),
        'posterTimeOverScale': round(float(ages[poster]), 2),
        'checks': checks,
    }
    factsPath.write_text(json.dumps(facts, indent=2) + '\n', encoding='utf-8')
    print(f'wrote {videoPath.name} ({videoPath.stat().st_size / 1e3:.0f} kB), {posterPath.name} '
          f'({posterPath.stat().st_size / 1e3:.0f} kB) and {factsPath.name}')
    print(json.dumps(facts, indent=2))

if __name__ == '__main__':
    main()
