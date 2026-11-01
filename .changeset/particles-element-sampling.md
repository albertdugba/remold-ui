---
"@remold-ui/core": minor
"@remold-ui/canvas": minor
"@remold-ui/react": minor
---

Particles can now be made from the page itself, and poured somewhere else.

- `useDust(ref, options)` in React, or `dust(container, options)` from canvas: `await trail.away(elements, target)` breaks elements into dots that pour into a target, and `trail.back(elements, source)` pours them back. Each pour draws on its own canvas over the container and removes it once the dots land.
- `sampleElementPoints(element, { relativeTo, palette, background })` paints an element's backgrounds, text and images as they look and samples them, so each dot keeps its colour, in `relativeTo`'s CSS pixels even inside a scaled ancestor.
- `clusterPoints(points, { x, y, radius })` in core gathers the same points into a heap at one spot, keeping their order so `pairing: "index"` carries them there and back.
- Palettes take any CSS colour, `var(--name)` included. `particles()` and `Remold.Particles` read variables from the canvas and repaint when the theme changes, so there's no need to read CSS yourself or remount on dark mode.
- `particles().settled()` resolves once the dots stop moving.
- `fit` takes a frame, `{ width, height, x?, y? }`, so shapes drawn in the same frame keep their size and place as they change; `fitPoints` takes the same frame as `from`. `Remold.Particles` now passes `fit` through.
