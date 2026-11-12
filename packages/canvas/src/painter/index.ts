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
  /** Seconds of motion so far. */
  time: number;
  /** Seconds since the last frame; 0 for a frame drawn outside the loop (a resize, a `redraw`). */
  dt: number;
  /** True when motion is reduced: draw a calm, still frame. */
  still: boolean;
}

export interface PainterOptions<V extends PainterValues> {
  /** Paint one frame. The canvas is already cleared and scaled, so draw in CSS pixels from. */
  draw: (context: CanvasRenderingContext2D, frame: PainterFrame<V>) => void;
  /** The values to start at. */
  values?: V;
  /** How values spring: one spring, or one per name. */
  spring?: PainterSpring<V>;
  /** How close counts as arrived, in the values' own units. */
  precision?: number;
  /** Keep drawing every frame, for things that move on their own (drifting, breathing, reacting to live audio). */
  continuous?: boolean;
  /** Clear the canvas before each frame. */
  clear?: boolean;
  /** "user" (default) follows the system setting; "always" and "never" override it. */
  reducedMotion?: ReducedMotion;
  /** Stored pixels per CSS pixel are capped at this. */
  maxPixelRatio?: number;
  /** The canvas's accessible name. */
  label?: string;
  /** The frame loop to run on. */
  loop?: FrameLoop;
}

export interface Painter<V extends PainterValues> {
  /** Every value where it is now. */
  readonly values: Readonly<V>;
  /** True when motion is reduced: skip flings and other extra motion in your handlers. */
  readonly still: boolean;
  /** Spring values to new targets, from wherever they are. */
  to(targets: Partial<V>, options?: PainterToOptions<V>): void;
  /** Jump values to new numbers and stop them, without springing. */
  set(values: Partial<V>): void;
  /** Draw again now, for a change `draw` reads that isn't a value (a colour, a font, a prop). */
  redraw(): void;
  /** Change the canvas's accessible name. */
  label(label: string | undefined): void;
  /** Stop drawing and let go of the canvas. */
  destroy(): void;
}

const DEFAULT_PRECISION = 0.001;

function springOf<V extends PainterValues>(spring: PainterSpring<V> | undefined, name: string): SpringConfig | undefined {
  if (!spring) return undefined;

  const perName = Object.values(spring).some((entry) => typeof entry === "object" && entry !== null);

  return perName ? (spring as Record<string, SpringConfig | undefined>)[name] : (spring as SpringConfig);
}

function checked(name: string, amount: number): number {
  if (!Number.isFinite(amount)) throw new RangeError(`painter: value "${name}" must be a finite number, got ${amount}`);

  return amount;
}

function contextOf(canvas: HTMLCanvasElement, options: { draw?: unknown; precision?: number }): CanvasRenderingContext2D {
  if (typeof options?.draw !== "function") throw new TypeError("painter: options.draw must be a function that paints a frame");

  const precision = options.precision ?? DEFAULT_PRECISION;

  if (!(precision > 0)) throw new RangeError(`painter: precision must be positive, got ${precision}`);

  const context = canvas.getContext("2d");

  if (!context) throw new Error("painter: this canvas has no 2D context (is it already used for WebGL?)");

  return context;
}

function labelCanvas(canvas: HTMLCanvasElement, label: string | undefined) {
  if (label) {
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", label);
    return;
  }

  canvas.removeAttribute("aria-label");

  if (canvas.getAttribute("role") === "img") canvas.removeAttribute("role");
}

function observeSize(canvas: HTMLCanvasElement, onResize: () => void): ResizeObserver | null {
  if (typeof ResizeObserver !== "function") return null;

  const observer = new ResizeObserver(onResize);

  observer.observe(canvas);

  return observer;
}

function observeVisibility(canvas: HTMLCanvasElement, onChange: (visible: boolean) => void): IntersectionObserver | null {
  if (typeof IntersectionObserver !== "function") return null;

  const observer = new IntersectionObserver((entries) => onChange(entries.at(-1)?.isIntersecting ?? true));

  observer.observe(canvas);

  return observer;
}

/** A sharp canvas that redraws only while its sprung values move. */
export function painter<V extends PainterValues = PainterValues>(canvas: HTMLCanvasElement, options: PainterOptions<V>): Painter<V> {
  const context = contextOf(canvas, options);
  const precision = options.precision ?? DEFAULT_PRECISION;
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

  const keepsGoing = () => options.continuous === true && !still();

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

    const keepGoing = moving || keepsGoing();

    if (!keepGoing) stop = null;

    return keepGoing;
  };

  const wake = () => {
    if (destroyed || stop || !visible) return;

    const springing = [...springs.values()].some((spring) => !spring.settled);

    if (springing || keepsGoing()) stop = loop.add(tick);
  };

  const resize = observeSize(canvas, () => {
    size = fitCanvas(canvas, { maxPixelRatio: options.maxPixelRatio });

    if (!destroyed) draw(0);
  });

  const watch = observeVisibility(canvas, (isVisible) => {
    visible = isVisible;
    wake();
  });

  const springFor = (name: string, start: number) => {
    const existing = springs.get(name);

    if (existing) return existing;

    const created = value(start, { spring: springOf(options.spring, name), precision });

    springs.set(name, created);

    return created;
  };

  const drawIfIdle = () => {
    if (!stop) draw(0);
  };

  labelCanvas(canvas, options.label);
  draw(0);
  wake();

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

      drawIfIdle();
    },

    redraw() {
      if (destroyed) return;

      drawIfIdle();
      wake();
    },

    label: (label) => labelCanvas(canvas, label),

    destroy() {
      destroyed = true;
      stop?.();
      stop = null;
      resize?.disconnect();
      watch?.disconnect();
    },
  };
}
