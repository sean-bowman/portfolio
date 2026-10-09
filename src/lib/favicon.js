/* ========================================
   FAVICON
   The NOVA worked-example nozzle in side view, and a version tag for its link
   Sean Bowman [10/08/2026]
   ======================================== */

// @ts-check

// Build-time only: src/pages/favicon.svg.js serves faviconSvg as /favicon.svg, and
// BaseLayout links it with ?v=faviconVersion. Browsers keep favicons in a cache of their
// own, keyed by the icon's URL, and can show a superseded icon long after the file changes;
// the version is a hash of the SVG, so any change to the icon changes its URL.
//
// The wall comes from NOVA's worked example (src/lib/novaOutline.js) with its true radial
// proportions: chamber 1.79 and exit 6.325 times the throat. The bell is shortened along
// the axis to fit the square.

import { createHash } from 'node:crypto';
import { novaRatios, pathData, round, wallPoints } from './novaOutline.js';

const throatHalf = 1.9;
/** @type {import('./novaOutline.js').OutlineSpec} */
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

export const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke-linecap="round" stroke-linejoin="round">
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

/** First 8 hex digits of the SVG's SHA-256 */
export const faviconVersion = createHash('sha256').update(faviconSvg).digest('hex').slice(0, 8);
