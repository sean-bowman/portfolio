/* ========================================
   SITE MAP LAUNCHES
   Rollout, erection, ignition, ascent, and booster return
   Sean Bowman [10/06/2026]
   ======================================== */

// @ts-check

import {
    BoxGeometry,
    BufferGeometry,
    ConeGeometry,
    CylinderGeometry,
    EdgesGeometry,
    Float32BufferAttribute,
    Group,
    Line,
    LineSegments,
    Mesh,
    Vector3
} from 'three';
import { material, materialCopy } from './materials.js';
import { flamePlume, puffCloud, setCloud } from './structures.js';
import { roadZ } from './plan.js';

const trailCapacity = 90;
const halfPi = Math.PI / 2;

// Booster return, as a fraction s of the descent (y = 34 (1 - s)^2 above the landing
// surface, so the booster slows all the way down): the engine relights for the slowdown
// at landingBurnStart, about 17 units up, and kicks up a cloud from landingCloudStart,
// under 5 units up, which spreads and thins until the sequence ends.
const landingBurnStart = 0.3;
const landingCloudStart = 0.62;
const descentStart = 22;
const descentDuration = 10;
const landedSequenceEnd = 34;

/**
 * Smoothstep ease between 0 and 1.
 * @param {number} t
 */
function ease(t) {
    const clamped = Math.min(1, Math.max(0, t));
    return clamped * clamped * (3 - 2 * clamped);
}

/**
 * Solid mesh with ink edges.
 * @param {BufferGeometry} geometry
 */
function inked(geometry) {
    const group = new Group();
    group.add(new Mesh(geometry, material('fill')));
    group.add(new LineSegments(new EdgesGeometry(geometry, 25), material('ink')));
    return group;
}

/**
 * Generic two-stage vehicle, 11.4 units tall, origin at the booster base.
 */
function buildVehicle() {
    const vehicle = new Group();
    const booster = new Group();
    booster.add(inked(new CylinderGeometry(0.55, 0.55, 7, 12).translate(0, 3.5, 0)));
    booster.add(inked(new CylinderGeometry(0.6, 0.6, 0.35, 12).translate(0, 7.1, 0)));
    for (let i = 0; i < 4; i++) {
        const fin = inked(new BoxGeometry(0.08, 1.3, 0.75).translate(0, 0.65, 0.95));
        fin.rotation.y = i * halfPi + Math.PI / 4;
        booster.add(fin);
    }
    const plume = flamePlume(0.7, 5.5);
    plume.visible = false;
    booster.add(plume);

    const upper = new Group();
    upper.add(inked(new CylinderGeometry(0.55, 0.55, 2.6, 12).translate(0, 8.6, 0)));
    upper.add(inked(new ConeGeometry(0.55, 1.5, 12).translate(0, 10.65, 0)));

    vehicle.add(booster, upper);
    return { vehicle, booster, upper, plume };
}

/**
 * @typedef {Object} LandingSite
 * @property {() => Vector3} base - World position of the landing surface (the landing vessel bobs)
 * @property {() => boolean} ready
 */

/**
 * Runs launches one after another once a pad is ready. Times are scene seconds, which
 * slow down while the visitor hovers a facility.
 */
export class LaunchSystem {
    /**
     * @param {Object} options
     * @param {import('three').Scene} options.scene
     * @param {Vector3} options.hangarDoorway - World point the vehicle rolls out from
     * @param {Group[]} options.doors - Hangar door pivots, slid apart for rollout
     * @param {{ base: Vector3, ready: () => boolean }[]} options.pads
     * @param {LandingSite[]} options.landingSites
     */
    constructor({ scene, hangarDoorway, doors, pads, landingSites }) {
        this.hangarDoorway = hangarDoorway;
        this.doors = doors;
        this.doorHomeX = doors.map(door => door.position.x);
        this.pads = pads;
        this.landingSites = landingSites;

        const { vehicle, booster, upper, plume } = buildVehicle();
        this.vehicle = vehicle;
        this.booster = booster;
        this.upper = upper;
        this.plume = plume;
        vehicle.visible = false;

        this.groundCloud = puffCloud(7, 1.6);
        this.groundCloud.visible = false;
        this.landingCloud = puffCloud(6, 1.2);
        this.landingCloud.visible = false;

        this.trailPositions = new Float32Array(trailCapacity * 3);
        this.trailGeometry = new BufferGeometry();
        this.trailGeometry.setAttribute('position', new Float32BufferAttribute(this.trailPositions, 3));
        this.trailGeometry.setDrawRange(0, 0);
        this.trailMaterial = materialCopy('trail');
        this.trail = new Line(this.trailGeometry, this.trailMaterial);
        this.trail.frustumCulled = false;

        scene.add(vehicle, this.groundCloud, this.landingCloud, this.trail);

        this.launchCount = 0;
        this.startTime = -1;      // scene time the current sequence began; -1 when idle
        this.nextStart = 0;       // scene time the next sequence may begin
        this.padIndex = 0;
        this.landingIndex = 0;
        /** @type {{ base: Vector3 } | null} */
        this.pad = null;
        /** @type {LandingSite | null} */
        this.landing = null;
        this.trailCount = 0;
        this.lastTrailTime = 0;
        this.liftedOff = false;
    }

    /**
     * Show a single vehicle standing on the first pad: the still frame under reduced motion.
     */
    showParked() {
        const pad = this.pads[0];
        this.vehicle.visible = pad.ready();
        this.upper.visible = true;
        this.plume.visible = false;
        this.vehicle.rotation.set(0, 0, 0);
        this.vehicle.position.copy(pad.base);
        this.landingCloud.visible = false;
    }

    /**
     * @param {number} time - Scene seconds
     * @returns {Vector3 | null} What the tracking dish should point at, if anything
     */
    update(time) {
        const readyPads = this.pads.filter(pad => pad.ready());
        if (this.startTime < 0) {
            if (readyPads.length === 0 || time < this.nextStart) return null;
            this.begin(time, readyPads);
        }
        return this.step(time - this.startTime, time);
    }

    /**
     * @param {number} time
     * @param {{ base: Vector3, ready: () => boolean }[]} readyPads
     */
    begin(time, readyPads) {
        this.startTime = time;
        this.pad = readyPads[this.padIndex % readyPads.length];
        this.padIndex += 1;
        const landings = this.landingSites.filter(site => site.ready());
        this.landing = landings.length ? landings[this.landingIndex % landings.length] : null;
        this.landingIndex += 1;
        this.liftedOff = false;
        this.trailCount = 0;
        this.trailGeometry.setDrawRange(0, 0);
        this.trailMaterial.opacity = 0.5;
        this.vehicle.visible = true;
        this.upper.visible = true;
        this.plume.visible = false;
        this.groundCloud.visible = false;
        this.landingCloud.visible = false;
    }

    /**
     * Seconds into the current sequence, or -1 between launches.
     * @param {number} time - Scene seconds
     * @returns {number}
     */
    sequenceTime(time) {
        return this.startTime < 0 ? -1 : time - this.startTime;
    }

    /**
     * Pose everything for t seconds into the current sequence.
     * @param {number} t
     * @param {number} time - Scene seconds, for the flicker
     * @returns {Vector3 | null}
     */
    step(t, time) {
        const pad = /** @type {{ base: Vector3 }} */ (this.pad);
        const vehicle = this.vehicle;
        /** @type {Vector3 | null} */
        let tracked = null;

        // Hangar doors: open for rollout, close behind the vehicle
        const doorOpen = t < 4.5 ? ease(t / 1.2) : 1 - ease((t - 4.5) / 1.2);
        this.doors.forEach((door, index) => {
            door.position.x = this.doorHomeX[index] + Math.sign(this.doorHomeX[index]) * 2.9 * doorOpen;
        });

        if (t < 4.2) {
            // Rollout: lying along the road, nose east, out of the hangar and up the pad spur
            const doorway = this.hangarDoorway;
            const legOne = Math.abs(pad.base.x - doorway.x);
            const legTwo = Math.abs(roadZ - pad.base.z);
            const travelled = ease((t - 0.6) / 3.6) * (legOne + legTwo);
            const x = doorway.x + Math.sign(pad.base.x - doorway.x) * Math.min(travelled, legOne);
            const z = travelled <= legOne ? roadZ : roadZ - (travelled - legOne);
            // Appears on the road once the doors are apart, rather than through the wall
            vehicle.visible = t >= 0.6;
            vehicle.position.set(x, 1, z);
            vehicle.rotation.set(0, 0, -halfPi);
        } else if (t < 6.2) {
            // Raised from horizontal to vertical about the booster base
            vehicle.position.copy(pad.base);
            vehicle.rotation.set(0, 0, -halfPi * (1 - ease((t - 4.2) / 2)));
        } else if (t < 19) {
            vehicle.position.copy(pad.base);
            vehicle.rotation.set(0, 0, 0);
            if (t >= 9) {
                // Ignition and ground cloud
                this.plume.visible = true;
                const flicker = 0.92 + 0.12 * Math.abs(Math.sin(time * 37));
                this.plume.scale.set(1, Math.min(1, (t - 9) / 0.6) * flicker, 1);
                this.groundCloud.visible = true;
                this.groundCloud.position.copy(pad.base);
                setCloud(this.groundCloud, Math.min(1, (t - 9) / 6), 6);
            }
            if (t >= 10) {
                // Ascent: accelerating climb, pitching over toward the ocean (-z)
                if (!this.liftedOff) {
                    this.liftedOff = true;
                    this.launchCount += 1;
                }
                const tau = t - 10;
                vehicle.position.set(pad.base.x, pad.base.y + 0.9 * Math.pow(tau, 2.2), pad.base.z - 0.12 * Math.pow(tau, 2.5));
                vehicle.rotation.set(-Math.min(0.75, 0.04 * Math.pow(tau, 1.7)), 0, 0);
                this.pushTrail(time, vehicle.position);
                tracked = vehicle.position;
            }
        } else {
            // Stage separation happens far above the frame; the upper stage is gone
            this.upper.visible = false;
            this.trailMaterial.opacity = Math.max(0, 0.5 * (1 - (t - 19) / 6));
            this.groundCloud.visible = t < 26;
            if (this.groundCloud.visible) setCloud(this.groundCloud, Math.min(1, (t - 9) / 6), 6);

            if (this.landing && t >= descentStart) {
                // Booster return: a descent that slows all the way down on its engine, with
                // the plume lengthening as the booster nears the surface
                const s = Math.min(1, (t - descentStart) / descentDuration);
                const base = this.landing.base();
                vehicle.visible = true;
                vehicle.rotation.set(0, 0, 0);
                vehicle.position.set(base.x, base.y + 34 * Math.pow(1 - s, 2), base.z);
                this.plume.visible = s >= landingBurnStart && s < 1;
                if (this.plume.visible) {
                    const burn = (s - landingBurnStart) / (1 - landingBurnStart);
                    const flicker = 0.1 * Math.abs(Math.sin(time * 41));
                    this.plume.scale.set(0.8, 0.45 + 0.3 * burn + flicker, 0.8);
                }

                // The exhaust reaching the pad or the deck raises a cloud that spreads and
                // thins out by the end of the sequence
                const cloudStartTime = descentStart + landingCloudStart * descentDuration;
                this.landingCloud.visible = t >= cloudStartTime;
                if (this.landingCloud.visible) {
                    this.landingCloud.position.copy(base);
                    setCloud(this.landingCloud, Math.min(1, (t - cloudStartTime) / (landedSequenceEnd - cloudStartTime)), 3.5);
                }
                tracked = s < 1 ? vehicle.position : null;
            } else {
                vehicle.visible = false;
                this.plume.visible = false;
            }

            const end = this.landing ? landedSequenceEnd : 26;
            if (t >= end) {
                // Sequence over; a landed booster stays put until the next rollout
                this.startTime = -1;
                this.plume.visible = false;
                this.groundCloud.visible = false;
                this.landingCloud.visible = false;
                const readyPads = this.pads.filter(candidate => candidate.ready()).length;
                this.nextStart = time + (readyPads > 1 ? 10 : 20);
                if (!this.landing) vehicle.visible = false;
            }
        }
        return tracked;
    }

    /**
     * Record the vehicle position into the fading ascent trail.
     * @param {number} time
     * @param {Vector3} position
     */
    pushTrail(time, position) {
        if (time - this.lastTrailTime < 0.08 || this.trailCount >= trailCapacity) return;
        this.lastTrailTime = time;
        this.trailPositions.set([position.x, position.y, position.z], this.trailCount * 3);
        this.trailCount += 1;
        this.trailGeometry.attributes.position.needsUpdate = true;
        this.trailGeometry.setDrawRange(0, this.trailCount);
    }
}
