# @remold-ui/core

## 0.2.1

### Patch Changes

- beb4f14: Every package now has its own README on npm, with install steps, a working example and an overview of what's in it, and links back to the repository, issues and its folder in the repo.

## 0.2.0

### Minor Changes

- 34f0fa4: Particles in 3D. `CloudPoint` takes an optional `z`, which springs and scatters with the rest of the point; `PointCloud.data` now holds five numbers per point (`x, y, size, tone, z`, see `CLOUD_STRIDE`). `particles()` gains a `camera` option that turns the cloud and draws it with perspective, and a `blend: "add"` option for glowing dots on a dark ground. `Remold.Particles` takes the same `camera` and `blend` props.

  New `shapes` in `@remold-ui/core`: 3D point shapes (`sphere`, `ellipsoid`, `oval`, `curve`, `torus`, `revolve`, `fromPath`, `spiral`, `helix`, `attractor`) with chainable `at`, `scale`, `rotate`, `mirror`, `tone`, `stripes`, `fuzz`, `warp` and `repeat`, combined with `compose`, which shares dots by each part's `area` so every part is equally dense. `particles()` and `Remold.Particles` take a named palette, `pairing: "flow"` and `camera: true`, and `Remold.Particles` takes a shape directly.

  Photos in 3D: `shapes.fromPixels` turns an image's pixels into a relief in its own colours, with a found `palette`; `loadPixels` in `@remold-ui/canvas` reads them in the browser, `setPalette` swaps a cloud's colours, and the camera takes `sway`. `Remold.Particles` takes `{ image, depth, bulge, colors }`.

- 34f0fa4: Smaller bundles. `@remold-ui/react`'s `Remold` namespace no longer includes the canvas parts: import Scene, Story, Particles, Canvas, Globe, DotGrid and `useDust` from `@remold-ui/react/canvas`, which now also has everything in the main entry. `@remold-ui/dom` reads CSS colours with its own small parser instead of `culori`, and `@remold-ui/core` parses SVG paths itself instead of with `svgpath`, so neither has dependencies left. `particles()` loads its matching worker only when a cloud is big enough to need it.

## 0.1.0

### Minor Changes

- 451cb19: Initial public release of the Remold UI packages.
- a70cf4d: Particles can now be made from the page itself, and poured somewhere else.

  - `useDust(ref, options)` in React, or `dust(container, options)` from canvas: `await trail.away(elements, target)` breaks elements into dots that pour into a target, and `trail.back(elements, source)` pours them back. Each pour draws on its own canvas over the container and removes it once the dots land.
  - `sampleElementPoints(element, { relativeTo, palette, background })` paints an element's backgrounds, text and images as they look and samples them, so each dot keeps its colour, in `relativeTo`'s CSS pixels even inside a scaled ancestor.
  - `clusterPoints(points, { x, y, radius })` in core gathers the same points into a heap at one spot, keeping their order so `pairing: "index"` carries them there and back.
  - Palettes take any CSS colour, `var(--name)` included. `particles()` and `Remold.Particles` read variables from the canvas and repaint when the theme changes, so there's no need to read CSS yourself or remount on dark mode.
  - `particles().settled()` resolves once the dots stop moving.
  - `fit` takes a frame, `{ width, height, x?, y? }`, so shapes drawn in the same frame keep their size and place as they change; `fitPoints` takes the same frame as `from`. `Remold.Particles` now passes `fit` through.

- 6774696: Particles can now scatter between shapes. Pass `transition="scatter"` to `Remold.Particles` (or `{ transition: "scatter" }` to `particles().to`) and the shape dissolves into a loose, glittering cloud before gathering into the next one; `{ type: "scatter", spread, hold, stagger, seed }` tunes it, and reduced motion skips it. In core, `pointCloud().to` takes the same settings as `scatter`.

  Also fixes a `pointCloud: matches don't fit` error when a particles canvas resized while a large shape change was still being paired off the main thread.
