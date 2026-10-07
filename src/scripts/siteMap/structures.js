/* ========================================
   SITE MAP STRUCTURES
   Low-poly facilities that build part by part, blueprint first
   Sean Bowman [10/06/2026]
   ======================================== */

// @ts-check

import {
    BoxGeometry,
    BufferGeometry,
    CircleGeometry,
    ConeGeometry,
    CylinderGeometry,
    EdgesGeometry,
    ExtrudeGeometry,
    Group,
    LatheGeometry,
    Line,
    LineSegments,
    Mesh,
    Shape,
    SphereGeometry,
    Vector2,
    Vector3
} from 'three';
import { material, materialCopy } from './materials.js';
import { roadZ } from './plan.js';

const popMs = 450;
const edgeAngleDeg = 25;

/**
 * @typedef {Object} Part
 * @property {Group} pivot - Solid mesh and ink outline; scaled for the pop
 * @property {Group} blueprint - Dashed accent outline shown until the part turns solid
 * @property {number} poppedAt - performance.now() when it turned solid, or -1
 */

/**
 * A facility that builds part by part. Parts turn solid in the order they were added;
 * while building, the remaining parts show as a dashed blueprint, and a crane stands by
 * tall structures.
 */
export class Structure {
    /**
     * @param {string} id
     * @param {number} x
     * @param {number} z
     */
    constructor(id, x, z) {
        this.id = id;
        this.group = new Group();
        this.group.position.set(x, 0, z);
        /** @type {Part[]} */
        this.parts = [];
        /** @type {Group | null} */
        this.crane = null;
        this.progress = -1;
    }

    /**
     * Add one buildable part. Geometry is authored with its base at y = 0, so the pop
     * scales up from the ground.
     * @param {BufferGeometry} geometry
     * @param {Object} [options]
     * @param {[number, number, number]} [options.at] - Position in the parent's frame
     * @param {[number, number, number]} [options.rotation]
     * @param {'fill' | 'fillDouble' | 'land' | 'shadow' | 'accent'} [options.fill]
     * @param {boolean} [options.outline] - Draw ink edges
     * @param {Group} [options.parent] - Animated sub-group (dish head, hangar door)
     * @returns {Group} The part's pivot
     */
    addPart(geometry, { at = [0, 0, 0], rotation = [0, 0, 0], fill = 'fill', outline = true, parent = this.group } = {}) {
        const pivot = new Group();
        pivot.position.set(...at);
        pivot.rotation.set(...rotation);
        pivot.add(new Mesh(geometry, material(fill)));
        const edges = new EdgesGeometry(geometry, edgeAngleDeg);
        if (outline) pivot.add(new LineSegments(edges, material('ink')));

        const blueprint = new Group();
        blueprint.position.copy(pivot.position);
        blueprint.rotation.copy(pivot.rotation);
        const dashed = new LineSegments(edges, material('blueprint'));
        dashed.computeLineDistances();
        blueprint.add(dashed);

        parent.add(pivot, blueprint);
        this.parts.push({ pivot, blueprint, poppedAt: -1 });
        return pivot;
    }

    /**
     * Add a tower crane beside the structure, shown only while it builds.
     * @param {number} offsetX
     * @param {number} height
     */
    addCrane(offsetX, height) {
        const crane = new Group();
        crane.position.set(offsetX, 0, 0);
        const mast = new BoxGeometry(0.35, height, 0.35).translate(0, height / 2, 0);
        const jib = new BoxGeometry(8, 0.28, 0.28).translate(2.4, height, 0);
        crane.add(new LineSegments(new EdgesGeometry(mast), material('inkSoft')));
        crane.add(new LineSegments(new EdgesGeometry(jib), material('inkSoft')));
        crane.add(new Line(new BufferGeometry().setFromPoints([new Vector3(5.6, height, 0), new Vector3(5.6, height * 0.45, 0)]), material('inkSoft')));
        crane.visible = false;
        this.group.add(crane);
        this.crane = crane;
    }

    /**
     * Show the structure at a build progress between 0 and 1.
     * @param {number} progress
     * @param {boolean} animate - Pop newly solid parts (off under reduced motion)
     */
    setProgress(progress, animate) {
        if (progress === this.progress) return;
        this.progress = progress;
        const solidCount = Math.floor(progress * this.parts.length + 1e-6);
        const building = progress > 0 && progress < 1;
        const now = performance.now();
        this.parts.forEach((part, index) => {
            const solid = index < solidCount;
            if (solid && !part.pivot.visible && animate) {
                part.poppedAt = now;
                part.pivot.scale.setScalar(0.6);
            }
            part.pivot.visible = solid;
            part.blueprint.visible = !solid && building;
        });
        if (this.crane) this.crane.visible = building;
    }

    /**
     * Advance the scale pop of parts that just turned solid.
     * @param {number} now - performance.now()
     */
    animatePops(now) {
        this.parts.forEach(part => {
            if (part.poppedAt < 0) return;
            const k = Math.min(1, (now - part.poppedAt) / popMs);
            const eased = 1 - Math.pow(1 - k, 3);
            part.pivot.scale.setScalar(0.6 + 0.4 * eased);
            if (k >= 1) part.poppedAt = -1;
        });
    }
}

/* ========================================
   GEOMETRY HELPERS (base at y = 0)
   ======================================== */

/**
 * @param {number} width
 * @param {number} height
 * @param {number} depth
 */
function box(width, height, depth) {
    return new BoxGeometry(width, height, depth).translate(0, height / 2, 0);
}

/**
 * @param {number} radiusTop
 * @param {number} radiusBottom
 * @param {number} height
 * @param {number} [segments]
 */
function cylinder(radiusTop, radiusBottom, height, segments = 10) {
    return new CylinderGeometry(radiusTop, radiusBottom, height, segments).translate(0, height / 2, 0);
}

/* ========================================
   FACILITIES
   ======================================== */

/**
 * Access road along the front of the complex with spurs to both pads, built west to east.
 * @param {number[]} padXs
 */
export function buildRoad(padXs) {
    const structure = new Structure('road', 0, 0);
    for (let x = -57; x <= 33; x += 6) {
        structure.addPart(box(6, 0.06, 2.4), { at: [x, 0, roadZ] });
    }
    padXs.forEach(padX => {
        structure.addPart(box(2.4, 0.06, 10), { at: [padX, 0, roadZ - 6] });
    });
    return structure;
}

/**
 * Tracking dish: pedestal, rotating head, and a parabolic reflector on an elevation axis.
 * @param {{ x: number, z: number }} site
 */
export function buildDish(site) {
    const structure = new Structure('dish', site.x, site.z);
    structure.addPart(cylinder(0.6, 0.95, 3.2, 8));

    const head = new Group();
    head.position.y = 3.2;
    structure.group.add(head);
    structure.addPart(box(2.4, 0.5, 0.7), { parent: head });

    const tilt = new Group();
    tilt.position.y = 1.2;
    head.add(tilt);
    // Paraboloid y = r^2 / (4f) with focal length f = 1.9, rim radius 3.2
    const profile = [];
    for (let r = 0; r <= 3.2001; r += 0.4) profile.push(new Vector2(r, (r * r) / (4 * 1.9)));
    structure.addPart(new LatheGeometry(profile, 14), { parent: tilt, fill: 'fillDouble' });
    structure.addPart(cylinder(0.06, 0.06, 1.9, 5), { parent: tilt });
    structure.addPart(new ConeGeometry(0.25, 0.5, 6).rotateX(Math.PI).translate(0, 2.1, 0), { parent: tilt });
    return { structure, head, tilt };
}

/**
 * Bell nozzle as a lathe surface, base at the exit plane (y = 0) and the throat on top.
 * The radius grows steeply just below the throat and flattens toward the exit:
 * r = rThroat + (rExit - rThroat) * (x / length)^0.6, with x measured down from the throat.
 * @param {number} throatRadius
 * @param {number} exitRadius
 * @param {number} length
 */
function bellNozzle(throatRadius, exitRadius, length) {
    const profile = [];
    for (let i = 0; i <= 9; i++) {
        const fromThroat = (i / 9) * length;
        const radius = throatRadius + (exitRadius - throatRadius) * Math.pow(fromThroat / length, 0.6);
        profile.push(new Vector2(radius, length - fromThroat));
    }
    return new LatheGeometry(profile, 16);
}

/**
 * Vertical engine test stand: base slab, four-post tower, an engine firing down
 * (chamber, converging section, throat, bell) into a flame deflector, and a run tank on
 * the ground beside the slab with its feed line into the chamber.
 * @param {{ x: number, z: number }} site
 */
export function buildTestStand(site) {
    const structure = new Structure('testStand', site.x, site.z);
    structure.addPart(box(6.5, 0.8, 6));
    const half = 1.6;
    [[-half, -half], [half, -half], [-half, half], [half, half]].forEach(([x, z]) => {
        structure.addPart(box(0.35, 11, 0.35), { at: [x, 0.8, z] });
    });
    [3.8, 6.8, 9.8].forEach(y => {
        structure.addPart(box(2 * half + 0.35, 0.22, 0.22), { at: [0, y, half] });
        structure.addPart(box(2 * half + 0.35, 0.22, 0.22), { at: [0, y, -half] });
    });
    structure.addPart(box(4.2, 0.4, 4.2), { at: [0, 11.8, 0] });
    // Engine, top down: chamber 6.6 to 8.8, converging section to the throat at 6.1, bell
    // to the exit plane at 4.3
    structure.addPart(cylinder(0.7, 0.7, 2.2, 12), { at: [0, 6.6, 0] });
    structure.addPart(cylinder(0.7, 0.32, 0.5, 12), { at: [0, 6.1, 0] });
    structure.addPart(bellNozzle(0.32, 1.05, 1.8), { at: [0, 4.3, 0], fill: 'fillDouble' });
    structure.addPart(box(3.2, 1.6, 2.4), { at: [0, 0.8, 0], rotation: [0, 0, 0.35] });
    // Run tank on the ground, clear of the slab (which ends at x = 3.25), and its feed line
    structure.addPart(cylinder(1.1, 1.1, 6.5, 12), { at: [4.9, 0, 0] });
    structure.addPart(box(3.1, 0.18, 0.18), { at: [2.25, 7.9, 0] });
    structure.addCrane(-6, 15);

    // Hot-fire plume (from the nozzle exit down into the deflector) and the steam that
    // the deflector turns sideways
    const plume = flamePlume(0.95, 3.5);
    plume.position.set(0, 4.3, 0);
    plume.visible = false;
    structure.group.add(plume);
    const steam = puffCloud(5, 0.8);
    steam.position.set(1.8, 1.2, 0);
    steam.visible = false;
    structure.group.add(steam);
    return { structure, plume, steam };
}

/**
 * Two spherical propellant tanks on legs with a transfer line toward the pads.
 * @param {{ x: number, z: number }} site
 */
export function buildPropellantFarm(site) {
    const structure = new Structure('propellantFarm', site.x, site.z);
    [-3.2, 3.2].forEach(x => {
        [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]].forEach(([dx, dz]) => {
            structure.addPart(cylinder(0.14, 0.14, 2.6, 5), { at: [x + dx, 0, dz] });
        });
        structure.addPart(new SphereGeometry(2.3, 12, 8).translate(0, 2.3, 0), { at: [x, 1.6, 0] });
    });
    structure.addPart(box(20, 0.3, 0.3), { at: [15, 0.4, -2.2] });
    return { structure };
}

/**
 * Integration hangar with a gabled roof and doors on the road side that slide open for
 * rollout.
 * @param {{ x: number, z: number }} site
 */
export function buildHangar(site) {
    const structure = new Structure('hangar', site.x, site.z);
    structure.addPart(box(13, 5.6, 8));
    const gable = new Shape([new Vector2(-4.2, 0), new Vector2(4.2, 0), new Vector2(0, 2.4)]);
    const roof = new ExtrudeGeometry(gable, { depth: 13.4, bevelEnabled: false }).translate(0, 0, -6.7).rotateY(Math.PI / 2);
    structure.addPart(roof, { at: [0, 5.6, 0] });
    const doors = [-1, 1].map(side => structure.addPart(box(3.1, 5, 0.25), { at: [side * 1.55, 0, 4.1] }));
    structure.addCrane(-9, 11);
    return { structure, doors };
}

/**
 * Launch pad: deck with a flame trench, a service tower with an access arm, and, on the
 * first pad, two lightning masts with a catenary wire.
 * @param {{ x: number, z: number }} site
 * @param {string} id
 * @param {boolean} withMasts
 */
export function buildPad(site, id, withMasts) {
    const structure = new Structure(id, site.x, site.z);
    structure.addPart(box(9, 0.6, 9));
    structure.addPart(new BoxGeometry(2.2, 0.02, 9.2).translate(0, 0.61, 0), { fill: 'shadow', outline: false });
    const towerX = -3.6;
    const half = 1.1;
    [[-half, -half], [half, -half], [-half, half], [half, half]].forEach(([x, z]) => {
        structure.addPart(box(0.3, 17.5, 0.3), { at: [towerX + x, 0.6, z] });
    });
    for (let y = 3.6; y <= 16.6; y += 3.25) {
        structure.addPart(box(2 * half + 0.3, 0.2, 0.2), { at: [towerX, y, half] });
        structure.addPart(box(2 * half + 0.3, 0.2, 0.2), { at: [towerX, y, -half] });
    }
    structure.addPart(box(2.6, 0.3, 0.4), { at: [towerX + 2.2, 11.5, 0] });
    if (withMasts) {
        structure.addPart(cylinder(0.1, 0.2, 22, 6), { at: [-5.6, 0, 5.6] });
        const secondMast = structure.addPart(cylinder(0.1, 0.2, 22, 6), { at: [5.6, 0, -5.6] });
        // Catenary wire between the mast tips, carried by the second mast so it appears
        // with it; points are in that mast's frame
        secondMast.add(new Line(new BufferGeometry().setFromPoints([
            new Vector3(-11.2, 22, 11.2), new Vector3(-5.6, 19.5, 5.6), new Vector3(0, 22, 0)
        ]), material('inkSoft')));
    }
    structure.addCrane(-9.5, 22);
    return { structure, base: new Vector3(site.x, 0.6, site.z) };
}

/**
 * Concrete landing zone with a ring and cross marking.
 * @param {{ x: number, z: number }} site
 */
export function buildLandingZone(site) {
    const structure = new Structure('landingZone', site.x, site.z);
    const pad = structure.addPart(cylinder(4.4, 4.4, 0.08, 28));
    const ring = new Line(new BufferGeometry().setFromPoints(
        Array.from({ length: 41 }, (_, i) => new Vector3(Math.cos(i * Math.PI / 20) * 3.2, 0.1, Math.sin(i * Math.PI / 20) * 3.2))
    ), material('ink'));
    const cross = new LineSegments(new BufferGeometry().setFromPoints([
        new Vector3(-1.4, 0.1, 0), new Vector3(1.4, 0.1, 0), new Vector3(0, 0.1, -1.4), new Vector3(0, 0.1, 1.4)
    ]), material('ink'));
    pad.add(ring, cross);
    return { structure, base: new Vector3(site.x, 0.08, site.z) };
}

/**
 * Landing vessel offshore; the whole hull bobs on the swell.
 * @param {{ x: number, z: number }} site
 */
export function buildLandingVessel(site) {
    const structure = new Structure('landingVessel', site.x, site.z);
    const bob = new Group();
    structure.group.add(bob);
    structure.addPart(box(11, 1.2, 6), { at: [0, -0.7, 0], parent: bob });
    structure.addPart(box(1.4, 1.4, 6), { at: [-4.8, 0.5, 0], parent: bob });
    return { structure, bob, deckY: 0.5 };
}

/* ========================================
   EFFECTS
   ======================================== */

/**
 * Three nested cones pointing down from the origin: outer, mid, and core flame.
 * @param {number} radius
 * @param {number} length
 * @returns {Group}
 */
export function flamePlume(radius, length) {
    const plume = new Group();
    /** @type {['flameOuter' | 'flameMid' | 'flameCore', number, number][]} */
    const layers = [['flameOuter', 1, 1], ['flameMid', 0.72, 0.78], ['flameCore', 0.45, 0.52]];
    layers.forEach(([name, radiusScale, lengthScale]) => {
        const coneLength = length * lengthScale;
        // Apex down: flipped about x, then shifted so the open base sits at the origin
        const geometry = new ConeGeometry(radius * radiusScale, coneLength, 12, 1, true)
            .rotateX(Math.PI)
            .translate(0, -coneLength / 2, 0);
        plume.add(new Mesh(geometry, material(name)));
    });
    return plume;
}

/**
 * A cluster of puffs for ground clouds and steam; each child scales and fades.
 * @param {number} count
 * @param {number} spread
 * @returns {Group}
 */
export function puffCloud(count, spread) {
    const cloud = new Group();
    const smoke = materialCopy('smoke');
    cloud.userData.material = smoke;
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const puff = new Mesh(new SphereGeometry(1, 8, 6), smoke);
        puff.position.set(Math.cos(angle) * spread, 0.6 + (i % 2) * 0.4, Math.sin(angle) * spread * 0.6);
        puff.userData.direction = new Vector3(Math.cos(angle), 0.15, Math.sin(angle) * 0.6);
        cloud.add(puff);
    }
    return cloud;
}

/**
 * Set a puff cloud's expansion: radius scale and opacity follow progress 0 to 1.
 * @param {Group} cloud
 * @param {number} progress
 * @param {number} reach - Distance each puff travels outward at progress 1
 */
export function setCloud(cloud, progress, reach) {
    const eased = 1 - Math.pow(1 - progress, 2);
    cloud.children.forEach(puff => {
        puff.scale.setScalar(0.4 + 2.2 * eased);
        puff.position.copy(puff.userData.direction).multiplyScalar(0.8 + reach * eased).setY(0.6 + 1.4 * eased);
    });
    cloud.userData.material.opacity = 0.9 * (1 - Math.pow(progress, 1.6));
}

/**
 * Wave crest line for the surf break.
 * @param {number} width
 * @returns {Line}
 */
export function crestLine(width) {
    const points = [];
    for (let i = 0; i <= 24; i++) {
        const u = i / 24 - 0.5;
        points.push(new Vector3(u * width, 0, -Math.cos(u * Math.PI) * 1.2));
    }
    const geometry = new BufferGeometry().setFromPoints(points);
    return new Line(geometry, materialCopy('foam'));
}

/**
 * Small ground marker under the current page's facility.
 * @returns {Mesh}
 */
export function hereMarker() {
    const ring = new Mesh(new CircleGeometry(2.4, 40).rotateX(-Math.PI / 2), material('accent'));
    ring.position.y = 0.04;
    return ring;
}

