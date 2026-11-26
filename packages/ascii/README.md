# @remold-ui/ascii

Live ASCII art on WebGL2. Lit 3D words, logos and models, photos, videos and the camera, drawn as characters, binary, mixed digits, blocks, Braille, halftone or a 1-bit dither, every frame, in the browser.

Nothing here is a recording: the renderer draws each frame from the scene you give it, so it follows the cursor, changes words, and stays sharp at any size.

## Install

```bash
npm install @remold-ui/ascii
```

Ships ESM and CommonJS with types. No dependencies.

## Usage

```js
import { createAsciiRenderer, textField, torusKnot } from "@remold-ui/ascii";

const canvas = document.querySelector("canvas");
const ascii = createAsciiRenderer(canvas, { cellSize: 11, style: "braille" });

ascii.resize({ width: canvas.clientWidth, height: canvas.clientHeight, pixelRatio: devicePixelRatio });
ascii.setMesh(torusKnot());

function frame(now) {
  ascii.render({
    subject: "mesh",
    ink: { dark: "#2e2e34", light: "#f4f4f5" },
    camera: { yaw: now / 3000, pitch: 0.3 },
    seconds: now / 1000,
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

### Subjects

- **Shapes**: a word or an SVG path, extruded and lit. Load `textField("hello")` or `pathField(d, viewBox)` into the `logo`, `from` and `to` slots with `setField`. Then `morph` (logo to word) and `change` (one word to the next) blend between them.
- **Meshes**: `setMesh(torusKnot())`, or `setMesh(parseStl(buffer))` for any binary or text STL. Models are centred and scaled to the same size.
- **Media**: `setMedia(image | video | canvas)`. A playing video is read again on every render, so a `getUserMedia` stream gives live camera ASCII. `mirror`, `fit` and `tone` (contrast, brightness, gamma, floor) tune it, and `ink.source` colours each character from the image under it.

### Styles

`ascii`, `binary`, `mixed`, `blocks`, `braille`, `halftone` and `dither`. Switch with `setStyle`. Custom characters, faint to dense, with `setRamp(" .:-=+*#%@")`.

### Text out

`ascii.text(frame)` returns the frame as plain text in the current style, trimmed to what holds anything. Braille and dither come out as Unicode Braille.

### Motion

The renderer has no clock of its own. Pass `seconds` to make binary and mixed digits flicker, and hold it still (or at 0) when the reader prefers reduced motion.
