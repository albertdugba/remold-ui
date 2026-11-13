# @remold-ui/core

The maths behind [Remold](https://remoldui.xyz): SVG path morphing, springs, and the matching that works out which element or point became which. It works on plain data and never touches the DOM, so it runs in browsers, Web Workers, Node, Deno, Bun and edge runtimes.

Most apps want a package built on this one: [`@remold-ui/react`](https://www.npmjs.com/package/@remold-ui/react), [`@remold-ui/dom`](https://www.npmjs.com/package/@remold-ui/dom) or [`@remold-ui/canvas`](https://www.npmjs.com/package/@remold-ui/canvas). Use the core directly to write your own renderer, or to run the maths off the main thread.

## Install

```bash
npm install @remold-ui/core
```

No dependencies. Ships ESM and CommonJS with types, and tree-shakes.

## Usage

### Morph one SVG path into another

```js
import { createMorph } from "@remold-ui/core";

const menu = "M4 6h16M4 12h16M4 18h16";
const close = "M6 6l12 12M18 6L6 18";

const morph = createMorph(menu, close);

morph.d(0); // path data for the menu icon
morph.d(0.5); // halfway between the two
morph.d(1); // the close icon
```

### Spring a number

`value()` is a spring you step from your own clock. Call `to()` again while it is moving and it heads for the new target from where it is, at the speed it has.

```js
import { springs, value } from "@remold-ui/core";

const x = value(0, { spring: springs.snappy });
x.to(100);

let last = performance.now();

function frame(now) {
  const moving = x.step((now - last) / 1000); // seconds since the last frame
  last = now;

  element.style.translate = `${x.current}px`;

  if (moving) requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
```

`values()` does the same for thousands of numbers at once, in flat typed arrays.

### Build a shape out of points

```js
import { shapes } from "@remold-ui/core";

const planet = shapes.compose([
  { shape: shapes.sphere({ radius: 0.6 }) },
  { shape: shapes.torus({ radius: 1, tube: 0.05 }) },
]);

planet.points(2000); // [{ x, y, z }, …], the same points every time for the same seed
```

## API

| Area | Exports | What they do |
| --- | --- | --- |
| [Path morphing](https://remoldui.xyz/docs/core/shapes) | `createMorph`, `matchShapes`, `lerpBuffers`, `toPathData`, `drawPath` | Pair up the subpaths of two shapes and interpolate between them, as SVG path data or onto a canvas. |
| Path geometry | `parsePath`, `toCubics`, `subdivide`, `splitCubic`, `pointAt`, `bounds`, `centroid`, `signedArea`, `shapeToPath`, `shapesToPath` | Parse path data, turn it into cubic curves and measure it. `shapeToPath` converts `<circle>`, `<ellipse>`, `<rect>` and `<line>` into path data. |
| [Matching](https://remoldui.xyz/docs/core/matching) | `matchNodes`, `matchPoints`, `assign`, `hungarian`, `textSimilarity` | Work out which element or point became which between two snapshots, without keys or ids. |
| Points | `shapes`, `pointCloud`, `samplePath`, `sampleMask`, `fitPoints`, `clusterPoints` | Sample points from 3D shapes, SVG paths and image masks, and spring a cloud of them from one shape into the next. |
| [Springs](https://remoldui.xyz/docs/core/motion) | `value`, `values`, `springs`, `springCoefficients`, `stepSpring`, `isSettled`, `springToCss` | Springs described by `{ duration, bounce }` that you step yourself, plus a spring as a CSS `linear()` easing. |
| Gestures | `velocityTracker`, `project`, `rubberband`, `deceleration` | A finger's speed, where a flick would come to rest, and resistance past an edge. |
| Interpolation | `lerp`, `lerpPoint` | Linear interpolation for numbers and points. |

## Related packages

- [`@remold-ui/react`](https://www.npmjs.com/package/@remold-ui/react): React components and hooks.
- [`@remold-ui/dom`](https://www.npmjs.com/package/@remold-ui/dom): the browser layer, for plain JavaScript or any UI library.
- [`@remold-ui/canvas`](https://www.npmjs.com/package/@remold-ui/canvas): canvas scenes and particles.
- [`@remold-ui/morph`](https://www.npmjs.com/package/@remold-ui/morph): only the SVG path morphing from this package.

## License

[MIT](https://github.com/albertdugba/remold-ui/blob/main/LICENSE) © Albert Dugba
