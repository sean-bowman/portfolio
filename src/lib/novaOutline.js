/* ========================================
   NOVA NOZZLE OUTLINE
   NOVA's worked-example wall, mapped into small drawings at build time
   Sean Bowman [10/08/2026]
   ======================================== */

// @ts-check

// Used by the favicon endpoint and the role illustrations. The wall in heroNet.json is the
// NOVA worked example in throat radii (tools/exportNovaNet.py): the chamber runs to
// x = -2.14 at r = 1.79, the throat sits at x = 0, r = 1, and the bell ends at x = 15.9,
// r = 6.325. The wall is split at the throat and each section is normalized to unit length
// and unit change in radius, which keeps its true shape. A drawing then places the chamber,
// throat, and exit where it needs them; each section maps linearly in each direction, so a
// small drawing can choose a legible throat width while the bell keeps NOVA's curvature.
// Half-widths in NOVA's own ratios (chamber 1.79, exit 6.325 times the throat) keep the
// radial proportions exact.

import net from '../data/heroNet.json';

/** NOVA's chamber and exit radii over the throat radius */
export const novaRatios = {
    chamber: net.wall[1],
    exit: net.exitR
};

/** @typedef {[number, number]} Point */

/** @type {Point[]} */
const wall = [];
for (let i = 0; i < net.wall.length; i += 2) wall.push([net.wall[i], net.wall[i + 1]]);

/**
 * One wall section as (u, v): u from 0 to 1 along the axis, v from 0 at the throat to 1 at
 * the section's far end (the chamber, or the exit).
 * @param {Point[]} points - [x, r] from the throat outward
 * @returns {Point[]}
 */
function normalized(points) {
    const [x0] = points[0];
    const [x1, r1] = points[points.length - 1];
    return points.map(([x, r]) => [(x - x0) / (x1 - x0), (r - 1) / (r1 - 1)]);
}

// The resampled wall has no point exactly at the throat; insert it at x = 0, r = 1
const converging = normalized([[0, 1], ...wall.filter(([x]) => x < 0).reverse()]);
const diverging = normalized([[0, 1], ...wall.filter(([x]) => x > 0)]);

/**
 * Where a drawing puts the nozzle. Axial positions run in the flow direction.
 * @typedef {Object} OutlineSpec
 * @property {number} chamberAt - Upstream end of the straight chamber (the injector face)
 * @property {number} convergeAt - Where the converging section begins
 * @property {number} throatAt
 * @property {number} exitAt
 * @property {number} chamberHalf - Half-widths across the axis
 * @property {number} throatHalf
 * @property {number} exitHalf
 * @property {number} axis - Cross-axis coordinate of the centerline
 * @property {boolean} [vertical] - Axis along y, flow downward; otherwise along x, flow to the right
 */

/**
 * Half-width of the nozzle at an axial position.
 * @param {OutlineSpec} spec
 * @param {number} axial
 * @returns {number}
 */
export function halfWidthAt(spec, axial) {
    if (axial <= spec.convergeAt) return spec.chamberHalf;
    const section = axial < spec.throatAt
        ? { curve: converging, start: spec.throatAt, end: spec.convergeAt, far: spec.chamberHalf }
        : { curve: diverging, start: spec.throatAt, end: spec.exitAt, far: spec.exitHalf };
    const u = Math.min(1, Math.max(0, (axial - section.start) / (section.end - section.start)));
    let v = section.curve[section.curve.length - 1][1];
    for (let i = 1; i < section.curve.length; i++) {
        const [u0, v0] = section.curve[i - 1];
        const [u1, v1] = section.curve[i];
        if (u <= u1) {
            v = v0 + (v1 - v0) * (u - u0) / (u1 - u0 || 1);
            break;
        }
    }
    return spec.throatHalf + v * (section.far - spec.throatHalf);
}

/**
 * One wall of the nozzle from the injector face to the exit, in drawing coordinates.
 * @param {OutlineSpec} spec
 * @param {1 | -1} side - +1 for the wall at larger cross-axis coordinates
 * @returns {Point[]}
 */
export function wallPoints(spec, side) {
    /** @type {number[]} */
    const axials = [spec.chamberAt, spec.convergeAt];
    [...converging].reverse().forEach(([u]) => axials.push(spec.throatAt + u * (spec.convergeAt - spec.throatAt)));
    diverging.forEach(([u]) => axials.push(spec.throatAt + u * (spec.exitAt - spec.throatAt)));
    const unique = [...new Set(axials.map(a => Math.round(a * 1000) / 1000))].sort((a, b) => a - b);
    /** @type {Point[]} */
    const points = unique.map(axial => {
        const cross = spec.axis + side * halfWidthAt(spec, axial);
        return spec.vertical ? [cross, axial] : [axial, cross];
    });
    return simplify(points, 0.05);
}

/**
 * Douglas-Peucker simplification in drawing units.
 * @param {Point[]} points
 * @param {number} tolerance
 * @returns {Point[]}
 */
function simplify(points, tolerance) {
    const keep = points.map((_, i) => i === 0 || i === points.length - 1);
    /** @type {[number, number][]} */
    const stack = [[0, points.length - 1]];
    while (stack.length) {
        const [first, last] = /** @type {[number, number]} */ (stack.pop());
        const [ax, ay] = points[first];
        const [bx, by] = points[last];
        const length = Math.hypot(bx - ax, by - ay) || 1;
        let worst = -1;
        let worstDistance = 0;
        for (let i = first + 1; i < last; i++) {
            const [px, py] = points[i];
            const distance = Math.abs((bx - ax) * (py - ay) - (by - ay) * (px - ax)) / length;
            if (distance > worstDistance) {
                worst = i;
                worstDistance = distance;
            }
        }
        if (worst > 0 && worstDistance > tolerance) {
            keep[worst] = true;
            stack.push([first, worst], [worst, last]);
        }
    }
    return points.filter((_, i) => keep[i]);
}

/**
 * SVG path data for a polyline, rounded to 0.1.
 * @param {Point[]} points
 * @returns {string}
 */
export function pathData(points) {
    return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${round(x)} ${round(y)}`).join(' ');
}

/**
 * @param {number} value
 * @returns {string}
 */
export function round(value) {
    return String(Math.round(value * 10) / 10);
}
