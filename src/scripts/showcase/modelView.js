/* ========================================
   SHOWCASE MODEL VIEW
   One card's scene: model, lights, camera, orbit controls, and render modes
   Sean Bowman [10/07/2026]
   ======================================== */

// @ts-check

import {
    Box3,
    DirectionalLight,
    DoubleSide,
    EdgesGeometry,
    Group,
    HemisphereLight,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    PerspectiveCamera,
    Scene,
    Sphere,
    Vector3
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { withBase } from '../../lib/paths.js';
import { reducedMotion } from '../motion.js';
import { yieldToMain } from '../three/index.js';

/** Colors the view reads from the site tokens; decorative, never text */
export const viewTokens = ['scene-structure', 'scene-ink', 'accent'];

/** Fraction of the card the model fills when the view is reset */
const frameFill = 0.86;
/** Seconds after a touch interaction before auto-rotation resumes */
const resumeDelaySeconds = 4;
/** Above this angle between faces [deg] an edge is drawn as a line */
const edgeThresholdDeg = 35;

/**
 * @typedef {Object} RenderMode
 * @property {'shaded' | 'translucent' | 'hidden'} walls - Hidden walls still write depth,
 *   so lines behind them drop out as in a hidden-line drawing
 * @property {boolean} coolant - Coolant passages drawn
 * @property {boolean} drawing - The model file's own line drawing drawn
 * @property {number} edgeOpacity - Opacity of the rim and crease lines
 */

/**
 * Solid shows the outside of the part; jacket makes the walls translucent so the coolant
 * passages inside show; lines is a hidden-line drawing from the lines in the model file.
 * @type {Record<string, RenderMode>}
 */
const modes = {
    solid: { walls: 'shaded', coolant: true, drawing: false, edgeOpacity: 0.9 },
    jacket: { walls: 'translucent', coolant: true, drawing: false, edgeOpacity: 0.55 },
    lines: { walls: 'hidden', coolant: false, drawing: true, edgeOpacity: 0.95 }
};
/** Wall opacity in the translucent mode */
const translucentOpacity = 0.16;

/** @type {GLTFLoader | null} */
let gltfLoader = null;

/**
 * @returns {GLTFLoader} Shared loader with the meshopt decoder attached
 */
function getGltfLoader() {
    if (!gltfLoader) {
        gltfLoader = new GLTFLoader();
        gltfLoader.setMeshoptDecoder(MeshoptDecoder);
    }
    return gltfLoader;
}

export class ModelView {
    /**
     * @param {HTMLElement} element - The card's view region: orbit input and draw rectangle
     * @param {import('../../data/models.js').ShowcaseModel} model
     * @param {() => void} requestRender - Ask the stage for a frame (used when no loop runs)
     */
    constructor(element, model, requestRender) {
        this.element = element;
        this._model = model;
        this._requestRender = requestRender;
        this._scene = new Scene();
        this._camera = new PerspectiveCamera(32, 1, 0.01, 100);
        this._aspect = 0;
        this._homeDirection = new Vector3(...(model.viewDirection ?? [0.5, 0.35, 1])).normalize();
        this._modelBox = new Box3();
        this._interacted = false;
        this._hovered = false;
        this._resumeTimer = 0;
        this._ready = false;
        this._mode = model.modes[0];

        // Standard rather than the site map's Lambert: a smooth bell needs the specular term
        // to read as a shape, most of all on the dark ground
        this._wallMaterial = new MeshStandardMaterial({ roughness: 0.6, metalness: 0.1, side: DoubleSide });
        this._coolantMaterial = new MeshStandardMaterial({ roughness: 0.45, metalness: 0.1, side: DoubleSide });
        // Depth only, pushed back a little so lines lying on the surface pass the depth test
        this._depthMaterial = new MeshBasicMaterial({
            colorWrite: false,
            side: DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1
        });
        // Lines are transparent so they draw after every opaque surface has written depth
        this._edgeMaterial = new LineBasicMaterial({ transparent: true });
        this._drawingMaterial = new LineBasicMaterial({ transparent: true, opacity: 0.8 });
        /** @type {Mesh[]} */
        this._walls = [];
        /** @type {Mesh[]} */
        this._coolant = [];
        /** @type {LineSegments[]} */
        this._drawing = [];

        // Lighting reads the same in both themes: a sky/ground fill and a key from the
        // upper left that puts a highlight along the bell
        this._hemisphere = new HemisphereLight(0xffffff, 0x8a8f99, 1.6);
        this._key = new DirectionalLight(0xffffff, 1.6);
        this._key.position.set(-2, 3, 2);
        this._scene.add(this._hemisphere, this._key);

        this._controls = new OrbitControls(this._camera, element);
        this._configureControls();
    }

    /** @returns {Scene} */
    get scene() {
        return this._scene;
    }

    /** @returns {PerspectiveCamera} */
    get camera() {
        return this._camera;
    }

    _configureControls() {
        const controls = this._controls;
        const motion = !reducedMotion();
        controls.enableDamping = motion;
        controls.dampingFactor = 0.08;
        controls.rotateSpeed = 0.8;
        controls.autoRotate = motion;
        controls.autoRotateSpeed = 1.2;
        controls.zoomToCursor = true;
        // A plain wheel scrolls the page; Ctrl or Cmd with the wheel (and a trackpad
        // pinch, which arrives as a Ctrl wheel) zooms. Touch pinch always zooms.
        controls.enableZoom = false;
        this.element.addEventListener('wheel', event => {
            controls.enableZoom = event.ctrlKey || event.metaKey;
        }, { capture: true, passive: true });
        this.element.addEventListener('pointerdown', event => {
            if (event.pointerType === 'touch') controls.enableZoom = true;
        }, { capture: true });
        // OrbitControls claims every touch gesture; vertical swipes go back to page scroll,
        // horizontal drags orbit, and two fingers zoom and pan
        this.element.style.touchAction = 'pan-y';

        // Auto-rotation stops while the pointer is over the card and for a few seconds after
        // a touch interaction
        this.element.addEventListener('pointerenter', event => {
            if (event.pointerType === 'mouse') this._setHovered(true);
        });
        this.element.addEventListener('pointerleave', event => {
            if (event.pointerType === 'mouse') this._setHovered(false);
        });
        controls.addEventListener('start', () => {
            this._interacted = true;
            window.clearTimeout(this._resumeTimer);
            controls.autoRotate = false;
        });
        controls.addEventListener('end', () => {
            window.clearTimeout(this._resumeTimer);
            this._resumeTimer = window.setTimeout(() => this._updateAutoRotate(), resumeDelaySeconds * 1000);
        });
        // With no loop running (reduced motion), each camera move asks for its own frame
        controls.addEventListener('change', () => {
            if (reducedMotion()) this._requestRender();
        });
    }

    /** @param {boolean} hovered */
    _setHovered(hovered) {
        this._hovered = hovered;
        this._updateAutoRotate();
    }

    _updateAutoRotate() {
        this._controls.autoRotate = !reducedMotion() && !this._hovered;
    }

    /**
     * Load the model file (GLB or STL), assign materials by part role, and frame it.
     * @returns {Promise<void>}
     */
    async load() {
        const url = withBase(this._model.filePath);
        const root = new Group();
        if (url.toLowerCase().endsWith('.stl')) {
            const geometry = await new STLLoader().loadAsync(url);
            root.add(new Mesh(geometry));
        } else {
            const gltf = await getGltfLoader().loadAsync(url);
            root.add(gltf.scene);
        }

        // Sort the file's contents first: surfaces by role, and line primitives, which are
        // the model's own line drawing
        /** @type {Mesh[]} */
        const meshes = [];
        root.traverse(object => {
            if (/** @type {LineSegments} */ (object).isLineSegments) {
                const lines = /** @type {LineSegments} */ (object);
                lines.material = this._drawingMaterial;
                this._drawing.push(lines);
            } else if (/** @type {Mesh} */ (object).isMesh) {
                meshes.push(/** @type {Mesh} */ (object));
            }
        });
        // One mesh per slice, yielding between them, so normals and edge extraction never
        // hold the main thread for long
        for (const mesh of meshes) {
            // NOVA's surfaces carry positions only; smooth normals come from the mesh
            if (!mesh.geometry.attributes.normal) mesh.geometry.computeVertexNormals();
            if (this._roleOf(mesh) === 'coolant') {
                mesh.material = this._coolantMaterial;
                this._coolant.push(mesh);
            } else {
                mesh.material = this._wallMaterial;
                // Walls draw first, so in the hidden-line mode their depth is in place before
                // any line is tested against it
                mesh.renderOrder = -1;
                this._walls.push(mesh);
                // Rims and creases as ink lines, the line-art look of the rest of the site;
                // children of the mesh, so they share its transform
                mesh.add(new LineSegments(new EdgesGeometry(mesh.geometry, edgeThresholdDeg), this._edgeMaterial));
            }
            await yieldToMain();
        }

        // Orient, then center on the bounding box so the orbit target is the model center
        const pivot = new Group();
        pivot.add(root);
        const [rx, ry, rz] = this._model.rotation ?? [0, 0, 0];
        root.rotation.set(rx, ry, rz);
        pivot.updateMatrixWorld(true);
        const center = new Box3().setFromObject(root, true).getCenter(new Vector3());
        root.position.sub(center);
        pivot.updateMatrixWorld(true);
        this._modelBox.setFromObject(pivot, true);
        this._scene.add(pivot);

        this._ready = true;
        this.setMode(this._mode);
        this.resetView();
    }

    /**
     * Material role of a mesh: the first role found on it or its ancestors in the model's
     * partRoles table; anything unlisted is a wall.
     * @param {import('three').Object3D} object
     * @returns {string}
     */
    _roleOf(object) {
        const roles = this._model.partRoles ?? {};
        for (let node = /** @type {import('three').Object3D | null} */ (object); node; node = node.parent) {
            if (roles[node.name]) return roles[node.name];
        }
        return 'wall';
    }

    /**
     * Switch render mode.
     * @param {string} mode - A key of the modes table
     */
    setMode(mode) {
        const settings = modes[mode] ?? modes.solid;
        this._mode = mode;
        const translucent = settings.walls === 'translucent';
        this._wallMaterial.transparent = translucent;
        this._wallMaterial.opacity = translucent ? translucentOpacity : 1;
        // Translucent walls must not hide what is behind them in the depth buffer
        this._wallMaterial.depthWrite = !translucent;
        this._wallMaterial.needsUpdate = true;
        // A hidden wall swaps material rather than visibility: mesh.visible would also hide
        // its child edge lines
        const wallMaterial = settings.walls === 'hidden' ? this._depthMaterial : this._wallMaterial;
        this._walls.forEach(mesh => { mesh.material = wallMaterial; });
        this._coolant.forEach(mesh => { mesh.visible = settings.coolant; });
        this._drawing.forEach(lines => { lines.visible = settings.drawing; });
        this._edgeMaterial.opacity = settings.edgeOpacity;
        this._requestRender();
    }

    /** Return the camera to the model's home view, framed for the card's current shape. */
    resetView() {
        if (!this._ready) return;
        this._interacted = false;
        this._controls.target.set(0, 0, 0);
        this._frame();
        this._controls.update();
        this._updateAutoRotate();
        this._requestRender();
    }

    /**
     * Place the camera along the home direction at the distance where the bounding box
     * fills frameFill of the view. Projection scales with 1/depth, so a few corrections
     * from the bounding-sphere distance converge.
     */
    _frame() {
        const camera = this._camera;
        const box = this._modelBox;
        const corners = [];
        for (let i = 0; i < 8; i++) {
            corners.push(new Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z));
        }
        const radius = box.getBoundingSphere(new Sphere()).radius;
        let distance = radius / Math.sin((camera.fov * Math.PI) / 360);
        // The corners are projected with the current aspect
        camera.updateProjectionMatrix();
        const projected = new Vector3();
        for (let pass = 0; pass < 4; pass++) {
            camera.position.copy(this._homeDirection).multiplyScalar(distance);
            camera.lookAt(0, 0, 0);
            camera.updateMatrixWorld();
            let extent = 0;
            corners.forEach(corner => {
                projected.copy(corner).project(camera);
                extent = Math.max(extent, Math.abs(projected.x), Math.abs(projected.y));
            });
            distance *= extent / frameFill;
        }
        camera.position.copy(this._homeDirection).multiplyScalar(distance);
        camera.near = distance / 50;
        camera.far = distance * 10;
        camera.updateProjectionMatrix();
        this._controls.minDistance = distance * 0.3;
        this._controls.maxDistance = distance * 2.5;
    }

    /**
     * Re-color from the site tokens.
     * @param {Record<string, string>} colors - Output of themeColors(viewTokens)
     */
    applyTheme(colors) {
        this._wallMaterial.color.set(colors['scene-structure']);
        this._coolantMaterial.color.set(colors.accent);
        this._edgeMaterial.color.set(colors['scene-ink']);
        this._drawingMaterial.color.set(colors['scene-ink']);
        this._requestRender();
    }

    /**
     * Draw into the viewport and scissor rectangle the stage has set.
     * @param {import('three').WebGLRenderer} renderer
     * @param {number} dtSeconds
     * @param {number} aspect
     */
    render(renderer, dtSeconds, aspect) {
        if (!this._ready) return;
        if (Math.abs(aspect - this._aspect) > 1e-3) {
            this._camera.aspect = aspect;
            this._aspect = aspect;
            // Until the visitor moves the camera, a new card shape gets a fresh framing
            if (!this._interacted) this._frame();
            this._camera.updateProjectionMatrix();
        }
        this._controls.update(dtSeconds || null);
        renderer.render(this._scene, this._camera);
    }

    /**
     * State for the development hook in viewer.js.
     * @returns {{ mode: string, azimuth: number, distance: number, autoRotate: boolean, wallColor: string }}
     */
    info() {
        return {
            mode: this._mode,
            azimuth: Number(this._controls.getAzimuthalAngle().toFixed(4)),
            distance: Number(this._camera.position.distanceTo(this._controls.target).toFixed(3)),
            autoRotate: this._controls.autoRotate,
            wallColor: `#${this._wallMaterial.color.getHexString()}`
        };
    }

    dispose() {
        window.clearTimeout(this._resumeTimer);
        this._controls.dispose();
        this._scene.traverse(object => {
            const mesh = /** @type {Mesh} */ (object);
            mesh.geometry?.dispose();
        });
        [this._wallMaterial, this._coolantMaterial, this._depthMaterial, this._edgeMaterial, this._drawingMaterial]
            .forEach(material => material.dispose());
    }
}
