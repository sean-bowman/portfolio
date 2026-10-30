'''
Export pySurf's splash-up as a short video for the portfolio Showcase.

Continues the Surf Ranch overturn (pySurfCase.surfRanchWave) through the jet's impact with
pySurf's SplashUp: the boundary element flow at the impact handed to weakly compressible SPH at 64
particles per depth, the settings of the pySurf README's splash-up GIF, run for 3 sqrt(h0 / g)
with 120 recorded frames. Each frame is drawn at true scale in a window that travels with the
breaker at 0.85 of the wave's crest speed, the speed pySurf measures the broken water's leading
edge advancing at (0.83 to 0.89), so the tube and splash stay in frame, the particles colored by speed with
pySurf's dark ocean colormap on the site's night-ocean ground, and the frames are encoded as an
H.264 MP4 with a WebP poster at the splash-up's highest point.

The flow is pySurf's output and this script computes nothing physical beyond what it reports from
the frames (the splash-up's peak). The validation it quotes is pySurf's: the energy lost in active
breaking against the DNS of Mostert and Deike (2020), a different case (H0/h0 = 0.3 on a 3 degree
beach) checked in pySurf's tests/testValidationSplashUp.py. The splash-up's shape is not validated.

Usage (from githubPagesSite/, with pySurf checked out beside it):
    python tools/exportPySurfSplash.py
The SPH run takes about an hour and is pickled in the export folder; later runs only redraw.
It writes public/assets/video/pySurfSplashUp.mp4, public/assets/video/pySurfSplashUp.webp and
src/data/pySurfSplashFacts.json.

Author: Sean Bowman
Date:   10/29/2026
'''

import json
import math
import pickle

import numpy as np

from pySurfCase import siteRoot, surfRanchWave, workDir

videoPath = siteRoot / 'public' / 'assets' / 'video' / 'pySurfSplashUp.mp4'
posterPath = siteRoot / 'public' / 'assets' / 'video' / 'pySurfSplashUp.webp'
factsPath = siteRoot / 'src' / 'data' / 'pySurfSplashFacts.json'
framesCache = workDir / 'splashFrames.pkl'

particlesPerDepth = 64
recordedFrames = 120
widthPx, heightPx, dpi = 960, 400, 100
windowDepths = 3.6              # [h0], the travelling window's width; its height follows the frame
windowLead = 2.0                # [h0], the window's left edge behind the impact point at the hand-off
panFraction = 0.85              # the window's speed over the crest speed
fps = 24
holdSeconds = 0.6               # the last frame held before the loop restarts

# Night ocean, pySurf's dark palette (the site's dark tokens)
ground, sand, stillWater = '#16232A', '#F2CE82', '#9FB3AE'
waterStops = ('#47AFA3', '#5FD4C7', '#7EDDD0', '#E8F0EC')

# pySurf's active-breaking validation, tests/testValidationSplashUp.py (Mostert and Deike 2020,
# H0/h0 = 0.3 on 3 degrees, 48 particles per depth; 64 within 1 percent)
mostert = {'shareLostModel': 0.277, 'shareLostDns': 0.31, 'rateError': -0.07, 'criterion': 0.30}

def runSplash() -> dict:
    '''
    The SPH continuation's frames and the numbers the drawing needs, from the cache when present.

    Returns:
    --------
    dict
        frames (time, positions, speeds, crestHeight), spacing, crest speed, impact x, bed
        profile, hand-off time, particle counts, wave height and depth
    '''
    if framesCache.exists():
        return pickle.loads(framesCache.read_bytes())

    wave = surfRanchWave()
    from pysurf.SplashUp import SplashUp

    scale = math.sqrt(wave.depth / 9.81)
    splash = SplashUp(wave, particlesPerDepth=particlesPerDepth, duration=3.0 * scale,
                      frameInterval=3.0 * scale / recordedFrames)
    print('Running the splash-up (SPH, about an hour)...')
    splash.run(progress=True)
    bedX = np.asarray(splash.bathymetry.x, dtype=float)
    data = {
        'frames': [{'time': frame.time, 'positions': frame.positions.astype(np.float32),
                    'speeds': frame.speeds.astype(np.float32), 'crestHeight': frame.crestHeight}
                   for frame in splash.frames],
        'spacing': splash.spacing,
        'crestSpeed': splash.crestSpeed,
        'impactX': splash.impactX,
        'bedX': bedX,
        'bedZ': np.asarray(splash.bathymetry.z, dtype=float),
        'handoffTime': splash.handoffTime,
        'fluidParticles': splash.particles.nFluid,
        'waveHeight': wave.waveHeight,
        'depth': wave.depth,
        'stopReason': splash.stopReason,
    }
    workDir.mkdir(parents=True, exist_ok=True)
    framesCache.write_bytes(pickle.dumps(data))
    return data

def main() -> None:
    import imageio_ffmpeg
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib.colors import LinearSegmentedColormap

    data = runSplash()
    frames, d, spacing = data['frames'], data['depth'], data['spacing']
    speedScale = 1.6 * math.sqrt(9.81 * d)
    colormap = LinearSegmentedColormap.from_list('splashWater', list(waterStops))
    windowHeight = windowDepths * heightPx / widthPx
    bedX, bedZ = data['bedX'], data['bedZ']
    floor = float(np.interp(data['impactX'], bedX, bedZ)) - 0.05 * d

    figure = plt.figure(figsize=(widthPx / dpi, heightPx / dpi), dpi=dpi, facecolor=ground)
    axes = figure.add_axes([0, 0, 1, 1], facecolor=ground)
    axes.set_axis_off()
    pointsPerMeter = (widthPx / windowDepths) * 72.0 / dpi
    markerArea = (0.95 * spacing * pointsPerMeter)**2
    sandX = np.linspace(bedX[0], bedX[-1], 400)
    sandZ = np.interp(sandX, bedX, bedZ)
    axes.fill_between(sandX, floor - d, sandZ, color=sand, alpha=0.16, linewidth=0)
    axes.plot(sandX, sandZ, color=sand, alpha=0.6, linewidth=1.2)
    axes.axhline(1.0 * d, color=stillWater, alpha=0.35, linewidth=0.8, linestyle=(0, (2, 4)))
    first = frames[0]
    scatter = axes.scatter(first['positions'][:, 0], first['positions'][:, 1], c=first['speeds'], s=markerArea,
                           cmap=colormap, vmin=0.0, vmax=speedScale, linewidths=0)

    def place(frame: dict) -> None:
        '''Move the particles and the travelling window to one frame.'''
        elapsed = frame['time'] - data['handoffTime']
        start = data['impactX'] - windowLead * d + panFraction * data['crestSpeed'] * elapsed
        start = float(np.clip(start, bedX[0], bedX[-1] - windowDepths * d))
        axes.set_xlim(start, start + windowDepths * d)
        axes.set_ylim(floor, floor + windowHeight * d)
        scatter.set_offsets(frame['positions'])
        scatter.set_array(frame['speeds'])

    videoPath.parent.mkdir(parents=True, exist_ok=True)
    writer = imageio_ffmpeg.write_frames(
        str(videoPath), (widthPx, heightPx), fps=fps, codec='libx264', quality=None, macro_block_size=8,
        output_params=['-crf', '27', '-preset', 'slow', '-movflags', '+faststart'])
    writer.send(None)
    for frame in frames:
        place(frame)
        figure.canvas.draw()
        image = np.asarray(figure.canvas.buffer_rgba())[:, :, :3]
        writer.send(np.ascontiguousarray(image))
    for _ in range(round(holdSeconds * fps)):
        writer.send(np.ascontiguousarray(image))
    writer.close()

    # Poster: the splash-up at its highest, which is also the still under reduced motion
    peak = int(np.argmax([frame['crestHeight'] for frame in frames[5:]])) + 5
    place(frames[peak])
    figure.savefig(posterPath, dpi=dpi, facecolor=ground, pil_kwargs={'quality': 82})
    plt.close(figure)

    scale = math.sqrt(d / 9.81)
    facts = {
        'particlesPerDepth': particlesPerDepth,
        'fluidParticles': int(data['fluidParticles']),
        'durationOverScale': round((frames[-1]['time'] - data['handoffTime']) / scale, 2),
        'slowMotion': round((len(frames) / fps) / (frames[-1]['time'] - data['handoffTime']), 1),
        'peakHeightOverWaveHeight': round(frames[peak]['crestHeight'] / data['waveHeight'], 2),
        'peakTimeOverScale': round((frames[peak]['time'] - data['handoffTime']) / scale, 2),
        'mostert': mostert,
        'stopReason': data['stopReason'],
    }
    factsPath.write_text(json.dumps(facts, indent=2) + '\n', encoding='utf-8')
    print(f'wrote {videoPath.name} ({videoPath.stat().st_size / 1e3:.0f} kB), {posterPath.name} '
          f'({posterPath.stat().st_size / 1e3:.0f} kB) and {factsPath.name}')
    print(json.dumps(facts, indent=2))

if __name__ == '__main__':
    main()
