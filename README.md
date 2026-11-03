<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/hero-dark.svg">
  <img alt="Remold: animated components for your UI, and the primitives to build your own. Change you can follow. A list sorted newest first is re-sorted A to Z, with a line following each row to where it went, over particles streaming from a loose cloud into a neat grid. Around it float a revenue card, a save button turning from Saving to Saved, an avatar stack, and a dotted globe." src=".github/assets/hero-light.svg" width="100%">
</picture>

<br />
<br />

[![CI](https://github.com/albertdugba/remold-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/albertdugba/remold-ui/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-18181b)](LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-18181b?logo=typescript&logoColor=white)
![Works with any framework](https://img.shields.io/badge/works%20with-any%20framework-18181b)
![Reduced motion](https://img.shields.io/badge/reduced%20motion-respected-18181b)

**Change you can follow.**

Animated components for your UI, and the primitives to compose your own:<br />
layout, text and icon morphs, connectors, canvas scenes and particles.

</div>

---

## Why Remold

Most interfaces change by swapping one thing for another. A list re-sorts, "Save" becomes "Saved", a menu icon becomes a close icon, a pill grows into a palette. When that happens all at once, people lose track of what went where. Remold closes that gap.

- **It works out what became what.** You don't give elements ids or wrap them in keyed motion components. Remold reads what's on the page before and after a change and pairs things up by what they show.
- **It moves only what changed.** Shared letters slide while the others fade. Strokes reshape from one icon into the next. Elements that moved travel from where they were to where they are now.
- **It works with any framework.** The core is plain TypeScript with no browser code. On top of it there are React bindings, and a plain-JavaScript API for everything else: Vue, Svelte, Angular, Solid, or no framework at all. It reads what's already been rendered, so it works with Base UI, React Aria, Radix, MUI, or your own components.
- **It's accessible by default.** It follows `prefers-reduced-motion`. Morphing text stays real, selectable text for screen readers. Focus survives elements being replaced, and changes can be announced.

## Quick start

> Remold hasn't had its first npm release yet. Until it does, clone the repo and use the workspace packages (see [Development](#development)).

### React

```bash
npm install @remold-ui/react
```

```tsx
import { Remold } from "@remold-ui/react";

export function Tasks({ tasks, sort }) {
  // Re-sorting moves each row from where it was to where it is now. Remold matches rows by what
  // they show, so it needs no ids of its own (the key is only there for React).
  return (
    <Remold.Layout trigger={sort}>
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </Remold.Layout>
  );
}

export function SaveLabel({ saving }) {
  // "Saving" becomes "Saved" letter by letter: the shared letters stay put.
  return <Remold.Text>{saving ? "Saving" : "Saved"}</Remold.Text>;
}

export function MenuButton({ open }) {
  // The menu icon's strokes reshape into the close icon.
  return <Remold.Icon icon={open ? <CloseIcon /> : <MenuIcon />} />;
}
```

### Plain JavaScript, or any framework

```bash
npm install @remold-ui/dom
```

`transition()` takes an element and a function that changes what's inside it. Remold reads the page before and after, and moves what moved.

```js
import { morphText, transition } from "@remold-ui/dom";

// Change the DOM however you like: replaceChildren, innerHTML, a template.
transition(list, () => {
  list.replaceChildren(...sortBy(tasks, "a–z").map(renderRow));
});

morphText(statusLabel, "Saved");
```

The change can be async, which is how it works with frameworks that render on their own schedule. Change the state, then wait for the framework to update the page:

```js
// Vue
transition(list, async () => {
  sort.value = "a–z";
  await nextTick();
});

// Svelte
transition(list, async () => {
  sort = "a–z";
  await tick();
});
```

## Primitives

| React | Plain JavaScript | What it does |
| --- | --- | --- |
| `Remold.Layout` | `transition()` | Animates everything that moved, resized, appeared or left. It matches elements by what they show, so it works even when each view has different markup. |
| `Remold.Text` | `morphText()` | Morphs text letter by letter: shared letters slide, the rest fade. |
| `Remold.Icon` | `iconToPath()` + `createMorph()` | Reshapes one icon into another, from any icon set or from path data. |
| `Remold.Connectors` + `Remold.Anchor` | `connectors()` | Draws lines between elements that stay attached while they move. Lines draw in and out, and pulses run along them. |
| `Remold.PathGroup` | `createMorph()` | Morphs a set of paths together, for illustrations and logos. |
| `Remold.Scene` · `Remold.Canvas` | `scene()` · `painter()` | Live canvas scenes: an isometric camera and layouts that spring between each other. |
| `Remold.Particles` · `Remold.DotGrid` · `Remold.Globe` | `particles()` · `dotGrid()` · `globe()` | Point clouds that re-form from one shape into the next, with no keys to match. |
| `Remold.Story` | | Plays a sequence of states on one shared clock. |
| `Remold.Ignore` | `data-rm-ignore` | Leaves part of the page out of matching. |

The JavaScript functions come from `@remold-ui/dom`, `@remold-ui/canvas` and `@remold-ui/morph`.

React hooks: `useRemold()` for interactive changes that may be interrupted, `useViewTransition()` for page-sized changes (with the View Transitions API where the browser has it), plus `useAutoplay`, `useSpringPress`, `useDragToDismiss` and `useConnectorMotion`.

## Components

The docs ship copy-in components built on these primitives. Each one solves a specific product problem, with motion only on the change that matters. Every component page has an install command for the shadcn registry, which copies its code and CSS into your project.

| | |
| --- | --- |
| **Interface** | Command palette · Product tour · Save button · Step progress · Avatar stack · Bulk selection · Comment thread · Course outline · Filter bar · Flight rebooking · Hold to record · Invite teammates · Label picker · Live room · Logo morph · Mentions · Morph icons · Onboarding checklist · One-time code · Two-factor setup · Usage meter · Wallet and more |
| **Form elements** | Amount input · Phone input · Tag input · Address autocomplete · Quantity stepper · Promo code · Range slider · Upload row · Split amount |
| **Particles and canvas** | Inbox triage · Donation goal · Dot grid hero · Focus timer · Live visitors · Unit chart · Voice orb |

## Packages

| Package | |
| --- | --- |
| [`@remold-ui/core`](packages/core) | Shapes, morphing, matching and layout. Pure maths with no DOM, on purpose. |
| [`@remold-ui/dom`](packages/dom) | Reads what's on screen (elements, SVG, canvas) into plain data, and plays transitions. |
| [`@remold-ui/react`](packages/react) | React components and hooks. |
| [`@remold-ui/vue`](packages/vue) | Vue adapter. Early: for now, use `@remold-ui/dom` from Vue, as in the quick start. |
| [`@remold-ui/angular`](packages/angular) | Angular adapter. Early: for now, use `@remold-ui/dom` from Angular. |
| [`@remold-ui/canvas`](packages/canvas) | Live canvas scenes, looks and keyless point clouds. |
| [`@remold-ui/morph`](packages/morph) | Framework-neutral SVG path matching and interpolation, for Motion, GSAP or your own renderer. |

Every package is versioned together, ships ESM and CommonJS with types, and is free of side effects so it tree-shakes.

## Development

Requires Node 22.12 or newer and pnpm 10.

```bash
pnpm install     # once
pnpm dev         # builds the packages and starts the docs, with every component live
pnpm test        # every package's tests
pnpm typecheck   # every package, strict
pnpm lint        # Biome
pnpm build       # everything; Turborepo skips what hasn't changed
```

```text
packages/
  core/      headless maths: shapes, morphing, matching
  dom/       the browser layer
  react/     React components and hooks
  vue/       Vue adapter (early)
  angular/   Angular adapter (early)
  canvas/    canvas scenes and particles
  morph/     standalone SVG path morphing
apps/
  docs/      documentation and every component, live
```

## CI and releases

Every pull request and every push to `main` runs [CI](.github/workflows/ci.yml), four jobs in parallel:

| Job | Checks |
| --- | --- |
| **lint** | Biome across the whole repo. |
| **typecheck** | Every package and the docs, with Turborepo's cache. |
| **test** | Every package's Vitest suite. |
| **build-and-package** | Builds everything, then checks that every file each package exports is really there. |

Releases use [Changesets](https://github.com/changesets/changesets):

1. Add a changeset with each user-facing change: `pnpm changeset`.
2. [Version packages](.github/workflows/version-packages.yml) opens a pull request that bumps every package together.
3. Pushing a `vX.Y.Z` tag runs [Publish packages](.github/workflows/publish.yml). It checks the tag matches the version, reruns the full checks, and publishes every package to npm.

The details are in [RELEASING.md](RELEASING.md).

## Contributing

Issues and pull requests are welcome.

- **Keep the change focused.** Add a changeset if users will notice it.
- **Run the checks before you push:** `pnpm lint && pnpm typecheck && pnpm test`. Husky lints your staged files on commit.
- **Components solve a specific problem.** Animate the one change that matters, and leave the rest still.

## License

[MIT](LICENSE) © Albert Dugba

<sub>The README hero is drawn by [`scripts/readme-hero.py`](scripts/readme-hero.py). Run it from the repo root after changing it: `python3 scripts/readme-hero.py`.</sub>
