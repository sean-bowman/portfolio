/* ========================================
   SHOWCASE STAGE
   One WebGL renderer drawing every model card through scissor rectangles
   Sean Bowman [10/07/2026]
   ======================================== */

// @ts-check

// The pattern of three.js's webgl_multiple_elements example. A transparent canvas sits
// over the card grid with pointer events off, sized to the viewport rather than the
// grid so its drawing buffer stays bounded however many cards there are. Each frame it
// moves to the visible part of the grid and draws each on-screen card's scene into that
// card's rectangle. Between frames the canvas scrolls with the page, so a drawn model
// stays registered with its card while the next frame is pending. One WebGL context
// serves any number of cards.

import { createRenderer, RenderLoop } from '../three/index.js';
import { reducedMotion } from '../motion.js';

/**
 * @typedef {Object} StageView
 * @property {HTMLElement} element - Card region the view draws into
 * @property {(renderer: import('three').WebGLRenderer, dtSeconds: number, aspect: number) => void} render
 */

export class ShowcaseStage {
    /**
     * @param {HTMLElement} host - Positioned element that covers the card grid
     * @param {HTMLCanvasElement} canvas - Absolutely positioned canvas inside the host
     */
    constructor(host, canvas) {
        this._host = host;
        this._canvas = canvas;
        // The model is the page's content, so phones keep up to 2x pixels (no antialiasing)
        this._renderer = createRenderer(canvas, { litePixelRatio: 2 });
        this._renderer.setScissorTest(true);
        /** @type {StageView[]} */
        this._views = [];
        this._width = 0;
        this._height = 0;
        this._pendingFrame = 0;
        /** Frames drawn, for the development hook in viewer.js */
        this.frameCount = 0;

        this._loop = new RenderLoop(host, dtSeconds => this.render(dtSeconds));

        // Without the loop (reduced motion), scrolling reveals parts of the grid the
        // canvas has not drawn yet, so redraw once per scrolled frame
        this._onScroll = () => {
            if (reducedMotion()) this.requestRender();
        };
        window.addEventListener('scroll', this._onScroll, { passive: true });
    }

    /** @returns {import('three').WebGLRenderer} */
    get renderer() {
        return this._renderer;
    }

    /** @param {StageView} view */
    add(view) {
        this._views.push(view);
    }

    /** Draw one frame on the next animation frame; repeated calls in one frame coalesce. */
    requestRender() {
        if (this._pendingFrame) return;
        this._pendingFrame = requestAnimationFrame(() => {
            this._pendingFrame = 0;
            this.render(0);
        });
    }

    /**
     * Place the canvas over the visible part of the grid and draw every card in view.
     * @param {number} dtSeconds
     */
    render(dtSeconds) {
        this.frameCount++;
        const hostRect = this._host.getBoundingClientRect();
        const canvasHeight = this._canvas.clientHeight;
        const offset = Math.min(Math.max(-hostRect.top, 0), Math.max(hostRect.height - canvasHeight, 0));
        this._canvas.style.transform = `translate3d(0, ${offset}px, 0)`;

        if (hostRect.width !== this._width || canvasHeight !== this._height) {
            this._width = hostRect.width;
            this._height = canvasHeight;
            this._renderer.setSize(this._width, this._height, false);
        }

        // Clear the whole canvas to transparent, then draw each card inside its rectangle
        this._renderer.setScissor(0, 0, this._width, this._height);
        this._renderer.clear();

        const canvasTop = hostRect.top + offset;
        this._views.forEach(view => {
            const rect = view.element.getBoundingClientRect();
            const left = rect.left - hostRect.left;
            const top = rect.top - canvasTop;
            if (top + rect.height < 0 || top > this._height || rect.width === 0) return;
            // WebGL rectangles start at the bottom left
            const bottom = this._height - top - rect.height;
            this._renderer.setViewport(left, bottom, rect.width, rect.height);
            this._renderer.setScissor(left, bottom, rect.width, rect.height);
            view.render(this._renderer, dtSeconds, rect.width / rect.height);
        });
    }

    /** Stop drawing and release the WebGL context. */
    dispose() {
        cancelAnimationFrame(this._pendingFrame);
        window.removeEventListener('scroll', this._onScroll);
        this._loop.dispose();
        this._renderer.dispose();
        this._renderer.forceContextLoss();
    }
}
