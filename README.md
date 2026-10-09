# Portfolio

Source for [sean-bowman.github.io/portfolio](https://sean-bowman.github.io/portfolio/): an Astro static site with Three.js model viewers, deployed to GitHub Pages by a GitHub Actions workflow.

## Contents

- [Stack](#stack)
- [Develop](#develop)
- [Project layout](#project-layout)
- [Theme](#theme)
- [Hero net](#hero-net)
- [Showcase](#showcase)
- [Site map](#site-map)
- [Deploy](#deploy)
- [Adding content](#adding-content)
- [Conventions](#conventions)

## Stack

- [Astro](https://astro.build/) 7, static output. Pages are `.astro` files that compile to plain HTML; JavaScript ships only where a page has a client script.
- [Three.js](https://threejs.org/) from npm for the Showcase models and the footer site map, bundled into one shared chunk that loads only when a 3D element nears the viewport.
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
  components/           Header, Footer, HeroNet, SiteMap, ThemeToggle, Experience, Tools, ProjectCard
  components/glyphs/    one animated SVG illustration per role
  pages/                one .astro file per route: index, projects, showcase, beyond-engineering, contact, 404
  data/                 pages.js (nav and footer links), roles.js (Experience), tools.js (Tools and Methods), models.js and novaNozzleFacts.json (Showcase), heroNet.json (hero), reposFallback.json
  lib/                  github.js (build-time repository fetch), paths.js (base-path URLs)
  scripts/              client scripts: motion.js, theme.js, nav.js, site.js
  scripts/three/        Three.js toolkit: renderer defaults, theme colors, visibility-gated render loop
  scripts/showcase/     Showcase: shared stage, per-card model view, page entry
  scripts/siteMap/      footer launch-complex scene: clock, plan, materials, structures, launches
  styles/               tokens.css (Surfy Pastels light/dark) first, then the global CSS in cascade order
  assets/images/        photos processed by astro:assets
public/                 copied as-is: favicon.svg, assets/resume.pdf, assets/video/, assets/models/
tools/                  exporters run by hand: exportNovaNozzle.py, exportNovaNet.py (novaCase.py runs the NOVA case they share)
.github/workflows/      deploy.yml
```

`build.format: 'file'` emits `projects.html` and so on, so the `.html` URLs published before the Astro migration still resolve. Nav links use the extensionless form (`/portfolio/projects`), which GitHub Pages maps to the same file.

Navigation between pages goes through Astro's client router (`<ClientRouter />` in `BaseLayout.astro`), which swaps page content without a full reload. Bundled scripts therefore execute once per visit: anything tied to a page's DOM runs on the `astro:page-load` event, and click handlers are delegated from `document`.

## Theme

Colors come from the Surfy Pastels palette in `src/styles/tokens.css`: light on bare `:root`, dark under `html[data-theme="dark"]` and under the OS dark preference when no theme attribute is set. An inline script in the `<head>` of `BaseLayout.astro` sets `data-theme` before first paint (a stored choice in `localStorage['site-theme']` wins; otherwise the OS setting) and re-applies it after every client-side navigation. The toggle (`ThemeToggle.astro`, `src/scripts/theme.js`) reveals the new theme as a circle growing from the button through the View Transitions API and dispatches a `themechange` event that the Three.js scenes use to recolor.

## Hero net

Behind the home-page hero is the characteristic net from the method-of-characteristics solve of NOVA's worked-example nozzle: the upper half of the meridional plane, the wall from the end of the converging section to the exit, and a dash-dot centerline. `src/components/HeroNet.astro` builds it as inline SVG at compile time from `src/data/heroNet.json`, so Home ships no 3D library for it.

- Each characteristic draws on over 1.75 s, starting at 6.2 s times its `t`, the axial position of its upstream end as a fraction of the nozzle length, so the net fills from the throat to the exit in the order the solve marched it; the wall draws at a steady rate alongside, and the whole net is complete at about 7.3 s. The timing is three custom properties at the top of `heroNet.css`. It draws once per arrival at the page, then drifts slowly and follows the pointer by up to 8 px. Under reduced motion, or without JavaScript, it shows finished and still.
- Two mask layers keep the hero text legible: the net drops to 6% strength behind the text column, except in the strip below the buttons where the throat sits. Measured worst-case contrast of every hero text element with the net behind it is 4.64:1 or higher in both themes from 640 to 1920 px (the light-mode description, 4.83:1 without the net). Stroke opacities are the `--hero-net-*` tokens.
- Below 1024 px the hero stacks, so the net drops the fade for a uniform half strength; below 640 px it and its caption are hidden.
- Regenerate with `python tools/exportNovaNet.py` (or `--pickled` to reuse the last solve). The caption names the case.

## Showcase

The Showcase page draws every model card with one WebGL renderer. A transparent canvas, one viewport tall, sits over the card grid with pointer events off; each frame it moves to the visible part of the grid and draws each card's scene into that card's rectangle with a scissor test (`src/scripts/showcase/stage.js`). One context serves any number of cards, and the loop runs only while the grid is on screen.

- Each card has its own scene, camera, and orbit controls bound to the card's view region (`modelView.js`). Drag orbits, Ctrl or Cmd with the wheel zooms (a plain wheel scrolls the page), right-drag pans, and on touch screens horizontal drags orbit, pinch zooms, and vertical swipes scroll. The model turns slowly until the pointer is over it; under reduced motion it holds still and redraws only on input.
- Render modes: solid (shaded, with rims and creases in ink), cooling jacket (translucent walls, coolant passages in the accent color), and lines (a hidden-line drawing from line primitives stored in the model file). Colors are the `--scene-*` tokens and `--accent`, re-read on `themechange`.
- The NOVA nozzle comes from `tools/exportNovaNozzle.py`, which runs NOVA's worked example, writes every surface through NOVA's STL writer, assembles a GLB with the line drawing and 60 instanced channels, compresses it with gltf-transform (meshopt), and writes the card numbers to `src/data/novaNozzleFacts.json`. It needs the NOVA repository checked out beside this one and Node on the path.
- `window.__showcaseInfo()` in the console reports draw calls, frames drawn, and each card's mode, camera azimuth and distance.
- Without WebGL the canvas hides and each card says so above its text.

## Site map

The top of the footer is a Three.js launch complex on the Florida coast that builds out while the visitor stays: road, tracking dish, test stand, propellant farm, hangar, two pads, a landing zone, and a landing vessel, then routine launches with booster returns. Five facilities are the site's pages; their labels link to them. Build progress follows a visit clock (`src/scripts/siteMap/clock.js`) that counts seconds on site, pauses in hidden tabs, and starts over on a full reload. The container carries `transition:persist`, so one scene and one clock last the whole visit across client-side navigation.

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
- **A showcase model.** Put a GLB (compressed with `npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt --join false`) or an STL in `public/assets/models/`, and add an entry to `showcaseModels` in `src/data/models.js`: name, description, file path, source repository, spec rows, render modes, and optionally a rotation, a home view direction, and `partRoles` naming the glTF nodes that are coolant passages. Line primitives in a GLB become the lines mode drawing. Personal or public geometry only.
- **A role.** Add it to `companies` in `src/data/roles.js` (keep it in step with the resume) and give it a `glyph` key. A new illustration goes in `src/components/glyphs/` as an inline SVG with `data-draw` and `data-loops`, registered in the `glyphs` map in `Experience.astro`, with its loops in `src/styles/glyphs.css`.
- **A skill or tool.** Named commercial software goes in `industrySoftware` in `src/data/tools.js`; methods, languages, and practices go on a card as a `core` or `other` chip.
- **A photo.** Put it in `src/assets/images/`, import it in the page's frontmatter, and render it with `<Picture>` (see `beyond-engineering.astro` for the widths and sizes used by the feature blocks).
- **The resume.** Replace `public/assets/resume.pdf`. The source is `Documents/Resume/Resume_Sean_Bowman_LinkedIn.tex`, the variant with the phone number redacted.

## Conventions

camelCase JavaScript, kebab-case CSS classes and custom properties, single quotes, JSDoc on functions, and a header block with author and date at the top of every source file. Astro component files use PascalCase names. Client scripts carry `// @ts-check` so the editor type-checks them against the Three.js and Astro types.
