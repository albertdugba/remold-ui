# @remold-ui/canvas

Live canvas pieces for [Remold](https://github.com/albertdugba/remold-ui): point clouds that re-form from one shape into the next with no keys to match, a dot grid that answers the cursor, a dotted globe, isometric scenes whose layouts spring between each other, and a canvas you paint with springs.

```bash
npm install @remold-ui/canvas
```

ESM and CommonJS, fully typed, free of side effects. For React, use [`@remold-ui/react/canvas`](https://www.npmjs.com/package/@remold-ui/react) instead.

## Usage

```js
import { particles, sampleTextPoints } from "@remold-ui/canvas";

const cloud = particles(canvas, { points: sampleTextPoints("Hello") });

// Each dot springs to the nearest place in the new shape. Big clouds do the pairing in a
// Web Worker, loaded only when it's needed.
cloud.to(sampleTextPoints("World"));

// When the canvas leaves the page:
cloud.destroy();
```

Points can come from text (`sampleTextPoints`), an image (`sampleImagePoints`), an element on the page (`sampleElementPoints`), or the 3D `shapes` in `@remold-ui/core`, seen through an optional `camera`.

## What's in it

| Function | What it does |
| --- | --- |
| `particles(canvas, options?)` | A point cloud that re-forms into new shapes, in 2D or 3D. |
| `dotGrid(canvas, options?)` | A field of dots that answers the cursor. |
| `globe(canvas, options?)` | A dotted globe with markers, arcs and pulses. |
| `scene(canvas, options)` | An isometric scene whose layouts spring between each other. |
| `painter(canvas, options)` | A canvas you draw yourself, with springs for the values you animate. |
| `dust(container, options?)` | A soft drift of dust over an element, for backgrounds. |
| `loadPixels(source)` | Reads an image's pixels in the browser, for photo-shaped clouds. |
| `looks` · `palettes` | Ready-made object looks and colour palettes for scenes. |

Every animation follows `prefers-reduced-motion`, and each piece sizes itself to its canvas and the screen's pixel ratio.

## Related packages

- [`@remold-ui/react`](https://www.npmjs.com/package/@remold-ui/react): these pieces as React components, from `@remold-ui/react/canvas`.
- [`@remold-ui/core`](https://www.npmjs.com/package/@remold-ui/core): the shapes, springs and matching underneath.

## License

MIT © Albert Dugba
