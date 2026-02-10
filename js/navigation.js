/* ========================================
   NAVIGATION FUNCTIONALITY
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Mobile menu toggle
    initMobileMenu();

    // Highlight active page in navigation
    highlightActivePage();
});


/**
 * Initialize mobile menu toggle functionality
 */
function initMobileMenu() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (!navToggle || !navMenu) {
        return; // Exit if elements don't exist
    }

    // Toggle mobile menu on button click
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navMenu.classList.toggle('active');

        // Update ARIA attribute for accessibility
        const isExpanded = navMenu.classList.contains('active');
        navToggle.setAttribute('aria-expanded', isExpanded);
    });

    // Close mobile menu when clicking on a nav link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
            navToggle.setAttribute('aria-expanded', 'false');
        });
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (event) => {
        const isClickInside = navToggle.contains(event.target) || navMenu.contains(event.target);

        if (!isClickInside && navMenu.classList.contains('active')) {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
            navToggle.setAttribute('aria-expanded', 'false');
        }
    });

    // Close mobile menu on window resize (when switching to desktop view)
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.innerWidth > 768 && navMenu.classList.contains('active')) {
                navToggle.classList.remove('active');
                navMenu.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        }, 250);
    });
}


/**
 * Highlight the active page in the navigation menu
 */
function highlightActivePage() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        // Remove active class from all links first
        link.classList.remove('active');

        // Get the href attribute
        const linkPath = link.getAttribute('href');

        // Check if the current page matches this link
        if (currentPath.endsWith(linkPath) ||
            (linkPath === './index.html' && (currentPath.endsWith('/') || currentPath.endsWith('index.html')))) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
}


/**
 * Add smooth scroll behavior for anchor links
 * (useful if you add anchor links within pages later)
 */
function initSmoothScroll() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');

    anchorLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');

            // Skip if it's just '#'
            if (targetId === '#') {
                e.preventDefault();
                return;
            }

            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                e.preventDefault();

                // Scroll to target with offset for fixed navbar
                const navbarHeight = document.querySelector('.navbar')?.offsetHeight || 0;
                const targetPosition = targetElement.offsetTop - navbarHeight - 20;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Initialize smooth scroll
initSmoothScroll();
