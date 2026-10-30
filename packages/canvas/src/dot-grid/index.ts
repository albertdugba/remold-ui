/**
 * Dot grid: the dotted background behind a landing page that wakes up under the cursor. Dots near
 * the pointer swell, brighten and lean away; a click sends a ripple across; a `shape` (your
 * wordmark or logo) lights up in the dots. Built on the painter, so it stays sharp, only draws
 * while something moves, sleeps off screen and holds still for reduced motion.
 *
 * Colours come from `colors`, or from CSS when left out: `color` paints the dots and
 * `accent-color` the lit ones. The canvas can sit behind your content with `pointer-events: none`;
 * it follows the pointer over its parent.
 *
 * ```ts
 * const grid = dotGrid(canvas, { shape: { text: "remold" } });
 * grid.ripple({ x: 240, y: 120 });
 * ```
 */
import type { ReducedMotion } from "@remold-ui/dom";
import { painter } from "../painter";

export type DotGridShape =
  | {
      /** Words to light up, centred. */
      text: string;
      /** Any CSS font. Default: bold, in the canvas's font family. */
      font?: string;
      /** How much of the grid it fills, from 0 to 1. Default 0.7. */
      scale?: number;
    }
  | {
      /** An SVG path, like an icon's `d`. */
      path: string;
      /** The path's square viewBox size. Default 24, like most icon sets. */
      viewBox?: number;
      /** How much of the grid it fills, from 0 to 1. Default 0.6. */
      scale?: number;
    };

export interface DotGridColors {
  /** Resting dots. Default: CSS `color`. Use a translucent colour for a quiet grid. */
  dot?: string;
  /** Dots under the pointer, in a ripple or in the shape. Default: CSS `accent-color`. */
  active?: string;
}

/** Everything that can change after the grid is made. */
export interface DotGridLook {
  /** Space between dots, in CSS pixels. Default 22. */
  gap?: number;
  /** Resting dot radius, in CSS pixels. Default 1.2. */
  size?: number;
  /** How far the pointer's influence reaches, in CSS pixels. Default 140. */
  reach?: number;
  /** How much dots grow under the pointer: 1 doubles them. Default 1.4. */
  swell?: number;
  /** How far dots lean away from the pointer, in CSS pixels. Default 6. */
  push?: number;
  /** Words or a path to light up in the dots. `null` for none. */
  shape?: DotGridShape | null;
  /** A slow shimmer across the grid while nothing else is happening. Default false. */
  ambient?: boolean;
  colors?: DotGridColors;
}

export interface DotGridOptions extends DotGridLook {
  /** Ripple on click. Default true. */
  ripples?: boolean;
  /** The element whose pointer it follows. Default: the canvas's parent. */
  track?: HTMLElement | null;
  /** The canvas's accessible name. Leave it out for a decorative background. */
  label?: string;
  /** "user" (default) follows the system setting; "always" and "never" override it. */
  reducedMotion?: ReducedMotion;
  /** Stored pixels per CSS pixel are capped at this. Default 2. */
  maxPixelRatio?: number;
}

export interface DotGridPoint {
  /** CSS pixels from the canvas's left edge. */
  x: number;
  /** CSS pixels from the canvas's top edge. */
  y: number;
}

export interface DotGrid {
  /** Move the glow as if the pointer were here, or `null` to let it fade. For demos and tours. */
  hover(at: DotGridPoint | null): void;
  /** Send a ripple out from a point. Default: the centre. */
  ripple(at?: DotGridPoint): void;
  /** Change gap, size, reach, swell, push, shape, shimmer or colours. */
  set(look: DotGridLook): void;
  /** Draw again now, after a CSS change. */
  redraw(): void;
  /** Stop drawing and let go of the canvas. */
  destroy(): void;
}

type Rgba = [number, number, number, number];

const LEVELS = 8;
const RIPPLE_SPEED = 520;
const RIPPLE_LIFE = 1.6;
const RIPPLE_BAND = 34;

function rgba(color: string): Rgba {
  const hex = /^#([0-9a-f]{3,8})$/i.exec(color.trim());
  if (hex) {
    let h = hex[1]!;
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    const n = (i: number) => Number.parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  const fn = /rgba?\(([^)]+)\)/i.exec(color);
  if (!fn) return [128, 128, 128, 1];
  const parts = fn[1]!.split(/[\s,/]+/).filter(Boolean).map(Number);
  return [parts[0] ?? 128, parts[1] ?? 128, parts[2] ?? 128, parts[3] ?? 1];
}

const mix = (a: Rgba, b: Rgba, t: number) =>
  `rgba(${Math.round(a[0] + (b[0] - a[0]) * t)}, ${Math.round(a[1] + (b[1] - a[1]) * t)}, ${Math.round(a[2] + (b[2] - a[2]) * t)}, ${a[3] + (b[3] - a[3]) * t})`;

export function dotGrid(canvas: HTMLCanvasElement, options: DotGridOptions = {}): DotGrid {
  const look: DotGridLook = { ...options };
  const track = options.track ?? canvas.parentElement ?? canvas;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, presence: 0, inside: false };
  let ripples: (DotGridPoint & { age: number })[] = [];
  let grid = { width: 0, height: 0, gap: 0, cols: 0, rows: 0, ox: 0, oy: 0 };
  let heat = new Float32Array(0);
  let lit = new Float32Array(0);
  let mask = new Uint8Array(0);
  let maskKey = "";
  let palette: string[] = [];
  let busy = true;
  let frames = 0;

  const readColors = () => {
    const css = getComputedStyle(canvas);
    const given = look.colors ?? {};
    const accent = given.active ?? (css.accentColor && css.accentColor !== "auto" ? css.accentColor : css.color);
    const from = rgba(given.dot ?? css.color);
    const to = rgba(accent);
    palette = Array.from({ length: LEVELS }, (_, i) => mix(from, to, i / (LEVELS - 1)));
  };

  const layout = (width: number, height: number) => {
    const gap = Math.max(4, look.gap ?? 22);
    if (grid.width === width && grid.height === height && grid.gap === gap) return;
    const cols = Math.floor(width / gap) + 1;
    const rows = Math.floor(height / gap) + 1;
    grid = { width, height, gap, cols, rows, ox: (width - (cols - 1) * gap) / 2, oy: (height - (rows - 1) * gap) / 2 };
    heat = new Float32Array(cols * rows);
    lit = new Float32Array(cols * rows);
    mask = new Uint8Array(cols * rows);
    maskKey = "";
  };

  const sampleShape = () => {
    const shape = look.shape;
    const key = shape ? `${JSON.stringify(shape)}:${grid.width}x${grid.height}:${grid.gap}` : "";
    if (key === maskKey) return;
    maskKey = key;
    mask.fill(0);
    if (!shape || typeof document === "undefined") return;
    const { width, height } = grid;
    const off = document.createElement("canvas");
    off.width = Math.max(1, Math.round(width));
    off.height = Math.max(1, Math.round(height));
    const context = off.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    context.fillStyle = "#000";
    if ("text" in shape) {
      const family = getComputedStyle(canvas).fontFamily || "sans-serif";
      const fill = shape.scale ?? 0.7;
      const probe = shape.font ?? `800 100px ${family}`;
      context.font = probe;
      const measured = context.measureText(shape.text).width || 1;
      const sizeMatch = /(\d+(?:\.\d+)?)px/.exec(probe);
      const base = sizeMatch ? Number(sizeMatch[1]) : 100;
      const k = Math.min((width * fill) / measured, (height * fill) / base);
      context.font = probe.replace(/(\d+(?:\.\d+)?)px/, `${base * k}px`);
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(shape.text, width / 2, height / 2);
    } else {
      const box = shape.viewBox ?? 24;
      const k = (Math.min(width, height) * (shape.scale ?? 0.6)) / box;
      context.translate(width / 2 - (box * k) / 2, height / 2 - (box * k) / 2);
      context.scale(k, k);
      context.fill(new Path2D(shape.path));
    }
    const pixels = context.getImageData(0, 0, off.width, off.height).data;
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const x = Math.min(off.width - 1, Math.round(grid.ox + col * grid.gap));
        const y = Math.min(off.height - 1, Math.round(grid.oy + row * grid.gap));
        if (pixels[(y * off.width + x) * 4 + 3]! > 100) mask[row * grid.cols + col] = 1;
      }
    }
  };

  const paint = painter(canvas, {
    label: options.label,
    reducedMotion: options.reducedMotion,
    maxPixelRatio: options.maxPixelRatio,
    get continuous() {
      return busy || pointer.inside || ripples.length > 0 || look.ambient === true;
    },
    draw(context, { width, height, dt, time, still }) {
      if (frames++ % 30 === 0) readColors();
      layout(width, height);
      sampleShape();

      const ease = still ? 1 : 1 - Math.exp(-dt * 9);
      const follow = still ? 1 : 1 - Math.exp(-dt * 14);
      pointer.x += (pointer.tx - pointer.x) * follow;
      pointer.y += (pointer.ty - pointer.y) * follow;
      pointer.presence += ((pointer.inside ? 1 : 0) - pointer.presence) * (still ? 1 : 1 - Math.exp(-dt * 6));

      if (still) ripples = [];
      for (const r of ripples) r.age += dt;
      ripples = ripples.filter((r) => r.age < RIPPLE_LIFE);

      const reach = Math.max(1, look.reach ?? 140);
      const size = look.size ?? 1.2;
      const swell = look.swell ?? 1.4;
      const push = still ? 0 : (look.push ?? 6);
      const ambient = look.ambient === true && !still;
      const { cols, rows, gap, ox, oy } = grid;
      const levels: number[][] = Array.from({ length: LEVELS }, () => []);
      let moving = pointer.presence > 0.001 && pointer.presence < 0.999;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const i = row * cols + col;
          let x = ox + col * gap;
          let y = oy + row * gap;

          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const d = Math.hypot(dx, dy);
          const t = d / reach;
          const near = t < 1 ? (1 - t * t * (3 - 2 * t)) * pointer.presence : 0;
          const next = heat[i]! + (near - heat[i]!) * ease;
          if (Math.abs(next - heat[i]!) > 1e-3) moving = true;
          heat[i] = next;

          const shaped = mask[i]!;
          const glow = lit[i]! + (shaped - lit[i]!) * (still ? 1 : 1 - Math.exp(-dt * 4));
          if (Math.abs(glow - lit[i]!) > 1e-3) moving = true;
          lit[i] = glow;

          let wave = 0;
          let wx = 0;
          let wy = 0;
          for (const r of ripples) {
            const rx = x - r.x;
            const ry = y - r.y;
            const rd = Math.hypot(rx, ry) || 1;
            const band = Math.exp(-(((rd - r.age * RIPPLE_SPEED) / RIPPLE_BAND) ** 2)) * (1 - r.age / RIPPLE_LIFE);
            wave += band;
            wx += (rx / rd) * band;
            wy += (ry / rd) * band;
          }

          const shimmer = ambient ? 0.25 * (0.5 + 0.5 * Math.sin(x * 0.018 + y * 0.012 - time * 1.1)) ** 6 : 0;

          if (push && d > 0) {
            x += (dx / d) * push * heat[i]!;
            y += (dy / d) * push * heat[i]!;
          }
          x += wx * push;
          y += wy * push;

          const energy = Math.min(1, heat[i]! + wave + glow * 0.85 + shimmer);
          const level = Math.round(energy * (LEVELS - 1));
          const radius = size * (1 + swell * Math.min(1, heat[i]! + wave * 0.8) + glow * 0.5);
          levels[level]!.push(x, y, radius);
        }
      }

      busy = moving;
      for (let level = 0; level < LEVELS; level++) {
        const dots = levels[level]!;
        if (!dots.length) continue;
        context.fillStyle = palette[level]!;
        context.beginPath();
        for (let k = 0; k < dots.length; k += 3) {
          context.moveTo(dots[k]! + dots[k + 2]!, dots[k + 1]!);
          context.arc(dots[k]!, dots[k + 1]!, dots[k + 2]!, 0, Math.PI * 2);
        }
        context.fill();
      }
    },
  });

  const local = (event: PointerEvent) => {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };
  const move = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    const { x, y } = local(event);
    if (!pointer.inside && pointer.presence < 0.01) {
      pointer.x = x;
      pointer.y = y;
    }
    pointer.tx = x;
    pointer.ty = y;
    pointer.inside = true;
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
      if (at) {
        if (!pointer.inside && pointer.presence < 0.01) {
          pointer.x = at.x;
          pointer.y = at.y;
        }
        pointer.tx = at.x;
        pointer.ty = at.y;
        pointer.inside = true;
      } else {
        pointer.inside = false;
      }
      paint.redraw();
    },
    ripple(at) {
      if (paint.still) return;
      ripples.push({ x: at?.x ?? grid.width / 2, y: at?.y ?? grid.height / 2, age: 0 });
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
