# @remold-ui/canvas

The canvas parts of [Remold](https://remoldui.xyz): particles that re-form from one shape into the next, a dot grid that answers the cursor, a dotted globe, isometric scenes that spring between layouts, and a canvas you paint yourself with the sizing and frame loop handled.

Using React? These are components in [`@remold-ui/react/canvas`](https://www.npmjs.com/package/@remold-ui/react).

## Install

```bash
npm install @remold-ui/canvas
```

Ships ESM and CommonJS with types, and tree-shakes.

## Usage

### Particles

```js
import { particles, sampleTextPoints } from "@remold-ui/canvas";

const canvas = document.querySelector("canvas");

const dots = particles(canvas, {
  points: sampleTextPoints("Hello", { count: 2000 }),
  label: "Hello",
});

// Each dot springs to a nearby place in the new shape. Spare dots shrink away and new ones grow in.
dots.to(sampleTextPoints("World", { count: 2000 }), { label: "World" });

// When the canvas leaves the page:
dots.destroy();
```

Points can come from text (`sampleTextPoints`), an image (`sampleImagePoints`), an element on the page (`sampleElementPoints`), or the 3D `shapes` in `@remold-ui/core`, which a `camera` turns in space:

```js
import { particles } from "@remold-ui/canvas";
import { shapes } from "@remold-ui/core";

particles(canvas, {
  points: shapes.torus().points(2000),
  camera: true,
  label: "A turning ring",
});
```

Pairing the dots of a large cloud runs in a Web Worker, which is loaded only when it is needed.

## API

| Function | What it does |
| --- | --- |
| [`particles(canvas, options?)`](https://remoldui.xyz/docs/canvas/particles) | Dots that rebuild themselves into each new shape, in 2D or 3D. |
| `dotGrid(canvas, options?)` | A field of dots that swell and lean away from the cursor. |
| `globe(canvas, options?)` | A dotted globe with markers, pulses and arcs between places. |
| [`scene(canvas, options)`](https://remoldui.xyz/docs/canvas/scene) | An isometric scene of objects that springs between named layouts. |
| [`painter(canvas, options)`](https://remoldui.xyz/docs/canvas/painter) | A canvas you draw yourself, with sizing, the frame loop and springs handled. |
| `dust(container, options?)` | Breaks elements into dots that pour into another element, and back. |
| `sampleTextPoints` · `sampleImagePoints` · `sampleElementPoints` | Points for `particles`, from text, an image or an element. |
| `loadPixels(source)` | Reads an image's pixels, for a photo-shaped cloud with `shapes.fromPixels`. |
| `looks` · `palettes` | Ready-made object looks and colour palettes for scenes. |

`particles`, `dotGrid`, `globe`, `scene`, `painter` and `dust` each return a handle with `destroy()`, to call when the canvas leaves the page. Each part sizes itself to its canvas and the screen's pixel ratio.

## Accessibility

Every part follows `prefers-reduced-motion` by default: with it on, particles go straight to the new shape instead of flying there. Pass a `label` to give the canvas an accessible name. See [Accessibility](https://remoldui.xyz/docs/concepts/accessibility).

## Related packages

- [`@remold-ui/react`](https://www.npmjs.com/package/@remold-ui/react): these parts as React components, from `@remold-ui/react/canvas`.
- [`@remold-ui/core`](https://www.npmjs.com/package/@remold-ui/core): the shapes, springs and matching underneath.

## License

[MIT](https://github.com/albertdugba/remold-ui/blob/main/LICENSE) © Albert Dugba
