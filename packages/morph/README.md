# @remold-ui/morph

SVG path morphing from [Remold](https://remoldui.xyz), on its own. Give it two shapes and it pairs up their subpaths, so a menu icon can become a close icon, or one logo another, even when they have different numbers of parts. It only does the geometry: you bring the clock, whether that is Motion, GSAP, the Web Animations API or your own renderer.

## Install

```bash
npm install @remold-ui/morph
```

Ships ESM and CommonJS with types, and tree-shakes. It never touches the DOM, so it also runs in Node and Web Workers.

## Usage

```js
import { createMorph } from "@remold-ui/morph";

const menu = "M4 6h16M4 12h16M4 18h16";
const close = "M6 6l12 12M18 6L6 18";

const shape = createMorph(menu, close);

// Path data for any point between the two: 0 is the menu, 1 is the close icon.
path.setAttribute("d", shape.d(0.5));
```

### With Motion

```js
import { animate } from "motion";
import { createMorph } from "@remold-ui/morph";

const shape = createMorph(menu, close);

animate(0, 1, {
  type: "spring",
  duration: 0.5,
  bounce: 0.15,
  onUpdate: (progress) => path.setAttribute("d", shape.d(progress)),
});
```

Progress can go below 0 or above 1, so when a spring overshoots, the shape overshoots with it.

In React, `MorphPath` from [`@remold-ui/react`](https://www.npmjs.com/package/@remold-ui/react) wraps this up as a component.

## API

`createMorph(from, to, options?)` takes two shapes, as SVG path data or as subpaths, and returns a `Morph`:

| Member | What it gives you |
| --- | --- |
| `d(progress, precision?)` | SVG path data for that point of the morph. |
| `at(progress, out?)` | The same shape as packed numbers, for drawing on a canvas without building strings. |
| `from` · `to` · `layout` | The two matched shapes and how their subpaths are laid out, for your own renderer. |

`options` steer the matching:

| Option | What it does |
| --- | --- |
| `pairing` | How subpaths are paired: `"auto"` or `"order"`. |
| `padding` | What a subpath with no partner turns into: `"collapse"` or `"merge"`. |
| `orient` | Makes paired subpaths run the same way round. On by default. |
| `rotate` | Starts closed loops from the point that travels least. On by default. |

`matchShapes(from, to, options?)` is the pairing step by itself, on subpaths.

See [Shapes](https://remoldui.xyz/docs/core/shapes) for the details.

## Related packages

- [`@remold-ui/react`](https://www.npmjs.com/package/@remold-ui/react): `Remold.Icon` and `Remold.PathGroup` morph icons and illustrations in React.
- [`@remold-ui/core`](https://www.npmjs.com/package/@remold-ui/core): the full core this comes from, with springs and matching.

## License

[MIT](https://github.com/albertdugba/remold-ui/blob/main/LICENSE) © Albert Dugba
