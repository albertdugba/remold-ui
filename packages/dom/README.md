# @remold-ui/dom

The browser layer of [Remold](https://remoldui.xyz), for plain JavaScript or any UI library. It reads the page before and after a change, works out which element became which, and animates the difference. It also morphs text letter by letter and draws connector lines between elements.

Using React? Install [`@remold-ui/react`](https://www.npmjs.com/package/@remold-ui/react) instead.

## Install

```bash
npm install @remold-ui/dom
```

Its only dependency is `@remold-ui/core`. Ships ESM and CommonJS with types, and tree-shakes.

## Usage

### Animate a change

`transition()` takes an element and a function that changes what is inside it. Change the DOM however you like: `replaceChildren`, `innerHTML`, a template. Elements are paired by what they show, so they need no ids or matching attributes, and only what changed moves.

```js
import { transition } from "@remold-ui/dom";

const list = document.querySelector("#tasks");

function sortTasks(tasks) {
  transition(list, () => {
    list.replaceChildren(...tasks.map(renderRow));
  });
}
```

It returns a `Transition`: await `finished` to know when everything has settled, or call `skip()` to jump to the end. Starting another transition while one is running is fine; each element heads for its new place from where it is.

### With a UI library

For a library that renders on its own schedule, make the update `async`: change the library's state, wait for its next DOM update, and Remold takes the second snapshot then. No adapter package is needed. In Svelte, for example:

```js
import { tick } from "svelte";

transition(list, async () => {
  sort = "a-z";
  await tick();
});
```

### Morph text

```js
import { morphText } from "@remold-ui/dom";

// "Saving" becomes "Saved": the letters they share slide into place and the rest fade.
morphText(statusLabel, "Saved");
```

The element keeps its real text for screen readers while the letters move.

### Connector lines

Name an element with `data-rm-anchor`, and point at it from another with `data-rm-link`. `connectors()` draws a line between each pair and keeps it attached while the elements move.

```html
<div id="thread" style="position: relative">
  <svg class="lines" style="position: absolute; inset: 0"></svg>

  <img data-rm-anchor="comment-1" src="ada.png" alt="Ada" />
  <img data-rm-anchor="comment-2" data-rm-link="comment-1" src="grace.png" alt="Grace" />
</div>
```

```js
import { connectors } from "@remold-ui/dom";

const thread = document.querySelector("#thread");
const lines = connectors(thread, thread.querySelector("svg"), { shape: "elbow", radius: 12 });

// When the thread leaves the page:
lines.destroy();
```

Each line is a `path.rm-connector`, styled with CSS.

## API

| Function | What it does |
| --- | --- |
| [`transition(root, update, options?)`](https://remoldui.xyz/docs/hooks/use-remold) | Animates everything that moved, resized, appeared or left during `update`. |
| [`viewTransition(root, update, options?)`](https://remoldui.xyz/docs/hooks/use-view-transition) | The same for page-sized changes, through the View Transitions API where the browser has it. |
| [`morphText(element, text, options?)`](https://remoldui.xyz/docs/primitives/text) | Morphs an element's text letter by letter. |
| [`connectors(root, svg, options?)`](https://remoldui.xyz/docs/primitives/connectors) | Lines between elements that stay attached while they move, with optional arrows, labels and pulses. |
| [`iconToPath(element)`](https://remoldui.xyz/docs/primitives/icon) | Reads an icon from any icon set into path data, to morph with `createMorph`. |
| [`dragToDismiss(element, options)`](https://remoldui.xyz/docs/hooks/use-drag-to-dismiss) | Lets a sheet or card be dragged away, and springs it back when it isn't pulled far enough. |
| `frames(callback)` | Runs a callback every frame with the seconds since the last one, until it returns `false`. |
| `readNodes(root)` · `describeChanges(summary)` | The snapshot and the change summary behind `transition`, for building your own. |
| `prefersReducedMotion()` · `announce(message)` | Whether the system asks for less motion, and a message read to screen-reader users. |

Add `data-rm-ignore` to an element to leave it and its contents out of transitions.

## Accessibility

Everything follows `prefers-reduced-motion` by default: changes happen at once, with no movement. Pass `reducedMotion: "always"` or `"never"` to override it. If the focused element is replaced by its new version, focus moves to the new one. See [Accessibility](https://remoldui.xyz/docs/concepts/accessibility).

## Related packages

- [`@remold-ui/react`](https://www.npmjs.com/package/@remold-ui/react): React components and hooks built on this package.
- [`@remold-ui/canvas`](https://www.npmjs.com/package/@remold-ui/canvas): canvas scenes and particles.
- [`@remold-ui/core`](https://www.npmjs.com/package/@remold-ui/core): the maths underneath, with no DOM.

## License

[MIT](https://github.com/albertdugba/remold-ui/blob/main/LICENSE) © Albert Dugba
