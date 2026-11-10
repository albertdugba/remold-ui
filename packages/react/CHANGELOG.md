# @remold-ui/react

## 0.1.0

### Minor Changes

- 7d0fe18: Icons from sets that paint each shape, such as Hugeicons, now morph with their stroke.

  - `iconToPath` reads paint the `<svg>` leaves out (fill, stroke, stroke width, line caps and joins) from the icon's first shape.
  - `Remold.Icon` and `Remold.PathGroup` take SVG path data as `path` instead of `d`: `<Remold.Icon path="M4 6h16" />`, `{ id, path }`.

- 451cb19: Initial public release of the Remold UI packages.
- 7d0fe18: Morph changes can play in beats with the new `choreography` option, on `transition()`, `Remold.Morph`, `useRemoldMorph` and `useRemold`: what leaves goes first, then what moves, then what arrives, one after another in reading order. `true` uses the default timing; `{ move, enter, stagger, maxStagger }` changes it, in seconds. Off by default, and off with reduced motion.
- a70cf4d: Particles can now be made from the page itself, and poured somewhere else.

  - `useDust(ref, options)` in React, or `dust(container, options)` from canvas: `await trail.away(elements, target)` breaks elements into dots that pour into a target, and `trail.back(elements, source)` pours them back. Each pour draws on its own canvas over the container and removes it once the dots land.
  - `sampleElementPoints(element, { relativeTo, palette, background })` paints an element's backgrounds, text and images as they look and samples them, so each dot keeps its colour, in `relativeTo`'s CSS pixels even inside a scaled ancestor.
  - `clusterPoints(points, { x, y, radius })` in core gathers the same points into a heap at one spot, keeping their order so `pairing: "index"` carries them there and back.
  - Palettes take any CSS colour, `var(--name)` included. `particles()` and `Remold.Particles` read variables from the canvas and repaint when the theme changes, so there's no need to read CSS yourself or remount on dark mode.
  - `particles().settled()` resolves once the dots stop moving.
  - `fit` takes a frame, `{ width, height, x?, y? }`, so shapes drawn in the same frame keep their size and place as they change; `fitPoints` takes the same frame as `from`. `Remold.Particles` now passes `fit` through.

- 6774696: Particles can now scatter between shapes. Pass `transition="scatter"` to `Remold.Particles` (or `{ transition: "scatter" }` to `particles().to`) and the shape dissolves into a loose, glittering cloud before gathering into the next one; `{ type: "scatter", spread, hold, stagger, seed }` tunes it, and reduced motion skips it. In core, `pointCloud().to` takes the same settings as `scatter`.

  Also fixes a `pointCloud: matches don't fit` error when a particles canvas resized while a large shape change was still being paired off the main thread.

### Patch Changes

- 7d0fe18: A `Remold.Icon` that changes inside a `Remold.Morph` now morphs in place instead of fading in again. The snapshot reads an element's media identity from `data-rm-media` when it has one (exported as `MEDIA_ATTRIBUTE`), and `Remold.Icon` sets it to an id that stays the same for the life of the icon.
- Updated dependencies [7d0fe18]
- Updated dependencies [7d0fe18]
- Updated dependencies [451cb19]
- Updated dependencies [7d0fe18]
- Updated dependencies [a70cf4d]
- Updated dependencies [6774696]
  - @remold-ui/dom@0.1.0
  - @remold-ui/core@0.1.0
  - @remold-ui/canvas@0.1.0
  - @remold-ui/morph@0.1.0
