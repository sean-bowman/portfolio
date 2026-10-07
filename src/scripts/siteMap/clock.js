/* ========================================
   SITE MAP CLOCK
   Seconds on site this visit, driving the launch complex's build-out
   Sean Bowman [10/06/2026]
   ======================================== */

// @ts-check

// Counts whole seconds at 1 Hz from the first page load, paused while the tab is hidden.
// Nothing is stored: the site map persists across client-side navigation, so one count
// covers the visit, and a full reload or a new visit starts from zero. ?t=N starts the
// count at N seconds, to preview a later build state.

const previewMatch = window.location.search.match(/[?&]t=(\d+)/);
let elapsedSeconds = previewMatch ? Number(previewMatch[1]) : 0;
let started = false;

/** @type {Set<(seconds: number) => void>} */
const listeners = new Set();

/**
 * Start the 1 Hz count. Safe to call more than once.
 */
export function startClock() {
    if (started) return;
    started = true;
    window.setInterval(() => {
        if (document.hidden) return;
        elapsedSeconds += 1;
        listeners.forEach(listener => listener(elapsedSeconds));
    }, 1000);
}

/**
 * @returns {number} Whole seconds on site this visit
 */
export function siteSeconds() {
    return elapsedSeconds;
}

/**
 * Call back on every tick with the new count.
 * @param {(seconds: number) => void} listener
 * @returns {() => void} Unsubscribe function
 */
export function onTick(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/**
 * Format seconds as mission elapsed time.
 * @param {number} seconds
 * @returns {string} e.g. 'T+02:14'
 */
export function missionTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `T+${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}
