/**
 * Painter: a canvas you paint yourself, with the plumbing done. It keeps the canvas sharp at every
 * size, clears and scales it before each frame, runs the frame loop only while something is moving
 * (or always, for ambient motion) and only while the canvas is on screen, springs named numbers to
 * new targets, and holds still for reduced motion. You write `draw`.
 *
 * ```ts
 * const orb = painter(canvas, {
 *   values: { radius: 40, glow: 0 },
 *   draw(context, { width, height, values }) {
 *     context.beginPath();
 *     context.arc(width / 2, height / 2, values.radius, 0, Math.PI * 2);
 *     context.fill();
 *   },
 * });
 * orb.to({ radius: 80 }); // springs there, drawing every frame until it settles
 * ```
 */
import { value, type AnimatedValue, type SpringConfig } from "@remold-ui/core";
import { frames, prefersReducedMotion, type FrameLoop, type ReducedMotion } from "@remold-ui/dom";
import { fitCanvas, type CanvasSize } from "../canvas-size";

/** Named numbers the painter springs between. */
export type PainterValues = Record<string, number>;

/** One spring for every value, or one per value name (names left out use core's smooth spring). */
export type PainterSpring<V extends PainterValues> = SpringConfig | Partial<Record<keyof V & string, SpringConfig>>;

export interface PainterToOptions<V extends PainterValues> {
  /** A different spring for this move. */
  spring?: PainterSpring<V>;
  /** Start values moving at these speeds (units per second): hand over a flick's velocity. */
  velocity?: Partial<Record<keyof V & string, number>>;
}

/** Everything `draw` gets besides the context. */
export interface PainterFrame<V extends PainterValues> extends CanvasSize {
  /** Every value where it is this frame. */
  values: Readonly<V>;
  /** Seconds of motion so far. Stops while the canvas is off screen, and stays 0 for reduced motion. */
  time: number;
  /** Seconds since the last frame; 0 for a frame drawn outside the loop (a resize, a `redraw`). */
  dt: number;
  /** True when motion is reduced: draw a calm, still frame. */
  still: boolean;
}

export interface PainterOptions<V extends PainterValues> {
  /**
   * Paint one frame. The canvas is already cleared and scaled, so draw in CSS pixels from (0, 0)
   * to (`width`, `height`).
   */
  draw: (context: CanvasRenderingContext2D, frame: PainterFrame<V>) => void;
  /** The values to start at. Spring them to new targets with `to`. */
  values?: V;
  /** How values spring: one spring, or one per name. Default: core's smooth spring. */
  spring?: PainterSpring<V>;
  /** How close counts as arrived, in the values' own units. Default 0.001. */
  precision?: number;
  /**
   * Keep drawing every frame, for things that move on their own (drifting, breathing, reacting to
   * live audio). Default false: draw only while a value is springing.
   */
  continuous?: boolean;
  /** Clear the canvas before each frame. Default true; turn off to paint trails. */
  clear?: boolean;
  /** "user" (default) follows the system setting; "always" and "never" override it. */
  reducedMotion?: ReducedMotion;
  /** Stored pixels per CSS pixel are capped at this. Default 2. */
  maxPixelRatio?: number;
  /** The canvas's accessible name. Leave it out for a decorative canvas. */
  label?: string;
  /** The frame loop to run on. Default: the shared browser loop. Pass your own for tests. */
  loop?: FrameLoop;
}

export interface Painter<V extends PainterValues> {
  /** Every value where it is now. */
  readonly values: Readonly<V>;
  /** True when motion is reduced: skip flings and other extra motion in your handlers. */
  readonly still: boolean;
  /** Spring values to new targets, from wherever they are. A name it hasn't seen starts there. */
  to(targets: Partial<V>, options?: PainterToOptions<V>): void;
  /** Jump values to new numbers and stop them, without springing. Use it to follow a finger. */
  set(values: Partial<V>): void;
  /**
   * Draw again now, for a change `draw` reads that isn't a value (a colour, a font, a prop). Also
   * starts the loop if `continuous` has turned on since.
   */
  redraw(): void;
  /** Change the canvas's accessible name. */
  label(label: string | undefined): void;
  /** Stop drawing and let go of the canvas. */
  destroy(): void;
}

export function painter<V extends PainterValues = PainterValues>(canvas: HTMLCanvasElement, options: PainterOptions<V>): Painter<V> {
  if (typeof options?.draw !== "function") throw new TypeError("painter: options.draw must be a function that paints a frame");
  const precision = options.precision ?? 0.001;
  if (!(precision > 0)) throw new RangeError(`painter: precision must be positive, got ${precision}`);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("painter: this canvas has no 2D context (is it already used for WebGL?)");

  const loop = options.loop ?? { add: frames };
  const still = () => options.reducedMotion === "always" || (options.reducedMotion !== "never" && prefersReducedMotion());
  const springs = new Map<string, AnimatedValue>();
  const current = {} as Record<string, number>;
  for (const [name, start] of Object.entries(options.values ?? {})) {
    springs.set(name, value(checked(name, start), { spring: springOf(options.spring, name), precision }));
    current[name] = start;
  }

  let size = fitCanvas(canvas, { maxPixelRatio: options.maxPixelRatio });
  let time = 0;
  let visible = true;
  let destroyed = false;
  let stop: (() => void) | null = null;

  const draw = (dt: number) => {
    for (const [name, spring] of springs) current[name] = spring.current;
    context.setTransform(size.pixelRatio, 0, 0, size.pixelRatio, 0, 0);
    if (options.clear !== false) context.clearRect(0, 0, size.width, size.height);
    options.draw(context, { ...size, values: current as V, time, dt, still: still() });
  };

  const tick = (dt: number): boolean => {
    if (destroyed || !visible) {
      stop = null;
      return false;
    }
    let moving = false;
    for (const spring of springs.values()) if (spring.step(dt)) moving = true;
    time += dt;
    draw(dt);
    const keepGoing = moving || (options.continuous === true && !still());
    if (!keepGoing) stop = null;
    return keepGoing;
  };

  /** Run the loop if there's anything to animate and anyone to see it. */
  const wake = () => {
    if (destroyed || stop || !visible) return;
    const springing = [...springs.values()].some((spring) => !spring.settled);
    if (springing || (options.continuous === true && !still())) stop = loop.add(tick);
  };

  const resize = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
    size = fitCanvas(canvas, { maxPixelRatio: options.maxPixelRatio });
    if (!destroyed) draw(0);
  }) : null;
  resize?.observe(canvas);
  const watch = typeof IntersectionObserver === "function" ? new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1]?.isIntersecting ?? true;
    wake();
  }) : null;
  watch?.observe(canvas);

  const setLabel = (label: string | undefined) => {
    if (label) {
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", label);
    } else {
      canvas.removeAttribute("aria-label");
      if (canvas.getAttribute("role") === "img") canvas.removeAttribute("role");
    }
  };
  setLabel(options.label);
  draw(0);
  wake();

  const springFor = (name: string, start: number) => {
    let spring = springs.get(name);
    if (!spring) {
      spring = value(start, { spring: springOf(options.spring, name), precision });
      springs.set(name, spring);
    }
    return spring;
  };

  return {
    get values() {
      return current as V;
    },
    get still() {
      return still();
    },
    to(targets, toOptions) {
      if (destroyed) return;
      const instant = still();
      for (const [name, target] of Object.entries(targets)) {
        if (target === undefined) continue;
        const spring = springFor(name, checked(name, target));
        if (instant) spring.set(target);
        else spring.to(target, { spring: springOf(toOptions?.spring ?? options.spring, name), velocity: toOptions?.velocity?.[name as keyof V & string] });
      }
      if (instant || !stop) draw(0);
      wake();
    },
    set(values) {
      if (destroyed) return;
      for (const [name, next] of Object.entries(values)) {
        if (next !== undefined) springFor(name, checked(name, next)).set(next);
      }
      if (!stop) draw(0);
    },
    redraw() {
      // While the loop runs, the next frame shows the change anyway.
      if (destroyed) return;
      if (!stop) draw(0);
      wake();
    },
    label: setLabel,
    destroy() {
      destroyed = true;
      stop?.();
      stop = null;
      resize?.disconnect();
      watch?.disconnect();
    },
  };
}

/** The spring for one value: a shared spring, or that name's entry in a per-name record. */
function springOf<V extends PainterValues>(spring: PainterSpring<V> | undefined, name: string): SpringConfig | undefined {
  if (!spring) return undefined;
  const perName = Object.values(spring).some((entry) => typeof entry === "object" && entry !== null);
  return perName ? (spring as Record<string, SpringConfig | undefined>)[name] : (spring as SpringConfig);
}

function checked(name: string, n: number): number {
  if (!Number.isFinite(n)) throw new RangeError(`painter: value "${name}" must be a finite number, got ${n}`);
  return n;
}
