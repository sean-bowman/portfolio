/* ========================================
   SITE UTILITIES
   Back-to-top button, external links, in-page anchor scrolling
   Sean Bowman [10/05/2026]
   ======================================== */

// @ts-check

// This module runs once per visit. Anything tied to a page's DOM runs on
// astro:page-load, which fires on the first load and after every client-side
// navigation.

const backToTopThresholdPx = 300;

/* ========================================
   BACK TO TOP
   ======================================== */

window.addEventListener('scroll', () => {
    const button = document.querySelector('.back-to-top');
    button?.classList.toggle('visible', window.scrollY > backToTopThresholdPx);
}, { passive: true });

document.addEventListener('click', (event) => {
    const target = /** @type {Element} */ (event.target);
    if (target.closest('.back-to-top')) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

/* ========================================
   IN-PAGE ANCHORS
   ======================================== */

// Offset anchor scrolling by the sticky navbar height so headings are not hidden
document.addEventListener('click', (event) => {
    const link = /** @type {Element} */ (event.target).closest('a[href^="#"]');
    if (!link) return;

    const targetId = link.getAttribute('href');
    if (!targetId || targetId === '#') return;

    const targetElement = document.querySelector(targetId);
    if (!targetElement) return;

    event.preventDefault();
    const navbarHeight = document.querySelector('.navbar')?.getBoundingClientRect().height ?? 0;
    const targetTop = targetElement.getBoundingClientRect().top + window.scrollY - navbarHeight - 20;
    window.scrollTo({ top: targetTop, behavior: 'smooth' });
});

/* ========================================
   EXTERNAL LINKS
   ======================================== */

/**
 * Open links to other hosts in a new tab, with rel set so the opened page
 * cannot reach back through window.opener.
 */
function markExternalLinks() {
    document.querySelectorAll('a[href^="http"]').forEach(link => {
        const anchor = /** @type {HTMLAnchorElement} */ (link);
        if (anchor.hostname === window.location.hostname) return;
        anchor.setAttribute('target', '_blank');
        anchor.setAttribute('rel', 'noopener noreferrer');
    });
}

document.addEventListener('astro:page-load', () => {
    markExternalLinks();
    // Reset the button state for the new page's scroll position
    document.querySelector('.back-to-top')?.classList.toggle('visible', window.scrollY > backToTopThresholdPx);
});
