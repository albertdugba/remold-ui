# Remold

Keeps track of what became what in an interface: between two shapes, two states or two pages. Then it animates the change, describes it, and makes it readable.

It is **headless**: the core is plain TypeScript with no browser code, and thin adapters connect it to React, Vue and Angular. It reads what components have already rendered, so it works alongside any component library (Base UI, React Aria, Radix, MUI) and any chart library (SVG or canvas) without wrapping them.

## Layout

| Folder | Package | Job |
|---|---|---|
| `packages/core` | `@remold-ui/core` | Shapes, morphing, matching, layout. Pure math, no DOM (its tsconfig has no DOM types on purpose). |
| `packages/dom` | `@remold-ui/dom` | Reads the screen (elements, SVG, canvas) into plain data; plays transitions. |
| `packages/react` | `@remold-ui/react` | React primitives plus `useRemold()` and `useViewTransition()` hooks. |
| `packages/vue` | `@remold-ui/vue` | `v-remold` directive. |
| `packages/angular` | `@remold-ui/angular` | Angular bindings for Remold. |
| `apps/docs` | — | Documentation and interactive component examples. |

## Commands

```bash
pnpm install        # once
pnpm dev            # builds the packages and starts the documentation app
pnpm test           # runs every package's tests
pnpm typecheck      # type-checks every package
pnpm build          # builds everything (Turborepo caches unchanged packages)
```

Requires Node 22.12 or newer and pnpm 10.

## React

Use `useRemold()` for interactive changes that may be interrupted, such as sorting or
rapid toggles. Use `useViewTransition()` for page-sized changes: it uses the browser's View
Transitions API where available and falls back to a normal Remold transition elsewhere.

```tsx
import { useState } from "react";
import { useViewTransition } from "@remold-ui/react";

function Product() {
  const { ref, animate } = useViewTransition();
  const [view, setView] = useState("list");
  return <main ref={ref}>
    <button onClick={() => animate(() => setView("detail"))}>Open</button>
    {view === "list" ? <List /> : <Detail />}
  </main>;
}
```
