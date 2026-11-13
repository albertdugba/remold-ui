# @remold-ui/react

React components and hooks for [Remold](https://remoldui.xyz). They morph text, icons, SVG paths and whole layouts into what comes next, draw connector lines that stay attached while things move, and re-form canvas particles from one shape into another.

## Install

```bash
npm install @remold-ui/react
```

Needs React 18 or newer. Ships ESM and CommonJS with types, and tree-shakes.

## Usage

### Morph a layout

Wrap the part of the interface that changes in `Remold.Morph` and give it a `trigger` that changes with it. Remold reads the page before and after, pairs the elements by what they show, and moves only what changed.

```tsx
import { Remold } from "@remold-ui/react";

export function Tasks({ tasks, sort }: { tasks: Task[]; sort: string }) {
  return (
    <Remold.Morph trigger={sort}>
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </Remold.Morph>
  );
}
```

The `key` is React's usual list key. Remold needs no ids or matching attributes of its own.

### Morph text and icons

```tsx
import { Remold } from "@remold-ui/react";

// "Saving" becomes "Saved": the letters they share slide into place and the rest fade.
export function SaveLabel({ saving }: { saving: boolean }) {
  return <Remold.Text>{saving ? "Saving" : "Saved"}</Remold.Text>;
}

// The strokes of one icon reshape into the next. Icons can come from any icon set.
export function MenuButton({ open }: { open: boolean }) {
  return <Remold.Icon icon={open ? <CloseIcon /> : <MenuIcon />} />;
}
```

### Animate a change from an event handler

`useRemold` animates a state change you make yourself, and can be interrupted by the next one.

```tsx
import { useState } from "react";
import { useRemold } from "@remold-ui/react";

export function Files({ files }: { files: FileItem[] }) {
  const [sort, setSort] = useState("name");
  const { ref, animate } = useRemold<HTMLUListElement>();

  return (
    <>
      <button onClick={() => animate(() => setSort("size"))}>Sort by size</button>
      <ul ref={ref}>
        {sortBy(files, sort).map((file) => (
          <FileRow key={file.id} file={file} />
        ))}
      </ul>
    </>
  );
}
```

### Canvas parts

Particles, scenes, the dot grid and the globe draw on a canvas, so they have their own entry. An interface that doesn't use them never ships canvas code.

```tsx
import { Remold } from "@remold-ui/react/canvas";

// The dots re-form into the new word whenever it changes.
export function Hero({ word }: { word: string }) {
  return <Remold.Particles shape={word} label={`Particles spelling ${word}`} />;
}
```

`@remold-ui/react/canvas` exports everything in the main entry too, so a screen that uses canvas parts can import from one place.

### Next.js

The components use hooks, so in the App Router import them from a Client Component (a file that starts with `"use client"`). They render on the server and start animating once the page has hydrated.

## Components

| Component | What it does |
| --- | --- |
| [`Remold.Morph`](https://remoldui.xyz/docs/primitives/morph) | Animates everything inside it that moved, resized, appeared or left when its `trigger` changes. |
| [`Remold.Text`](https://remoldui.xyz/docs/primitives/text) | Changes text letter by letter. |
| [`Remold.Icon`](https://remoldui.xyz/docs/primitives/icon) | Reshapes one icon into the next, from any icon set or from path data. |
| [`Remold.PathGroup`](https://remoldui.xyz/docs/primitives/path-group) | Morphs an illustration made of several paths, each part on its own. |
| [`Remold.Connectors`](https://remoldui.xyz/docs/primitives/connectors) · `Remold.Anchor` | Lines between elements that stay attached while they move. |
| [`MorphPath`](https://remoldui.xyz/docs/core/shapes) | One SVG path that morphs between two shapes on a Motion spring. |
| [`Remold.Tour`](https://remoldui.xyz/docs/primitives/tour) | Walks people through an interface one step at a time. It keeps the step and finds each target; the look is yours. |
| [`Remold.Ignore`](https://remoldui.xyz/docs/primitives/ignore) | Leaves its contents out of transitions. |

From `@remold-ui/react/canvas`:

| Component | What it does |
| --- | --- |
| [`Remold.Particles`](https://remoldui.xyz/docs/primitives/particles) | Morphs a word, shape or image into another as dots. |
| [`Remold.DotGrid`](https://remoldui.xyz/docs/primitives/dot-grid) | A dotted background that answers the cursor. |
| [`Remold.Globe`](https://remoldui.xyz/docs/primitives/globe) | A dotted globe with pulses and arcs between places. |
| [`Remold.Scene`](https://remoldui.xyz/docs/primitives/scene) | A canvas scene of objects that springs between layouts. |
| `Remold.Story` | A Scene told as chapters, each revealing a layout with an annotation. |
| [`Remold.Canvas`](https://remoldui.xyz/docs/primitives/canvas) | A canvas you paint yourself, with sizing, the frame loop and springs handled. |

## Hooks

| Hook | What it does |
| --- | --- |
| [`useRemold`](https://remoldui.xyz/docs/hooks/use-remold) | Animates a state change you make from an event handler. |
| [`useRemoldMorph`](https://remoldui.xyz/docs/primitives/morph) | `Remold.Morph` as a ref, for a component you don't render yourself, such as a Base UI or MUI part. |
| [`useViewTransition`](https://remoldui.xyz/docs/hooks/use-view-transition) | Runs a page-sized change through the View Transitions API where the browser has it. |
| [`useTour`](https://remoldui.xyz/docs/primitives/tour) | The current step of a `Remold.Tour` and its target element. |
| [`useAutoplay`](https://remoldui.xyz/docs/hooks/use-autoplay) | Steps through states by itself while on screen, and stops when someone takes over. |
| [`useSpringPress`](https://remoldui.xyz/docs/hooks/use-spring-press) | A small, interruptible spring response for controls pressed with a pointer. |
| [`useDragToDismiss`](https://remoldui.xyz/docs/hooks/use-drag-to-dismiss) | Lets a sheet, card or panel be pulled away, or spring back. |
| `useConnectorMotion` | Keeps connector lines attached to elements that Motion is moving with a layout animation. |
| [`useDust`](https://remoldui.xyz/docs/hooks/use-dust) | Breaks parts of the page into dots that pour somewhere else. From `@remold-ui/react/canvas`. |

The package also exports the [`springs`](https://remoldui.xyz/docs/concepts/springs) presets.

## Styling

Every part renders a plain element. `className` takes a string or a function of the part's state, `render` swaps in your own element, and state shows up as `data-rm-*` attributes. See [Styling](https://remoldui.xyz/docs/concepts/styling).

## Accessibility

Every part follows `prefers-reduced-motion` by default: changes happen at once, with no movement. Morphing text stays real text for screen readers, and focus moves to the new version of an element that was replaced. See [Accessibility](https://remoldui.xyz/docs/concepts/accessibility).

## Related packages

- [`@remold-ui/dom`](https://www.npmjs.com/package/@remold-ui/dom): the same building blocks for plain JavaScript or any UI library.
- [`@remold-ui/canvas`](https://www.npmjs.com/package/@remold-ui/canvas): the canvas parts without React.
- [`@remold-ui/morph`](https://www.npmjs.com/package/@remold-ui/morph): SVG path morphing on your own clock, for Motion or GSAP.
- [`@remold-ui/core`](https://www.npmjs.com/package/@remold-ui/core): the maths underneath, with no DOM.

## License

[MIT](https://github.com/albertdugba/remold-ui/blob/main/LICENSE) © Albert Dugba
