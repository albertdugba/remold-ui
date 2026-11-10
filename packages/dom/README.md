# @remold-ui/dom

The browser layer of [Remold](https://github.com/albertdugba/remold-ui), for plain JavaScript or any UI library. It reads what's on screen before and after a change, works out what became what, and animates the difference. It also morphs text and draws connector lines between elements.

```bash
npm install @remold-ui/dom
```

ESM and CommonJS, fully typed, no dependencies beyond `@remold-ui/core`, free of side effects.

## Usage

```js
import { morphText, transition } from "@remold-ui/dom";

// Change the DOM however you like: replaceChildren, innerHTML, a template.
// Remold reads the page before and after, pairs the elements that became one another,
// and moves only what changed.
transition(list, () => {
  list.replaceChildren(...sortBy(tasks, "a–z").map(renderRow));
});

// "Saving" becomes "Saved" letter by letter. It stays real text for screen readers.
morphText(statusLabel, "Saved");
```

### With a UI library

For a library that renders on its own schedule, make the update `async`: change the library's state, wait for its next DOM update, and Remold takes the second snapshot then. No adapter package is needed.

```js
transition(list, async () => {
  setItems(sortBy(items, "a–z"));
  await nextRender();
});
```

### Connector lines

```js
import { connectors } from "@remold-ui/dom";

// Draws a line between every pair of elements linked with data attributes inside `root`,
// and keeps the lines attached while the elements move.
const lines = connectors(root, svg, { shape: "elbow" });
```

## What's in it

| Function | What it does |
| --- | --- |
| `transition(root, update, options?)` | Animates everything that moved, resized, appeared or left during `update`. |
| `morphText(element, text, options?)` | Morphs an element's text letter by letter. |
| `connectors(root, svg, options?)` | Lines between elements that stay attached while they move, with pulses along them. |
| `iconToPath(element)` | Reads an icon from any icon set into path data, to morph with `createMorph`. |
| `viewTransition(root, update, options?)` | Page-sized changes, using the View Transitions API where the browser has it. |
| `dragToDismiss(element, options)` | Drag a sheet or card away, with a spring back when it isn't far enough. |
| `readNodes(root)` · `describeChanges(summary)` | The snapshot and matching behind `transition`, for building your own. |
| `prefersReducedMotion()` · `announce(message)` | Accessibility helpers. |

Add `data-rm-ignore` to leave part of the page out of matching.

## Related packages

- [`@remold-ui/react`](https://www.npmjs.com/package/@remold-ui/react): React components and hooks built on this package.
- [`@remold-ui/canvas`](https://www.npmjs.com/package/@remold-ui/canvas): canvas scenes and particles.
- [`@remold-ui/core`](https://www.npmjs.com/package/@remold-ui/core): the headless maths underneath.

## License

MIT © Albert Dugba
