/* ========================================
   NAVIGATION
   Mobile menu toggle for the site header
   Sean Bowman [10/05/2026]
   ======================================== */

// @ts-check

// The header is re-rendered on every client-side navigation, so all handlers are
// delegated from document and look the elements up at event time. The active link
// is set at build time in Header.astro.

const mobileBreakpointPx = 768;

/**
 * Open or close the mobile menu and keep aria-expanded in sync.
 * @param {boolean} isOpen - Target state
 */
function setMenuOpen(isOpen) {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    if (!navToggle || !navMenu) return;

    navToggle.classList.toggle('active', isOpen);
    navMenu.classList.toggle('active', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
}

/**
 * @returns {boolean} Whether the mobile menu is open
 */
function isMenuOpen() {
    return document.querySelector('.nav-menu')?.classList.contains('active') ?? false;
}

document.addEventListener('click', (event) => {
    const target = /** @type {Element} */ (event.target);

    if (target.closest('.nav-toggle')) {
        setMenuOpen(!isMenuOpen());
        return;
    }
    // A link choice or a click anywhere outside the menu closes it
    if (target.closest('.nav-link') || (isMenuOpen() && !target.closest('.nav-menu'))) {
        setMenuOpen(false);
    }
});

// Close the menu when the window grows past the mobile layout
let resizeTimer = 0;
window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
        if (window.innerWidth > mobileBreakpointPx && isMenuOpen()) {
            setMenuOpen(false);
        }
    }, 250);
});
