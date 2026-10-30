'''
Export pySurf's Surf Ranch overturn as line-art frames for the portfolio Showcase.

The Surf Ranch soliton of Feddersen et al. (2024), a0/h0 = 0.6, shoals up a 0.0693 reef face onto
a flat 0.371 h0 deep and plunges. pySurf's boundary element model (pysurf.OverturningWave) carries
its free surface from the start to the instant the jet lands. This script takes 40 of the run's
recorded surfaces, from the crest crossing the reef face to the jet's impact, and writes them as
SVG path data for the Showcase drawing, with the bed, still water level, and the run's impact
measures beside the DNS's.

Frames are spaced evenly in a playback clock that runs the overturn (from shortly before the face
turns vertical to the impact) at a third of the speed of the shoaling, so the jet's growth takes
most of the loop. The last frame is the impact.

The surfaces are pySurf's output and this script computes nothing physical. The comparison with
the DNS is the one tests/testValidationOverturning.py makes; the card reports it as measured,
including the measure that fails (the overturn's aspect ratio).

Usage (from githubPagesSite/, with pySurf checked out beside it):
    python tools/exportPySurfOverturn.py
It writes src/data/pySurfOverturn.json.

Author: Sean Bowman
Date:   10/29/2026
'''

import json

import numpy as np

from pySurfCase import siteRoot, surfRanchWave

outputPath = siteRoot / 'src' / 'data' / 'pySurfOverturn.json'
frameCount = 40
windowX = (35.0, 43.0)          # [h0], the reef face to past the impact
windowZ = (0.3, 1.85)           # [h0], below the flat to above the crest
units = 200                     # drawing units per h0
simplifyTolerance = 0.003       # [h0], Douglas-Peucker
slowMotion = 3.0                # the overturn plays at this fraction of the shoaling's speed

# Feddersen et al. (2024), zero wind, at jet impact; jet area and angle as Pick and Feddersen
# (2026) quote them. The values pySurf's validation test compares with, as published.
dnsText = {
    'impactX': '42.05',
    'impactHeightOverDepth': '0.64',
    'overturnAreaOverImpactHeightSquared': '0.352',
    'jetAreaOverImpactHeightSquared': '0.22',
    'overturnAspectRatio': '0.300',
    'overturnAngle': '33',
}
dns = {key: float(value) for key, value in dnsText.items()}

def simplify(points: np.ndarray, tolerance: float) -> np.ndarray:
    '''
    Douglas-Peucker simplification of a polyline, ends kept.

    Parameters:
    -----------
    points : np.ndarray
        Polyline, shape (n, 2)
    tolerance : float
        Largest distance a dropped point may lie from the simplified line

    Returns:
    --------
    np.ndarray
        The kept points, in order
    '''
    keep = np.zeros(len(points), dtype=bool)
    keep[[0, -1]] = True
    stack = [(0, len(points) - 1)]
    while stack:
        first, last = stack.pop()
        if last - first < 2:
            continue
        start, end = points[first], points[last]
        chord = end - start
        length = np.hypot(*chord)
        middle = points[first + 1:last] - start
        if length > 0.0:
            distance = np.abs(chord[0] * middle[:, 1] - chord[1] * middle[:, 0]) / length
        else:
            distance = np.hypot(middle[:, 0], middle[:, 1])
        index = int(np.argmax(distance))
        if distance[index] > tolerance:
            split = first + 1 + index
            keep[split] = True
            stack.extend([(first, split), (split, last)])
    return points[keep]

def toDrawing(points: np.ndarray) -> np.ndarray:
    '''Data coordinates [h0] to integer drawing units, z flipped so up is up on screen.'''
    x = np.round((points[:, 0] - windowX[0]) * units)
    y = np.round((windowZ[1] - points[:, 1]) * units)
    return np.column_stack([x, y]).astype(int)

def pathData(points: np.ndarray) -> str:
    '''An SVG path: one absolute move, then relative line-to pairs, repeats dropped.'''
    drawn = toDrawing(points)
    steps = np.diff(drawn, axis=0)
    steps = steps[np.any(steps != 0, axis=1)]
    relative = ''.join(f'{dx} {dy} '.replace(' -', '-') for dx, dy in steps).strip()
    return f'M{drawn[0, 0]} {drawn[0, 1]}l{relative}'

def windowed(surface: np.ndarray, margin: float = 0.3) -> np.ndarray:
    '''The stretch of the surface from where it enters the window to where it last leaves it.'''
    inside = np.flatnonzero((surface[:, 0] >= windowX[0] - margin) & (surface[:, 0] <= windowX[1] + margin))
    return surface[inside[0]:inside[-1] + 1]

def main() -> None:
    wave = surfRanchWave()
    frames = [frame for frame in wave.frames if frame.surface is not None]
    times = np.array([frame.time for frame in frames])
    crestX = np.array([np.asarray(frame.surface)[np.argmax(np.asarray(frame.surface)[:, 1]), 0] for frame in frames])
    breakingTime, impactTime = wave.breakingPoint.time, wave.solver.time

    # Playback clock: real time until 0.15 s before the face turns vertical, a third of it after
    slowStart = breakingTime - 0.15
    playback = np.where(times < slowStart, times, slowStart + (times - slowStart) * slowMotion)
    startIndex = int(np.argmax(crestX >= windowX[0] + 1.0))
    targets = np.linspace(playback[startIndex], playback[-1], frameCount)
    chosen = []
    for target in targets:
        index = int(np.argmin(np.abs(playback - target)))
        if not chosen or index > chosen[-1]:
            chosen.append(index)
    # The last frame is the impact itself: the run's final surface
    surfaces = [np.asarray(frames[index].surface) for index in chosen[:-1]] + [np.asarray(wave.solver.surface)]
    frameTimes = [float(times[index]) for index in chosen[:-1]] + [float(impactTime)]

    paths = [pathData(simplify(windowed(surface), simplifyTolerance)) for surface in surfaces]
    bedX = np.linspace(windowX[0], windowX[1], 200)
    bed = np.column_stack([bedX, wave.bathymetry.elevation(bedX)])
    bedPath = pathData(simplify(bed, 1e-4))

    summary = wave.summary()
    comparison = []
    for key, label, unit in (('overturnAreaOverImpactHeightSquared', 'Overturn area', ''),
                             ('impactHeightOverDepth', 'Height at impact', ''),
                             ('overturnAngle', 'Overturn angle', 'deg'),
                             ('jetAreaOverImpactHeightSquared', 'Jet area', ''),
                             ('overturnAspectRatio', 'Overturn aspect ratio', '')):
        model, reference = float(summary[key]), dns[key]
        # An angle is compared in degrees, as the validation test compares it; the rest as ratios
        row = {'key': key, 'label': label, 'unit': unit, 'model': round(model, 3), 'dns': reference,
               'dnsText': dnsText[key]}
        if unit == 'deg':
            row['difference'] = round(model - reference, 2)
        else:
            row['error'] = round(model / reference - 1.0, 4)
        comparison.append(row)

    data = {
        'viewBox': [0, 0, round((windowX[1] - windowX[0]) * units), round((windowZ[1] - windowZ[0]) * units)],
        'unitsPerDepth': units,
        'stillWaterY': round((windowZ[1] - 1.0) * units),
        'bed': bedPath,
        'frames': paths,
        'frameTimes': [round(time, 4) for time in frameTimes],
        'breakingTime': round(float(breakingTime), 3),
        'impactTime': round(float(impactTime), 3),
        'impactX': round(float(summary['impactX']), 2),
        'dnsImpactX': dns['impactX'],
        'waveHeightOverDepth': float(wave.waveHeight / wave.depth),
        'comparison': comparison,
    }
    text = json.dumps(data, separators=(',', ':'))
    outputPath.write_text(text + '\n', encoding='utf-8')
    print(f'wrote {outputPath.name}: {len(paths)} frames, {len(text) / 1e3:.1f} kB, '
          f'{frameTimes[0]:.3f} to {frameTimes[-1]:.3f} s (breaking {breakingTime:.3f} s)')
    for row in comparison:
        change = f"{row['difference']:+.1f} deg" if 'difference' in row else f"{100 * row['error']:+.1f}%"
        print(f"  {row['label']:24s} model {row['model']:7.3f}  DNS {row['dns']:7.3f}  {change}")

if __name__ == '__main__':
    main()
