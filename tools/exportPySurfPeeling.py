'''
Export pySurf's peeling breaker as two short videos for the portfolio Showcase: along an oblique
reef, and both ways off a triangular one.

Runs pySurf's PeelingWave on the Surf Ranch reef with its depth contours turned to 30 degrees from
the incident crest, the case of the pySurf README's peeling-breaker GIFs: the exact solitary wave
of a0/h0 = 0.6 (pySurfCase.surfRanchWave('exact')), 32 particles per depth, 1.6 sqrt(h0 / g) from
the first plane's impact in 40 recorded intervals. Every cross-section of that reef sees the 2D
overturn delayed by its distance along the crest, so SPH planes join one at a time as their own
jets land. Ahead of them the drawing shows every plane still in the potential flow, at its own
phase, as one shaded sheet; one restart of the overturn records those surfaces and the stacked
flow's speed on them, strip theory's spanwise velocity included.

The run's free-slip wall at y = 0 is the symmetry plane of a triangular reef, z_b = f(x - |y|
tan(alpha)), on which the wave reaches the apex first and peels both ways: for flow that stays
symmetric, the run is that reef's half y > 0, and its mirror image the other half.

Both videos draw every particle and the sheet at true scale, colored by speed from deep blue at
rest to white at twice the wave speed on the site's night-ocean ground, with the water cut at the
end of the first plane's SPH window down to the reef flat. The oblique reef is seen from low on
the shoreward side, ahead of the peel, looking back along the crest into the tube; the triangular
reef head on from the shore. The frames are encoded as H.264 MP4s with WebP posters.

The flow is pySurf's output and this script computes nothing physical beyond what it reports from
the run (the incident wave's speed, the peel speed, the particle count) and the surface speeds it
colors the sheet with. Neither case is validated: no measurement or 3D simulation of a solitary
wave peeling along an oblique or triangular reef was found. The checks the cards quote are pySurf's
consistency checks of the construction (tests/testValidationPeelingWave.py). Strip theory's
spanwise velocity is 70 percent high against Guyenne and Grilli's (2006) 3D ridge
(tests/testValidationRidgeOverturn.py) and least accurate at the apex.

Usage (from githubPagesSite/, with pySurf checked out beside it and numba installed):
    python tools/exportPySurfPeeling.py
The exact-start overturn takes about 20 minutes, the SPH run about 70 minutes on four threads and
the restart for the planes' phases about 12; the result is pickled in the export folder, so later
runs only redraw. It writes public/assets/video/pySurfPeeling.mp4 and .webp,
public/assets/video/pySurfAFrame.mp4 and .webp, and src/data/pySurfPeelingFacts.json.

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

videoDir = siteRoot / 'public' / 'assets' / 'video'
factsPath = siteRoot / 'src' / 'data' / 'pySurfPeelingFacts.json'
runCache = workDir / 'peelingRun.pkl'

particlesPerDepth = 32
obliqueAngle = 30.0             # [deg], the reef's depth contours against the incident crest
widthPx, heightPx, dpi = 960, 400, 100
offshoreX = 41.0                # [h0], the window's offshore edge: the first impact is at 42.4
zLimits = (-0.45, 0.95)         # [h0], from the still water level
# Along the cut the bed is the reef flat, 0.371 h0 below still water: x - |y| tan(alpha) runs from
# 44.3 to 46.4 h0 there, and the flat starts at 39.1
reefFlat = -0.371
samples = 160                   # points along each potential-flow plane's surface
fps = 9
holdSeconds = 1.5               # the last frame held before the loop restarts
posterAge = 1.0                 # [sqrt(h0 / g)], the posters' time after the first impact

# The two cameras. Oblique: low, shoreward and ahead of the peel, into the tube. Triangular: head
# on from the shore, where each plane of particles projects to one column, so wider markers
views = {
    'pySurfPeeling': {'mirrored': False, 'elevation': 10.0, 'azimuth': 55.0, 'zoom': 1.55,
                      'axesRect': [0.04, -0.03, 0.96, 1.16], 'markerSize': 2.5},
    'pySurfAFrame': {'mirrored': True, 'elevation': 10.0, 'azimuth': 0.0, 'zoom': 1.95,
                     'axesRect': [0.08, 0.03, 0.92, 1.08], 'markerSize': 3.5},
}

# Night-ocean ground (the site's dark --bg and --text-muted); water deep blue at rest to white at
# twice the wave speed
ground, pane, grid, ink = '#16232A', '#1B2B33', '#2E4550', '#9FB3AE'
waterStops = ('#1D4F91', '#2E7BC6', '#7FB8E8', '#FFFFFF')

# pySurf's consistency checks of the construction (tests/testValidationPeelingWave.py and the
# README's peeling-breaker table): the spread of the newest half of the planes' energies at four
# ages after their impact, with and without spanwise velocity; their median against the 2D
# splash-up with strip theory's spanwise velocity, to 0.8 sqrt(h0 / g) and at 1.2; the 5 percent
# criterion; the spanwise velocity's error on Guyenne and Grilli's ridge; and the oldest planes'
# energy beside the wall at y = 0, the triangular reef's apex, with the spanwise velocity and
# without it
checks = {
    'steadyAges': [0.25, 0.5, 0.8, 1.2],
    'steadySpread': [0.006, 0.008, 0.012, 0.017],
    'twoDimensionalTo08': 0.001,
    'twoDimensionalAt12': 0.012,
    'criterion': 0.05,
    'spanwiseRidgeError': 0.70,
    'apexGainWithSpanwise': 0.095,
    'apexLossWithout': 0.011,
}

def runPeeling() -> dict:
    '''
    The peeling breaker's frames, each plane's free surface and its speed at the plane's phase,
    and the numbers the drawing and the cards need, from the cache when present.

    Returns:
    --------
    dict
        frames (time, positions, speeds, activePlanes), surfaces and surfaceSpeeds (plane lag
        index to surface and speed), spacing, planes, plane lag, shear, the first plane's SPH
        window end, incident and peel speeds, wave height and depth
    '''
    if runCache.exists():
        return pickle.loads(runCache.read_bytes())

    wave = surfRanchWave('exact')
    from pysurf.bemSolver import FlowField
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
    solver, g = restart.solver, restart.solver.config.gravity
    surfaces, surfaceSpeeds = {}, {}
    for j, phase in enumerate(phases):
        frame = restart.frameAt(phase - start.time)
        if frame is None:
            continue
        # The stacked flow on the surface: the 2D (u, w) and strip theory's
        # v = -tan(alpha) (u + phi_t / c), with phi_t = -g eta - |u|^2 / 2 on the free surface
        flow = FlowField(frame.surface, frame.potential, solver.bed, solver.config.surfaceSpacing,
                         solver.stillWaterLevel, g)
        u = flow.surfaceVelocity
        rate = -g * (frame.surface[:, 1] - solver.stillWaterLevel) - 0.5 * np.sum(u**2, axis=1)
        v = -peel.shear * (u[:, 0] + rate / peel.incidentSpeed)
        surfaces[j] = frame.surface.copy()
        surfaceSpeeds[j] = np.sqrt(np.sum(u**2, axis=1) + v**2)

    data = {
        'frames': [{'time': frame.time, 'positions': frame.positions, 'speeds': frame.speeds,
                    'activePlanes': frame.activePlanes} for frame in peel.frames],
        'surfaces': surfaces,
        'surfaceSpeeds': surfaceSpeeds,
        'spacing': peel.spacing,
        'planes': planes,
        'planeLag': lag,
        'shear': peel.shear,
        'windowEnd': peel.window.endX,
        'incidentSpeed': peel.incidentSpeed,
        'peelSpeed': peel.peelSpeed,
        'waveHeight': wave.waveHeight,
        'depth': wave.depth,
    }
    workDir.mkdir(parents=True, exist_ok=True)
    runCache.write_bytes(pickle.dumps(data))
    return data

def planeRow(surface: np.ndarray, speed: np.ndarray, shift: float,
             limits: tuple[float, float]) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    '''
    One plane's surface between x limits, shifted along x, resampled evenly in arc length, so
    neighboring planes' points line up into a sheet.
    '''
    x = surface[:, 0] + shift
    inside = np.flatnonzero((x > limits[0]) & (x < limits[1]))
    piece = slice(inside[0], inside[-1] + 1)
    x, z, speed = x[piece], surface[piece, 1] - 1.0, speed[piece]
    arc = np.r_[0.0, np.cumsum(np.hypot(np.diff(x), np.diff(z)))]
    even = np.linspace(0.0, arc[-1], samples)
    return np.interp(even, arc, x), np.interp(even, arc, z), np.interp(even, arc, speed)

def drawFrame(data: dict, frame: dict, view: dict, colormap, light) -> np.ndarray:
    '''
    One frame as an RGB array, in depths: every particle of the SPH water, and every plane still
    in the potential flow as one shaded sheet, the water cut at the first plane's window end. With
    `mirrored` the run is drawn with its mirror image in y, the triangular reef.
    '''
    import matplotlib.pyplot as plt

    d = data['depth']
    s, lag, shear = data['spacing'] / d, data['planeLag'], data['shear']
    span = data['planes'] * s
    limits = (offshoreX, data['windowEnd'] / d)
    mirrored = view['mirrored']
    positions = frame['positions'].astype(float) / d
    positions[:, 2] -= 1.0
    keep = (positions[:, 0] > limits[0]) & (positions[:, 0] < limits[1])
    points, speeds = positions[keep], frame['speeds'][keep] / data['incidentSpeed']
    if mirrored:
        points = np.vstack([points, points * [1.0, -1.0, 1.0]])
        speeds = np.r_[speeds, speeds]

    # Grid, tick and label colors are read from the rc parameters when the axes are made
    style = {'figure.facecolor': ground, 'axes.facecolor': ground, 'axes.edgecolor': grid, 'grid.color': grid,
             'text.color': ink, 'axes.labelcolor': ink, 'xtick.color': ink, 'ytick.color': ink}
    with plt.rc_context(style):
        figure = plt.figure(figsize=(widthPx / dpi, heightPx / dpi), dpi=dpi)
        axis = figure.add_axes(view['axesRect'], projection='3d')
    for side in (axis.xaxis, axis.yaxis, axis.zaxis):
        side.set_pane_color(pane)
        side.line.set_color(grid)
    # A 3D axes keeps its active area square and clips data to it, so the zoomed box needs
    # clipping off; the depth sort hides the particles behind the visible water
    axis.scatter(points[:, 0], points[:, 1], points[:, 2], c=speeds, s=view['markerSize'], cmap=colormap, vmin=0.0,
                 vmax=2.0, linewidths=0, depthshade=False, clip_on=False)
    rows = []
    for k in range(frame['activePlanes'], data['planes']):
        j = int(round(k - frame['time'] / lag))
        if j in data['surfaces']:
            y = (k + 0.5) * s
            speed = data['surfaceSpeeds'][j] / data['incidentSpeed']
            rows.append((y, *planeRow(data['surfaces'][j] / d, speed, shear * y, limits)))
    if len(rows) > 1:
        rowY = np.array([row[0] for row in rows])
        y = rowY[:, None] * np.ones(samples)
        x, z, sheetSpeed = (np.array([row[n] for row in rows]) for n in (1, 2, 3))
        colors = colormap(np.clip(sheetSpeed / 2.0, 0.0, 1.0))
        faceColors = colormap(np.clip(sheetSpeed[:, -1] / 2.0, 0.0, 1.0))
        cutX = np.full((2, len(rows)), limits[1])
        cutZ = np.vstack([np.full(len(rows), reefFlat), z[:, -1]])
        # A mirror image takes its rows in reverse, so its faces keep their winding and their
        # normals point out of the water, as the shading needs
        for sign in ((1, -1) if mirrored else (1,)):
            order = slice(None, None, sign)
            axis.plot_surface(x[order], sign * y[order], z[order], facecolors=colors[order], rstride=1, cstride=1,
                              linewidth=0, antialiased=False, shade=True, lightsource=light, clip_on=False)
            # The sheet's cross-section at the cut, from its surface to the reef flat
            axis.plot_surface(cutX, sign * np.vstack([rowY, rowY]), cutZ, facecolors=np.stack([faceColors, faceColors]),
                              rstride=1, cstride=1, linewidth=0, antialiased=False, shade=False, clip_on=False)
    axis.set_xlim(*limits)
    axis.set_ylim(-span if mirrored else 0.0, span)
    axis.set_zlim(*zLimits)
    # One scale on all three axes
    axis.set_box_aspect((limits[1] - limits[0], (2.0 if mirrored else 1.0) * span, zLimits[1] - zLimits[0]),
                        zoom=view['zoom'])
    axis.view_init(elev=view['elevation'], azim=view['azimuth'])
    if mirrored:
        # Head on, the x axis points at the camera and its ticks would pile up
        axis.set_xticks([])
    else:
        axis.set_xlabel('x / h, toward shore')
    axis.set_ylabel('y / h, along the crest')
    # From the shore side the z label would otherwise read upside down
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
    from matplotlib.colors import LightSource, LinearSegmentedColormap
    from PIL import Image

    data = runPeeling()
    importPySurf()
    from pysurf import constants
    from pysurf.waveTheory import exactSolitaryWaveSpeed

    frames, d, g = data['frames'], data['depth'], constants.gravity
    colormap = LinearSegmentedColormap.from_list('peelingWater', list(waterStops))
    # Light from above and the shore: level water keeps its speed color, the curl's underside darkens
    light = LightSource(azdeg=90.0, altdeg=60.0)
    scale = math.sqrt(d / g)
    ages = np.array([frame['time'] for frame in frames]) / scale
    poster = int(np.argmin(np.abs(ages - posterAge)))

    for name, view in views.items():
        # A lower CRF than the splash-up's 27 keeps the particles and the sheet's shading sharp; at
        # 9 frames per second on a still ground the files stay small
        videoPath = videoDir / f'{name}.mp4'
        videoPath.parent.mkdir(parents=True, exist_ok=True)
        writer = imageio_ffmpeg.write_frames(
            str(videoPath), (widthPx, heightPx), fps=fps, codec='libx264', quality=None, macro_block_size=8,
            output_params=['-crf', '22', '-preset', 'slow', '-movflags', '+faststart'])
        writer.send(None)
        for index, frame in enumerate(frames):
            image = drawFrame(data, frame, view, colormap, light)
            writer.send(np.ascontiguousarray(image))
            print(f'{name}: frame {index + 1}/{len(frames)}', flush=True)
        for _ in range(round(holdSeconds * fps)):
            writer.send(np.ascontiguousarray(image))
        writer.close()
        # Poster: the jet landing in the newest planes, the unbroken wave still curling ahead of
        # them and the splash behind; also the still under reduced motion
        posterPath = videoDir / f'{name}.webp'
        Image.fromarray(drawFrame(data, frames[poster], view, colormap, light)).save(posterPath, 'WEBP', quality=82)
        print(f'wrote {videoPath.name} ({videoPath.stat().st_size / 1e3:.0f} kB) and {posterPath.name} '
              f'({posterPath.stat().st_size / 1e3:.0f} kB)')

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
    print(f'wrote {factsPath.name}')
    print(json.dumps(facts, indent=2))

if __name__ == '__main__':
    main()
