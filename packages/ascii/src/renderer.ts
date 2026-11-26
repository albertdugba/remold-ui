/**
 * Live ASCII art on WebGL2. A sample pass finds what is under every sample: an extruded shape by
 * ray-marching, a mesh by drawing its triangles, or an image, video or camera by filtering it. The
 * glyph pass then draws the style at full resolution. Nothing animates on its own: call `render`
 * with each frame, from your own loop.
 */
import type { DistanceField } from "./distance-field";
import { DEFAULT_FONT, glyphAtlas, glyphLayout, type GlyphLayout } from "./glyphs";
import type { Mesh } from "./mesh";
import { CAMERA, FULL_SCREEN, GLYPHS, MEDIA, MESH_FRAGMENT, MESH_VERTEX, SHAPE } from "./shaders";
import { type AsciiCells, type AsciiStyle, EDGE_THRESHOLD, frameCells, type FrameTextOptions, frameText, STYLES } from "./styles";

export type FieldSlot = "logo" | "from" | "to";
export type AsciiSubject = "shape" | "mesh" | "media";
export type MediaElement = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageBitmap | OffscreenCanvas;

export interface AsciiInk {
  /** The colour of the least lit surface. */
  dark: string;
  /** The colour of the most lit surface. */
  light: string;
  /** Draw lit surfaces sparsely, for ink on a light ground. */
  invert?: boolean;
  /** Colour each character from the image or video under it instead. */
  source?: boolean;
}

export interface AsciiTone {
  /** 1 leaves it as is. Default 1. */
  contrast?: number;
  /** Added to the tone, from -1 to 1. Default 0. */
  brightness?: number;
  /** Above 1 darkens the mid-tones. Default 1. */
  gamma?: number;
  /** Tones below this are left empty. Default 0. */
  floor?: number;
}

export interface AsciiFrame {
  subject: AsciiSubject;
  ink: AsciiInk;
  /** Turn about the upright axis, then lean toward you, in radians. */
  camera?: { yaw?: number; pitch?: number };
  /** Where the light is, in view space: x right, y up, z toward you. */
  light?: readonly [number, number, number];
  /** For shapes: 0 shows the logo, 1 the word. */
  morph?: number;
  /** For shapes: 0 shows the `from` word, 1 the `to` word. */
  change?: number;
  /** For shapes: half the extrusion's thickness, in world units. Default 0.2. */
  depth?: number;
  /** Drives the flicker of binary and mixed digits. Hold it still for reduced motion. */
  seconds?: number;
  tone?: AsciiTone;
  /** For media: flip left to right, as a selfie camera expects. Default false. */
  mirror?: boolean;
  /** For media: fill the canvas and crop, or fit inside it. Default `"cover"`. */
  fit?: "cover" | "contain";
}

export interface AsciiRendererOptions {
  /** The height of a character cell, in CSS pixels. Default 11. */
  cellSize?: number;
  /** The characters from faintest to densest. Default `".:-=+*#%@"`. */
  ramp?: string;
  /** A monospace font stack. */
  font?: string;
  style?: AsciiStyle;
}

const DEFAULT_CELL_SIZE = 11;
const DEFAULT_DEPTH = 0.2;
const DEFAULT_LIGHT = [-2.6, 2.2, 3] as const;
const ROUNDING = 0.035;
const EDGE_GAIN = 1.3;
const NEAR = 0.5;
const FAR = 20;
const SLOTS: readonly FieldSlot[] = ["logo", "from", "to"];
const HAVE_CURRENT_DATA = 2;

/** Half the view's height at the origin, wide enough that a 4-unit shape fits any aspect. */
const halfHeightFor = (aspect: number) => Math.max(1.15, 2.6 / aspect);

export function createAsciiRenderer(canvas: HTMLCanvasElement, options: AsciiRendererOptions = {}) {
  const context = canvas.getContext("webgl2", { antialias: false, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true });

  if (!context) throw new Error("ascii: this needs WebGL2, which this browser doesn't offer");

  const gl: WebGL2RenderingContext = context;
  const programs = {
    shape: program(gl, FULL_SCREEN, SHAPE),
    mesh: program(gl, MESH_VERTEX, MESH_FRAGMENT),
    media: program(gl, FULL_SCREEN, MEDIA),
    glyphs: program(gl, FULL_SCREEN, GLYPHS),
  };
  const locations = {
    shape: uniforms(gl, programs.shape),
    mesh: uniforms(gl, programs.mesh),
    media: uniforms(gl, programs.media),
    glyphs: uniforms(gl, programs.glyphs),
  };

  const emptyArray = gl.createVertexArray();
  const meshArray = gl.createVertexArray();
  const meshBuffers = { positions: gl.createBuffer(), normals: gl.createBuffer(), indices: gl.createBuffer() };
  let meshIndexCount = 0;

  const fields = Object.fromEntries(SLOTS.map((slot) => [slot, texture(gl, gl.LINEAR)])) as Record<FieldSlot, WebGLTexture>;
  const mediaTexture = texture(gl, gl.LINEAR);
  const atlas = texture(gl, gl.NEAREST);
  const samples = texture(gl, gl.NEAREST);
  const tints = texture(gl, gl.NEAREST);
  const depth = gl.createRenderbuffer();
  const framebuffer = gl.createFramebuffer();

  const settings = { cellSize: options.cellSize ?? DEFAULT_CELL_SIZE, font: options.font ?? DEFAULT_FONT, pixelRatio: 1, width: 1, height: 1 };
  const grid = { columns: 1, rows: 1, cellWidth: 1, cellHeight: 1, originX: 0, originY: 0 };
  let layout: GlyphLayout = glyphLayout(options.ramp);
  let style: AsciiStyle = options.style ?? "ascii";
  let media: { element: MediaElement; width: number; height: number; live: boolean } | null = null;

  const split = () => STYLES[style].split;
  const sampleWidth = () => grid.columns * split()[0];
  const sampleHeight = () => grid.rows * split()[1];

  function allocateSamples() {
    for (const target of [samples, tints]) {
      gl.bindTexture(gl.TEXTURE_2D, target);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, sampleWidth(), sampleHeight(), 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }

    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, sampleWidth(), sampleHeight());
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, samples, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, tints, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function layOut() {
    const glyphs = glyphAtlas({ characters: layout.characters, size: settings.cellSize, pixelRatio: settings.pixelRatio, font: settings.font });

    gl.bindTexture(gl.TEXTURE_2D, atlas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, glyphs.canvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    grid.cellWidth = glyphs.cellWidth;
    grid.cellHeight = glyphs.cellHeight;
    grid.columns = Math.max(1, Math.floor(canvas.width / glyphs.cellWidth));
    grid.rows = Math.max(1, Math.floor(canvas.height / glyphs.cellHeight));
    grid.originX = Math.floor((canvas.width - grid.columns * grid.cellWidth) / 2);
    grid.originY = Math.floor((canvas.height - grid.rows * grid.cellHeight) / 2);
    allocateSamples();
  }

  /** Size the canvas, in CSS pixels. */
  function resize({ width, height, pixelRatio = 1 }: { width: number; height: number; pixelRatio?: number }) {
    settings.width = width;
    settings.height = height;
    settings.pixelRatio = pixelRatio;
    canvas.width = Math.max(1, Math.round(width * pixelRatio));
    canvas.height = Math.max(1, Math.round(height * pixelRatio));
    layOut();
  }

  function setCellSize(size: number) {
    if (!(size > 0)) throw new RangeError(`ascii: cellSize must be positive, got ${size}`);
    settings.cellSize = size;
    layOut();
  }

  function setRamp(ramp: string) {
    layout = glyphLayout(ramp);
    layOut();
  }

  function setStyle(next: AsciiStyle) {
    const [x, y] = split();
    style = next;
    if (split()[0] !== x || split()[1] !== y) allocateSamples();
  }

  function setField(slot: FieldSlot, field: DistanceField) {
    gl.bindTexture(gl.TEXTURE_2D, fields[slot]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, field.width, field.height, 0, gl.RED, gl.FLOAT, field.distances);
  }

  function setMesh(mesh: Mesh) {
    gl.bindVertexArray(meshArray);

    for (const [buffer, data, name] of [
      [meshBuffers.positions, mesh.positions, "aPosition"],
      [meshBuffers.normals, mesh.normals, "aNormal"],
    ] as const) {
      const location = gl.getAttribLocation(programs.mesh, name);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshBuffers.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    meshIndexCount = mesh.indices.length;
  }

  /** An image, a canvas or a playing video. A video is read again on every render, so a camera stays live. */
  function setMedia(element: MediaElement | null) {
    if (!element) {
      media = null;
      return;
    }

    const live = typeof HTMLVideoElement !== "undefined" && element instanceof HTMLVideoElement;
    const [width, height] = mediaSize(element);
    media = { element, width, height, live };
    if (!live) uploadMedia();
  }

  function uploadMedia() {
    if (!media) return;

    if (media.live) {
      const video = media.element as HTMLVideoElement;
      if (video.readyState < HAVE_CURRENT_DATA) return;
      media.width = video.videoWidth;
      media.height = video.videoHeight;
    }

    gl.bindTexture(gl.TEXTURE_2D, mediaTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, media.element);
  }

  function drawSamples(frame: AsciiFrame) {
    const aspect = (grid.columns * grid.cellWidth) / (grid.rows * grid.cellHeight);
    const halfHeight = halfHeightFor(aspect);
    const rotation = rotationMatrix(frame.camera?.yaw ?? 0, frame.camera?.pitch ?? 0);
    const light = frame.light ?? DEFAULT_LIGHT;

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, sampleWidth(), sampleHeight());
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (frame.subject === "mesh") {
      if (meshIndexCount === 0) return;

      gl.enable(gl.DEPTH_TEST);
      gl.useProgram(programs.mesh);
      gl.uniformMatrix3fv(locations.mesh.uRotation ?? null, false, rotation);
      gl.uniformMatrix4fv(locations.mesh.uProjection ?? null, false, perspective(CAMERA / halfHeight, aspect));
      gl.uniform3f(locations.mesh.uLight ?? null, ...light);
      gl.bindVertexArray(meshArray);
      gl.drawElements(gl.TRIANGLES, meshIndexCount, gl.UNSIGNED_INT, 0);
      gl.disable(gl.DEPTH_TEST);
      return;
    }

    gl.bindVertexArray(emptyArray);

    if (frame.subject === "media") {
      if (!media) return;
      if (media.live) uploadMedia();
      if (media.width === 0 || media.height === 0) return;

      const mediaAspect = media.width / media.height;
      const wider = mediaAspect > aspect;
      const cover = (frame.fit ?? "cover") === "cover";
      const fit = wider === cover ? [aspect / mediaAspect, 1] : [1, mediaAspect / aspect];
      const tone = frame.tone ?? {};
      const at = locations.media;

      gl.useProgram(programs.media);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, mediaTexture);
      gl.uniform1i(at.uMedia ?? null, 0);
      gl.uniform2f(at.uGrid ?? null, sampleWidth(), sampleHeight());
      gl.uniform2f(at.uFit ?? null, fit[0] ?? 1, fit[1] ?? 1);
      gl.uniform1f(at.uMirror ?? null, frame.mirror ? 1 : 0);
      gl.uniform1f(at.uContrast ?? null, tone.contrast ?? 1);
      gl.uniform1f(at.uBrightness ?? null, tone.brightness ?? 0);
      gl.uniform1f(at.uGamma ?? null, tone.gamma ?? 1);
      gl.uniform1f(at.uEdgeGain ?? null, EDGE_GAIN);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return;
    }

    const at = locations.shape;
    gl.useProgram(programs.shape);
    SLOTS.forEach((slot, unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, fields[slot]);
    });
    gl.uniform1i(at.uLogo ?? null, 0);
    gl.uniform1i(at.uFrom ?? null, 1);
    gl.uniform1i(at.uTo ?? null, 2);
    gl.uniform1f(at.uMorph ?? null, frame.morph ?? 1);
    gl.uniform1f(at.uChange ?? null, frame.change ?? 1);
    gl.uniform2f(at.uGrid ?? null, sampleWidth(), sampleHeight());
    gl.uniform1f(at.uAspect ?? null, aspect);
    gl.uniform1f(at.uHalfHeight ?? null, halfHeight);
    gl.uniformMatrix3fv(at.uRotation ?? null, false, rotation);
    gl.uniform3f(at.uLight ?? null, ...light);
    gl.uniform1f(at.uDepth ?? null, frame.depth ?? DEFAULT_DEPTH);
    gl.uniform1f(at.uRound ?? null, ROUNDING);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function render(frame: AsciiFrame) {
    drawSamples(frame);

    const at = locations.glyphs;
    const [splitX, splitY] = split();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(programs.glyphs);
    gl.bindVertexArray(emptyArray);

    [samples, tints, atlas].forEach((each, unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, each);
    });
    gl.uniform1i(at.uCells ?? null, 0);
    gl.uniform1i(at.uTints ?? null, 1);
    gl.uniform1i(at.uAtlas ?? null, 2);
    gl.uniform2f(at.uCell ?? null, grid.cellWidth, grid.cellHeight);
    gl.uniform2f(at.uOrigin ?? null, grid.originX, grid.originY);
    gl.uniform2i(at.uGridSize ?? null, grid.columns, grid.rows);
    gl.uniform2i(at.uSplit ?? null, splitX, splitY);
    gl.uniform1i(at.uStyle ?? null, STYLES[style].id);
    gl.uniform1i(at.uRamp ?? null, layout.ramp.length);
    gl.uniform1i(at.uEdges ?? null, layout.edges);
    gl.uniform1i(at.uDigits ?? null, layout.digits);
    gl.uniform1i(at.uMixed ?? null, layout.mixed);
    gl.uniform3f(at.uInkDark ?? null, ...rgb(frame.ink.dark));
    gl.uniform3f(at.uInkLight ?? null, ...rgb(frame.ink.light));
    gl.uniform1f(at.uInvert ?? null, frame.ink.invert ? 1 : 0);
    gl.uniform1f(at.uSourceColour ?? null, frame.ink.source && frame.subject === "media" ? 1 : 0);
    gl.uniform1f(at.uFloor ?? null, frame.tone?.floor ?? 0);
    gl.uniform1f(at.uEdgeThreshold ?? null, EDGE_THRESHOLD);
    gl.uniform1f(at.uPixel ?? null, Math.max(1, Math.round(settings.pixelRatio)));
    gl.uniform1f(at.uSeconds ?? null, frame.seconds ?? 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function readFrame(frame: AsciiFrame): FrameTextOptions {
    drawSamples(frame);

    const width = sampleWidth();
    const height = sampleHeight();
    const samples = new Uint8Array(width * height * 4);
    const colours = new Uint8Array(width * height * 4);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, samples);
    gl.readBuffer(gl.COLOR_ATTACHMENT1);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, colours);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const media = frame.subject === "media";

    return {
      style,
      columns: grid.columns,
      rows: grid.rows,
      seconds: frame.seconds ?? 0,
      invert: frame.ink.invert ?? false,
      ramp: layout.ramp,
      floor: frame.tone?.floor ?? 0,
      read: (x, y) => {
        const at = (y * width + x) * 4;
        return {
          hit: (samples[at + 3] ?? 0) >= 128,
          lit: (samples[at] ?? 0) / 255,
          edgeAngle: (samples[at + 1] ?? 0) / 255,
          edgeStrength: (samples[at + 2] ?? 0) / 255,
          tint: media ? [colours[at] ?? 0, colours[at + 1] ?? 0, colours[at + 2] ?? 0] : undefined,
        };
      },
    };
  }

  /** The frame as plain text in the current style, trimmed to the rows and columns that hold anything. */
  function text(frame: AsciiFrame): string {
    return frameText(readFrame(frame));
  }

  /** The frame as a grid of characters, how lit each is and its source colour: for terminal and SVG exports. */
  function cells(frame: AsciiFrame): AsciiCells {
    return frameCells(readFrame(frame));
  }

  function destroy() {
    for (const each of [...Object.values(fields), mediaTexture, atlas, samples, tints]) gl.deleteTexture(each);
    for (const each of Object.values(meshBuffers)) gl.deleteBuffer(each);
    for (const each of Object.values(programs)) gl.deleteProgram(each);
    gl.deleteRenderbuffer(depth);
    gl.deleteFramebuffer(framebuffer);
    gl.deleteVertexArray(emptyArray);
    gl.deleteVertexArray(meshArray);
    media = null;
  }

  return {
    resize,
    setCellSize,
    setRamp,
    setStyle,
    setField,
    setMesh,
    setMedia,
    render,
    text,
    cells,
    destroy,
    /** The character grid, for sizing exports. */
    get grid() {
      return { columns: grid.columns, rows: grid.rows };
    },
  };
}

export type AsciiRenderer = ReturnType<typeof createAsciiRenderer>;

function mediaSize(element: MediaElement): [number, number] {
  if (typeof HTMLVideoElement !== "undefined" && element instanceof HTMLVideoElement) return [element.videoWidth, element.videoHeight];
  if (typeof HTMLImageElement !== "undefined" && element instanceof HTMLImageElement) return [element.naturalWidth, element.naturalHeight];
  return [element.width, element.height];
}

/** Turn about the upright axis, then lean: the rotation shapes and meshes share, column-major. */
export function rotationMatrix(yaw: number, pitch: number): Float32Array {
  const [cy, sy, cp, sp] = [Math.cos(yaw), Math.sin(yaw), Math.cos(pitch), Math.sin(pitch)];

  return new Float32Array([cy, 0, -sy, sy * sp, cp, cy * sp, sy * cp, -sp, cy * cp]);
}

function perspective(focal: number, aspect: number): Float32Array {
  const range = NEAR - FAR;

  return new Float32Array([focal / aspect, 0, 0, 0, 0, focal, 0, 0, 0, 0, (NEAR + FAR) / range, -1, 0, 0, (2 * NEAR * FAR) / range, 0]);
}

function texture(gl: WebGL2RenderingContext, filter: number): WebGLTexture {
  const created = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, created);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, 1, 1, 0, gl.RED, gl.FLOAT, new Float32Array([1]));

  return created;
}

function program(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram {
  const linked = gl.createProgram();

  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertexSource],
    [gl.FRAGMENT_SHADER, fragmentSource],
  ] as const) {
    const shader = gl.createShader(type);

    if (!shader) throw new Error("ascii: could not create a shader");

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`ascii: a shader failed to compile\n${gl.getShaderInfoLog(shader)}`);

    gl.attachShader(linked, shader);
  }

  gl.linkProgram(linked);

  if (!gl.getProgramParameter(linked, gl.LINK_STATUS)) throw new Error(`ascii: shaders failed to link\n${gl.getProgramInfoLog(linked)}`);

  return linked;
}

function uniforms(gl: WebGL2RenderingContext, linked: WebGLProgram): Record<string, WebGLUniformLocation | null> {
  const count = gl.getProgramParameter(linked, gl.ACTIVE_UNIFORMS) as number;

  return Object.fromEntries(
    Array.from({ length: count }, (_, index) => {
      const name = gl.getActiveUniform(linked, index)?.name ?? "";
      return [name, gl.getUniformLocation(linked, name)];
    }),
  );
}

/** A `#rrggbb` or `#rgb` colour as 0–1 channels. */
export function rgb(hex: string): [number, number, number] {
  const digits = hex.replace("#", "");
  const full = digits.length === 3 ? [...digits].map((digit) => digit + digit).join("") : digits;
  const value = Number.parseInt(full, 16);

  if (full.length !== 6 || Number.isNaN(value)) throw new RangeError(`ascii: colours are hex like "#0b0b0c", got "${hex}"`);

  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}
