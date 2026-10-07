/* ========================================
   SHOWCASE VIEWER
   Builds the shared stage and one model view per card on the Showcase page
   Sean Bowman [10/07/2026]
   ======================================== */

// @ts-check

// Loaded by showcase.astro in idle time once the grid nears the viewport. The client
// router swaps pages in place, so the stage is built on each visit to the page and
// released before the next swap.

import { showcaseModels } from '../../data/models.js';
import { themeColors, onThemeChange, yieldToMain } from '../three/index.js';
import { ShowcaseStage } from './stage.js';
import { ModelView, viewTokens } from './modelView.js';

/** @type {ShowcaseStage | null} */
let stage = null;
/** @type {ModelView[]} */
let views = [];
/** @type {(() => void) | null} */
let stopThemeWatch = null;
/** @type {ResizeObserver | null} */
let resizeObserver = null;

/**
 * @param {HTMLElement} card
 * @param {string} message
 */
function showCardError(card, message) {
    const loading = card.querySelector('.showcase-loading');
    if (!loading) return;
    loading.textContent = message;
    loading.classList.add('showcase-error');
}

/**
 * Build the stage and the card views. Throws if WebGL is unavailable; the caller marks
 * the grid so the cards show their text without a viewer.
 * @returns {Promise<void>}
 */
export async function initShowcase() {
    const host = /** @type {HTMLElement | null} */ (document.querySelector('.showcase-layout'));
    const canvas = /** @type {HTMLCanvasElement | null} */ (host?.querySelector('.showcase-canvas'));
    if (!host || !canvas || host.dataset.initialized === 'true') return;
    host.dataset.initialized = 'true';

    stage = new ShowcaseStage(host, canvas);
    const activeStage = stage;
    const colors = themeColors(viewTokens);

    const cards = /** @type {HTMLElement[]} */ ([...host.querySelectorAll('.showcase-card')]);
    for (const card of cards) {
        const model = showcaseModels[Number(card.dataset.modelIndex)];
        const element = /** @type {HTMLElement} */ (card.querySelector('.showcase-view'));
        const view = new ModelView(element, model, () => activeStage.requestRender());
        view.applyTheme(colors);
        activeStage.add(view);
        views.push(view);
        bindCardControls(card, view);

        view.load()
            .then(async () => {
                // The visitor may have left the page while the file loaded
                if (stage !== activeStage) return;
                card.classList.add('is-loaded');
                // Compile this card's shaders off the main thread's critical path before
                // its first frame
                await activeStage.renderer.compileAsync(view.scene, view.camera);
                if (stage === activeStage) activeStage.requestRender();
            })
            .catch(error => {
                console.error(`Showcase model failed to load: ${model.filePath}`, error);
                showCardError(card, 'The model could not be loaded.');
            });
        await yieldToMain();
        if (stage !== activeStage) return;
    }

    stopThemeWatch = onThemeChange(() => {
        const next = themeColors(viewTokens);
        views.forEach(view => view.applyTheme(next));
    });

    // Card size changes (breakpoints, rotation) need a frame even when no loop runs
    resizeObserver = new ResizeObserver(() => activeStage.requestRender());
    resizeObserver.observe(host);

    // Development aid: frame and draw-call counts, and each card's view state
    /** @type {any} */ (window).__showcaseInfo = () => ({
        ...activeStage.renderer.info.render,
        frames: activeStage.frameCount,
        views: views.map(view => view.info())
    });
}

/**
 * Wire a card's mode buttons and reset button to its view.
 * @param {HTMLElement} card
 * @param {ModelView} view
 */
function bindCardControls(card, view) {
    const modeButtons = /** @type {HTMLButtonElement[]} */ ([...card.querySelectorAll('[data-mode]')]);
    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            view.setMode(/** @type {string} */ (button.dataset.mode));
            modeButtons.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
        });
    });
    card.querySelector('[data-reset]')?.addEventListener('click', () => view.resetView());
}

/**
 * Release the WebGL context, controls, and listeners before the page is swapped out.
 */
export function disposeShowcase() {
    stopThemeWatch?.();
    stopThemeWatch = null;
    resizeObserver?.disconnect();
    resizeObserver = null;
    views.forEach(view => view.dispose());
    views = [];
    stage?.dispose();
    stage = null;
}

document.addEventListener('astro:before-swap', disposeShowcase);
