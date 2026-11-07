# @remold-ui/core

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
