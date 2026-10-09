/* ========================================
   SITE MAP SCENE
   A launch complex on the Florida coast that builds out while the visitor stays
   Sean Bowman [10/06/2026]
   ======================================== */

// @ts-check

// Loaded once per visit by SiteMap.astro when the footer nears the viewport; the
// container persists across client-side navigation, so this module's state (scene,
// build progress, launch count) lasts the whole visit. Build progress follows the visit
// clock (clock.js). Everything else animates on "scene time", which slows to 0.2x while
// the visitor hovers a facility.

import {
    BoxGeometry,
    BufferGeometry,
    DirectionalLight,
    Fog,
    Group,
    HemisphereLight,
    IcosahedronGeometry,
    InstancedMesh,
    Line,
    MathUtils,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    PerspectiveCamera,
    PlaneGeometry,
    Raycaster,
    Scene,
    SphereGeometry,
    Vector2,
    Vector3
} from 'three';
import { createRenderer, isLite, onThemeChange, RenderLoop, yieldToMain } from '../three/index.js';
import { reducedMotion } from '../motion.js';
import { siteSeconds, onTick, missionTime } from './clock.js';
import { sites, roadZ, progressOf, buildingAt, schedule } from './plan.js';
import { applyTheme, material, sceneColors } from './materials.js';
import * as build from './structures.js';
import { LaunchSystem } from './vehicle.js';

// Camera 22 units up and 62 back, pitched about 9 degrees down: the tallest tower clears
// the top of the frame and the road sits near the bottom edge
const cameraHeight = 22;
const cameraBack = 62;          // camera z
const lookAtY = 6;
const lookAtZ = -40;
const slowTimeScale = 0.2;
const reducedMotionRenderMs = 5000;

let initialized = false;

/**
 * Small seeded PRNG (mulberry32) so every visitor sees the same scrub and dunes.
 * @param {number} seed
 * @returns {() => number} Uniform values in [0, 1)
 */
function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Build the scene once per visit inside the persisted site-map container. Setup runs in
 * slices that yield to the main thread, and shaders compile asynchronously before the
 * first frame. Rejects if WebGL is unavailable.
 * @param {HTMLElement} container
 * @returns {Promise<void>}
 */
export async function initSiteMap(container) {
    if (initialized) return;
    initialized = true;

    const canvas = /** @type {HTMLCanvasElement} */ (container.querySelector('.site-map-canvas'));
    const status = /** @type {HTMLElement} */ (container.querySelector('.site-map-status'));
    /** @type {Map<string, HTMLAnchorElement>} */
    const labels = new Map();
    container.querySelectorAll('.site-map-label').forEach(element => {
        const anchor = /** @type {HTMLAnchorElement} */ (element);
        labels.set(anchor.dataset.page ?? '', anchor);
    });

    applyTheme();
    const renderer = createRenderer(canvas, { maxPixelRatio: 1.5 });
    const scene = new Scene();
    scene.fog = new Fog(sceneColors.skyLow, 110, 330);
    const camera = new PerspectiveCamera(28, 1, 0.5, 400);

    const hemisphere = new HemisphereLight(sceneColors.skyTop, sceneColors.land, 1.6);
    const sun = new DirectionalLight(0xffffff, 1.4);
    sun.position.set(-40, 60, 50);
    scene.add(hemisphere, sun);

    /* ========================================
       ENVIRONMENT
       ======================================== */

    // Land, beach, and sea extend well past the fog's far distance, so their edges never
    // show; the visible horizon is the fog color, which the CSS sky gradient ends on
    const land = new Mesh(new PlaneGeometry(1400, 90).rotateX(-Math.PI / 2), material('land'));
    land.position.set(0, 0, 33);
    const beach = new Mesh(new PlaneGeometry(1400, 4.6).rotateX(-Math.PI / 2), material('fill'));
    beach.position.set(0, 0.01, -14.3);
    scene.add(land, beach);

    // Ocean: a coarse grid whose vertex heights carry two crossing swells
    const ocean = new Mesh(new PlaneGeometry(1400, 700, 120, 40).rotateX(-Math.PI / 2), material('ocean'));
    ocean.position.set(0, -0.25, -16.5 - 350);
    const oceanPositions = /** @type {import('three').BufferAttribute} */ (ocean.geometry.attributes.position);
    scene.add(ocean);

    // Foam along the shoreline
    const shorePoints = [];
    for (let x = -170; x <= 170; x += 4) shorePoints.push(new Vector3(x, 0.06, -16.4));
    const shoreline = new Line(new BufferGeometry().setFromPoints(shorePoints), material('foam'));
    const shorePositions = /** @type {import('three').BufferAttribute} */ (shoreline.geometry.attributes.position);
    scene.add(shoreline);

    const random = seededRandom(7);
    const lite = isLite();
    await yieldToMain();
    const dummy = new Object3D();

    // Dunes behind the beach
    const duneCount = 34;
    const dunes = new InstancedMesh(new SphereGeometry(1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), material('land'), duneCount);
    for (let i = 0; i < duneCount; i++) {
        dummy.position.set(-150 + i * 9 + random() * 5, 0, -10.5 + random() * 2);
        dummy.scale.set(2.5 + random() * 3, 0.6 + random() * 0.8, 1.6 + random() * 1.2);
        dummy.updateMatrix();
        dunes.setMatrixAt(i, dummy.matrix);
    }
    scene.add(dunes);

    // Scrub, kept clear of facilities and the road
    const scrubCount = lite ? 70 : 160;
    const scrub = new InstancedMesh(new IcosahedronGeometry(1, 0), material('scrub'), scrubCount);
    const keepClear = Object.values(sites).filter(site => site.z > -12);
    let placed = 0;
    while (placed < scrubCount) {
        const x = -110 + random() * 220;
        const z = -8 + random() * 48;
        const nearSite = keepClear.some(site => Math.hypot(site.x - x, site.z - z) < 9);
        if (nearSite || Math.abs(z - roadZ) < 2.5) continue;
        const size = 0.45 + random() * 0.7;
        dummy.position.set(x, size * 0.3, z);
        dummy.scale.set(size, size * 0.65, size);
        dummy.rotation.set(0, random() * Math.PI, 0);
        dummy.updateMatrix();
        scrub.setMatrixAt(placed, dummy.matrix);
        placed += 1;
    }
    scene.add(scrub);

    // Surf break: three crests rolling in, and a surfer on the middle one
    const surfSite = sites.surfBreak;
    const crests = [0, 1, 2].map(() => build.crestLine(15));
    crests.forEach(crest => scene.add(crest));
    const surfer = new Group();
    const board = new Mesh(new BoxGeometry(0.32, 0.06, 1.5), material('fill'));
    const rider = new Mesh(new BoxGeometry(0.24, 0.75, 0.24).translate(0, 0.42, 0), material('fill'));
    surfer.add(board, rider);
    surfer.rotation.y = Math.PI / 2.4;
    scene.add(surfer);

    /* ========================================
       FACILITIES
       ======================================== */

    await yieldToMain();
    const road = build.buildRoad([sites.padA.x, sites.padB.x]);
    const dish = build.buildDish(sites.dish);
    const testStand = build.buildTestStand(sites.testStand);
    await yieldToMain();
    const farm = build.buildPropellantFarm(sites.propellantFarm);
    const hangar = build.buildHangar(sites.hangar);
    await yieldToMain();
    const padA = build.buildPad(sites.padA, 'padA', true);
    await yieldToMain();
    const padB = build.buildPad(sites.padB, 'padB', false, 1);
    const landingZone = build.buildLandingZone(sites.landingZone);
    const vessel = build.buildLandingVessel(sites.landingVessel);
    await yieldToMain();
    const structures = [road, dish.structure, testStand.structure, farm.structure, hangar.structure,
        padA.structure, padB.structure, landingZone.structure, vessel.structure];
    structures.forEach(structure => scene.add(structure.group));

    const marker = build.hereMarker();
    scene.add(marker);

    const done = (/** @type {string} */ id) => progressOf(id, siteSeconds()) >= 1;
    const launches = new LaunchSystem({
        scene,
        hangarDoorway: new Vector3(sites.hangar.x, 0, sites.hangar.z + 4.6),
        doors: hangar.doors,
        pads: [
            { base: padA.base, ready: () => done('padA') && done('hangar') },
            { base: padB.base, ready: () => done('padB') && done('hangar') }
        ],
        landingSites: [
            { base: () => landingZone.base, ready: () => done('landingZone') },
            {
                base: () => new Vector3(sites.landingVessel.x, vessel.deckY + vessel.bob.position.y, sites.landingVessel.z),
                ready: () => done('landingVessel')
            }
        ]
    });

    // Invisible hit volumes for pointer picking, one per page facility
    /** @type {Mesh[]} */
    const hitVolumes = [];
    Object.values(sites).forEach(site => {
        if (!site.page) return;
        const height = (site.labelHeight ?? 6) + 2;
        const volume = new Mesh(new BoxGeometry(10, height, 10).translate(0, height / 2, 0), new MeshBasicMaterial({ visible: false }));
        volume.position.set(site.x, 0, site.z);
        volume.userData.page = site.page;
        hitVolumes.push(volume);
        scene.add(volume);
    });

    /** Page id to its site, for labels, the marker, and camera framing */
    /** @type {Map<string, { x: number, z: number, labelHeight?: number, detail?: string }>} */
    const sitesByPage = new Map();
    /** @type {Map<string, string>} */
    const structureIdByPage = new Map();
    Object.entries(sites).forEach(([id, site]) => {
        if (!site.page) return;
        sitesByPage.set(site.page, site);
        structureIdByPage.set(site.page, id);
        const detail = labels.get(site.page)?.querySelector('.site-map-label-detail');
        if (detail) detail.textContent = site.detail ?? '';
    });

    /* ========================================
       BUILD STATE (1 Hz)
       ======================================== */

    // Hot fires this visit, counted as each one lights (animateHotFire)
    let hotFireCount = 0;
    let wasBurning = false;

    /**
     * @param {number} count
     * @param {string} one
     * @param {string} many
     */
    function counted(count, one, many) {
        return `${count} ${count === 1 ? one : many}`;
    }

    function updateBuild() {
        const seconds = siteSeconds();
        const animate = !reducedMotion();
        structures.forEach(structure => structure.setProgress(progressOf(structure.id, seconds), animate));
        labels.forEach((label, page) => {
            const built = progressOf(structureIdByPage.get(page) ?? '', seconds) >= 1;
            label.classList.toggle('is-hidden', !built);
        });

        // Phase, then the running tallies: hot fires once the test stand stands, launches
        // once the first pad does
        const building = buildingAt(seconds);
        const parts = [missionTime(seconds)];
        if (seconds < schedule[0].start) {
            parts.push('surveying the site');
        } else if (building) {
            const percent = Math.floor(100 * (seconds - building.start) / (building.end - building.start));
            parts.push(`building ${building.label} ${percent}%`);
        } else {
            parts.push('routine operations');
        }
        if (done('testStand')) parts.push(counted(hotFireCount, 'hot fire', 'hot fires'));
        if (done('padA')) parts.push(counted(launches.launchCount, 'launch', 'launches'));
        status.textContent = parts.join(' · ');
        if (reducedMotion()) launches.showParked();
    }

    /* ========================================
       CAMERA, PAGE, AND POINTER
       ======================================== */

    let cameraX = 0;
    let cameraTargetX = 0;
    let panFactor = 1;
    let unitsPerPixel = 0.1;
    let currentPage = '';

    function framePage() {
        currentPage = document.body.dataset.page ?? '';
        const site = sitesByPage.get(currentPage);
        marker.visible = Boolean(site);
        if (site) {
            marker.position.set(site.x, 0.04, site.z);
            cameraTargetX = MathUtils.clamp(site.x * panFactor, -60, 60);
            if (reducedMotion()) cameraX = cameraTargetX;
        }
        labels.forEach((label, page) => {
            if (page === currentPage) label.setAttribute('aria-current', 'page');
            else label.removeAttribute('aria-current');
        });
    }

    function resize() {
        const width = container.clientWidth;
        const height = canvas.clientHeight || 1;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        // Width of the view at the look-at distance decides how far the camera pans: a
        // wide view shows most of the complex and only drifts toward the current page
        const distance = Math.hypot(cameraHeight - lookAtY, cameraBack - lookAtZ);
        const halfWidth = distance * Math.tan(MathUtils.degToRad(camera.fov) / 2) * camera.aspect;
        unitsPerPixel = (2 * halfWidth) / width;
        panFactor = halfWidth > 60 ? 0.25 : 1;
        framePage();
    }

    let timeScale = 1;
    let timeScaleTarget = 1;
    /** @type {string | null} */
    let hoveredPage = null;

    /**
     * @param {string | null} page
     */
    function setHovered(page) {
        if (page === hoveredPage) return;
        if (hoveredPage) labels.get(hoveredPage)?.classList.remove('is-hot');
        hoveredPage = page;
        if (page) labels.get(page)?.classList.add('is-hot');
        timeScaleTarget = page ? slowTimeScale : 1;
        canvas.style.cursor = page ? 'pointer' : '';
    }

    const raycaster = new Raycaster();
    const pointer = new Vector2();

    /**
     * @param {PointerEvent} event
     * @returns {string | null} Page id of the built facility under the pointer
     */
    function pick(event) {
        const rect = canvas.getBoundingClientRect();
        pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(hitVolumes, false)[0];
        const page = hit ? /** @type {string} */ (hit.object.userData.page) : null;
        return page && !labels.get(page)?.classList.contains('is-hidden') ? page : null;
    }

    let dragStartX = 0;
    let dragStartCamera = 0;
    let dragging = false;
    let dragMoved = false;

    canvas.addEventListener('pointerdown', event => {
        dragging = true;
        dragMoved = false;
        dragStartX = event.clientX;
        dragStartCamera = cameraX;
        canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
        if (dragging) {
            const dx = event.clientX - dragStartX;
            if (Math.abs(dx) > 5) dragMoved = true;
            if (dragMoved) {
                cameraX = MathUtils.clamp(dragStartCamera - dx * unitsPerPixel, -75, 75);
                cameraTargetX = cameraX;
                loop.renderOnce();
            }
            return;
        }
        if (event.pointerType === 'mouse') setHovered(pick(event));
    });
    canvas.addEventListener('pointerup', event => {
        dragging = false;
        if (dragMoved) return;
        const page = pick(event);
        if (page) labels.get(page)?.click();
    });
    canvas.addEventListener('pointerleave', () => setHovered(null));
    labels.forEach((label, page) => {
        label.addEventListener('mouseenter', () => setHovered(page));
        label.addEventListener('mouseleave', () => setHovered(null));
    });

    /* ========================================
       FRAME
       ======================================== */

    let sceneTime = 0;
    const projected = new Vector3();
    const dishWorld = new Vector3();

    /**
     * @param {number} time - Scene seconds
     */
    function animateEnvironment(time) {
        for (let i = 0; i < oceanPositions.count; i++) {
            const x = oceanPositions.getX(i);
            const z = oceanPositions.getZ(i);
            oceanPositions.setY(i, 0.28 * Math.sin(0.14 * x + time * 0.8) + 0.22 * Math.sin(0.2 * z - time * 1.1));
        }
        oceanPositions.needsUpdate = true;

        for (let i = 0; i < shorePositions.count; i++) {
            shorePositions.setZ(i, -16.4 + 0.35 * Math.sin(0.25 * shorePositions.getX(i) + time * 1.3));
        }
        shorePositions.needsUpdate = true;

        // Each crest rolls from 26 units out to the shoreline over a 7 s cycle
        crests.forEach((crest, index) => {
            const phase = ((time / 7) + index / 3) % 1;
            crest.position.set(surfSite.x, 0.15 + 0.5 * Math.sin(phase * Math.PI), surfSite.z - 22 * (1 - phase) + 2);
            /** @type {import('three').LineBasicMaterial} */ (crest.material).opacity = Math.min(1, phase * 4) * (1 - Math.pow(phase, 3));
        });
        const surfPhase = ((time / 7) + 1 / 3) % 1;
        surfer.position.set(surfSite.x - 6 + 12 * surfPhase, 0.35 + 0.5 * Math.sin(surfPhase * Math.PI), surfSite.z - 22 * (1 - surfPhase) + 2.8);
        surfer.visible = surfPhase > 0.15 && surfPhase < 0.9;

        vessel.bob.position.y = 0.25 * Math.sin(time * 0.9);
        vessel.bob.rotation.z = 0.025 * Math.sin(time * 0.7);

        const pulse = 0.5 + 0.5 * Math.sin(time * 2.4);
        marker.scale.setScalar(0.9 + 0.15 * pulse);
        material('accent').opacity = 0.3 + 0.25 * pulse;
    }

    /**
     * Run the test stand's hot-fire cycle and count each firing as it lights.
     * @param {number} time
     */
    function animateHotFire(time) {
        const ready = done('testStand');
        const cycle = time % 11;
        const burning = ready && cycle < 3.2;
        if (burning && !wasBurning) hotFireCount += 1;
        wasBurning = burning;
        testStand.plume.visible = burning;
        if (burning) {
            testStand.plume.scale.set(1, Math.min(1, cycle / 0.4) * (0.9 + 0.12 * Math.abs(Math.sin(time * 33))), 1);
        }
        testStand.steam.visible = ready && cycle < 7;
        if (testStand.steam.visible) build.setCloud(testStand.steam, Math.min(1, cycle / 6), 4);
    }

    /**
     * Point the dish at a target, or sweep slowly when idle.
     * @param {Vector3 | null} target
     * @param {number} time
     * @param {number} dt
     */
    function aimDish(target, time, dt) {
        if (!done('dish')) return;
        let azimuth;
        let elevation;
        if (target) {
            dish.head.getWorldPosition(dishWorld);
            const dx = target.x - dishWorld.x;
            const dz = target.z - dishWorld.z;
            azimuth = Math.atan2(-dx, -dz);
            elevation = Math.atan2(target.y - dishWorld.y, Math.hypot(dx, dz));
        } else {
            azimuth = 0.6 * Math.sin(time * 0.15);
            elevation = 0.55;
        }
        const k = Math.min(1, dt * 3);
        dish.head.rotation.y += (azimuth - dish.head.rotation.y) * k;
        const tilt = -(Math.PI / 2 - MathUtils.clamp(elevation, 0.1, 1.45));
        dish.tilt.rotation.x += (tilt - dish.tilt.rotation.x) * k;
    }

    function placeLabels() {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        labels.forEach((label, page) => {
            const site = sitesByPage.get(page);
            if (!site) return;
            projected.set(site.x, site.labelHeight ?? 6, site.z).project(camera);
            const onScreen = projected.z < 1 && Math.abs(projected.x) < 1.05 && Math.abs(projected.y) < 1.1;
            label.style.visibility = onScreen ? 'visible' : 'hidden';
            const x = (projected.x + 1) / 2 * width;
            const y = (1 - projected.y) / 2 * height;
            label.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
        });
    }

    /**
     * @param {number} dt - Seconds since the last frame (0 for a one-off render)
     */
    function frame(dt) {
        timeScale += (timeScaleTarget - timeScale) * Math.min(1, dt * 6);
        const sceneDt = dt * timeScale;
        sceneTime += sceneDt;
        const now = performance.now();
        structures.forEach(structure => structure.animatePops(now));

        if (!reducedMotion()) {
            animateEnvironment(sceneTime);
            animateHotFire(sceneTime);
            const target = launches.update(sceneTime);
            aimDish(target, sceneTime, sceneDt);
            cameraX += (cameraTargetX - cameraX) * (1 - Math.exp(-dt * 2.5));
        } else {
            // Still frame: waves, crests, and the surfer posed at a fixed moment
            animateEnvironment(2.5);
            cameraX = cameraTargetX;
            aimDish(null, 0, 1);
        }

        camera.position.set(cameraX, cameraHeight, cameraBack);
        camera.lookAt(cameraX, lookAtY, lookAtZ);
        placeLabels();
        renderer.render(scene, camera);
    }

    const loop = new RenderLoop(container, frame);

    /* ========================================
       WIRING
       ======================================== */

    new ResizeObserver(() => {
        resize();
        loop.renderOnce();
    }).observe(container);
    resize();
    updateBuild();
    // Compile every shader program off the main thread where the browser supports it
    // (KHR_parallel_shader_compile), so the first frame does not stall on compilation
    await renderer.compileAsync(scene, camera);
    loop.renderOnce();

    onTick(updateBuild);
    // Under reduced motion the loop never runs; redraw the current build state every 5 s
    window.setInterval(() => {
        if (reducedMotion() && !document.hidden) loop.renderOnce();
    }, reducedMotionRenderMs);

    document.addEventListener('astro:page-load', () => {
        framePage();
        loop.renderOnce();
    });

    onThemeChange(() => {
        applyTheme();
        /** @type {Fog} */ (scene.fog).color.copy(sceneColors.skyLow);
        hemisphere.color.copy(sceneColors.skyTop);
        hemisphere.groundColor.copy(sceneColors.land);
        loop.renderOnce();
    });

    // Development aid: draw-call and triangle counts, scene and visit state
    /** @type {any} */ (window).__siteMapInfo = () => ({
        ...renderer.info.render,
        seconds: siteSeconds(),
        sceneTime: Number(sceneTime.toFixed(2)),
        launches: launches.launchCount,
        hotFires: hotFireCount,
        sequenceTime: Number(launches.sequenceTime(sceneTime).toFixed(2)),
        cameraX: Number(cameraX.toFixed(2)),
        page: currentPage,
        lite
    });
}

