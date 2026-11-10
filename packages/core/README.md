# @remold-ui/core

The headless core of [Remold](https://github.com/albertdugba/remold-ui): shapes, morphing, matching and springs, as plain maths on plain data. There's no DOM in it, on purpose, so it runs anywhere: browsers, Web Workers, Node, Deno, Bun and edge runtimes.

```bash
npm install @remold-ui/core
```

ESM and CommonJS, fully typed, no dependencies, free of side effects.

Most apps want a package built on this one instead: [`@remold-ui/react`](https://www.npmjs.com/package/@remold-ui/react), [`@remold-ui/dom`](https://www.npmjs.com/package/@remold-ui/dom) or [`@remold-ui/canvas`](https://www.npmjs.com/package/@remold-ui/canvas). Use the core directly to build your own renderer or to run the maths off the main thread.

## Usage

```js
import { createMorph, shapes, springs, value } from "@remold-ui/core";

// Morph one SVG shape into another: 0 is the first shape, 1 the second.
const morph = createMorph(menuPathData, closePathData);
morph.d(0.5); // SVG path data halfway between them

// A spring you step yourself, from any clock.
const position = value(0, { spring: springs.smooth });
position.to(100);
position.step(1 / 60); // returns true while it's still moving
position.current;

// 3D point shapes for particle clouds, composed and transformed.
const planet = shapes.compose([
  { shape: shapes.sphere({ radius: 0.6 }) },
  { shape: shapes.torus({ radius: 1, tube: 0.05 }) },
]);
```

## What's in it

| Area | Exports |
| --- | --- |
| **Morphing** | `createMorph`, `matchShapes`, `lerpBuffers` |
| **Paths** | `parsePath`, `toCubics`, `subdivide`, `bounds`, `centroid`, `shapeToPath`, `toPathData`, `drawPath` |
| **Matching** | `matchNodes` (what became what between two snapshots), `matchPoints`, `hungarian`, `textSimilarity` |
| **Points** | `shapes` (spheres, tori, spirals, attractors, shapes from paths and photos), `pointCloud`, `samplePath`, `sampleMask`, `fitPoints` |
| **Motion** | `value`, `values`, `springs`, `stepSpring`, `springToCss`, `velocityTracker`, `project`, `rubberband` |

## License

MIT © Albert Dugba
