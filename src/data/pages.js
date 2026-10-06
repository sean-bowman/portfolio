/* ========================================
   SITE PAGES
   One list drives the nav, the footer, and page metadata
   Sean Bowman [10/05/2026]
   ======================================== */

// @ts-check

/**
 * @typedef {Object} SitePage
 * @property {string} id - Stable identifier passed by each page as its current page
 * @property {string} label - Nav label
 * @property {string} path - Route relative to the base path ('' is the home page)
 */

/** @type {SitePage[]} */
export const sitePages = [
    { id: 'home', label: 'Home', path: '' },
    { id: 'projects', label: 'Projects', path: 'projects' },
    { id: 'showcase', label: 'Showcase', path: 'showcase' },
    { id: 'beyond', label: 'Beyond Engineering', path: 'beyond-engineering' },
    { id: 'contact', label: 'Contact', path: 'contact' }
];

/** Home page sections linked from the footer site map, by element id */
export const homeSections = [
    { label: 'Experience', id: 'experience' },
    { label: 'Tools and Methods', id: 'tools' }
];

/** External profiles shown in the footer and on the contact page */
export const externalLinks = [
    { label: 'GitHub', href: 'https://github.com/sean-bowman' },
    { label: 'LinkedIn', href: 'https://linkedin.com/in/sean-bowman' },
    { label: 'Email', href: 'mailto:seanbowman9@gmail.com' }
];
