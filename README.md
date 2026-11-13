<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/hero-dark.svg">
  <img alt="remold/ui: animated React components with the micro-animations built in. The word remold sits in a selection box with corner handles, and the logo beside it remolds between a square shoulder and an arc." src=".github/assets/hero-light.svg" width="100%">
</picture>

<br />
<br />

[![CI](https://github.com/albertdugba/remold-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/albertdugba/remold-ui/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@remold-ui/react?color=18181b&label=npm)](https://www.npmjs.com/package/@remold-ui/react)
[![License: MIT](https://img.shields.io/badge/license-MIT-18181b)](LICENSE)

**Animated React components with the micro-animations built in, and the engine that morphs them.**

[Documentation](https://remoldui.xyz/docs) · [Components](https://remoldui.xyz/docs/components) · [Quick start](https://remoldui.xyz/docs/quick-start)

</div>

---

## What it is

Remold is two things that work together.

- **Components you copy into your app.** Inputs, menus, checkouts, dashboards and more, each animating only the change that matters. They are built on [Base UI](https://base-ui.com) for behaviour and accessibility, and animated with [Motion](https://motion.dev) and Remold. You install them from a shadcn registry and own the code.
- **The engine underneath.** When an interface changes, Remold works out which element became which and morphs one state into the next: text, icons, SVG paths and whole layouts. It needs no ids or matching attributes, and it works in React or with plain JavaScript and any UI library.

## Install a component

Every component on [remoldui.xyz](https://remoldui.xyz/docs/components) has an install command. It copies the source into `components/remold/` and adds the packages it needs.

```bash
npx shadcn@latest add https://remoldui.xyz/r/otp-input.json
```

## Use the engine

### React

```bash
npm install @remold-ui/react
```

```tsx
import { Remold } from "@remold-ui/react";

// Re-sorting moves each row from where it was to where it is now.
export function Tasks({ tasks, sort }) {
  return (
    <Remold.Morph trigger={sort}>
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </Remold.Morph>
  );
}

// "Follow" becomes "Following": the letters they share stay, and "ing" arrives.
export function FollowLabel({ following }) {
  return <Remold.Text>{following ? "Following" : "Follow"}</Remold.Text>;
}

// The menu icon's strokes reshape into the close icon.
export function MenuButton({ open }) {
  return <Remold.Icon icon={open ? <CloseIcon /> : <MenuIcon />} />;
}
```

### Plain JavaScript or any UI library

```bash
npm install @remold-ui/dom
```

`transition()` takes an element and a function that changes what is inside it. Remold reads the page before and after, and moves what moved.

```js
import { morphText, transition } from "@remold-ui/dom";

transition(list, () => {
  list.replaceChildren(...sortedTasks.map(renderRow));
});

morphText(followLabel, "Following");
```

## Building blocks

| React | Plain JavaScript | What it does |
| --- | --- | --- |
| [`Remold.Morph`](https://remoldui.xyz/docs/primitives/morph) | `transition()` | Animates everything that moved, resized, appeared or left when a value changes. |
| [`Remold.Text`](https://remoldui.xyz/docs/primitives/text) | `morphText()` | Changes text letter by letter: shared letters slide, the rest fade. |
| [`Remold.Icon`](https://remoldui.xyz/docs/primitives/icon) | `iconToPath()` + `createMorph()` | Reshapes one icon into the next, from any icon set. |
| [`Remold.PathGroup`](https://remoldui.xyz/docs/primitives/path-group) | `createMorph()` | Morphs an illustration made of several paths. |
| [`Remold.Connectors`](https://remoldui.xyz/docs/primitives/connectors) | `connectors()` | Lines between elements that stay attached while they move. |
| [`Remold.Tour`](https://remoldui.xyz/docs/primitives/tour) | | Walks people through an interface one step at a time. |
| [`Remold.Particles`](https://remoldui.xyz/docs/primitives/particles) | `particles()` | Rebuilds thousands of dots into any word, shape or image. |
| [`Remold.Scene`](https://remoldui.xyz/docs/primitives/scene) · [`Remold.Canvas`](https://remoldui.xyz/docs/primitives/canvas) | `scene()` · `painter()` | Canvas scenes that spring between layouts, and a canvas you paint yourself. |
| [`Remold.Globe`](https://remoldui.xyz/docs/primitives/globe) · [`Remold.DotGrid`](https://remoldui.xyz/docs/primitives/dot-grid) | `globe()` · `dotGrid()` | A dotted globe, and a dot grid that answers the cursor. |

The canvas parts come from `@remold-ui/react/canvas`, so an interface that doesn't use them never ships canvas code. Everything follows `prefers-reduced-motion`, and morphing text stays real text for screen readers.

## Packages

| Package | |
| --- | --- |
| [`@remold-ui/react`](packages/react) | React components and hooks. |
| [`@remold-ui/dom`](packages/dom) | The same building blocks for plain JavaScript or any UI library. |
| [`@remold-ui/canvas`](packages/canvas) | Particles, scenes, the globe and the dot grid without React. |
| [`@remold-ui/morph`](packages/morph) | SVG path morphing on its own, for Motion, GSAP or your own renderer. |
| [`@remold-ui/core`](packages/core) | The maths underneath: morphing, matching and springs, with no DOM. |

The packages are versioned together and ship ESM and CommonJS with types.

## Development

Needs Node 22.12 or newer and pnpm 10.

```bash
pnpm install     # once
pnpm dev         # builds the packages and starts the docs at localhost:5192
pnpm test        # every package's tests
pnpm typecheck   # every package and the docs
pnpm lint        # Biome
pnpm build       # everything; Turborepo skips what hasn't changed
```

The library lives in `packages/`, and the docs site with every component is `apps/docs`.

## Contributing

Issues and pull requests are welcome.

- **Keep the change focused,** and add a changeset with `pnpm changeset` if users will notice it.
- **Run the checks before you push:** `pnpm lint && pnpm typecheck && pnpm test`.
- **Components solve a specific problem.** Animate the one change that matters, and leave the rest still.

Releases are described in [RELEASING.md](RELEASING.md).

## Built with

[Base UI](https://base-ui.com) for behaviour and accessibility, [Motion](https://motion.dev) for springs and shared-element animation, and [Hugeicons](https://hugeicons.com) for icons. The currency converter's rates come from [ExchangeRate-API](https://www.exchangerate-api.com).

## License

[MIT](LICENSE) © Albert Dugba
