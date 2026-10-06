/* ========================================
   THEME TOGGLE
   Light/dark switch with a circular reveal from the button
   Sean Bowman [10/06/2026]
   ======================================== */

// @ts-check

// The pre-paint script in BaseLayout.astro sets html[data-theme] before first paint,
// re-applies it after every client-side navigation, and follows OS changes while no
// choice is stored. This module handles the button: it stores the choice, runs the
// reveal, and announces the change with a 'themechange' event that the Three.js
// scenes listen for.

import { reducedMotion } from './motion.js';

const storageKey = 'site-theme';
const themeColorMeta = { light: '#F7F1E6', dark: '#16232A' };

/**
 * @returns {'light' | 'dark'} The theme currently applied to the page
 */
export function currentTheme() {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/**
 * Keep the toggle's pressed state in step with the applied theme.
 */
function syncToggle() {
    const isDark = currentTheme() === 'dark';
    document.querySelectorAll('.theme-toggle').forEach(button => {
        button.setAttribute('aria-pressed', String(isDark));
    });
}

/**
 * Apply and store a theme, then announce it.
 * @param {'light' | 'dark'} theme
 */
function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColorMeta[theme]);
    try {
        localStorage.setItem(storageKey, theme);
    } catch {
        // Storage can be blocked (private mode, site-data settings); the choice then lasts for this page only
    }
    syncToggle();
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}

/**
 * Switch themes. With the View Transitions API, the new theme is revealed as a circle
 * growing from the button's center until it overshoots the farthest viewport corner.
 * Without the API, or under reduced motion, the switch is instant.
 * @param {Element} button - The toggle that was pressed
 */
function toggleTheme(button) {
    const nextTheme = currentTheme() === 'dark' ? 'light' : 'dark';
    if (!document.startViewTransition || reducedMotion()) {
        setTheme(nextTheme);
        return;
    }

    const root = document.documentElement;
    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const viewWidth = Math.max(window.innerWidth, root.clientWidth);
    const viewHeight = Math.max(window.innerHeight, root.clientHeight);
    // Distance to the farthest corner, with margin so the circle edge leaves the screen
    const radius = Math.hypot(Math.max(centerX, viewWidth - centerX), Math.max(centerY, viewHeight - centerY)) * 1.15 + 80;

    root.style.setProperty('--vt-x', `${centerX}px`);
    root.style.setProperty('--vt-y', `${centerY}px`);
    root.style.setProperty('--vt-r', `${radius}px`);
    root.classList.add('vt-theme');

    const transition = document.startViewTransition(() => setTheme(nextTheme));
    transition.finished.finally(() => root.classList.remove('vt-theme'));
}

document.addEventListener('click', (event) => {
    const button = /** @type {Element} */ (event.target).closest('.theme-toggle');
    if (button) toggleTheme(button);
});

document.addEventListener('astro:page-load', syncToggle);
