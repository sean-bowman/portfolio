'''
Export the pySurf default thruster for the portfolio Showcase.

Builds the board pySurf's README describes and ships as assets/surfboard/generatedThruster.stl: a
6'0" x 20" x 2.5" thruster with a pointed nose, round tail and aggressive rocker. The card's
numbers come from that board at its README resolution, 240 stations and 33 points per contour. The
model drawn in the browser is the same board at 160 stations and 21 points per contour: about 25k
triangles rather than 61k, since every orbit frame draws it, and with smooth normals the two look
alike at card size. pySurf's own exportGeometry writes the closed surface; this script reads that
STL back, scales it to meters and adds a line drawing from the same section data for the viewer's
lines mode: the rail line, the deck and bottom centerlines (the two rockers), and cross sections at
evenly spaced stations.

The geometry is pySurf's output and this script computes nothing physical. The board is not
validated: its planform and rocker are matched by eye to photographs of a reference thruster, and
its cross sections are calibrated to the sections of that board's STL (pySurf README, "Surfboard
Geometry"); the card says so.

Usage (from githubPagesSite/, with pySurf checked out beside it and Node on the path):
    python tools/exportPySurfBoard.py
The script compresses the model with gltf-transform (meshopt) and writes
public/assets/models/pySurfThruster.glb and src/data/pySurfBoardFacts.json.

Author: Sean Bowman
Date:   10/29/2026
'''

import json
import os
import subprocess

import numpy as np
import trimesh

from pySurfCase import importPySurf, siteRoot, workDir

factsPath = siteRoot / 'src' / 'data' / 'pySurfBoardFacts.json'
modelPath = siteRoot / 'public' / 'assets' / 'models' / 'pySurfThruster.glb'
feetToMeters = 0.3048
sectionCount = 13

def polylineSegments(points: np.ndarray) -> np.ndarray:
    '''
    Segments joining consecutive points of a polyline.

    Parameters:
    -----------
    points : np.ndarray
        Polyline points, shape (n, 3)

    Returns:
    --------
    np.ndarray
        Segments, shape (n - 1, 2, 3)
    '''
    return np.stack([points[:-1], points[1:]], axis=1)

def buildBoard(stations: int, pointsPerContour: int):
    '''
    The README's board at a given resolution, with its surface written by pySurf and read back.

    Parameters:
    -----------
    stations : int
        Axial stations
    pointsPerContour : int
        Points on each deck and bottom contour

    Returns:
    --------
    tuple
        (Surfboard, trimesh.Trimesh in meters)
    '''
    from pysurf import Surfboard

    board = Surfboard(totalLength=6.0, maxWidth=20.0, midpointThickness=2.5,
                      noseShape='point', tailShape='round', rockerProfile='aggressive')
    board.resolution = stations
    board.numCrossSectionPoints = pointsPerContour
    board.plotsEnabled = False
    board.generateGeometry()
    workDir.mkdir(parents=True, exist_ok=True)
    stlPath = board.exportGeometry(str(workDir / f'thruster{stations}.stl'), units='mm')
    surface = trimesh.load_mesh(stlPath)
    surface.apply_scale(1e-3)
    surface.merge_vertices()
    return board, surface

def main() -> None:
    importPySurf()

    # The README's board, at the counts generatedThruster.stl was written with, for the card's
    # numbers; and the same board, lighter, for the browser
    readmeBoard, readmeSurface = buildBoard(240, 33)
    board, surface = buildBoard(160, 21)
    print(f'surface: {len(surface.faces)} faces drawn ({len(readmeSurface.faces)} at the README resolution); '
          f'volumes {readmeSurface.volume * 1e3:.2f} and {surface.volume * 1e3:.2f} L')

    # Line drawing from the section data, in meters: board length along x, width along y,
    # thickness along z (pySurf's frame)
    data = board.geometryData
    deckX, deckY, deckZ = (np.asarray(data[key]) * feetToMeters for key in ('deckX', 'deckY', 'deckZ'))
    bottomY, bottomZ = (np.asarray(data[key]) * feetToMeters for key in ('bottomY', 'bottomZ'))
    lines = []
    for side in (1.0, -1.0):
        rail = np.column_stack([deckX[:, -1], side * deckY[:, -1], deckZ[:, -1]])
        lines.append(polylineSegments(rail))
    lines.append(polylineSegments(np.column_stack([deckX[:, 0], np.zeros(len(deckX)), deckZ[:, 0]])))
    lines.append(polylineSegments(np.column_stack([deckX[:, 0], np.zeros(len(deckX)), bottomZ[:, 0]])))
    stations = np.unique(np.round(np.linspace(0, len(deckX) - 1, sectionCount + 2)[1:-1]).astype(int))
    for station in stations:
        # One loop: right deck from the centerline to the rail, right bottom back to the
        # centerline, then the left half the other way round
        y = np.concatenate([deckY[station], bottomY[station, ::-1], -bottomY[station], -deckY[station, ::-1]])
        z = np.concatenate([deckZ[station], bottomZ[station, ::-1], bottomZ[station], deckZ[station, ::-1]])
        lines.append(polylineSegments(np.column_stack([np.full(len(y), deckX[station, 0]), y, z])))
    lineSegments = np.concatenate(lines)
    print(f'drawing: {len(lineSegments)} segments, {len(stations)} sections')

    scene = trimesh.Scene()
    scene.add_geometry(surface, node_name='board', geom_name='board')
    scene.add_geometry(trimesh.load_path(lineSegments), node_name='boardLines', geom_name='boardLines')
    rawGlbPath = workDir / 'pySurfThruster.glb'
    scene.export(str(rawGlbPath))
    subprocess.run(
        f'npx -y @gltf-transform/cli@4 optimize "{rawGlbPath}" "{modelPath}" '
        '--compress meshopt --join false --simplify false',
        shell=True, check=True, cwd=siteRoot
    )

    # Card numbers: the board's inputs as a shaper states them, and what the README-resolution
    # surface measures
    readme = readmeBoard.geometryData
    readmeDeckZ, readmeBottomZ = (np.asarray(readme[key]) * feetToMeters for key in ('deckZ', 'bottomZ'))
    bottomCenter = readmeBottomZ[:, 0]
    volumeLiters = float(readmeSurface.volume) * 1e3
    extents = readmeSurface.bounding_box.extents
    facts = {
        'lengthFtIn': f"{int(board.totalLength)}'{round((board.totalLength % 1) * 12)}\"",
        'widthIn': board.maxWidth,
        'thicknessIn': board.midpointThickness,
        'noseShape': board.noseShape,
        'tailShape': board.tailShape,
        'rockerProfile': board.rockerProfile,
        'noseRockerIn': round(float((bottomCenter[-1] - bottomCenter.min()) / 0.0254), 1),
        'tailRockerIn': round(float((bottomCenter[0] - bottomCenter.min()) / 0.0254), 1),
        'volumeLiters': round(volumeLiters, 1),
        'volumeCubicInches': round(volumeLiters / 0.016387064),
        'stations': int(readmeBoard.resolution),
        'pointsPerContour': int(readmeBoard.numCrossSectionPoints),
        'drawnStations': int(len(deckX)),
        'drawnPointsPerContour': int(deckX.shape[1]),
        'faces': int(len(surface.faces)),
        'sectionCount': int(len(stations)),
        'maxThicknessIn': round(float(np.max(readmeDeckZ[:, 0] - readmeBottomZ[:, 0]) / 0.0254), 2),
        'overallLengthMm': round(float(extents[0]) * 1e3),
    }
    factsPath.write_text(json.dumps(facts, indent=2) + '\n', encoding='utf-8')
    print(f'wrote {modelPath.name} ({os.path.getsize(modelPath) / 1e3:.0f} kB) and {factsPath.name}')
    print(json.dumps(facts, indent=2))

if __name__ == '__main__':
    main()
