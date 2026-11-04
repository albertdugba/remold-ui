---
"@remold-ui/dom": minor
"@remold-ui/react": minor
---

Layout changes can play in beats with the new `choreography` option, on `transition()`, `Remold.Layout`, `useRemoldLayout` and `useRemold`: what leaves goes first, then what moves, then what arrives, one after another in reading order. `true` uses the default timing; `{ move, enter, stagger, maxStagger }` changes it, in seconds. Off by default, and off with reduced motion.
