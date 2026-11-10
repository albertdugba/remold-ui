# @remold-ui/morph

SVG path morphing on its own, from [Remold](https://github.com/albertdugba/remold-ui). Give it two shapes and it pairs up their subpaths, so a menu icon can become a close icon, or one logo another. It only does the geometry: bring your own clock, whether that's Motion, GSAP, the Web Animations API or a renderer of your own.

```bash
npm install @remold-ui/morph
```

ESM and CommonJS, fully typed, free of side effects. It runs anywhere, including Node and Web Workers.

## Usage

```js
import { createMorph } from "@remold-ui/morph";

const shape = createMorph(menuPathData, closePathData);

// Path data for any point between the two: 0 is the first shape, 1 the second.
path.setAttribute("d", shape.d(0.5));
```

### With Motion

```js
import { animate } from "motion";
import { createMorph } from "@remold-ui/morph";

const shape = createMorph(menuPathData, closePathData);

animate(0, 1, {
  type: "spring",
  onUpdate: (progress) => path.setAttribute("d", shape.d(progress)),
});
```

Progress can go below 0 or above 1, so a spring can overshoot and the shape overshoots with it.

## API

- **`createMorph(from, to, options?)`** takes two shapes as path data strings, or as subpaths, and returns a `Morph`:
  - `d(progress, precision?)` gives SVG path data for that point of the morph.
  - `at(progress, out?)` gives the same shape as packed numbers, for drawing on a canvas without building strings.
  - `from`, `to` and `layout` are the matched shapes, for a renderer of your own.
- **`matchShapes(from, to, options?)`** is the subpath pairing on its own.

## Related packages

- [`@remold-ui/react`](https://www.npmjs.com/package/@remold-ui/react): `Remold.Icon` and `Remold.PathGroup` morph icons and illustrations in React.
- [`@remold-ui/core`](https://www.npmjs.com/package/@remold-ui/core): the full headless core this comes from.

## License

MIT © Albert Dugba
