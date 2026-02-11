/* ========================================
   3D MODEL SHOWCASE
   Three.js STL viewer with orbit controls
   Sean Bowman [02/11/2026]
   ======================================== */

import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


/* ========================================
   MODEL CONFIGURATION
   Add new models here to display them
   on the showcase page.
   ======================================== */

const showcaseModels = [
    {
        name: 'Wireframe Icosahedron',
        description: 'A placeholder wireframe shape demonstrating the Three.js viewer. Replace with real STL models as they become available.',
        filePath: null,
        color: '#5eadb5',
        category: 'placeholder'
    },
    {
        name: 'Wireframe Torus Knot',
        description: 'Another placeholder shape showcasing orbit controls and lighting. Drag to rotate, scroll to zoom.',
        filePath: null,
        color: '#5b9e8f',
        category: 'placeholder'
    },
    {
        name: 'Coming Soon',
        description: 'More computational engineering models will be added here as projects develop.',
        filePath: null,
        color: '#94a3b8',
        category: 'placeholder'
    }
];

// Scene background color -- matches the site's --background-dark
const sceneBackgroundColor = 0x121520;


/* ========================================
   SHOWCASE VIEWER CLASS
   Encapsulates a complete Three.js scene
   for a single model card.
   ======================================== */

class ShowcaseViewer {
    /**
     * Create a 3D viewer for a single STL model.
     * @param {HTMLCanvasElement} canvas - The canvas element to render into
     * @param {Object} config - Model configuration object
     * @param {number} index - Index in the showcaseModels array (used for placeholder variety)
     */
    constructor(canvas, config, index) {
        this._canvas = canvas;
        this._config = config;
        this._index = index;
        this._scene = null;
        this._camera = null;
        this._renderer = null;
        this._controls = null;
        this._animationId = null;
        this._isActive = false;
        this._isInitialized = false;
    }

    /**
     * Initialize the Three.js scene, camera, renderer, lights, and controls.
     */
    initScene() {
        const container = this._canvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene
        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(sceneBackgroundColor);

        // Camera
        this._camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this._camera.position.set(0, 1.5, 3);

        // Renderer
        this._renderer = new THREE.WebGLRenderer({
            canvas: this._canvas,
            antialias: true,
            alpha: false
        });
        this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this._renderer.setSize(width, height);

        // Lighting -- three-light setup for engineering models on dark theme
        const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
        this._scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
        keyLight.position.set(1, 1, 1);
        this._scene.add(keyLight);

        // Accent fill light using the site's primary color for a subtle cyan rim
        const fillLight = new THREE.DirectionalLight(0x5eadb5, 0.3);
        fillLight.position.set(-1, -0.5, -1);
        this._scene.add(fillLight);

        // Orbit controls
        this._controls = new OrbitControls(this._camera, this._canvas);
        this._controls.enableDamping = true;
        this._controls.dampingFactor = 0.05;
        this._controls.autoRotate = true;
        this._controls.autoRotateSpeed = 1.0;
        this._controls.target.set(0, 0, 0);
        this._controls.update();

        this._isInitialized = true;
    }

    /**
     * Load an STL file and add it to the scene. If no filePath is configured,
     * renders a placeholder wireframe shape instead.
     * @returns {Promise<void>}
     */
    async loadModel() {
        if (!this._config.filePath) {
            this._renderPlaceholder();
            return;
        }

        try {
            const loader = new STLLoader();
            const geometry = await loader.loadAsync(this._config.filePath);

            // Center the geometry
            geometry.computeBoundingBox();
            geometry.center();

            // Scale to fit the viewport
            const size = new THREE.Vector3();
            geometry.boundingBox.getSize(size);
            const maxDimension = Math.max(size.x, size.y, size.z);
            const scale = 2.0 / maxDimension;

            const material = new THREE.MeshPhongMaterial({
                color: this._config.color,
                specular: 0x444444,
                shininess: 30,
                flatShading: false
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.scale.setScalar(scale);
            this._scene.add(mesh);

            // Position camera to frame the model
            this._camera.position.set(0, 1.5, 3);
            this._controls.target.set(0, 0, 0);
            this._controls.update();

        } catch (error) {
            console.error(`Failed to load model: ${this._config.filePath}`, error);
            this._renderErrorState();
        }
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

        const material = new THREE.MeshPhongMaterial({
            color: this._config.color,
            wireframe: true,
            transparent: true,
            opacity: 0.6
        });

        const mesh = new THREE.Mesh(geometry, material);
        this._scene.add(mesh);
    }

    /**
     * Render an error state when an STL file fails to load.
     * Shows a red wireframe and updates the card's loading overlay.
     */
    _renderErrorState() {
        const geometry = new THREE.IcosahedronGeometry(1, 1);
        const material = new THREE.MeshPhongMaterial({
            color: 0xf87171,
            wireframe: true,
            transparent: true,
            opacity: 0.4
        });

        const mesh = new THREE.Mesh(geometry, material);
        this._scene.add(mesh);

        // Show error message in the loading overlay
        const card = this._canvas.closest('.showcase-card');
        if (card) {
            const loadingEl = card.querySelector('.showcase-loading');
            if (loadingEl) {
                loadingEl.innerHTML = '<p>Failed to load model.</p>';
                loadingEl.classList.add('showcase-error');
            }
        }
    }

    /**
     * Start the render loop. Called by IntersectionObserver when the card
     * becomes visible in the viewport.
     */
    start() {
        if (this._isActive || !this._isInitialized) return;
        this._isActive = true;
        this._animate();
    }

    /**
     * Stop the render loop. Called by IntersectionObserver when the card
     * leaves the viewport to save GPU cycles.
     */
    stop() {
        this._isActive = false;
        if (this._animationId) {
            cancelAnimationFrame(this._animationId);
            this._animationId = null;
        }
    }

    /**
     * Internal animation loop. Updates controls (for damping and auto-rotate)
     * and renders the scene each frame.
     */
    _animate() {
        if (!this._isActive) return;
        this._animationId = requestAnimationFrame(() => this._animate());
        this._controls.update();
        this._renderer.render(this._scene, this._camera);
    }

    /**
     * Handle window resize by updating camera aspect ratio and renderer size.
     */
    handleResize() {
        if (!this._isInitialized) return;
        const container = this._canvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;
        this._camera.aspect = width / height;
        this._camera.updateProjectionMatrix();
        this._renderer.setSize(width, height);
    }

    /**
     * Clean up all Three.js resources. Call when the viewer is no longer needed.
     */
    dispose() {
        this.stop();
        if (this._controls) this._controls.dispose();
        if (this._renderer) this._renderer.dispose();
        if (this._scene) {
            this._scene.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) object.material.dispose();
            });
        }
    }
}


/* ========================================
   INITIALIZATION
   ======================================== */

const viewers = [];

document.addEventListener('DOMContentLoaded', () => {
    initShowcase();
});

/**
 * Build showcase cards from the model configuration array,
 * create ShowcaseViewer instances, and set up the IntersectionObserver
 * for lazy rendering.
 */
function initShowcase() {
    const grid = document.getElementById('showcaseGrid');
    if (!grid) return;

    // Build DOM cards from configuration
    showcaseModels.forEach((config, index) => {
        const card = _createShowcaseCard(config, index);
        grid.appendChild(card);
    });

    // Initialize viewers with IntersectionObserver
    _initViewerObserver();

    // Handle window resizes
    _initResizeHandler();
}


/* ========================================
   DOM CONSTRUCTION
   ======================================== */

/**
 * Create a showcase card DOM element with a canvas and metadata.
 * @param {Object} config - Model configuration from showcaseModels
 * @param {number} index - Index for unique canvas ID generation
 * @returns {HTMLElement} The card article element
 */
function _createShowcaseCard(config, index) {
    const card = document.createElement('article');
    card.className = 'showcase-card';
    card.setAttribute('data-viewer-index', index);

    const isPlaceholder = !config.filePath;

    card.innerHTML = `
        <div class="showcase-viewer-container">
            <canvas class="showcase-canvas" id="showcaseCanvas${index}"></canvas>
            <div class="showcase-loading">
                <div class="loading"></div>
                <p>Loading model...</p>
            </div>
        </div>
        <div class="showcase-content">
            <h3 class="showcase-title">${config.name}</h3>
            <p class="showcase-description">${config.description}</p>
            ${isPlaceholder ? '<span class="badge">Placeholder</span>' : ''}
        </div>
    `;

    return card;
}


/* ========================================
   VIEWPORT OBSERVER & RESIZE
   ======================================== */

/**
 * Use IntersectionObserver to start/stop Three.js renderers
 * based on viewport visibility. Prevents wasted GPU cycles
 * for off-screen viewers.
 */
function _initViewerObserver() {
    const cards = document.querySelectorAll('.showcase-card');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const index = parseInt(entry.target.getAttribute('data-viewer-index'), 10);
            const viewer = viewers[index];
            if (!viewer) return;

            if (entry.isIntersecting) {
                viewer.start();
            } else {
                viewer.stop();
            }
        });
    }, {
        rootMargin: '100px',
        threshold: 0.0
    });

    cards.forEach((card, index) => {
        const canvas = card.querySelector('.showcase-canvas');
        const config = showcaseModels[index];

        const viewer = new ShowcaseViewer(canvas, config, index);
        viewer.initScene();
        viewer.loadModel().then(() => {
            // Hide loading indicator once the model (or placeholder) is ready
            const loadingEl = card.querySelector('.showcase-loading');
            if (loadingEl && !loadingEl.classList.contains('showcase-error')) {
                loadingEl.style.display = 'none';
            }
        });

        viewers.push(viewer);
        observer.observe(card);
    });
}

/**
 * Debounced resize handler that updates all active viewer dimensions.
 */
function _initResizeHandler() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            viewers.forEach(viewer => viewer.handleResize());
        }, 250);
    });
}
