---
"@remold-ui/core": minor
"@remold-ui/canvas": minor
"@remold-ui/react": minor
---

Particles can now scatter between shapes. Pass `transition="scatter"` to `Remold.Particles` (or `{ transition: "scatter" }` to `particles().to`) and the shape dissolves into a loose, glittering cloud before gathering into the next one; `{ type: "scatter", spread, hold, stagger, seed }` tunes it, and reduced motion skips it. In core, `pointCloud().to` takes the same settings as `scatter`.

Also fixes a `pointCloud: matches don't fit` error when a particles canvas resized while a large shape change was still being paired off the main thread.
