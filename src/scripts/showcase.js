/* ========================================
   3D MODEL SHOWCASE
   Three.js STL viewer with orbit controls
   Sean Bowman [02/11/2026]
   ======================================== */

// @ts-check

import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { showcaseModels } from '../data/models.js';
import { withBase } from '../lib/paths.js';
import { createRenderer, themeColors, onThemeChange, RenderLoop } from './three/index.js';
import { reducedMotion } from './motion.js';

/** Tokens the viewers read; re-read whenever the theme changes */
const viewerTokens = ['accent', 'accent-dim', 'text-muted', 'red'];


/* ========================================
   SHOWCASE VIEWER CLASS
   Encapsulates a complete Three.js scene
   for a single model card.
   ======================================== */

class ShowcaseViewer {
    /**
     * Create a 3D viewer for a single STL model.
     * @param {HTMLCanvasElement} canvas - The canvas element to render into
     * @param {import('../data/models.js').ShowcaseModel} config - Model configuration object
     * @param {number} index - Index in the showcaseModels array (used for placeholder variety)
     */
    constructor(canvas, config, index) {
        this._canvas = canvas;
        this._config = config;
        this._index = index;
        this._colorToken = config.colorToken;
        /** @type {THREE.Scene} */
        this._scene = new THREE.Scene();
        /** @type {THREE.PerspectiveCamera} */
        this._camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
        /** @type {THREE.WebGLRenderer | null} */
        this._renderer = null;
        /** @type {OrbitControls | null} */
        this._controls = null;
        /** @type {THREE.DirectionalLight | null} */
        this._fillLight = null;
        /** @type {THREE.MeshPhongMaterial | THREE.MeshBasicMaterial | null} */
        this._modelMaterial = null;
    }

    /**
     * Set up the camera, renderer, lights, and controls.
     */
    initScene() {
        const container = /** @type {HTMLElement} */ (this._canvas.parentElement);

        this._camera.aspect = container.clientWidth / container.clientHeight;
        this._camera.position.set(0, 1.5, 3);
        this._camera.updateProjectionMatrix();

        // Transparent clear: the card's --surface-2 background shows through in either theme
        this._renderer = createRenderer(this._canvas);
        this._renderer.setSize(container.clientWidth, container.clientHeight);

        // Lighting: neutral ambient and key light, plus a rim light in the accent color
        this._scene.add(new THREE.AmbientLight(0x808090, 0.6));

        const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
        keyLight.position.set(1, 1, 1);
        this._scene.add(keyLight);

        this._fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        this._fillLight.position.set(-1, -0.5, -1);
        this._scene.add(this._fillLight);

        // Orbit controls; auto-rotation only when the visitor allows motion
        this._controls = new OrbitControls(this._camera, this._canvas);
        this._controls.enableDamping = true;
        this._controls.dampingFactor = 0.05;
        this._controls.autoRotate = !reducedMotion();
        this._controls.autoRotateSpeed = 1.0;
        this._controls.target.set(0, 0, 0);
        this._controls.update();

        this.applyTheme();
    }

    /**
     * Load an STL file and add it to the scene. If no filePath is configured,
     * renders a placeholder wireframe shape instead.
     * @returns {Promise<void>}
     */
    async loadModel() {
        if (!this._config.filePath) {
            this._renderPlaceholder();
            this.applyTheme();
            return;
        }

        try {
            const loader = new STLLoader();
            const geometry = await loader.loadAsync(withBase(this._config.filePath));

            // Center the geometry
            geometry.computeBoundingBox();
            geometry.center();

            // Scale to fit the viewport
            const size = new THREE.Vector3();
            /** @type {THREE.Box3} */ (geometry.boundingBox).getSize(size);
            const maxDimension = Math.max(size.x, size.y, size.z);
            const scale = 2.0 / maxDimension;

            this._modelMaterial = new THREE.MeshPhongMaterial({
                specular: 0x444444,
                shininess: 30,
                flatShading: false
            });

            const mesh = new THREE.Mesh(geometry, this._modelMaterial);
            mesh.scale.setScalar(scale);
            this._scene.add(mesh);

            // Position camera to frame the model
            this._camera.position.set(0, 1.5, 3);
            /** @type {OrbitControls} */ (this._controls).target.set(0, 0, 0);
            /** @type {OrbitControls} */ (this._controls).update();

        } catch (error) {
            console.error(`Failed to load model: ${this._config.filePath}`, error);
            this._renderErrorState();
        }
        this.applyTheme();
    }

    /**
     * Render a placeholder wireframe shape when no STL file is available.
     * Uses different geometries based on the card index for visual variety.
     */
    _renderPlaceholder() {
        let geometry;

        // Vary the placeholder shape per card for visual interest
        switch (this._index % 3) {
            case 0:
                geometry = new THREE.IcosahedronGeometry(1, 1);
                break;
            case 1:
                geometry = new THREE.TorusKnotGeometry(0.7, 0.25, 80, 16);
                break;
            case 2:
            default:
                geometry = new THREE.OctahedronGeometry(1, 0);
                break;
        }

        // Unlit, so the wireframe shows the theme token's color exactly in both modes
        this._modelMaterial = new THREE.MeshBasicMaterial({
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });

        this._scene.add(new THREE.Mesh(geometry, this._modelMaterial));
    }

    /**
     * Render an error state when an STL file fails to load.
     * Shows a wireframe in the error color and updates the card's loading overlay.
     */
    _renderErrorState() {
        this._colorToken = 'red';
        this._modelMaterial = new THREE.MeshBasicMaterial({
            wireframe: true,
            transparent: true,
            opacity: 0.6
        });
        this._scene.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), this._modelMaterial));

        // Show error message in the loading overlay
        const card = this._canvas.closest('.showcase-card');
        const loadingEl = card?.querySelector('.showcase-loading');
        if (loadingEl) {
            loadingEl.innerHTML = '<p>Failed to load model.</p>';
            loadingEl.classList.add('showcase-error');
        }
    }

    /**
     * Pull the mesh and rim-light colors from the current theme tokens.
     */
    applyTheme() {
        const colors = themeColors(viewerTokens);
        this._fillLight?.color.set(colors.accent);
        this._modelMaterial?.color.set(colors[this._colorToken] || colors.accent);
    }

    /**
     * Call back whenever the visitor moves the camera.
     * @param {() => void} callback
     */
    onCameraChange(callback) {
        this._controls?.addEventListener('change', callback);
    }

    /**
     * Advance the controls (damping and auto-rotate) and draw one frame.
     */
    renderFrame() {
        if (!this._renderer || !this._controls) return;
        this._controls.update();
        this._renderer.render(this._scene, this._camera);
    }

    /**
     * Handle window resize by updating camera aspect ratio and renderer size.
     */
    handleResize() {
        if (!this._renderer) return;
        const container = /** @type {HTMLElement} */ (this._canvas.parentElement);
        this._camera.aspect = container.clientWidth / container.clientHeight;
        this._camera.updateProjectionMatrix();
        this._renderer.setSize(container.clientWidth, container.clientHeight);
    }

    /**
     * Clean up all Three.js resources. Call when the viewer is no longer needed.
     */
    dispose() {
        this._controls?.dispose();
        this._renderer?.dispose();
        this._scene.traverse(object => {
            const mesh = /** @type {THREE.Mesh} */ (object);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) /** @type {THREE.Material} */ (mesh.material).dispose();
        });
    }
}


/* ========================================
   INITIALIZATION
   The page is swapped in place by the client router, so viewers are built on
   astro:page-load when the grid is present and disposed before the next swap.
   ======================================== */

/** @type {{ viewer: ShowcaseViewer, loop: RenderLoop }[]} */
let entries = [];
/** @type {(() => void) | null} */
let stopThemeWatch = null;
let resizeTimeout = 0;

/**
 * Create a viewer and a visibility-gated render loop for each card rendered by
 * showcase.astro.
 */
function initShowcase() {
    const grid = document.getElementById('showcaseGrid');
    if (!grid || grid.dataset.initialized === 'true') return;
    grid.dataset.initialized = 'true';

    grid.querySelectorAll('.showcase-card').forEach((element, index) => {
        const card = /** @type {HTMLElement} */ (element);
        const canvas = /** @type {HTMLCanvasElement} */ (card.querySelector('.showcase-canvas'));
        const viewer = new ShowcaseViewer(canvas, showcaseModels[index], index);
        viewer.initScene();

        const loop = new RenderLoop(card, () => viewer.renderFrame());
        // With reduced motion the loop never runs, so redraw whenever the visitor orbits
        viewer.onCameraChange(() => {
            if (reducedMotion()) loop.renderOnce();
        });

        viewer.loadModel().then(() => {
            // Hide loading indicator once the model (or placeholder) is ready
            const loadingEl = /** @type {HTMLElement | null} */ (card.querySelector('.showcase-loading'));
            if (loadingEl && !loadingEl.classList.contains('showcase-error')) {
                loadingEl.style.display = 'none';
            }
            loop.renderOnce();
        });
        entries.push({ viewer, loop });
    });

    stopThemeWatch = onThemeChange(() => {
        entries.forEach(({ viewer, loop }) => {
            viewer.applyTheme();
            loop.renderOnce();
        });
    });
}

/**
 * Release every WebGL context, loop, and listener before the page is swapped out.
 */
function disposeShowcase() {
    stopThemeWatch?.();
    stopThemeWatch = null;
    entries.forEach(({ viewer, loop }) => {
        loop.dispose();
        viewer.dispose();
    });
    entries = [];
}

window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(() => {
        entries.forEach(({ viewer, loop }) => {
            viewer.handleResize();
            loop.renderOnce();
        });
    }, 250);
});

document.addEventListener('astro:page-load', initShowcase);
document.addEventListener('astro:before-swap', disposeShowcase);
// When this module first loads during a client-side navigation it can arrive after
// that navigation's page-load event; the initialized flag makes a second call safe
initShowcase();
