---
"@remold-ui/core": minor
"@remold-ui/dom": minor
"@remold-ui/canvas": minor
"@remold-ui/react": minor
---

Smaller bundles. `@remold-ui/react`'s `Remold` namespace no longer includes the canvas parts: import Scene, Story, Particles, Canvas, Globe, DotGrid and `useDust` from `@remold-ui/react/canvas`, which now also has everything in the main entry. `@remold-ui/dom` reads CSS colours with its own small parser instead of `culori`, and `@remold-ui/core` parses SVG paths itself instead of with `svgpath`, so neither has dependencies left. `particles()` loads its matching worker only when a cloud is big enough to need it.
