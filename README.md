# Portfolio

Source for [sean-bowman.github.io/portfolio](https://sean-bowman.github.io/portfolio/): an Astro static site with Three.js model viewers, deployed to GitHub Pages by a GitHub Actions workflow.

## Contents

- [Stack](#stack)
- [Develop](#develop)
- [Project layout](#project-layout)
- [Theme](#theme)
- [Site map](#site-map)
- [Deploy](#deploy)
- [Adding content](#adding-content)
- [Conventions](#conventions)

## Stack

- [Astro](https://astro.build/) 7, static output. Pages are `.astro` files that compile to plain HTML; JavaScript ships only where a page has a client script.
- [Three.js](https://threejs.org/) from npm for the Showcase viewers, bundled into its own chunk that loads only on pages with a 3D element.
- `astro:assets` for images: every photo is resized and re-encoded to AVIF and WebP at build time.
- `@astrojs/sitemap` for `sitemap-index.xml`.
- Node 22.12 or later.

## Develop

```bash
npm install
npm run dev        # http://localhost:4321/portfolio
npm run build      # writes dist/
npm run preview    # serves dist/ at http://localhost:4321/portfolio
```

The site is served under `/portfolio` (the `base` in `astro.config.mjs`), so local URLs carry that prefix too.

## Project layout

```text
astro.config.mjs        site, base path, build format, integrations
src/
  layouts/              BaseLayout.astro: <head>, header, footer, shared scripts
  components/           Header, Footer, SiteMap, ThemeToggle, Experience, Tools, ProjectCard
  components/glyphs/    one animated SVG illustration per role
  pages/                one .astro file per route: index, projects, showcase, beyond-engineering, contact, 404
  data/                 pages.js (nav and footer links), roles.js (Experience), tools.js (Tools and Methods), models.js (showcase models), reposFallback.json
  lib/                  github.js (build-time repository fetch), paths.js (base-path URLs)
  scripts/              client scripts: motion.js, theme.js, nav.js, site.js, showcase.js
  scripts/three/        Three.js toolkit: renderer defaults, theme colors, visibility-gated render loop
  scripts/siteMap/      footer launch-complex scene: clock, plan, materials, structures, launches
  styles/               tokens.css (Surfy Pastels light/dark) first, then the global CSS in cascade order
  assets/images/        photos processed by astro:assets
public/                 copied as-is: favicon.svg, assets/resume.pdf, assets/video/, assets/models/
.github/workflows/      deploy.yml
```

`build.format: 'file'` emits `projects.html` and so on, so the `.html` URLs published before the Astro migration still resolve. Nav links use the extensionless form (`/portfolio/projects`), which GitHub Pages maps to the same file.

Navigation between pages goes through Astro's client router (`<ClientRouter />` in `BaseLayout.astro`), which swaps page content without a full reload. Bundled scripts therefore execute once per visit: anything tied to a page's DOM runs on the `astro:page-load` event, and click handlers are delegated from `document`.

## Theme

Colors come from the Surfy Pastels palette in `src/styles/tokens.css`: light on bare `:root`, dark under `html[data-theme="dark"]` and under the OS dark preference when no theme attribute is set. An inline script in the `<head>` of `BaseLayout.astro` sets `data-theme` before first paint (a stored choice in `localStorage['site-theme']` wins; otherwise the OS setting) and re-applies it after every client-side navigation. The toggle (`ThemeToggle.astro`, `src/scripts/theme.js`) reveals the new theme as a circle growing from the button through the View Transitions API and dispatches a `themechange` event that the Three.js scenes use to recolor.

## Site map

The top of the footer is a Three.js launch complex on the Florida coast that builds out while the visitor stays: road, tracking dish, test stand, propellant farm, hangar, two pads, a landing zone, and a droneship, then routine launches with booster returns. Five facilities are the site's pages; their labels link to them. Build progress follows a visit clock (`src/scripts/siteMap/clock.js`) that counts seconds on site, pauses in hidden tabs, and starts over on a full reload. The container carries `transition:persist`, so one scene and one clock last the whole visit across client-side navigation.

- Preview a later state with `?t=<seconds>`; the full build completes at 301 s.
- Layout and build order: `src/scripts/siteMap/plan.js`. Colors: the `--scene-*` tokens in `tokens.css`.
- `window.__siteMapInfo()` in the console reports draw calls, triangles, visit and scene time, launches, and camera position.
- Without WebGL the scene hides and the plain HTML site map below it remains.

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`, which builds with `withastro/action` and publishes with `actions/deploy-pages`. A daily scheduled run rebuilds the site so the repository cards stay current.

The Projects page and the Featured Projects cards are fetched from the GitHub REST API at build time (`src/lib/github.js`), authenticated with the workflow's `GITHUB_TOKEN`. If the fetch fails, the build uses `src/data/reposFallback.json`. To refresh that snapshot:

```bash
gh api 'users/sean-bowman/repos?type=owner&sort=updated&per_page=100' \
  --jq '[.[] | select(.fork == false) | {name, description, language, updated_at, html_url}]' \
  > src/data/reposFallback.json
```

Repository setting required once: Settings, Pages, Source: GitHub Actions.

## Adding content

- **A page.** Add `src/pages/<name>.astro` wrapped in `<BaseLayout title description current>`, and an entry in `sitePages` in `src/data/pages.js` so it appears in the nav.
- **A showcase model.** Export a mesh to `public/assets/models/` and add an entry to `showcaseModels` in `src/data/models.js` with `filePath: 'assets/models/<name>.stl'`.
- **A role.** Add it to `companies` in `src/data/roles.js` (keep it in step with the resume) and give it a `glyph` key. A new illustration goes in `src/components/glyphs/` as an inline SVG with `data-draw` and `data-loops`, registered in the `glyphs` map in `Experience.astro`, with its loops in `src/styles/glyphs.css`.
- **A skill or tool.** Named commercial software goes in `industrySoftware` in `src/data/tools.js`; methods, languages, and practices go on a card as a `core` or `other` chip. A card's `shownIn` entries take a role id, a page id, or an external `href` with a `label`; unknown ids fail the build.
- **A photo.** Put it in `src/assets/images/`, import it in the page's frontmatter, and render it with `<Picture>` (see `beyond-engineering.astro` for the widths and sizes used by the feature blocks).
- **The resume.** Replace `public/assets/resume.pdf`. The source is `Documents/Resume/Resume_Sean_Bowman_LinkedIn.tex`, the variant with the phone number redacted.

## Conventions

camelCase JavaScript, kebab-case CSS classes and custom properties, single quotes, JSDoc on functions, and a header block with author and date at the top of every source file. Astro component files use PascalCase names. Client scripts carry `// @ts-check` so the editor type-checks them against the Three.js and Astro types.
