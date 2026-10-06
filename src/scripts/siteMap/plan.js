/* ========================================
   SITE MAP PLAN
   Layout of the launch complex and the order it is built in
   Sean Bowman [10/06/2026]
   ======================================== */

// @ts-check

// World units: y up, the coastline runs along x, the Atlantic lies toward -z, and the
// camera looks east from the west (+z). Land runs from z = -12 inland; the beach is
// z = -12 to -16.5, the water beyond.

/**
 * @typedef {Object} Site
 * @property {number} x
 * @property {number} z
 * @property {string} [page] - Page id from src/data/pages.js the facility links to
 * @property {string} [detail] - Facility name shown under the page label on hover
 * @property {number} [labelHeight] - Height of the label anchor above the ground
 */

/** @type {Record<string, Site>} */
export const sites = {
    landingZone: { x: -52, z: 4 },
    dish: { x: -38, z: 6, page: 'contact', detail: 'Tracking dish', labelHeight: 9 },
    testStand: { x: -24, z: 3, page: 'projects', detail: 'Engine test stand', labelHeight: 13 },
    propellantFarm: { x: -11, z: 7 },
    hangar: { x: 2, z: 7, page: 'showcase', detail: 'Integration hangar', labelHeight: 9 },
    padA: { x: 15, z: -2, page: 'home', detail: 'Launch pad', labelHeight: 19 },
    padB: { x: 28, z: -2 },
    surfBreak: { x: 44, z: -18, page: 'beyond', detail: 'Surf break', labelHeight: 4 },
    droneship: { x: 22, z: -64 }
};

/** Road along the front of the complex, and the spurs to each pad */
export const roadZ = 12;

/**
 * @typedef {Object} QueueEntry
 * @property {string} id - Key in sites, or 'road'
 * @property {string} label - Shown in the status line while it builds
 * @property {number} seconds - Base build time, before durationScale
 */

/** @type {QueueEntry[]} */
export const buildQueue = [
    { id: 'road', label: 'access road', seconds: 8 },
    { id: 'dish', label: 'tracking dish', seconds: 15 },
    { id: 'testStand', label: 'engine test stand', seconds: 20 },
    { id: 'propellantFarm', label: 'propellant farm', seconds: 25 },
    { id: 'hangar', label: 'integration hangar', seconds: 25 },
    { id: 'padA', label: 'launch pad', seconds: 40 },
    { id: 'landingZone', label: 'landing zone', seconds: 20 },
    { id: 'padB', label: 'second pad', seconds: 30 },
    { id: 'droneship', label: 'droneship', seconds: 15 }
];

/** First structure breaks ground this many seconds into the visit */
export const queueStartSeconds = 4;
/** Every build time is stretched by this factor; the full build takes about 5 minutes */
export const durationScale = 1.5;

/**
 * @typedef {Object} Schedule
 * @property {string} id
 * @property {string} label
 * @property {number} start - Visit seconds when building starts
 * @property {number} end - Visit seconds when it is complete
 */

/** @type {Schedule[]} */
export const schedule = (() => {
    let cursor = queueStartSeconds;
    return buildQueue.map(entry => {
        const start = cursor;
        cursor += entry.seconds * durationScale;
        return { id: entry.id, label: entry.label, start, end: cursor };
    });
})();

/**
 * Build progress of one structure at a given visit time.
 * @param {string} id
 * @param {number} seconds - Visit seconds
 * @returns {number} 0 before it starts, 1 once complete
 */
export function progressOf(id, seconds) {
    const entry = schedule.find(item => item.id === id);
    if (!entry) return 1;   // not in the queue: present from the start
    return Math.min(1, Math.max(0, (seconds - entry.start) / (entry.end - entry.start)));
}

/**
 * @param {number} seconds
 * @returns {Schedule | null} The structure under construction, if any
 */
export function buildingAt(seconds) {
    return schedule.find(item => seconds >= item.start && seconds < item.end) ?? null;
}
