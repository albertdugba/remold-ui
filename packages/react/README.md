# @remold-ui/react

React components and hooks for [Remold](https://github.com/albertdugba/remold-ui): morphing text, icons, SVG paths and layouts, connector lines that stay attached while things move, and canvas particles that re-form from one shape into another.

```bash
npm install @remold-ui/react
```

React 18 or newer. ESM and CommonJS, fully typed, free of side effects.

## Usage

```tsx
import { Remold } from "@remold-ui/react";

// "Saving" becomes "Saved" letter by letter: shared letters slide, the rest fade.
// It stays real, selectable text for screen readers.
export function SaveLabel({ saving }: { saving: boolean }) {
  return <Remold.Text>{saving ? "Saving" : "Saved"}</Remold.Text>;
}

// Re-sorting moves each row from where it was to where it is now. Remold matches the rows by
// what they show, so only what changed moves.
export function Tasks({ tasks, sort }: { tasks: Task[]; sort: string }) {
  return (
    <Remold.Morph trigger={sort}>
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </Remold.Morph>
  );
}

// One icon's strokes reshape into the next, from any icon set.
export function MenuButton({ open }: { open: boolean }) {
  return <Remold.Icon icon={open ? <CloseIcon /> : <MenuIcon />} />;
}
```

### Canvas parts

Particles, scenes, the dot grid and the globe draw on a canvas, so they live in their own entry. An interface-only bundle never carries canvas code.

```tsx
import { Remold } from "@remold-ui/react/canvas";

// The dots re-form into the new shape when it changes. No keys to match.
export function Hero({ word }: { word: string }) {
  return <Remold.Particles shape={word} label={`Particles spelling ${word}`} />;
}
```

`@remold-ui/react/canvas` has everything in the main entry too, so a screen that uses canvas imports from one place.

## What's in it

| Part | What it does |
| --- | --- |
| `Remold.Morph` | Animates everything that moved, resized, appeared or left after a change. |
| `Remold.Text` | Morphs text letter by letter. |
| `Remold.Icon` | Reshapes one icon into another, from any icon set or from path data. |
| `Remold.PathGroup` | Morphs a set of paths together, for illustrations and logos. |
| `Remold.Connectors` · `Remold.Anchor` | Lines between elements that stay attached while they move, with pulses along them. |
| `Remold.Ignore` | Leaves part of the page out of matching. |
| `Remold.Particles` · `Remold.DotGrid` · `Remold.Globe` | Point clouds, a dot grid that answers the cursor, and a dotted globe (from `/canvas`). |
| `Remold.Scene` · `Remold.Canvas` · `Remold.Story` | Isometric scenes, a canvas you paint with springs, and a shared clock for a sequence of states (from `/canvas`). |

Hooks: `useRemold` for interactive changes that may be interrupted, `useRemoldMorph` to hand the transition to another component, `useViewTransition` for page-sized changes, plus `useAutoplay`, `useSpringPress`, `useDragToDismiss`, `useConnectorMotion` and, from `/canvas`, `useDust`.

## Accessibility

Remold follows `prefers-reduced-motion`, morphing text stays real text, and focus survives elements being replaced.

## Related packages

- [`@remold-ui/dom`](https://www.npmjs.com/package/@remold-ui/dom): the same primitives for plain JavaScript or any UI library.
- [`@remold-ui/canvas`](https://www.npmjs.com/package/@remold-ui/canvas): canvas scenes and particles without React.
- [`@remold-ui/morph`](https://www.npmjs.com/package/@remold-ui/morph): SVG path morphing for Motion, GSAP or your own clock.
- [`@remold-ui/core`](https://www.npmjs.com/package/@remold-ui/core): the headless maths underneath.

## License

MIT © Albert Dugba
