/* ========================================
   ROLES
   Work history for the Experience section, condensed from the resume
   Sean Bowman [10/06/2026]
   ======================================== */

// @ts-check

// Source: Documents/Resume/Resume_Sean_Bowman_LinkedIn.tex. Keep the two in step: the
// resume is the reference for titles, dates, and claims. Anchor ids are referenced by
// the Tools section's "Shown in" links.

/**
 * @typedef {Object} Role
 * @property {string} id - Anchor id on the home page
 * @property {string} title
 * @property {string} [team] - Group or discipline shown under the title
 * @property {string} start - e.g. 'Aug 2026'
 * @property {string} end - e.g. 'Present'
 * @property {string} glyph - Key of the illustration component in Experience.astro
 * @property {string[]} points - Two or three condensed resume bullets
 */

/**
 * @typedef {Object} Company
 * @property {string} name
 * @property {string} location
 * @property {Role[]} roles - Most recent first
 */

/** @type {Company[]} */
export const companies = [
    {
        name: 'Blue Origin',
        location: 'Merritt Island, FL',
        roles: [
            {
                id: 'role-blue-origin',
                title: 'Fluid System Engineer III',
                team: 'New Glenn Stage 2 Fluids, Hydrazine',
                start: 'Aug 2026',
                end: 'Present',
                glyph: 'newGlennLaunch',
                points: [
                    'Responsible engineer for the heat exchanger that supplies pressurization fluid to the second-stage tanks in flight',
                    'Overseeing the heat exchanger\'s qualification testing'
                ]
            }
        ]
    },
    {
        name: 'Vaya Space',
        location: 'Cocoa, FL',
        roles: [
            {
                id: 'role-director',
                title: 'Director of Propulsion',
                start: 'Jan 2026',
                end: 'Jun 2026',
                glyph: 'hybridTestStand',
                points: [
                    'Led the propulsion department behind the Dauntless hybrid engine, a supercritical oxygen expander cycle, through design, analysis, manufacturing, test operations, and flight qualification',
                    'Directed a team of 8 engineers and developers and owned the department\'s schedule, personnel, budget, program management, and mission assurance',
                    'Architected the 38,000-line Python propulsion design suite, with coding standards, onboarding, and a reviewed main/dev/feature Git workflow'
                ]
            },
            {
                id: 'role-ae2',
                title: 'Aerospace Engineer II',
                team: 'Fluid Thermal Control',
                start: 'Apr 2024',
                end: 'Jan 2026',
                glyph: 'regenNozzle',
                points: [
                    'Owned the regeneratively cooled nozzle end to end: contour and cooling channels by axisymmetric method of characteristics, spirally fluted geometry for LPBF in GRCop-42, and CAD release',
                    'Responsible engineer through fabrication and test: vendor oversight, DFM reviews, inspection and assembly, control-room operations, and post-test validation against design predictions'
                ]
            },
            {
                id: 'role-ae1',
                title: 'Aerospace Engineer I',
                team: 'Fluid Thermal Control',
                start: 'Apr 2022',
                end: 'Apr 2024',
                glyph: 'supercriticalTs',
                points: [
                    'Designed, analyzed, and tested the nozzle\'s regenerative cooling architecture: the LOX coolant path for supercritical oxygen and conjugate heat transfer analysis with REFPROP and CEA',
                    'Wrote the first propulsion design suite in MATLAB, then ported it to an object-based Python library that grew into the full engine design environment'
                ]
            }
        ]
    },
    {
        name: 'Florida Institute of Technology',
        location: 'Melbourne, FL',
        roles: [
            {
                id: 'role-gra',
                title: 'Graduate Research Assistant',
                start: 'Spring 2021',
                end: 'Fall 2021',
                glyph: 'cryoDroplets',
                points: [
                    'DPM CFD of cryogenic droplet thermo-fluid mixing, within 5% of experimental benchmarks',
                    'Delivered the validated analysis tool to a leading rocket manufacturer, where it remains in use'
                ]
            },
            {
                id: 'role-gta',
                title: 'Graduate Teaching Assistant Lead',
                team: 'AEE 3064 Fluid Mechanics Laboratory',
                start: 'Jan 2019',
                end: 'May 2021',
                glyph: 'venturiManometer',
                points: [
                    'Wrote course materials and lectured the laboratory, and led its team of instructors through weekly progress meetings'
                ]
            }
        ]
    }
];
