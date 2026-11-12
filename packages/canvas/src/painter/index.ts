import { value, type AnimatedValue, type SpringConfig } from "@remold-ui/core";
import { frames, prefersReducedMotion, type FrameLoop, type ReducedMotion } from "@remold-ui/dom";
import { fitCanvas, type CanvasSize } from "../canvas-size";

export type PainterValues = Record<string, number>;

export type PainterSpring<V extends PainterValues> = SpringConfig | Partial<Record<keyof V & string, SpringConfig>>;

export interface PainterToOptions<V extends PainterValues> {
  spring?: PainterSpring<V>;
  velocity?: Partial<Record<keyof V & string, number>>;
}

export interface PainterFrame<V extends PainterValues> extends CanvasSize {
  values: Readonly<V>;
  time: number;
  dt: number;
  still: boolean;
}

export interface PainterOptions<V extends PainterValues> {
  draw: (context: CanvasRenderingContext2D, frame: PainterFrame<V>) => void;
  values?: V;
  spring?: PainterSpring<V>;
  precision?: number;
  continuous?: boolean;
  clear?: boolean;
  reducedMotion?: ReducedMotion;
  maxPixelRatio?: number;
  label?: string;
  loop?: FrameLoop;
}

export interface Painter<V extends PainterValues> {
  readonly values: Readonly<V>;
  readonly still: boolean;
  to(targets: Partial<V>, options?: PainterToOptions<V>): void;
  set(values: Partial<V>): void;
  redraw(): void;
  label(label: string | undefined): void;
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
