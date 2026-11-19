'''
Export pySurf's 3D breaking wave over a turned reef as a short video for the portfolio Showcase.

The source is pySurf's own animation of its 3D GPU SPH run (pySurf/examples/breakingWave3D/
shoalReef32.mp4): the Surf Ranch reef turned 25 degrees across a tank 4 depths wide, the exact
solitary wave of H/h0 = 0.6, 32 particles per depth with the crest's water split once, nine
sections drawn in 3D and colored by speed, with a plan-view inset of the crest and each section's
breaking point. The run's states are not kept, so this script crops the frame to the site's
960 x 400 (dropping the title and the time counter), holds the last frame, encodes it as an H.264
MP4 and writes a WebP poster at t' = 22.7, with the jets curling over in every inner section.

The facts it writes are pySurf's recorded results (validation/gpuSph in pySurf: shoalReef.py for
the run and its cross-check against DualSPHysics, ridge.py for the 3D validation of the breaking
point). This script computes nothing physical.

Usage (from githubPagesSite/, with pySurf checked out beside it):
    python tools/exportPySurfShoal.py
It writes public/assets/video/pySurfShoalReef.mp4, public/assets/video/pySurfShoalReef.webp and
src/data/pySurfShoalFacts.json.

Author: Sean Bowman
Date:   11/19/2026
'''

import json
import subprocess
from pathlib import Path

import imageio_ffmpeg

siteRoot = Path(__file__).resolve().parents[1]
source = siteRoot.parent / 'pySurf' / 'examples' / 'breakingWave3D' / 'shoalReef32.mp4'
videoPath = siteRoot / 'public' / 'assets' / 'video' / 'pySurfShoalReef.mp4'
posterPath = siteRoot / 'public' / 'assets' / 'video' / 'pySurfShoalReef.webp'
factsPath = siteRoot / 'src' / 'data' / 'pySurfShoalFacts.json'

# The 3D view, its colorbar and the inset lie within y 136 to 669 of the 1280 x 720 source, the
# site's 2.4:1 at full width
crop = 'crop=1280:533:0:136,scale=960:400:flags=lanczos'
holdSeconds = 0.6               # the last frame held before the loop restarts
posterTime = 3.0                # [s] into the source video: t' = 22.7

# pySurf's recorded results for this run and for the 3D breaking point (validation/gpuSph)
facts = {
    'particlesPerDepth': 32,
    'fluidParticlesAtEnd': 6599740,
    'gpuHours': 32.1,
    'reefAngle': 25,
    'spanDepths': 4,
    'sections': 9,
    'innerSections': 7,
    'videoStartTime': 18.95,                    # [sqrt(h0/g)] from the start
    'videoEndTime': 23.23,
    'dualSphysics': {'breakingTimeWithin': 0.04, 'breakingHeightHigher': [8, 11], 'landingLater': [0.03, 0.13],
                     'breakSpeed': 10.31, 'breakSpeedReference': 9.90},
    'ridge': {'timeError': 2.9, 'crestPositionError': 0.39, 'crestHeightError': -0.2},
    'reefFlat': {'wg12Error': [24.5, 29.3]},
}

def main() -> None:

    '''Crop and encode the video, write its poster and the facts.'''

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    videoPath.parent.mkdir(parents = True, exist_ok = True)
    subprocess.run([ffmpeg, '-v', 'error', '-y', '-i', str(source),
                    '-vf', f'{crop},tpad=stop_mode=clone:stop_duration={holdSeconds}',
                    '-an', '-c:v', 'libx264', '-crf', '22', '-preset', 'slow', '-pix_fmt', 'yuv420p',
                    '-movflags', '+faststart', str(videoPath)], check = True)
    subprocess.run([ffmpeg, '-v', 'error', '-y', '-ss', str(posterTime), '-i', str(source), '-frames:v', '1',
                    '-vf', crop, '-quality', '80', str(posterPath)], check = True)
    factsPath.write_bytes((json.dumps(facts, indent = 2) + '\n').encode('utf-8'))
    for path in (videoPath, posterPath, factsPath):
        print(f'{path.relative_to(siteRoot)}: {path.stat().st_size / 1e3:.0f} kB')

if __name__ == '__main__':
    main()
