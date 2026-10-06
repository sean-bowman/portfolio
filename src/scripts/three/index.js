/* ========================================
   THREE.JS TOOLKIT
   Shared renderer setup, theme colors, and visibility-driven render loops
   Sean Bowman [10/05/2026]
   ======================================== */

// @ts-check

// Shared by every 3D element on the site (showcase viewers, site map, hero net).
// Lazy loading happens one level up: a page imports its 3D feature module with
// import() when the element nears the viewport, and the feature module imports
// Three.js statically. That keeps Three.js tree-shaken (a dynamic import of 'three'
// itself retains the whole namespace) while Vite still splits it into a shared chunk
// that only 3D pages download.

import { WebGLRenderer } from 'three';
import { reducedMotion } from '../motion.js';

/**
 * Low-power devices get fewer pixels and no antialiasing: 4 or fewer logical cores,
 * or a touch-first device with a small screen.
 * @returns {boolean}
 */
export function isLite() {
    const fewCores = (navigator.hardwareConcurrency || 8) <= 4;
    const smallTouch = window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 768;
    return fewCores || smallTouch;
}

/**
 * Create a WebGL renderer with the site's defaults: transparent clear so CSS
 * backgrounds show through, pixel ratio capped at 2 (1 in LITE mode).
 * @param {HTMLCanvasElement} canvas - Target canvas
 * @param {Object} [options]
 * @param {number} [options.maxPixelRatio=2] - Upper bound on devicePixelRatio
 * @returns {WebGLRenderer}
 */
export function createRenderer(canvas, { maxPixelRatio = 2 } = {}) {
    const lite = isLite();
    const renderer = new WebGLRenderer({ canvas, antialias: !lite, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lite ? 1 : maxPixelRatio));
    renderer.setClearColor(0x000000, 0);
    return renderer;
}

/**
 * Read site color tokens from the document's computed style.
 * @param {string[]} names - Token names without the leading dashes, e.g. ['accent', 'text']
 * @returns {Record<string, string>} Map of name to CSS color string (hex as authored in tokens.css)
 */
export function themeColors(names) {
    const style = getComputedStyle(document.documentElement);
    /** @type {Record<string, string>} */
    const colors = {};
    names.forEach(name => {
        colors[name] = style.getPropertyValue(`--${name}`).trim();
    });
    return colors;
}

/**
 * Call back whenever the active palette mode changes: the theme toggle's
 * 'themechange' event, or an OS light/dark switch while no explicit choice is stored.
 * @param {() => void} callback
 * @returns {() => void} Unsubscribe function
 */
export function onThemeChange(callback) {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    // Let the new CSS custom properties resolve before the callback reads them
    const handler = () => requestAnimationFrame(callback);
    document.addEventListener('themechange', handler);
    media.addEventListener('change', handler);
    return () => {
        document.removeEventListener('themechange', handler);
        media.removeEventListener('change', handler);
    };
}

/**
 * A requestAnimationFrame loop that runs only while its element is near the viewport
 * and the tab is visible. Under reduced motion it never loops; call renderOnce() to
 * draw a frame on demand instead.
 */
export class RenderLoop {
    /**
     * @param {Element} element - Element whose visibility gates the loop
     * @param {(dtSeconds: number, timeSeconds: number) => void} frame - Per-frame update and render
     * @param {Object} [options]
     * @param {string} [options.rootMargin='100px'] - IntersectionObserver margin
     */
    constructor(element, frame, { rootMargin = '100px' } = {}) {
        this._element = element;
        this._frame = frame;
        this._isVisible = false;
        this._animationId = 0;
        this._lastTimeMs = 0;
        this._onVisibility = () => this._update();
        this._observer = new IntersectionObserver((entries) => {
            this._isVisible = entries[entries.length - 1].isIntersecting;
            this._update();
        }, { rootMargin });
        this._observer.observe(element);
        document.addEventListener('visibilitychange', this._onVisibility);
    }

    /** Draw a single frame with zero elapsed time, e.g. after a theme change. */
    renderOnce() {
        this._frame(0, performance.now() / 1000);
    }

    /** Stop the loop and release the observer and listeners. */
    dispose() {
        this._stop();
        this._observer.disconnect();
        document.removeEventListener('visibilitychange', this._onVisibility);
    }

    _update() {
        const shouldRun = this._isVisible && !document.hidden && !reducedMotion();
        if (shouldRun && !this._animationId) {
            this._lastTimeMs = performance.now();
            this._animationId = requestAnimationFrame(timeMs => this._tick(timeMs));
        } else if (!shouldRun) {
            this._stop();
            // Reduced motion still needs one static frame once the element is on screen
            if (this._isVisible && reducedMotion()) this.renderOnce();
        }
    }

    /** @param {number} timeMs */
    _tick(timeMs) {
        // Clamp so a long pause (tab switch, breakpoint) does not jump the simulation
        const dtSeconds = Math.min((timeMs - this._lastTimeMs) / 1000, 0.05);
        this._lastTimeMs = timeMs;
        this._frame(dtSeconds, timeMs / 1000);
        this._animationId = requestAnimationFrame(nextMs => this._tick(nextMs));
    }

    _stop() {
        if (this._animationId) {
            cancelAnimationFrame(this._animationId);
            this._animationId = 0;
        }
    }
}
