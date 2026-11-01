/* ========================================
   SHOWCASE WAVES
   The breaking-wave cards: pySurf's overturn drawing, splash-up video and peeling-breaker video
   Sean Bowman [10/29/2026]
   ======================================== */

// @ts-check

// The numbers come from the exporters' output (tools/exportPySurfOverturn.py,
// tools/exportPySurfSplash.py and tools/exportPySurfPeeling.py), so the cards always describe the
// drawing and videos they sit beside. Validation lines report the checks pySurf's own tests make,
// failures included.

import overturn from './pySurfOverturn.json';
import splash from './pySurfSplashFacts.json';
import peel from './pySurfPeelingFacts.json';

/**
 * @typedef {Object} WaveSpec
 * @property {string} label
 * @property {string} value
 */

/**
 * @typedef {Object} WaveCard
 * @property {'overturn' | 'video'} media - Which component fills the card's top
 * @property {string} [video] - For media 'video', the asset name in public/assets/video
 * @property {string} name - Card title
 * @property {string} description - Card paragraph
 * @property {string} mediaLabel - Accessible description of the drawing or video
 * @property {WaveSpec[]} specs - Rows of the card's spec list
 * @property {string} note - Validation line
 * @property {string} noteUrl - Where the validation is written up
 * @property {string} sourceUrl - Repository that produced the media
 * @property {string} sourceLabel - Link text for sourceUrl
 */

/**
 * A ratio as a signed percentage, e.g. -0.9%.
 * @param {number} error
 * @returns {string}
 */
function percent(error) {
    const value = (100 * error).toFixed(1);
    return `${error >= 0 ? '+' : ''}${value}%`;
}

/**
 * One row of the DNS comparison: the model's value, the DNS's, and the difference.
 * @param {{ label: string, unit: string, model: number, dns: number, dnsText: string, error?: number, difference?: number }} row
 * @returns {WaveSpec}
 */
function comparisonSpec(row) {
    const unit = row.unit === 'deg' ? ' deg' : '';
    const change = row.difference !== undefined
        ? `${row.difference >= 0 ? '+' : ''}${row.difference.toFixed(1)} deg`
        : percent(row.error ?? 0);
    const model = row.unit === 'deg' ? row.model.toFixed(1) : row.model.toFixed(3);
    return { label: row.label, value: `${model}${unit} (DNS ${row.dnsText}${unit}, ${change})` };
}

const pySurfUrl = 'https://github.com/sean-bowman/pySurf';
const failing = overturn.comparison.find(row => row.key === 'overturnAspectRatio');

/** @type {WaveCard[]} */
export const waveCards = [
    {
        media: 'overturn',
        name: 'Plunging Breaker: the Overturn',
        description: `The Surf Ranch soliton of Feddersen et al. (2024), ${overturn.waveHeightOverDepth} times as high as the water is deep, runs up a 1:14 reef face onto a shallow flat and plunges. pySurf's boundary element model moves the free surface with the water, so the face can fold over into a jet; the run ends as the jet lands. Each faint line is one recorded surface, the highlighted line steps through them, and the overturn plays at a third of the speed of the shoaling.`,
        mediaLabel: 'Free surface of a solitary wave shoaling onto a reef and overturning into a plunging jet, drawn as successive profiles up to the jet landing.',
        specs: overturn.comparison.map(comparisonSpec),
        note: `Checked at the jet's impact against the two-phase DNS of Feddersen et al. (2024): the overturn area, height, angle and jet area meet the criteria set before the comparison. The overturn's aspect ratio does not (${failing?.model.toFixed(3)} against ${failing?.dnsText}), though it matches the field measurement, 0.38.`,
        noteUrl: `${pySurfUrl}#overturning-boundary-element-potential-flow`,
        sourceUrl: pySurfUrl,
        sourceLabel: 'sean-bowman/pySurf'
    },
    {
        media: 'video',
        video: 'pySurfSplashUp',
        name: 'Plunging Breaker: the Splash-Up',
        description: `The same wave carried through the jet's impact. pySurf hands the boundary element flow, at the instant the jet lands, to weakly compressible SPH: ${splash.fluidParticles.toLocaleString('en-US')} particles, each starting with the potential flow's velocity and pressure. The jet lands, a splash-up rises to ${splash.peakHeightOverWaveHeight} times the incident wave height and curls into a second plunge. Particles are colored by speed; the video runs ${splash.slowMotion} times slower than the flow.`,
        mediaLabel: 'Particle simulation of a plunging jet landing and throwing up a splash, colored by speed.',
        specs: [
            { label: 'Resolution', value: `${splash.particlesPerDepth} particles per depth` },
            { label: 'Splash-up peak', value: `${splash.peakHeightOverWaveHeight} H, ${splash.peakTimeOverScale} sqrt(h/g) after impact` },
            { label: 'Energy lost, active breaking', value: `${splash.mostert.shareLostModel} (DNS ${splash.mostert.shareLostDns}, ${percent(splash.mostert.shareLostModel / splash.mostert.shareLostDns - 1)})` },
            { label: 'Dissipation rate', value: `${percent(splash.mostert.rateError)} against the DNS fit` }
        ],
        note: `The energy lost in active breaking is checked against the DNS of Mostert and Deike (2020), a separate case on a 3 degree beach, inside the ${Math.round(100 * splash.mostert.criterion)}% criterion. The splash-up's shape is not validated, and the water is single-phase: the air in the tube neither cushions its collapse nor escapes.`,
        noteUrl: `${pySurfUrl}#splash-up-potential-flow-handed-to-sph`,
        sourceUrl: pySurfUrl,
        sourceLabel: 'sean-bowman/pySurf'
    },
    {
        media: 'video',
        video: 'pySurfPeeling',
        name: 'Plunging Breaker: the Peel',
        description: `The same wave on a reef whose depth contours run at ${peel.obliqueAngle} degrees to its crest, so the jet lands first at one end and the break peels along the crest at ${peel.peelSpeedOverRootGh} sqrt(gh). Each cross-section of that reef sees the 2D overturn delayed by its distance along the crest, so pySurf stacks the boundary element run in planes one particle spacing apart and hands each plane to 3D SPH as its own jet lands: ${peel.planes} planes and ${peel.fluidParticles.toLocaleString('en-US')} particles by the end. The lines are every second plane still in potential flow; particles are colored by speed, deep blue at rest to white at twice the wave speed. The view is at true scale, looking back along the crest into the tube, and runs ${peel.slowMotion} times slower than the flow.`,
        mediaLabel: 'Three-dimensional particle simulation of a breaking wave peeling along a reef toward the viewer, the unbroken part of the wave drawn as lines ahead of the peel.',
        specs: [
            { label: 'Resolution', value: `${peel.particlesPerDepth} particles per depth, ${peel.planes} planes` },
            { label: 'Peel speed', value: `${peel.peelSpeedOverRootGh} sqrt(gh), the wave speed over tan ${peel.obliqueAngle} deg` },
            { label: 'Incident wave speed', value: `${(100 * peel.incidentSpeedError).toFixed(2)}% against the exact solitary wave` },
            { label: 'Steady peel', value: `Plane energies within ${(100 * Math.max(...peel.checks.steadySpread)).toFixed(1)}% of each other to ${peel.checks.steadyAges.at(-1)} sqrt(h/g) after impact` },
            { label: 'Against the 2D splash-up', value: `Within ${(100 * peel.checks.twoDimensionalTo08).toFixed(1)}% to ${peel.checks.steadyAges[2]} sqrt(h/g), +${(100 * peel.checks.twoDimensionalAt12).toFixed(1)}% at ${peel.checks.steadyAges[3]}` }
        ],
        note: `Not validated: no measurement or 3D simulation of a solitary wave peeling along an oblique reef was found, so these checks test the construction, not the flow. Its least certain input is strip theory's spanwise velocity, ${Math.round(100 * peel.checks.spanwiseRidgeError)}% high on Guyenne and Grilli's (2006) 3D ridge; at ${peel.obliqueAngle} degrees it changes the plane energies by about 1%. The water is single-phase.`,
        noteUrl: `${pySurfUrl}#peeling-breaker-on-an-oblique-reef-3d-potential-flow-slices-handed-to-sph-plane-by-plane`,
        sourceUrl: pySurfUrl,
        sourceLabel: 'sean-bowman/pySurf'
    }
];
