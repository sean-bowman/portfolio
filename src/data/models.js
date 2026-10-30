/* ========================================
   SHOWCASE MODELS
   One entry per card on the Showcase page
   Sean Bowman [10/05/2026]
   ======================================== */

// @ts-check

// To add a model: put a GLB (preferred, meshopt-compressed) or STL file in
// public/assets/models/ and add an entry below. The shared renderer in
// src/scripts/showcase/ draws any number of cards. Personal or public geometry only:
// nothing derived from employer hardware.

import novaFacts from './novaNozzleFacts.json';
import boardFacts from './pySurfBoardFacts.json';

/**
 * NOVA's channelType values as card text
 * @type {Record<string, string>}
 */
const channelShapes = { circle: 'circular', rectangular: 'rectangular', helical: 'helical' };

/**
 * @typedef {Object} ModelSpec
 * @property {string} label
 * @property {string} value
 */

/**
 * @typedef {Object} ShowcaseModel
 * @property {string} name - Card title
 * @property {string} description - Card paragraph
 * @property {string} filePath - Model path relative to the base path (.glb or .stl)
 * @property {string} sourceUrl - Repository that generated the model
 * @property {string} sourceLabel - Link text for sourceUrl
 * @property {ModelSpec[]} specs - Rows of the card's spec list, units in the values
 * @property {string} [note] - Provenance or validation line under the specs
 * @property {string} [noteUrl] - Link for the note
 * @property {boolean} [wide] - Span the full grid width
 * @property {string[]} modes - Render modes offered, first is the default (solid, jacket, lines)
 * @property {Record<string, string>} [partRoles] - Material role ('wall' or 'coolant') per glTF node name; unlisted parts are walls
 * @property {string} [wallToken] - Site token the walls take their color from; --scene-structure by default
 * @property {[number, number, number]} [rotation] - Euler rotation [rad] that orients the model
 * @property {[number, number, number]} [viewDirection] - Home camera direction from the model center
 */

/** @type {ShowcaseModel[]} */
export const showcaseModels = [
    {
        name: 'Regeneratively Cooled Nozzle',
        description: `NOVA's worked example: a ${novaFacts.thrustKn} kN ${novaFacts.propellants} upper-stage nozzle. The method of characteristics sets the contour. A thermal solve sizes ${novaFacts.channelCount} ${novaFacts.coolant.toLowerCase()} cooling channels from the chamber to an area ratio of ${novaFacts.regenEndAreaRatio}, fed and collected by the two volutes; a radiation-cooled extension carries the bell from there to the exit. Every surface comes from NOVA's own STL export.`,
        filePath: 'assets/models/novaNozzle.glb',
        sourceUrl: 'https://github.com/sean-bowman/NOVA',
        sourceLabel: 'sean-bowman/NOVA',
        specs: [
            { label: 'Thrust', value: `${novaFacts.thrustKn} kN` },
            { label: 'Propellants', value: `${novaFacts.propellants}, O/F ${novaFacts.mixtureRatio}` },
            { label: 'Chamber pressure', value: `${novaFacts.chamberPressureMpa} MPa` },
            { label: 'Contour', value: `Truncated ideal, ${Math.round(novaFacts.lengthFraction * 100)}% length` },
            { label: 'Area ratio', value: `${novaFacts.expansionRatio}` },
            { label: 'Throat / exit radius', value: `${novaFacts.throatRadiusMm} / ${novaFacts.exitRadiusMm} mm` },
            { label: 'Envelope', value: `${novaFacts.overallLengthMm} mm long, ${novaFacts.overallDiameterMm} mm diameter` },
            { label: 'Cooling', value: `${novaFacts.channelCount} ${channelShapes[novaFacts.channelType] ?? novaFacts.channelType} channels to area ratio ${novaFacts.regenEndAreaRatio}` }
        ],
        note: "Throat sizing matches CEA's characteristic velocity to 0.02%, and the contour is checked against independent references. The flowfield itself is not validated point by point.",
        noteUrl: 'https://github.com/sean-bowman/NOVA/blob/main/docs/NozzleContourValidation.md',
        wide: true,
        modes: ['solid', 'jacket', 'lines'],
        partRoles: { channel: 'coolant' },
        // NOVA's exports run the nozzle axis along -Z (chamber at +Z); this turns the
        // axis horizontal with the exit to the right
        rotation: [0, -Math.PI / 2, 0],
        viewDirection: [0.42, 0.32, 1]
    },
    {
        name: 'Parametric Surfboard',
        description: `pySurf's default thruster, built from the three views a shaper draws: the planform and the deck and bottom rockers are C1-continuous cubic Bezier sections, and each cross section's deck and bottom contours meet at the rail, flatter toward the stringer by exponents that change along the board. pySurf's own STL writer made the surface; the line drawing is its rails, both rockers and ${boardFacts.sectionCount} of its cross sections.`,
        filePath: 'assets/models/pySurfThruster.glb',
        sourceUrl: 'https://github.com/sean-bowman/pySurf',
        sourceLabel: 'sean-bowman/pySurf',
        specs: [
            { label: 'Dimensions', value: `${boardFacts.lengthFtIn} x ${boardFacts.widthIn} in x ${boardFacts.maxThicknessIn} in` },
            { label: 'Volume', value: `${boardFacts.volumeLiters.toFixed(1)} L (${boardFacts.volumeCubicInches.toLocaleString('en-US')} cubic in)` },
            { label: 'Nose / tail', value: `${boardFacts.noseShape === 'point' ? 'Pointed' : boardFacts.noseShape} / ${boardFacts.tailShape}` },
            { label: 'Bottom rocker', value: `${boardFacts.noseRockerIn} in nose, ${boardFacts.tailRockerIn} in tail` },
            { label: 'Surface', value: `${boardFacts.stations} stations, ${boardFacts.pointsPerContour} points per deck and bottom contour; drawn here at ${boardFacts.drawnStations} and ${boardFacts.drawnPointsPerContour}` }
        ],
        note: 'Not validated: the planform and rocker are matched by eye to photographs of a reference thruster, and the cross sections are calibrated to that board\'s own STL, within 0.9% of the local thickness (rms) over the middle of the board.',
        noteUrl: 'https://github.com/sean-bowman/pySurf#surfboard',
        wide: true,
        modes: ['solid', 'lines'],
        // A smooth part has few creases to ink, so it needs a body color that stands off the
        // view's ground in both themes: foam white, or pale sea green at night
        wallToken: 'scene-foam',
        // pySurf's frame has the thickness along z; this turns it to three.js's y-up
        rotation: [-Math.PI / 2, 0, 0],
        viewDirection: [0.5, 1.5, 0.7]
    }
];
