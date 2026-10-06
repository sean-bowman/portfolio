/* ========================================
   MOTION LAYER
   Scroll reveal, SVG draw-on, and offscreen pausing for animated drawings
   Sean Bowman [10/05/2026]
   ======================================== */

// @ts-check

// Opt-in attributes (styles in src/styles/motion.css):
//   data-reveal   fades and rises into place when scrolled into view; siblings stagger
//   data-draw     on an <svg>: its strokes draw on when scrolled into view
//   data-loop     on an element inside a data-draw svg: excluded from draw-on because
//                 it runs its own dash animation
//   data-loops    on an <svg>: its infinite CSS animations pause while off screen
// Entrances replay: .in is removed only once an element is fully off screen.
// Nothing animates unless html.anim is set, which requires IntersectionObserver and no
// reduced-motion preference, so the final state is the no-JS and reduced-motion state.

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const revealStaggerCap = 8;
const drawStaggerCap = 24;
const drawableSelector = 'path, circle, rect, ellipse, line, polyline, polygon';

/** @type {IntersectionObserver | null} */
let _revealObserver = null;
/** @type {IntersectionObserver | null} */
let _pauseObserver = null;

/**
 * @returns {boolean} Whether the visitor prefers reduced motion
 */
export function reducedMotion() {
    return reducedMotionQuery.matches;
}

/**
 * Add or remove the html.anim gate class for the current motion preference.
 */
function updateMotionGate() {
    const allowMotion = !reducedMotion() && 'IntersectionObserver' in window;
    document.documentElement.classList.toggle('anim', allowMotion);
}

/**
 * @returns {IntersectionObserver}
 */
function getRevealObserver() {
    if (!_revealObserver) {
        _revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.06) {
                    entry.target.classList.add('in');
                } else if (!entry.isIntersecting) {
                    entry.target.classList.remove('in');
                }
            });
        }, { threshold: [0, 0.06], rootMargin: '0px 0px 2% 0px' });
    }
    return _revealObserver;
}

/**
 * Observe every [data-reveal] element and [data-draw] svg under root. Each element's
 * --d is its index among sibling [data-reveal] elements, for the entrance stagger.
 * @param {ParentNode} [root=document]
 */
export function observeReveal(root = document) {
    const observer = getRevealObserver();
    root.querySelectorAll('[data-reveal]').forEach(element => {
        const siblings = element.parentElement
            ? Array.from(element.parentElement.children).filter(child => child.hasAttribute('data-reveal'))
            : [element];
        const index = Math.min(siblings.indexOf(element), revealStaggerCap);
        /** @type {HTMLElement} */ (element).style.setProperty('--d', String(index));
        observer.observe(element);
    });
    root.querySelectorAll('[data-draw]').forEach(svg => observer.observe(svg));
}

/**
 * Prepare an svg's strokes for draw-on: pathLength="1" on every stroked shape lets one
 * dash rule draw any shape without measuring it. Solid fills appear without drawing,
 * and [data-loop] elements keep their own dash animation.
 * @param {Element} svg
 */
export function prepareDrawOn(svg) {
    let index = 0;
    svg.querySelectorAll(drawableSelector).forEach(shape => {
        const fill = shape.getAttribute('fill');
        if ((fill && fill !== 'none') || shape.closest('[data-loop]')) return;
        shape.setAttribute('pathLength', '1');
        shape.setAttribute('data-dl', '');
        /** @type {SVGElement} */ (shape).style.setProperty('--d', String(Math.min(index++, drawStaggerCap)));
    });
}

/**
 * Pause an svg's infinite CSS animations while it is off screen. The observer watches
 * the svg root because Safari misreports intersection for shapes inside an svg.
 * @param {Element} svg
 */
export function observePause(svg) {
    if (!_pauseObserver) {
        _pauseObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => entry.target.classList.toggle('is-paused', !entry.isIntersecting));
        }, { rootMargin: '150px' });
    }
    _pauseObserver.observe(svg);
}

/**
 * Wire up every opt-in element on the current page.
 */
function setUpPage() {
    updateMotionGate();
    document.querySelectorAll('[data-draw]').forEach(prepareDrawOn);
    observeReveal(document);
    document.querySelectorAll('svg[data-loops]').forEach(observePause);
}

/**
 * Drop observers that hold the outgoing page's elements.
 */
function tearDownPage() {
    _revealObserver?.disconnect();
    _revealObserver = null;
    _pauseObserver?.disconnect();
    _pauseObserver = null;
}

reducedMotionQuery.addEventListener('change', updateMotionGate);
document.addEventListener('astro:page-load', setUpPage);
document.addEventListener('astro:before-swap', tearDownPage);
// The router copies the new page's <html> attributes on swap, which drops the gate class
document.addEventListener('astro:after-swap', updateMotionGate);
updateMotionGate();
