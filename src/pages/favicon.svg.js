/* ========================================
   FAVICON
   The NOVA worked-example nozzle in side view, built at compile time
   Sean Bowman [10/08/2026]
   ======================================== */

// @ts-check

// A static endpoint, written to dist/favicon.svg. The wall comes from NOVA's worked example
// (src/lib/novaOutline.js) with its true radial proportions: chamber 1.79 and exit 6.325
// times the throat. The bell is shortened along the axis to fit the square.

import { novaRatios, pathData, round, wallPoints } from '../lib/novaOutline.js';

const throatHalf = 1.9;
/** @type {import('../lib/novaOutline.js').OutlineSpec} */
const spec = {
    chamberAt: 2.5,
    convergeAt: 4.8,
    throatAt: 7.6,
    exitAt: 30,
    chamberHalf: throatHalf * novaRatios.chamber,
    throatHalf,
    exitHalf: throatHalf * novaRatios.exit,
    axis: 16
};

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <!-- NOVA worked-example nozzle in side view: injector face, chamber, converging section, throat, bell -->
  <style>
    path { stroke: #3D9C93; }
    @media (prefers-color-scheme: dark) { path { stroke: #5FD4C7; } }
  </style>
  <path d="M${spec.chamberAt} ${round(spec.axis - spec.chamberHalf)} V${round(spec.axis + spec.chamberHalf)}" stroke-width="2.2"/>
  <path d="${pathData(wallPoints(spec, -1))}" stroke-width="2.2"/>
  <path d="${pathData(wallPoints(spec, 1))}" stroke-width="2.2"/>
</svg>
`;

export function GET() {
    return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
}
