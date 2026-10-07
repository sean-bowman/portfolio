'''
Export the NOVA worked-example nozzle for the portfolio Showcase.

Runs NOVA's shipped example configuration (src/NOVA/assets/NOVANozzle.json: 100 kN LOX/LH2
upper stage, expansion ratio 40, truncated ideal contour by method of characteristics, regen
jacket) with figures off and export on, so NOVA writes its own channel and volute STLs. The hot
wall and closeout shell exist on the nozzle only as contours; they are revolved here into
surface grids and written with NOVA's own STL writer (exports.py2cad), so every part comes out
of NOVA's code path. The parts are then assembled into one glTF binary with named nodes,
together with a line drawing (rings and meridians on the walls, section loops on the volutes)
taken from the same surface grids, and the run's sizing numbers are written beside it for the
Showcase card.

The geometry is NOVA's output and this script computes nothing physical. The numbers it
records carry the validation status of the NOVA worked example: thermochemistry checked
against NASA CEARun (tests/testCeaInterface.py), contour checked against independent
references for length, area ratio, near-wall consistency, and exit-plane mass balance
(NOVA README, "Contour families and verification").

Usage (from githubPagesSite/, with NOVA checked out beside it and Node on the path):
    python tools/exportNovaNozzle.py
The script compresses the model for the web with gltf-transform (meshopt) and writes
public/assets/models/novaNozzle.glb and src/data/novaNozzleFacts.json.

Author: Sean Bowman
Date:   10/07/2026
'''

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import trimesh

siteRoot = Path(__file__).resolve().parents[1]
novaRoot = siteRoot.parent / 'NOVA'
workDir = Path(tempfile.gettempdir()) / 'novaShowcaseExport'
factsPath = siteRoot / 'src' / 'data' / 'novaNozzleFacts.json'
revolveSegments = 96

def revolvedGrid(axial: np.ndarray, radius: np.ndarray, segments: int = revolveSegments) -> tuple:
    '''
    Surface-of-revolution grid in NOVA's export frame: the axis along Z (as the channel export
    writes it, Z = -x) and the radial plane in X and Y.

    Parameters:
    -----------
    axial : np.ndarray
        Axial stations along the nozzle, x [m]
    radius : np.ndarray
        Wall radius at each station [m]
    segments : int
        Circumferential divisions

    Returns:
    --------
    tuple of np.ndarray
        X, Y, Z grids shaped (stations, segments + 1) for exports.py2cad
    '''
    theta = np.linspace(0.0, 2.0 * np.pi, segments + 1)
    radiusGrid, thetaGrid = np.meshgrid(radius, theta, indexing='ij')
    axialGrid = np.repeat(-axial[:, None], segments + 1, axis=1)
    return radiusGrid * np.cos(thetaGrid), radiusGrid * np.sin(thetaGrid), axialGrid

def gridLines(xGrid: np.ndarray, yGrid: np.ndarray, zGrid: np.ndarray, rows: list, columns: list) -> np.ndarray:
    '''
    Line segments along chosen rows and columns of a surface grid: the isoparametric curves
    a CAD tool draws on a surface. On a surface of revolution the rows are rings and the
    columns are meridians.

    Parameters:
    -----------
    xGrid, yGrid, zGrid : np.ndarray
        Surface grid coordinates, shape (m, n)
    rows : list of int
        Row indices to draw along
    columns : list of int
        Column indices to draw along

    Returns:
    --------
    np.ndarray
        Segments, shape (k, 2, 3)
    '''
    points = np.stack([xGrid, yGrid, zGrid], axis=-1)
    segments = []
    for row in rows:
        line = points[row]
        segments.append(np.stack([line[:-1], line[1:]], axis=1))
    for column in columns:
        line = points[:, column]
        segments.append(np.stack([line[:-1], line[1:]], axis=1))
    return np.concatenate(segments)

def ringStations(axial: np.ndarray, radius: np.ndarray, count: int) -> list:
    '''
    Station indices spaced evenly in arc length along a meridian, ends included.

    Parameters:
    -----------
    axial, radius : np.ndarray
        Meridian coordinates [m]
    count : int
        Number of stations

    Returns:
    --------
    list of int
    '''
    arcLength = np.concatenate([[0.0], np.cumsum(np.hypot(np.diff(axial), np.diff(radius)))])
    targets = np.linspace(0.0, arcLength[-1], count)
    return sorted({int(np.argmin(np.abs(arcLength - target))) for target in targets})

def main() -> None:
    sys.path.insert(0, str(novaRoot / 'src'))
    from NOVA import Nozzle
    from NOVA.exports import py2cad

    workDir.mkdir(parents=True, exist_ok=True)
    config = json.loads((novaRoot / 'src' / 'NOVA' / 'assets' / 'NOVANozzle.json').read_text(encoding='utf-8'))

    # Same case as the README worked example; only the outputs change: no figures, a
    # separate output folder name so the run does not overwrite the example's own outputs
    def setOption(node: dict, key: str, value) -> bool:
        if key in node:
            node[key] = value
            return True
        return any(setOption(child, key, value) for child in node.values() if isinstance(child, dict))
    for key, value in (('plotsEnabled', False), ('export', True), ('filename', 'portfolioShowcase')):
        assert setOption(config, key, value), key
    configPath = workDir / 'portfolioShowcase.json'
    configPath.write_text(json.dumps(config, indent=2), encoding='utf-8')

    nozzle = Nozzle()
    nozzle.generateNozzle(configPath=str(configPath))

    # Hot wall (full gas-side contour) and closeout shell, revolved and written by NOVA's writer
    outputDir = Path(nozzle.dataFolder)
    hotWallAxial, hotWallRadius = np.asarray(nozzle.xNozzleWall), np.asarray(nozzle.rNozzleWall)
    shellAxial, shellRadius = np.asarray(nozzle.xNozzleShell), np.asarray(nozzle.rNozzleShell)
    hotWallGrid = revolvedGrid(hotWallAxial, hotWallRadius)
    shellGrid = revolvedGrid(shellAxial, shellRadius)
    hotWallPath = workDir / 'hotWall.stl'
    py2cad(str(hotWallPath), *hotWallGrid)
    shellPath = workDir / 'shell.stl'
    py2cad(str(shellPath), *shellGrid)

    # The channel as exportData writes it, with every third point of NOVA's closed 40-point
    # cross-section: a 13-sided tube. Sixty channels at full resolution are 276k triangles,
    # more than a phone should draw for passages a few pixels wide.
    channelRows = list(range(0, np.shape(nozzle.xChannel)[0], 3))
    channelPath = workDir / 'channel.stl'
    py2cad(str(channelPath), *(np.asarray(values)[channelRows] for values in (nozzle.zChannel, nozzle.yChannel, -np.asarray(nozzle.xChannel))))

    # Line drawing for the viewer's lines mode: rings and meridians on the revolved walls,
    # cross-section loops and a few lengthwise lines on the volutes. The volute grids are
    # NOVA's, moved into the channel frame.
    meridians = list(range(0, revolveSegments, revolveSegments // 24))
    lineSets = {
        'hotWallLines': gridLines(*hotWallGrid, ringStations(hotWallAxial, hotWallRadius, 16), meridians),
        'shellLines': gridLines(*shellGrid, ringStations(shellAxial, shellRadius, 6), meridians),
    }
    for prefix, name in (('InletVolute', 'inletVoluteLines'), ('OutletVolute', 'outletVoluteLines')):
        grid = [np.asarray(getattr(nozzle, f'{axis}{prefix}')) for axis in ('z', 'y', 'x')]
        grid[2] = -grid[2]
        rowCount, columnCount = grid[0].shape
        lineSets[name] = gridLines(*grid, list(range(0, rowCount, 4)) + [rowCount - 1], list(range(0, columnCount, columnCount // 4)))

    # NOVA writes the channel STL as (z, y, -x), axis along Z, but the volute STLs in the
    # nozzle's own (x, y, z), axis along X. The volutes take the channel's mapping so every
    # part shares one frame.
    toChannelFrame = np.array([[0, 0, 1, 0], [0, 1, 0, 0], [-1, 0, 0, 0], [0, 0, 0, 1]], dtype=float)
    parts = [
        ('hotWall', hotWallPath, None),
        ('shell', shellPath, None),
        ('channel', channelPath, None),
        ('inletVolute', outputDir / 'portfolioShowcaseInletVolute.stl', toChannelFrame),
        ('outletVolute', outputDir / 'portfolioShowcaseOutletVolute.stl', toChannelFrame),
    ]

    scene = trimesh.Scene()
    for name, path, transform in parts:
        mesh = trimesh.load_mesh(str(path))
        if transform is not None:
            mesh.apply_transform(transform)
        mesh.merge_vertices()
        mesh.remove_unreferenced_vertices()
        scene.add_geometry(mesh, node_name=name, geom_name=name)
        print(f'{name:17s} {len(mesh.faces):8d} faces')
    for name, segments in lineSets.items():
        scene.add_geometry(trimesh.load_path(segments), node_name=name, geom_name=name)
        print(f'{name:17s} {len(segments):8d} segments')

    # NOVA exports one channel for the CAD tool to pattern. The rest of the jacket is the
    # same mesh rotated about the axis at the channel pitch: extra nodes that reference the
    # one mesh, which the compression step turns into GPU instances.
    pitch = 2.0 * np.pi / int(nozzle.nChannel)
    for index in range(1, int(nozzle.nChannel)):
        rotation = trimesh.transformations.rotation_matrix(index * pitch, [0, 0, 1])
        scene.graph.update(frame_to=f'channel{index}', frame_from=scene.graph.base_frame, matrix=rotation, geometry='channel')

    rawGlbPath = workDir / 'novaNozzle.glb'
    scene.export(str(rawGlbPath))

    # Meshopt compression and GPU instancing for the web. Parts stay separate meshes
    # (--join false) so the viewer can give each its own material.
    modelPath = siteRoot / 'public' / 'assets' / 'models' / 'novaNozzle.glb'
    subprocess.run(
        f'npx -y @gltf-transform/cli@4 optimize "{rawGlbPath}" "{modelPath}" '
        '--compress meshopt --instance true --join false --simplify false',
        shell=True, check=True, cwd=siteRoot
    )

    # Card numbers: the operating point straight from the configuration, sizes from the
    # generated geometry
    def readOption(node: dict, key: str):
        if key in node:
            return node[key]
        for child in node.values():
            if isinstance(child, dict):
                found = readOption(child, key)
                if found is not None:
                    return found
        return None
    extents = scene.bounding_box.extents
    facts = {
        'thrustKn': round(readOption(config, 'thrust') / 1e3),
        'propellants': f"{readOption(config, 'Oxidizer')}/{readOption(config, 'Fuel')}",
        'chamberPressureMpa': round(readOption(config, 'chamberPressure') / 1e6, 2),
        'mixtureRatio': readOption(config, 'OFRatio'),
        'expansionRatio': readOption(config, 'expansionRatio'),
        'lengthFraction': readOption(config, 'lengthFraction'),
        'regenEndAreaRatio': readOption(config, 'regenTruncationValue'),
        'channelCount': int(nozzle.nChannel),
        'channelType': str(nozzle.channelType),
        'coolant': readOption(config, 'coolant'),
        'throatRadiusMm': round(float(np.min(nozzle.rNozzleWall)) * 1e3, 1),
        'exitRadiusMm': round(float(nozzle.rNozzleWall[-1]) * 1e3, 1),
        'overallLengthMm': round(float(extents[2]) * 1e3),
        'overallDiameterMm': round(float(max(extents[0], extents[1])) * 1e3),
    }
    factsPath.write_text(json.dumps(facts, indent=2) + '\n', encoding='utf-8')
    print(f'wrote {modelPath.name} ({os.path.getsize(modelPath) / 1e3:.0f} kB) and {factsPath.name}')
    print(json.dumps(facts, indent=2))

if __name__ == '__main__':
    main()
