/* ========================================
   TOOLS AND METHODS
   Credentials strip and workflow cards for the Tools section
   Sean Bowman [10/06/2026]
   ======================================== */

// @ts-check

// Named commercial tools sit in the credentials strip; the cards carry methods,
// languages, and practices, so nothing appears twice. "Shown in" entries point at a
// role anchor (validated against src/data/roles.js at build time), a site page, or an
// external repository.

/**
 * @typedef {Object} Credential
 * @property {string} name
 * @property {string} detail - Issuer and year for a degree, purpose for software
 */

/**
 * @typedef {Object} ShownIn
 * @property {string} [role] - Role id from src/data/roles.js
 * @property {string} [page] - Page id from src/data/pages.js
 * @property {string} [href] - External URL
 * @property {string} [label] - Link text; required with href
 */

/**
 * @typedef {Object} ToolCard
 * @property {string} title
 * @property {string} summary - One sentence
 * @property {string[]} core - Chips shown with emphasis: the most-used
 * @property {string[]} other
 * @property {ShownIn[]} shownIn
 */

/** @type {Credential[]} */
export const education = [
    { name: 'MS Aerospace Engineering', detail: 'Florida Institute of Technology, 2021' },
    { name: 'BS Applied Physics, Minor in Mathematics', detail: 'Stockton University, 2017, magna cum laude' }
];

/** @type {Credential[]} */
export const industrySoftware = [
    { name: 'Siemens NX', detail: 'CAD' },
    { name: 'Teamcenter', detail: 'PLM' },
    { name: 'SolidWorks', detail: 'CAD' },
    { name: 'STAR-CCM+', detail: 'CFD' },
    { name: 'ANSYS Fluent', detail: 'CFD' },
    { name: 'Simcenter Nastran', detail: 'FEA' },
    { name: 'REFPROP', detail: 'Fluid properties' },
    { name: 'NASA CEA', detail: 'Combustion thermochemistry' },
    { name: 'GFSSP', detail: 'Fluid networks' }
];

/** @type {ToolCard[]} */
export const toolCards = [
    {
        title: 'Design',
        summary: 'Hardware geometry generated from the physics, then released through CAD and PLM.',
        core: ['Method of characteristics', 'Regen cooling channels'],
        other: ['LPBF in GRCop-42', 'Programmatic geometry', 'DFM / DFA', 'Design reviews (PDR / CDR)'],
        shownIn: [{ role: 'role-ae2' }, { page: 'showcase' }]
    },
    {
        title: 'Analyze',
        summary: 'Thermo-fluid models built from first principles and checked against reference data.',
        core: ['Conjugate heat transfer', 'Supercritical fluids'],
        other: ['NumPy / SciPy', 'CoolProp', 'Numerical methods', 'Plotly'],
        shownIn: [{ role: 'role-ae1' }, { href: 'https://github.com/sean-bowman/NOVA', label: 'NOVA' }]
    },
    {
        title: 'Simulate',
        summary: 'CFD, FEA, and particle methods where closed-form answers run out.',
        core: ['CFD'],
        other: ['FEA', 'SPH', 'DPM (Lagrangian particles)', 'STL / mesh processing'],
        shownIn: [{ role: 'role-gra' }, { page: 'projects' }]
    },
    {
        title: 'Build software',
        summary: 'Tools other engineers run: design suites, solvers, interfaces, and automation.',
        core: ['Python', 'Git'],
        other: ['C#', 'C++', 'JavaScript', 'Rust', 'MATLAB', 'Fortran', 'Three.js', 'Streamlit', 'Astro', 'Playwright', 'Raspberry Pi Pico'],
        shownIn: [{ role: 'role-director' }, { page: 'projects' }]
    },
    {
        title: 'Test',
        summary: 'Hardware carried from the test plan through control-room operations to post-test validation.',
        core: ['Test planning', 'Control-room operations'],
        other: ['Qualification testing', 'Test readiness reviews', 'Post-test validation', 'Vendor oversight', 'Inspection and assembly'],
        shownIn: [{ role: 'role-blue-origin' }, { role: 'role-ae2' }]
    },
    {
        title: 'Lead',
        summary: 'A propulsion department: its people, schedule, budget, and mission assurance.',
        core: ['Team direction', 'Program management'],
        other: ['Mission assurance', 'Risk assessment', 'Budget and resources', 'Standups and 1:1s', 'Engineering standards', 'Code review', 'Technical documentation', 'Jira / Confluence'],
        shownIn: [{ role: 'role-director' }, { role: 'role-gta' }]
    }
];
