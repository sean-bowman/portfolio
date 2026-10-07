/* ========================================
   ASTRO CONFIGURATION
   Static build for GitHub Pages at sean-bowman.github.io/portfolio
   Sean Bowman [10/05/2026]
   ======================================== */

import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
    site: 'https://sean-bowman.github.io',
    // Project repository, so every route and asset is served under /portfolio
    base: '/portfolio',
    // 'file' emits projects.html rather than projects/index.html, keeping the URLs the
    // plain-HTML site published (and any external links to them) valid
    build: {
        format: 'file'
    },
    trailingSlash: 'never',
    integrations: [sitemap()],
    vite: {
        build: {
            // Three.js (about 550 kB minified) ships in its own chunk, loaded only on pages
            // with a 3D element; the default 500 kB warning would fire on every build
            chunkSizeWarningLimit: 700
        }
    }
});
