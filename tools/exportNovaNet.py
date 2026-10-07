'''
Export NOVA's method-of-characteristics net for the portfolio's home-page hero.

NOVA's truncated ideal contour comes from an axisymmetric method-of-characteristics solve, and
the Nozzle keeps the net it solved: the expansion kernel downstream of the throat and the
flow-straightening block that turns the flow axial (`expansionKernelX/R`,
`flowStraighteningX/R`, both normalized by the throat radius). Each row and each column of a
block is one characteristic. This script reads those blocks off the worked example, keeps every
second characteristic of each family, clips them to the delivered nozzle (the straightening
block runs on past the truncated exit to the untruncated ideal's end), simplifies them, and
writes them with the wall contour to src/data/heroNet.json. Each line carries t, the axial
position of its upstream end as a fraction of the nozzle length, so the hero can draw the net
in the order the solve marched it.

The script computes nothing physical; the net carries the validation status of the NOVA worked
example (NOVA docs/NozzleContourValidation.md). Its checks are on the export: the wall's exit
radius against the delivered area ratio, and every line inside the wall.

Usage (from githubPagesSite/, NOVA checked out beside it):
    python tools/exportNovaNet.py            solve the worked example (about two minutes)
    python tools/exportNovaNet.py --pickled  reuse the nozzle the last solve pickled

Author: Sean Bowman
Date:   10/07/2026
'''

import json
import sys

import numpy as np

from novaCase import loadPickledRun, readOption, runWorkedExample, siteRoot

netPath = siteRoot / 'src' / 'data' / 'heroNet.json'
lineStride = 2                 # keep every second characteristic of each family
simplifyTolerance = 0.004      # [-] Douglas-Peucker tolerance, throat radii
minimumLineLength = 0.05       # [-] shorter clipped fragments are dropped
convergingLength = 2.5         # [-] wall kept upstream of the throat
wallTolerance = 1e-3           # [-] how far outside the wall a node may sit before clipping

def blockLines(xBlock: np.ndarray, rBlock: np.ndarray) -> list:
    '''
    Every row and every column of a mesh block as polylines, ordered upstream to downstream.

    Nodes the solve never reached are left at zero (or NaN) in NOVA's arrays; a polyline is
    split wherever one appears.

    Parameters:
    -----------
    xBlock, rBlock : np.ndarray
        Node coordinates of one block, throat radii

    Returns:
    --------
    list of np.ndarray
        Polylines, each of shape (n, 2)
    '''
    xBlock, rBlock = np.asarray(xBlock, dtype=float), np.asarray(rBlock, dtype=float)
    reached = np.isfinite(xBlock) & np.isfinite(rBlock) & ~((xBlock == 0) & (rBlock == 0))
    lines = []
    for axis in (0, 1):
        count = xBlock.shape[axis]
        for index in range(0, count, lineStride):
            x = xBlock[index] if axis == 0 else xBlock[:, index]
            r = rBlock[index] if axis == 0 else rBlock[:, index]
            keep = reached[index] if axis == 0 else reached[:, index]
            run = []
            for xi, ri, ok in zip(x, r, keep):
                if ok:
                    run.append((xi, ri))
                elif len(run) > 1:
                    lines.append(np.array(run))
                    run = []
                else:
                    run = []
            if len(run) > 1:
                lines.append(np.array(run))
    # Characteristics run downstream in a supersonic nozzle; orient each one that way
    return [line if line[-1, 0] >= line[0, 0] else line[::-1] for line in lines]

def clipToNozzle(line: np.ndarray, inside) -> list:
    '''
    The parts of a polyline inside the nozzle, with the crossing points found by bisection.

    Parameters:
    -----------
    line : np.ndarray
        Polyline, shape (n, 2)
    inside : callable
        inside(x, r) -> bool

    Returns:
    --------
    list of np.ndarray
    '''
    def crossing(a: np.ndarray, b: np.ndarray) -> np.ndarray:
        # a is inside, b is not
        for _ in range(40):
            middle = 0.5 * (a + b)
            if inside(*middle):
                a = middle
            else:
                b = middle
        return a
    pieces, run = [], []
    for k, point in enumerate(line):
        if inside(*point):
            if not run and k > 0:
                run.append(crossing(point, line[k - 1]))
            run.append(point)
        elif run:
            run.append(crossing(line[k - 1], point))
            pieces.append(np.array(run))
            run = []
    if len(run) > 1:
        pieces.append(np.array(run))
    return pieces

def simplify(line: np.ndarray, tolerance: float) -> np.ndarray:
    '''
    Douglas-Peucker simplification.

    Parameters:
    -----------
    line : np.ndarray
        Polyline, shape (n, 2)
    tolerance : float
        Largest perpendicular distance a dropped point may lie from the kept chord

    Returns:
    --------
    np.ndarray
    '''
    keep = np.zeros(len(line), dtype=bool)
    keep[[0, -1]] = True
    stack = [(0, len(line) - 1)]
    while stack:
        first, last = stack.pop()
        if last - first < 2:
            continue
        chord = line[last] - line[first]
        length = np.hypot(*chord)
        offsets = line[first + 1:last] - line[first]
        if length > 0:
            distance = np.abs(chord[0] * offsets[:, 1] - chord[1] * offsets[:, 0]) / length
        else:
            distance = np.hypot(offsets[:, 0], offsets[:, 1])
        worst = int(np.argmax(distance))
        if distance[worst] > tolerance:
            split = first + 1 + worst
            keep[split] = True
            stack.extend([(first, split), (split, last)])
    return line[keep]

def flat(line: np.ndarray) -> list:
    '''x0, r0, x1, r1, ... rounded to 1e-3 throat radii'''
    return [round(float(value), 3) for value in line.reshape(-1)]

def main() -> None:
    nozzle, config = loadPickledRun() if '--pickled' in sys.argv else runWorkedExample()

    throatRadius = float(nozzle.nozzleScalingFactor)  # [m]
    wallX = np.asarray(nozzle.xNozzleWall, dtype=float) / throatRadius
    wallR = np.asarray(nozzle.rNozzleWall, dtype=float) / throatRadius
    divergingX = np.asarray(nozzle.xNozzleWallDivergingNonDimensional, dtype=float)
    divergingR = np.asarray(nozzle.rNozzleWallDivergingNonDimensional, dtype=float)
    exitX, exitR = float(wallX[-1]), float(wallR[-1])

    # The net lives in the normalized frame of the diverging wall; the drawn wall is the
    # dimensional contour divided by the throat radius. They must coincide (same origin, same
    # scale), which shows as agreement along the whole diverging section.
    stations = divergingX[(divergingX > 0.5) & (divergingX < exitX)]
    wallMismatch = np.max(np.abs(np.interp(stations, wallX, wallR) / np.interp(stations, divergingX, divergingR) - 1))
    print(f'drawn wall against the net frame: largest radius difference {wallMismatch * 100:.3f}%')
    assert wallMismatch < 0.005, wallMismatch

    def inside(x: float, r: float) -> bool:
        if x < divergingX[0] or x > exitX:
            return False
        return -wallTolerance <= r <= np.interp(x, divergingX, divergingR) + wallTolerance

    lines = []
    for xBlock, rBlock in ((nozzle.expansionKernelX, nozzle.expansionKernelR),
                           (nozzle.flowStraighteningX, nozzle.flowStraighteningR)):
        for line in blockLines(xBlock, rBlock):
            for piece in clipToNozzle(line, inside):
                if np.sum(np.hypot(*np.diff(piece, axis=0).T)) < minimumLineLength:
                    continue
                piece = simplify(piece, simplifyTolerance)
                slope = (piece[-1, 1] - piece[0, 1]) / max(piece[-1, 0] - piece[0, 0], 1e-9)
                lines.append({
                    't': round(float(piece[0, 0]) / exitX, 3),
                    # Left-running (C+) characteristics climb toward the wall, right-running (C-) fall toward the axis
                    'family': '+' if slope > 0 else '-',
                    'points': flat(piece)
                })
    lines.sort(key=lambda line: line['t'])

    keepWall = wallX >= -convergingLength
    net = {
        'case': {
            'thrustKn': round(readOption(config, 'thrust') / 1e3),
            'propellants': f"{readOption(config, 'Oxidizer')}/{readOption(config, 'Fuel')}",
            'expansionRatio': readOption(config, 'expansionRatio'),
            'characteristics': int(nozzle.numCharacteristics),
            'lineStride': lineStride,
            'throatRadiusMm': round(throatRadius * 1e3, 1)
        },
        'exitX': round(exitX, 3),
        'exitR': round(exitR, 3),
        'wall': flat(np.column_stack([wallX[keepWall], wallR[keepWall]])),
        'lines': lines
    }
    netPath.write_text(json.dumps(net, separators=(',', ':')) + '\n', encoding='utf-8')

    # Export checks: the exit radius follows from the delivered area ratio, and nothing was
    # left outside the wall
    areaRatio = exitR ** 2
    points = np.concatenate([np.reshape(line['points'], (-1, 2)) for line in lines])
    # Rounding to 1e-3 can move a clipped end just past the exit plane or the wall
    outside = sum(x > exitX + 1e-3 or r > np.interp(x, divergingX, divergingR) + 2e-3 or r < -1e-3 for x, r in points)
    print(f'{len(lines)} lines, {len(points)} points, {netPath.stat().st_size / 1e3:.1f} kB')
    print(f'exit at x = {exitX:.3f}, r = {exitR:.3f} throat radii: area ratio {areaRatio:.2f} '
          f'(requested {readOption(config, "expansionRatio")}, solve delivered {getattr(nozzle, "deliveredAreaRatio", float("nan"))})')
    print(f'points outside the wall after rounding: {outside}')

if __name__ == '__main__':
    main()
