---
"@remold-ui/dom": patch
"@remold-ui/react": minor
---

Icons from sets that paint each shape, such as Hugeicons, now morph with their stroke.

- `iconToPath` reads paint the `<svg>` leaves out (fill, stroke, stroke width, line caps and joins) from the icon's first shape.
- `Remold.Icon` and `Remold.PathGroup` take SVG path data as `path` instead of `d`: `<Remold.Icon path="M4 6h16" />`, `{ id, path }`.
