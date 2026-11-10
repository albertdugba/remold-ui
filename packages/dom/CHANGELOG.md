# @remold-ui/dom

## 0.1.0

### Minor Changes

- 451cb19: Initial public release of the Remold UI packages.
- 7d0fe18: Morph changes can play in beats with the new `choreography` option, on `transition()`, `Remold.Morph`, `useRemoldMorph` and `useRemold`: what leaves goes first, then what moves, then what arrives, one after another in reading order. `true` uses the default timing; `{ move, enter, stagger, maxStagger }` changes it, in seconds. Off by default, and off with reduced motion.

### Patch Changes

- 7d0fe18: A `Remold.Icon` that changes inside a `Remold.Morph` now morphs in place instead of fading in again. The snapshot reads an element's media identity from `data-rm-media` when it has one (exported as `MEDIA_ATTRIBUTE`), and `Remold.Icon` sets it to an id that stays the same for the life of the icon.
- 7d0fe18: Icons from sets that paint each shape, such as Hugeicons, now morph with their stroke.

  - `iconToPath` reads paint the `<svg>` leaves out (fill, stroke, stroke width, line caps and joins) from the icon's first shape.
  - `Remold.Icon` and `Remold.PathGroup` take SVG path data as `path` instead of `d`: `<Remold.Icon path="M4 6h16" />`, `{ id, path }`.

- Updated dependencies [451cb19]
- Updated dependencies [a70cf4d]
- Updated dependencies [6774696]
  - @remold-ui/core@0.1.0
