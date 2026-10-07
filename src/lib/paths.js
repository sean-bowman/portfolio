/* ========================================
   SITE PATHS
   Builds URLs under the deploy base path
   Sean Bowman [10/05/2026]
   ======================================== */

// @ts-check

// BASE_URL is '/portfolio' on GitHub Pages; strip any trailing slash so joins are uniform
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

/**
 * Prefix a site-relative path with the deploy base path.
 * @param {string} path - Path relative to the site root, e.g. 'projects' or 'assets/resume.pdf'
 * @returns {string} Absolute path including the base, e.g. '/portfolio/projects'
 */
export function withBase(path = '') {
    const cleanPath = path.replace(/^\/+/, '');
    return cleanPath ? `${basePath}/${cleanPath}` : `${basePath}/`;
}
