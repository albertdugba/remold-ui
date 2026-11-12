import type { ReducedMotion } from "@remold-ui/dom";
import { painter } from "../painter";

export type DotGridShape =
  | {
      text: string;
      font?: string;
      scale?: number;
    }
  | {
      path: string;
      viewBox?: number;
      scale?: number;
    };

export interface DotGridColors {
  dot?: string;
  active?: string;
}

export interface DotGridLook {
  gap?: number;
  size?: number;
  reach?: number;
  swell?: number;
  push?: number;
  shape?: DotGridShape | null;
  ambient?: boolean;
  colors?: DotGridColors;
}

export interface DotGridOptions extends DotGridLook {
  ripples?: boolean;
  track?: HTMLElement | null;
  label?: string;
  reducedMotion?: ReducedMotion;
  maxPixelRatio?: number;
}

export interface DotGridPoint {
  x: number;
  y: number;
}

export interface DotGrid {
  hover(at: DotGridPoint | null): void;
  ripple(at?: DotGridPoint): void;
  set(look: DotGridLook): void;
  redraw(): void;
  destroy(): void;
}

type Rgba = [number, number, number, number];

interface Ripple extends DotGridPoint {
  age: number;
}

interface Pointer {
  x: number;
  y: number;
  tx: number;
  ty: number;
  presence: number;
  inside: boolean;
}

interface Grid {
  width: number;
  height: number;
  gap: number;
  cols: number;
  rows: number;
  ox: number;
  oy: number;
}

interface Field {
  grid: Grid;
  heat: Float32Array;
  lit: Float32Array;
  mask: Uint8Array;
  maskKey: string;
}

interface Frame {
  reach: number;
  size: number;
  swell: number;
  push: number;
  ambient: boolean;
  ease: number;
  glowEase: number;
  time: number;
  pointer: Pointer;
  ripples: readonly Ripple[];
}

interface Wave {
  strength: number;
  x: number;
  y: number;
}

const LEVELS = 8;
const RIPPLE_SPEED = 520;
const RIPPLE_LIFE = 1.6;
const RIPPLE_BAND = 34;
const DEFAULT_GAP = 22;
const MIN_GAP = 4;
const COLOR_REFRESH = 30;
const SHAPE_ALPHA = 100;
const SIZE_IN_FONT = /(\d+(?:\.\d+)?)px/;
const HEX = /^#([0-9a-f]{3,8})$/i;
const COLOR_FUNCTION = /rgba?\(([^)]+)\)/i;
const FULL_TURN = Math.PI * 2;

function hexToRgba(digits: string): Rgba {
  const full = digits.length <= 4 ? [...digits].map((digit) => digit + digit).join("") : digits;
  const channel = (start: number) => Number.parseInt(full.slice(start, start + 2), 16);

  return [channel(0), channel(2), channel(4), full.length === 8 ? channel(6) / 255 : 1];
}

function rgba(color: string): Rgba {
  const hex = HEX.exec(color.trim());

  if (hex) return hexToRgba(hex[1]!);

  const call = COLOR_FUNCTION.exec(color);

  if (!call) return [128, 128, 128, 1];

  const parts = call[1]!.split(/[\s,/]+/).filter(Boolean).map(Number);

  return [parts[0] ?? 128, parts[1] ?? 128, parts[2] ?? 128, parts[3] ?? 1];
}

const mix = (a: Rgba, b: Rgba, t: number) =>
  `rgba(${Math.round(a[0] + (b[0] - a[0]) * t)}, ${Math.round(a[1] + (b[1] - a[1]) * t)}, ${Math.round(a[2] + (b[2] - a[2]) * t)}, ${a[3] + (b[3] - a[3]) * t})`;

function readPalette(canvas: HTMLCanvasElement, colors: DotGridColors = {}): string[] {
  const css = getComputedStyle(canvas);
  const accent = colors.active ?? (css.accentColor && css.accentColor !== "auto" ? css.accentColor : css.color);
  const from = rgba(colors.dot ?? css.color);
  const to = rgba(accent);

  return Array.from({ length: LEVELS }, (_, level) => mix(from, to, level / (LEVELS - 1)));
}

const emptyField = (): Field => ({
  grid: { width: 0, height: 0, gap: 0, cols: 0, rows: 0, ox: 0, oy: 0 },
  heat: new Float32Array(0),
  lit: new Float32Array(0),
  mask: new Uint8Array(0),
  maskKey: "",
});

function layoutField(field: Field, width: number, height: number, gap: number) {
  const { grid } = field;

  if (grid.width === width && grid.height === height && grid.gap === gap) return;

  const cols = Math.floor(width / gap) + 1;
  const rows = Math.floor(height / gap) + 1;

  field.grid = { width, height, gap, cols, rows, ox: (width - (cols - 1) * gap) / 2, oy: (height - (rows - 1) * gap) / 2 };
  field.heat = new Float32Array(cols * rows);
  field.lit = new Float32Array(cols * rows);
  field.mask = new Uint8Array(cols * rows);
  field.maskKey = "";
}

function drawText(context: CanvasRenderingContext2D, shape: { text: string; font?: string; scale?: number }, family: string, width: number, height: number) {
  const fill = shape.scale ?? 0.7;
  const probe = shape.font ?? `800 100px ${family}`;

  context.font = probe;

  const measured = context.measureText(shape.text).width || 1;
  const sizeMatch = SIZE_IN_FONT.exec(probe);
  const base = sizeMatch ? Number(sizeMatch[1]) : 100;
  const scale = Math.min((width * fill) / measured, (height * fill) / base);

  context.font = probe.replace(SIZE_IN_FONT, `${base * scale}px`);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(shape.text, width / 2, height / 2);
}

function drawPath(context: CanvasRenderingContext2D, shape: { path: string; viewBox?: number; scale?: number }, width: number, height: number) {
  const box = shape.viewBox ?? 24;
  const scale = (Math.min(width, height) * (shape.scale ?? 0.6)) / box;

  context.translate(width / 2 - (box * scale) / 2, height / 2 - (box * scale) / 2);
  context.scale(scale, scale);
  context.fill(new Path2D(shape.path));
}

function markShape(field: Field, pixels: Uint8ClampedArray, pixelWidth: number, pixelHeight: number) {
  const { grid, mask } = field;

  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const x = Math.min(pixelWidth - 1, Math.round(grid.ox + col * grid.gap));
      const y = Math.min(pixelHeight - 1, Math.round(grid.oy + row * grid.gap));

      if (pixels[(y * pixelWidth + x) * 4 + 3]! > SHAPE_ALPHA) mask[row * grid.cols + col] = 1;
    }
  }
}

function sampleShape(field: Field, shape: DotGridShape | null | undefined, canvas: HTMLCanvasElement) {
  const { grid } = field;
  const key = shape ? `${JSON.stringify(shape)}:${grid.width}x${grid.height}:${grid.gap}` : "";

  if (key === field.maskKey) return;

  field.maskKey = key;
  field.mask.fill(0);

  if (!shape || typeof document === "undefined") return;

  const scratch = document.createElement("canvas");

  scratch.width = Math.max(1, Math.round(grid.width));
  scratch.height = Math.max(1, Math.round(grid.height));

  const context = scratch.getContext("2d", { willReadFrequently: true });

  if (!context) return;

  context.fillStyle = "#000";

  if ("text" in shape) drawText(context, shape, getComputedStyle(canvas).fontFamily || "sans-serif", grid.width, grid.height);
  else drawPath(context, shape, grid.width, grid.height);

  markShape(field, context.getImageData(0, 0, scratch.width, scratch.height).data, scratch.width, scratch.height);
}

function followPointer(pointer: Pointer, dt: number, still: boolean) {
  const follow = still ? 1 : 1 - Math.exp(-dt * 14);

  pointer.x += (pointer.tx - pointer.x) * follow;
  pointer.y += (pointer.ty - pointer.y) * follow;
  pointer.presence += ((pointer.inside ? 1 : 0) - pointer.presence) * (still ? 1 : 1 - Math.exp(-dt * 6));
}

function agedRipples(ripples: Ripple[], dt: number, still: boolean): Ripple[] {
  if (still) return [];

  for (const ripple of ripples) ripple.age += dt;

  return ripples.filter((ripple) => ripple.age < RIPPLE_LIFE);
}

function waveAt(x: number, y: number, ripples: readonly Ripple[], wave: Wave) {
  wave.strength = 0;
  wave.x = 0;
  wave.y = 0;

  for (const ripple of ripples) {
    const rx = x - ripple.x;
    const ry = y - ripple.y;
    const distance = Math.hypot(rx, ry) || 1;
    const band = Math.exp(-(((distance - ripple.age * RIPPLE_SPEED) / RIPPLE_BAND) ** 2)) * (1 - ripple.age / RIPPLE_LIFE);

    wave.strength += band;
    wave.x += (rx / distance) * band;
    wave.y += (ry / distance) * band;
  }
}

function updateDot(field: Field, frame: Frame, index: number, x: number, y: number, levels: number[][], wave: Wave): boolean {
  const { heat, lit, mask } = field;
  const { pointer } = frame;
  const dx = x - pointer.x;
  const dy = y - pointer.y;
  const distance = Math.hypot(dx, dy);
  const t = distance / frame.reach;
  const near = t < 1 ? (1 - t * t * (3 - 2 * t)) * pointer.presence : 0;
  const nextHeat = heat[index]! + (near - heat[index]!) * frame.ease;
  let moving = Math.abs(nextHeat - heat[index]!) > 1e-3;

  heat[index] = nextHeat;

  const glow = lit[index]! + (mask[index]! - lit[index]!) * frame.glowEase;

  if (Math.abs(glow - lit[index]!) > 1e-3) moving = true;

  lit[index] = glow;
  waveAt(x, y, frame.ripples, wave);

  const shimmer = frame.ambient ? 0.25 * (0.5 + 0.5 * Math.sin(x * 0.018 + y * 0.012 - frame.time * 1.1)) ** 6 : 0;
  let shownX = x;
  let shownY = y;

  if (frame.push && distance > 0) {
    shownX += (dx / distance) * frame.push * heat[index]!;
    shownY += (dy / distance) * frame.push * heat[index]!;
  }

  shownX += wave.x * frame.push;
  shownY += wave.y * frame.push;

  const energy = Math.min(1, heat[index]! + wave.strength + glow * 0.85 + shimmer);
  const radius = frame.size * (1 + frame.swell * Math.min(1, heat[index]! + wave.strength * 0.8) + glow * 0.5);

  levels[Math.round(energy * (LEVELS - 1))]!.push(shownX, shownY, radius);

  return moving;
}

function paintLevels(context: CanvasRenderingContext2D, levels: readonly number[][], palette: readonly string[]) {
  for (let level = 0; level < LEVELS; level++) {
    const dots = levels[level]!;

    if (!dots.length) continue;

    context.fillStyle = palette[level]!;
    context.beginPath();

    for (let start = 0; start < dots.length; start += 3) {
      context.moveTo(dots[start]! + dots[start + 2]!, dots[start + 1]!);
      context.arc(dots[start]!, dots[start + 1]!, dots[start + 2]!, 0, FULL_TURN);
    }

    context.fill();
  }
}

function aim(pointer: Pointer, x: number, y: number) {
  if (!pointer.inside && pointer.presence < 0.01) {
    pointer.x = x;
    pointer.y = y;
  }

  pointer.tx = x;
  pointer.ty = y;
  pointer.inside = true;
}

export function dotGrid(canvas: HTMLCanvasElement, options: DotGridOptions = {}): DotGrid {
  const look: DotGridLook = { ...options };
  const track = options.track ?? canvas.parentElement ?? canvas;
  const pointer: Pointer = { x: 0, y: 0, tx: 0, ty: 0, presence: 0, inside: false };
  const field = emptyField();
  const wave: Wave = { strength: 0, x: 0, y: 0 };

  let ripples: Ripple[] = [];
  let palette: string[] = [];
  let busy = true;
  let frames = 0;

  const readColors = () => {
    palette = readPalette(canvas, look.colors);
  };

  const frameSettings = (dt: number, time: number, still: boolean): Frame => ({
    reach: Math.max(1, look.reach ?? 140),
    size: look.size ?? 1.2,
    swell: look.swell ?? 1.4,
    push: still ? 0 : (look.push ?? 6),
    ambient: look.ambient === true && !still,
    ease: still ? 1 : 1 - Math.exp(-dt * 9),
    glowEase: still ? 1 : 1 - Math.exp(-dt * 4),
    time,
    pointer,
    ripples,
  });

  const paint = painter(canvas, {
    label: options.label,
    reducedMotion: options.reducedMotion,
    maxPixelRatio: options.maxPixelRatio,

    get continuous() {
      return busy || pointer.inside || ripples.length > 0 || look.ambient === true;
    },

    draw(context, { width, height, dt, time, still }) {
      if (frames++ % COLOR_REFRESH === 0) readColors();

      layoutField(field, width, height, Math.max(MIN_GAP, look.gap ?? DEFAULT_GAP));
      sampleShape(field, look.shape, canvas);
      followPointer(pointer, dt, still);
      ripples = agedRipples(ripples, dt, still);

      const frame = frameSettings(dt, time, still);
      const { cols, rows, gap, ox, oy } = field.grid;
      const levels: number[][] = Array.from({ length: LEVELS }, () => []);
      let moving = pointer.presence > 0.001 && pointer.presence < 0.999;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (updateDot(field, frame, row * cols + col, ox + col * gap, oy + row * gap, levels, wave)) moving = true;
        }
      }

      busy = moving;
      paintLevels(context, levels, palette);
    },
  });

  const local = (event: PointerEvent) => {
    const bounds = canvas.getBoundingClientRect();

    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  const move = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;

    const { x, y } = local(event);

    aim(pointer, x, y);
    paint.redraw();
  };

  const leave = () => {
    pointer.inside = false;
    paint.redraw();
  };

  const down = (event: PointerEvent) => {
    if (options.ripples === false || paint.still) return;

    ripples.push({ ...local(event), age: 0 });
    paint.redraw();
  };

  track.addEventListener("pointermove", move);
  track.addEventListener("pointerleave", leave);
  track.addEventListener("pointerdown", down);

  return {
    hover(at) {
      if (at) aim(pointer, at.x, at.y);
      else pointer.inside = false;

      paint.redraw();
    },

    ripple(at) {
      if (paint.still) return;

      ripples.push({ x: at?.x ?? field.grid.width / 2, y: at?.y ?? field.grid.height / 2, age: 0 });
      paint.redraw();
    },

    set(next) {
      Object.assign(look, next);
      readColors();
      busy = true;
      paint.redraw();
    },

    redraw() {
      readColors();
      paint.redraw();
    },

    destroy() {
      paint.destroy();
      track.removeEventListener("pointermove", move);
      track.removeEventListener("pointerleave", leave);
      track.removeEventListener("pointerdown", down);
    },
  };
}
