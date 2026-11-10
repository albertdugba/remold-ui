---
"@remold-ui/core": minor
"@remold-ui/canvas": minor
"@remold-ui/react": minor
---

Particles in 3D. `CloudPoint` takes an optional `z`, which springs and scatters with the rest of the point; `PointCloud.data` now holds five numbers per point (`x, y, size, tone, z`, see `CLOUD_STRIDE`). `particles()` gains a `camera` option that turns the cloud and draws it with perspective, and a `blend: "add"` option for glowing dots on a dark ground. `Remold.Particles` takes the same `camera` and `blend` props.

New `shapes` in `@remold-ui/core`: 3D point shapes (`sphere`, `ellipsoid`, `oval`, `curve`, `torus`, `revolve`, `fromPath`, `spiral`, `helix`, `attractor`) with chainable `at`, `scale`, `rotate`, `mirror`, `tone`, `stripes`, `fuzz`, `warp` and `repeat`, combined with `compose`, which shares dots by each part's `area` so every part is equally dense. `particles()` and `Remold.Particles` take a named palette, `pairing: "flow"` and `camera: true`, and `Remold.Particles` takes a shape directly.

Photos in 3D: `shapes.fromPixels` turns an image's pixels into a relief in its own colours, with a found `palette`; `loadPixels` in `@remold-ui/canvas` reads them in the browser, `setPalette` swaps a cloud's colours, and the camera takes `sway`. `Remold.Particles` takes `{ image, depth, bulge, colors }`.
