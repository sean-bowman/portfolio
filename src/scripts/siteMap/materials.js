/* ========================================
   SITE MAP MATERIALS
   Theme-aware materials shared by every object in the scene
   Sean Bowman [10/06/2026]
   ======================================== */

// @ts-check

import {
    Color,
    DoubleSide,
    LineBasicMaterial,
    LineDashedMaterial,
    MeshBasicMaterial,
    MeshLambertMaterial
} from 'three';
import { themeColors } from '../three/index.js';

const tokenNames = [
    'scene-ink', 'scene-structure', 'scene-land', 'scene-scrub', 'scene-ocean', 'scene-foam',
    'scene-sky-low', 'scene-sky-top', 'accent', 'flame-core', 'flame-mid', 'flame-outer'
];

// Each material records the token its color comes from, so a theme change only re-reads
// the tokens and re-colors these few shared instances
const materials = {
    fill: new MeshLambertMaterial({ flatShading: true }),
    // Open surfaces seen from inside (dish reflector, nozzle bell) need both faces drawn
    fillDouble: new MeshLambertMaterial({ flatShading: true, side: DoubleSide }),
    land: new MeshLambertMaterial({ flatShading: true }),
    scrub: new MeshLambertMaterial({ flatShading: true }),
    ocean: new MeshLambertMaterial({ flatShading: true }),
    shadow: new MeshBasicMaterial({ transparent: true, opacity: 0.18, depthWrite: false }),
    smoke: new MeshLambertMaterial({ transparent: true, opacity: 0.9, depthWrite: false }),
    ink: new LineBasicMaterial({ transparent: true, opacity: 0.85 }),
    inkSoft: new LineBasicMaterial({ transparent: true, opacity: 0.35 }),
    foam: new LineBasicMaterial({ transparent: true, opacity: 0.9 }),
    trail: new LineBasicMaterial({ transparent: true, opacity: 0.5 }),
    blueprint: new LineDashedMaterial({ dashSize: 0.45, gapSize: 0.3, transparent: true, opacity: 0.95 }),
    accent: new MeshBasicMaterial({ transparent: true, side: DoubleSide, depthWrite: false }),
    flameCore: new MeshBasicMaterial({ transparent: true, opacity: 0.95, depthWrite: false }),
    flameMid: new MeshBasicMaterial({ transparent: true, opacity: 0.9, depthWrite: false }),
    flameOuter: new MeshBasicMaterial({ transparent: true, opacity: 0.85, depthWrite: false })
};

/** @type {Record<keyof typeof materials, string>} */
const tokenOf = {
    fill: 'scene-structure',
    fillDouble: 'scene-structure',
    land: 'scene-land',
    scrub: 'scene-scrub',
    ocean: 'scene-ocean',
    shadow: 'scene-ink',
    smoke: 'scene-foam',
    ink: 'scene-ink',
    inkSoft: 'scene-ink',
    foam: 'scene-foam',
    trail: 'scene-ink',
    blueprint: 'accent',
    accent: 'accent',
    flameCore: 'flame-core',
    flameMid: 'flame-mid',
    flameOuter: 'flame-outer'
};

/** Colors that are not material colors: fog, hemisphere light */
export const sceneColors = {
    skyLow: new Color(),
    skyTop: new Color(),
    land: new Color()
};

/** Per-object copies (for independent opacity) that still follow theme changes */
/** @type {[import('three').Material & { color: Color }, keyof typeof materials][]} */
const copies = [];

/**
 * @template {keyof typeof materials} K
 * @param {K} name
 * @returns {(typeof materials)[K]}
 */
export function material(name) {
    return materials[name];
}

/**
 * A private copy of a shared material, for objects that fade on their own. Copies are
 * re-colored with the originals on theme changes.
 * @template {keyof typeof materials} K
 * @param {K} name
 * @returns {(typeof materials)[K]}
 */
export function materialCopy(name) {
    const copy = /** @type {(typeof materials)[K]} */ (materials[name].clone());
    copies.push([copy, name]);
    return copy;
}

/**
 * Re-read the theme tokens and re-color every shared material.
 */
export function applyTheme() {
    const colors = themeColors(tokenNames);
    /** @type {(keyof typeof materials)[]} */ (Object.keys(materials)).forEach(name => {
        materials[name].color.set(colors[tokenOf[name]]);
    });
    copies.forEach(([copy, name]) => copy.color.set(colors[tokenOf[name]]));
    sceneColors.skyLow.set(colors['scene-sky-low']);
    sceneColors.skyTop.set(colors['scene-sky-top']);
    sceneColors.land.set(colors['scene-land']);
}
