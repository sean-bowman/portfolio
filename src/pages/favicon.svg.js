/* ========================================
   FAVICON
   Serves the favicon built in src/lib/favicon.js
   Sean Bowman [10/08/2026]
   ======================================== */

// @ts-check

// A static endpoint, written to dist/favicon.svg at build time

import { faviconSvg } from '../lib/favicon.js';

export function GET() {
    return new Response(faviconSvg, { headers: { 'Content-Type': 'image/svg+xml' } });
}
