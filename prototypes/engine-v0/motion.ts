/**
 * motion.ts — a declarative motion spec that agents write and the engine compiles.
 * ---------------------------------------------------------------------------
 * Models are reliable at structured JSON and unreliable at hand-writing animation code.
 * So the agent describes WHAT should happen:
 *
 *   elements    shapes (SVG path data or a basic shape), paint, transform origin
 *   states      per element: x, y, scale, rotate, opacity, fill, stroke, shape
 *   transitions timing per state change: duration, delay, stagger, easing or spring
 *   triggers    click / hover / load → a state, "next" or "toggle"
 *
 * …and this module decides HOW:
 *
 *   validateSpec   precise errors with JSON paths (fed back to the model to self-repair)
 *   MotionPlayer   interruptible runtime with springs; renders to SVG and Canvas
 *   compileCSS     data-state rules with transitions (springs → CSS linear() easing)
 *   compileWAAPI   a dependency-free Web Animations API module
 *   compileLottie  one transition as Lottie JSON for iOS, Android and web
 *
 * Shape changes become morphs through the engine, so "the icon becomes a square"
 * is one property in the spec.
 */
import { bounds, createMorph, parseColor, subpathsToD, toShape, type Morph } from "./engine";

/* ========================================================================== */
/*  Types                                                                      */
/* ========================================================================== */

export type Easing = "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out" | "spring" | [number, number, number, number];
export interface Spring {
  stiffness: number;
  damping: number;
  mass?: number;
}
export interface MotionElement {
  id: string;
  shape: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  origin?: [number, number];
}
export interface ElementProps {
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
  opacity?: number;
  fill?: string;
  stroke?: string;
  shape?: string;
}
export interface Transition {
  from: string;
  to: string;
  duration?: number;
  delay?: number;
  stagger?: number;
  easing?: Easing;
  spring?: Spring;
}
export interface Trigger {
  on: "click" | "hover" | "load";
  to: string;
}
export interface MotionSpec {
  version?: 1;
  name: string;
  viewBox: [number, number, number, number];
  elements: MotionElement[];
  states: Record<string, Record<string, ElementProps>>;
  transitions?: Transition[];
  triggers?: Trigger[];
  initial: string;
}
export interface SpecError {
  path: string;
  message: string;
}

/** Resolved values for one element in one state. */
export interface Resolved {
  x: number;
  y: number;
  scale: number;
  rotate: number;
  opacity: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  d: string;
}

/* ========================================================================== */
/*  Shapes                                                                     */
/* ========================================================================== */

const shapeCache = new Map<string, string>();
/** Any accepted shape string → absolute path data (cached). */
export function shapeD(shape: string): string {
  let d = shapeCache.get(shape);
  if (!d) {
    d = subpathsToD(toShape(shape).subpaths, 3);
    shapeCache.set(shape, d);
  }
  return d;
}

const isColour = (c: unknown) => typeof c === "string" && (c === "none" || c === "currentColor" || !!parseColor(c));

/* ========================================================================== */
/*  Validation                                                                 */
/* ========================================================================== */

export function validateSpec(input: unknown): { errors: SpecError[]; spec: MotionSpec | null } {
  const errors: SpecError[] = [];
  const err = (path: string, message: string) => errors.push({ path, message });
  if (!input || typeof input !== "object" || Array.isArray(input))
    return { errors: [{ path: "", message: "The spec must be a JSON object." }], spec: null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = input as any;
  const num = (v: unknown, path: string, min: number, max: number) => {
    if (v === undefined) return;
    if (typeof v !== "number" || !Number.isFinite(v)) err(path, "Must be a number.");
    else if (v < min || v > max) err(path, `Must be between ${min} and ${max} (got ${v}).`);
  };

  if (s.version !== undefined && s.version !== 1) err("version", "Only version 1 exists.");
  if (s.name !== undefined && typeof s.name !== "string") err("name", "Must be a string.");
  if (!Array.isArray(s.viewBox) || s.viewBox.length !== 4 || !s.viewBox.every((v: unknown) => typeof v === "number" && Number.isFinite(v)))
    err("viewBox", "Must be [minX, minY, width, height].");
  else if (s.viewBox[2] <= 0 || s.viewBox[3] <= 0) err("viewBox", "Width and height must be positive.");

  const ids = new Set<string>();
  const baseShape = new Map<string, string>();
  const strokeEl = new Map<string, boolean>();
  if (!Array.isArray(s.elements) || !s.elements.length) err("elements", "Needs at least one element.");
  else {
    if (s.elements.length > 24) err("elements", "At most 24 elements.");
    s.elements.forEach((el: MotionElement, i: number) => {
      const p = `elements[${i}]`;
      if (!el || typeof el !== "object") return err(p, "Must be an object.");
      if (typeof el.id !== "string" || !/^[A-Za-z][\w-]*$/.test(el.id))
        err(`${p}.id`, 'Must be a name like "icon" (letters, digits, - or _).');
      else if (ids.has(el.id)) err(`${p}.id`, `Duplicate id "${el.id}".`);
      else ids.add(el.id);
      if (typeof el.shape !== "string") err(`${p}.shape`, "Must be SVG path data or a basic shape element.");
      else {
        try {
          baseShape.set(el.id, shapeD(el.shape));
        } catch (e) {
          err(`${p}.shape`, (e as Error).message);
        }
      }
      if (el.fill !== undefined && !isColour(el.fill)) err(`${p}.fill`, "Use a hex colour, rgb(), currentColor or none.");
      if (el.stroke !== undefined && !isColour(el.stroke)) err(`${p}.stroke`, "Use a hex colour, rgb(), currentColor or none.");
      num(el.strokeWidth, `${p}.strokeWidth`, 0, 50);
      if (el.origin !== undefined && !(Array.isArray(el.origin) && el.origin.length === 2 && el.origin.every((v) => typeof v === "number")))
        err(`${p}.origin`, "Must be [x, y].");
      strokeEl.set(el.id, !!el.stroke && el.stroke !== "none");
    });
  }

  const states = s.states && typeof s.states === "object" && !Array.isArray(s.states) ? Object.keys(s.states) : [];
  if (!states.length) err("states", 'Needs at least one state, e.g. { "idle": {}, "active": { … } }.');
  if (states.length > 8) err("states", "At most 8 states.");
  for (const st of states) {
    const block = s.states[st];
    if (!block || typeof block !== "object") {
      err(`states.${st}`, "Must be an object keyed by element id.");
      continue;
    }
    for (const [id, props] of Object.entries(block as Record<string, ElementProps>)) {
      const p = `states.${st}.${id}`;
      if (!ids.has(id)) {
        err(p, `No element with id "${id}".`);
        continue;
      }
      if (!props || typeof props !== "object") {
        err(p, "Must be an object of properties.");
        continue;
      }
      for (const k of Object.keys(props))
        if (!["x", "y", "scale", "rotate", "opacity", "fill", "stroke", "shape"].includes(k))
          err(`${p}.${k}`, "Unknown property. Use x, y, scale, rotate, opacity, fill, stroke or shape.");
      num(props.x, `${p}.x`, -10000, 10000);
      num(props.y, `${p}.y`, -10000, 10000);
      num(props.scale, `${p}.scale`, 0, 20);
      num(props.rotate, `${p}.rotate`, -3600, 3600);
      num(props.opacity, `${p}.opacity`, 0, 1);
      if (props.fill !== undefined && !isColour(props.fill)) err(`${p}.fill`, "Use a hex colour, rgb(), currentColor or none.");
      if (props.stroke !== undefined && !isColour(props.stroke)) err(`${p}.stroke`, "Use a hex colour, rgb(), currentColor or none.");
      if (props.shape !== undefined) {
        if (typeof props.shape !== "string") err(`${p}.shape`, "Must be SVG path data.");
        else {
          try {
            const d = shapeD(props.shape),
              base = baseShape.get(id);
            if (base) createMorph(base, d, { fit: false, padding: strokeEl.get(id) ? "merge" : "collapse" });
          } catch (e) {
            err(`${p}.shape`, `Can't morph to this shape: ${(e as Error).message}`);
          }
        }
      }
    }
  }
  if (typeof s.initial !== "string" || !states.includes(s.initial))
    err("initial", `Must name one of the states (${states.join(", ") || "none defined"}).`);

  const easings = ["linear", "ease", "ease-in", "ease-out", "ease-in-out", "spring"];
  if (s.transitions !== undefined && !Array.isArray(s.transitions)) err("transitions", "Must be an array.");
  (Array.isArray(s.transitions) ? s.transitions : []).forEach((t: Transition, i: number) => {
    const p = `transitions[${i}]`;
    if (!t || typeof t !== "object") return err(p, "Must be an object.");
    if (t.from !== "*" && !states.includes(t.from)) err(`${p}.from`, `Unknown state "${t.from}". Use a state name or "*".`);
    if (!states.includes(t.to)) err(`${p}.to`, `Unknown state "${t.to}".`);
    num(t.duration, `${p}.duration`, 0, 10000);
    num(t.delay, `${p}.delay`, 0, 10000);
    num(t.stagger, `${p}.stagger`, 0, 2000);
    if (t.easing !== undefined) {
      const ok =
        (typeof t.easing === "string" && easings.includes(t.easing)) ||
        (Array.isArray(t.easing) &&
          t.easing.length === 4 &&
          t.easing.every((v) => typeof v === "number") &&
          t.easing[0] >= 0 &&
          t.easing[0] <= 1 &&
          t.easing[2] >= 0 &&
          t.easing[2] <= 1);
      if (!ok) err(`${p}.easing`, `Use ${easings.join(", ")} or a cubic-bezier [x1, y1, x2, y2] with x values in 0–1.`);
    }
    if (t.spring !== undefined) {
      if (typeof t.spring !== "object") err(`${p}.spring`, "Must be { stiffness, damping }.");
      else {
        num(t.spring.stiffness, `${p}.spring.stiffness`, 1, 2000);
        num(t.spring.damping, `${p}.spring.damping`, 0.1, 300);
        num(t.spring.mass, `${p}.spring.mass`, 0.1, 20);
      }
    }
  });
  (Array.isArray(s.triggers) ? s.triggers : []).forEach((t: Trigger, i: number) => {
    if (!["click", "hover", "load"].includes(t?.on)) err(`triggers[${i}].on`, "Use click, hover or load.");
    if (t?.to !== "next" && t?.to !== "toggle" && !states.includes(t?.to))
      err(`triggers[${i}].to`, 'Use a state name, "next" or "toggle".');
  });

  if (errors.length) return { errors, spec: null };
  return {
    errors,
    spec: {
      version: 1,
      name: s.name || "motion",
      viewBox: s.viewBox,
      elements: s.elements,
      states: s.states,
      transitions: s.transitions ?? [],
      triggers: s.triggers ?? [],
      initial: s.initial,
    },
  };
}

/* ========================================================================== */
/*  Timing                                                                     */
/* ========================================================================== */

/** CSS-style cubic-bezier easing function (x solved by Newton–Raphson with bisection fallback). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1,
    bx = 3 * (x2 - x1) - cx,
    ax = 1 - cx - bx;
  const cy = 3 * y1,
    by = 3 * (y2 - y1) - cy,
    ay = 1 - cy - by;
  const X = (t: number) => ((ax * t + bx) * t + cx) * t,
    Y = (t: number) => ((ay * t + by) * t + cy) * t;
  const dX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = X(t) - x,
        d = dX(t);
      if (Math.abs(e) < 1e-6) return Y(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0,
      hi = 1;
    t = x;
    for (let i = 0; i < 30; i++) {
      const v = X(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return Y(t);
  };
}

const NAMED: Record<string, [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
};

/** Simulate a damped spring from 0 to 1. Returns its settle time and a sampled curve. */
export function springCurve(sp: Spring): { duration: number; at: (p: number) => number; samples: number[] } {
  const k = sp.stiffness,
    c = sp.damping,
    m = sp.mass ?? 1,
    dt = 1 / 1000;
  let x = 0,
    v = 0,
    t = 0;
  const raw: number[] = [0];
  while (t < 4) {
    const a = (-k * (x - 1) - c * v) / m;
    v += a * dt;
    x += v * dt;
    t += dt;
    if (Math.round(t * 1000) % 4 === 0) raw.push(x);
    if (t > 0.05 && Math.abs(x - 1) < 0.0015 && Math.abs(v) < 0.02) break;
  }
  raw.push(1);
  const at = (p: number) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    const f = p * (raw.length - 1),
      i = Math.floor(f);
    return raw[i] + (raw[i + 1] - raw[i]) * (f - i);
  };
  const samples = Array.from({ length: 41 }, (_, i) => +at(i / 40).toFixed(4));
  return { duration: Math.round(t * 1000), at, samples };
}

export interface Timing {
  duration: number;
  delay: number;
  stagger: number;
  ease: (p: number) => number;
  css: string;
}

export function timingOf(t: Transition | undefined): Timing {
  const delay = t?.delay ?? 0,
    stagger = t?.stagger ?? 0;
  if (t && (t.easing === "spring" || (t.spring && t.easing === undefined))) {
    const sp = springCurve(t.spring ?? { stiffness: 260, damping: 22 });
    return { duration: sp.duration, delay, stagger, ease: sp.at, css: `linear(${sp.samples.join(", ")})` };
  }
  const e = t?.easing ?? "ease-in-out";
  const b = typeof e === "string" ? NAMED[e] ?? NAMED["ease-in-out"] : e;
  const css = typeof e === "string" && e !== "spring" ? e : `cubic-bezier(${b.join(", ")})`;
  return { duration: t?.duration ?? 320, delay, stagger, ease: cubicBezier(b[0], b[1], b[2], b[3]), css };
}

export function findTransition(spec: MotionSpec, from: string, to: string): Transition | undefined {
  const ts = spec.transitions ?? [];
  return ts.find((t) => t.from === from && t.to === to) ?? ts.find((t) => t.from === "*" && t.to === to);
}

/* ========================================================================== */
/*  Resolution                                                                 */
/* ========================================================================== */

export function resolve(spec: MotionSpec, state: string, el: MotionElement): Resolved {
  const p = spec.states[state]?.[el.id] ?? {};
  const hasStroke = !!el.stroke && el.stroke !== "none";
  return {
    x: p.x ?? 0,
    y: p.y ?? 0,
    scale: p.scale ?? 1,
    rotate: p.rotate ?? 0,
    opacity: p.opacity ?? 1,
    fill: p.fill ?? el.fill ?? (hasStroke ? "none" : "currentColor"),
    stroke: p.stroke ?? el.stroke ?? "none",
    strokeWidth: el.strokeWidth ?? (hasStroke ? 2 : 0),
    d: shapeD(p.shape ?? el.shape),
  };
}

export function originOf(el: MotionElement): [number, number] {
  if (el.origin) return el.origin;
  const [x, y, w, h] = bounds(toShape(shapeD(el.shape)).subpaths);
  return [x + w / 2, y + h / 2];
}

function lerpColour(a: string, b: string, t: number): string {
  if (a === b) return a;
  const ca = parseColor(a),
    cb = parseColor(b);
  if (ca && cb) {
    const v = ca.map((x, i) => x + (cb[i] - x) * t);
    return `rgba(${Math.round(v[0])},${Math.round(v[1])},${Math.round(v[2])},${+v[3].toFixed(3)})`;
  }
  return t < 0.5 ? a : b;
}

const transformOf = (r: Pick<Resolved, "x" | "y" | "scale" | "rotate">, o: [number, number]) =>
  `translate(${+(r.x + o[0]).toFixed(3)} ${+(r.y + o[1]).toFixed(3)}) rotate(${+r.rotate.toFixed(3)}) scale(${+r.scale.toFixed(
    4,
  )}) translate(${-o[0]} ${-o[1]})`;

/* ========================================================================== */
/*  Runtime player                                                             */
/* ========================================================================== */

export interface FrameElement extends Resolved {
  id: string;
  origin: [number, number];
}
export interface MotionTarget {
  render(frame: FrameElement[]): void;
}

interface Track {
  from: Resolved;
  to: Resolved;
  morph: Morph | null;
  start: number;
  delay: number;
  duration: number;
  ease: (p: number) => number;
}

/** Interruptible runtime: a new goTo() starts from whatever is on screen. */
export class MotionPlayer {
  state: string;
  private cur = new Map<string, Resolved>();
  private tracks = new Map<string, Track>();
  private origins = new Map<string, [number, number]>();
  constructor(
    public spec: MotionSpec,
    public targets: MotionTarget[] = [],
  ) {
    this.state = spec.initial;
    for (const el of spec.elements) {
      this.cur.set(el.id, resolve(spec, spec.initial, el));
      this.origins.set(el.id, originOf(el));
    }
  }
  get busy() {
    return this.tracks.size > 0;
  }
  stateNames() {
    return Object.keys(this.spec.states);
  }
  next(): string {
    const s = this.stateNames();
    return s[(s.indexOf(this.state) + 1) % s.length];
  }
  /** Resolve a trigger destination ("next", "toggle" or a state name). */
  dest(to: string): string {
    if (to === "next") return this.next();
    if (to === "toggle")
      return this.state === this.spec.initial ? this.stateNames().find((s) => s !== this.spec.initial) ?? this.state : this.spec.initial;
    return to;
  }
  goTo(state: string, now = performance.now()) {
    if (!this.spec.states[state]) return;
    const tm = timingOf(findTransition(this.spec, this.state, state));
    this.spec.elements.forEach((el, i) => {
      const from = { ...this.cur.get(el.id)! },
        to = resolve(this.spec, state, el);
      let morph: Morph | null = null;
      if (from.d !== to.d) {
        try {
          morph = createMorph(from.d, to.d, { fit: false, padding: el.stroke && el.stroke !== "none" ? "merge" : "collapse" });
        } catch {
          morph = null;
        }
      }
      this.tracks.set(el.id, {
        from,
        to,
        morph,
        start: now,
        delay: tm.delay + i * tm.stagger,
        duration: Math.max(1, tm.duration),
        ease: tm.ease,
      });
    });
    this.state = state;
  }
  /** Advance to `now` and render. Returns true while anything is still moving. */
  frame(now = performance.now()): boolean {
    for (const [id, tr] of this.tracks) {
      const p = Math.max(0, Math.min(1, (now - tr.start - tr.delay) / tr.duration));
      const e = tr.ease(p);
      const L = (a: number, b: number) => a + (b - a) * e;
      this.cur.set(id, {
        x: L(tr.from.x, tr.to.x),
        y: L(tr.from.y, tr.to.y),
        scale: L(tr.from.scale, tr.to.scale),
        rotate: L(tr.from.rotate, tr.to.rotate),
        opacity: Math.max(0, Math.min(1, L(tr.from.opacity, tr.to.opacity))),
        fill: lerpColour(tr.from.fill, tr.to.fill, Math.max(0, Math.min(1, e))),
        stroke: lerpColour(tr.from.stroke, tr.to.stroke, Math.max(0, Math.min(1, e))),
        strokeWidth: L(tr.from.strokeWidth, tr.to.strokeWidth),
        d: p >= 1 ? tr.to.d : tr.morph ? tr.morph.d(e) : tr.from.d,
      });
      if (p >= 1) this.tracks.delete(id);
    }
    const f = this.snapshot();
    for (const t of this.targets) t.render(f);
    return this.busy;
  }
  snapshot(): FrameElement[] {
    return this.spec.elements.map((el) => ({ id: el.id, origin: this.origins.get(el.id)!, ...this.cur.get(el.id)! }));
  }
}

/* ---- Render targets ---- */

export function svgTarget(svg: SVGSVGElement): MotionTarget {
  const NS = "http://www.w3.org/2000/svg";
  const nodes = new Map<string, { g: SVGGElement; p: SVGPathElement }>();
  return {
    render(frame) {
      for (const f of frame) {
        let n = nodes.get(f.id);
        if (!n || !n.g.isConnected) {
          const g = document.createElementNS(NS, "g"),
            p = document.createElementNS(NS, "path");
          g.dataset.el = f.id;
          g.appendChild(p);
          svg.appendChild(g);
          nodes.set(f.id, (n = { g, p }));
        }
        n.g.setAttribute("transform", transformOf(f, f.origin));
        n.g.setAttribute("opacity", String(+f.opacity.toFixed(3)));
        n.p.setAttribute("d", f.d);
        n.p.setAttribute("fill", f.fill);
        n.p.setAttribute("stroke", f.stroke);
        n.p.setAttribute("stroke-width", String(f.strokeWidth));
        n.p.setAttribute("stroke-linecap", "round");
        n.p.setAttribute("stroke-linejoin", "round");
      }
    },
  };
}

export function canvasTarget(canvas: HTMLCanvasElement, viewBox: [number, number, number, number]): MotionTarget {
  return {
    render(frame) {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const w = canvas.clientWidth,
        h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const [vx, vy, vw, vh] = viewBox,
        s = Math.min(w / vw, h / vh) * dpr;
      const ox = (canvas.width - vw * s) / 2 - vx * s,
        oy = (canvas.height - vh * s) / 2 - vy * s;
      const current = getComputedStyle(canvas).color;
      const col = (c: string) => (c === "currentColor" ? current : c);
      for (const f of frame) {
        ctx.setTransform(s, 0, 0, s, ox, oy);
        ctx.translate(f.x + f.origin[0], f.y + f.origin[1]);
        ctx.rotate((f.rotate * Math.PI) / 180);
        ctx.scale(f.scale, f.scale);
        ctx.translate(-f.origin[0], -f.origin[1]);
        ctx.globalAlpha = f.opacity;
        const p = new Path2D(f.d);
        if (f.fill !== "none") {
          ctx.fillStyle = col(f.fill);
          ctx.fill(p);
        }
        if (f.stroke !== "none" && f.strokeWidth > 0) {
          ctx.strokeStyle = col(f.stroke);
          ctx.lineWidth = f.strokeWidth;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke(p);
        }
      }
      ctx.globalAlpha = 1;
    },
  };
}

/* ========================================================================== */
/*  Compilers                                                                  */
/* ========================================================================== */

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "motion";

/** For each element, the shape path data per state, with a shared command structure when there are exactly two shapes. */
function matchedShapes(spec: MotionSpec): Map<string, { byState: Record<string, string>; matched: boolean }> {
  const out = new Map<string, { byState: Record<string, string>; matched: boolean }>();
  const states = Object.keys(spec.states);
  for (const el of spec.elements) {
    const per = Object.fromEntries(states.map((s) => [s, resolve(spec, s, el).d]));
    const distinct = [...new Set(Object.values(per))];
    if (distinct.length === 2) {
      const m = createMorph(distinct[0], distinct[1], { fit: false, padding: el.stroke && el.stroke !== "none" ? "merge" : "collapse" });
      const A = m.d(0),
        B = m.d(1);
      out.set(el.id, { byState: Object.fromEntries(states.map((s) => [s, per[s] === distinct[0] ? A : B])), matched: true });
    } else out.set(el.id, { byState: per, matched: distinct.length === 1 });
  }
  return out;
}

const cssTransform = (r: Resolved) =>
  `translate(${+r.x.toFixed(3)}px, ${+r.y.toFixed(3)}px) rotate(${+r.rotate.toFixed(3)}deg) scale(${+r.scale.toFixed(4)})`;

/** CSS: one rule per state; set data-state on the <svg> to animate. */
export function compileCSS(spec: MotionSpec): string {
  const c = slug(spec.name),
    states = Object.keys(spec.states),
    shapes = matchedShapes(spec);
  const markup = spec.elements
    .map((el) => {
      const r = resolve(spec, spec.initial, el);
      return `  <g class="${c}__${el.id}"><path d="${shapes.get(el.id)!.byState[spec.initial]}" fill="${r.fill}" stroke="${
        r.stroke
      }" stroke-width="${r.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    })
    .join("\n");
  let css = `/* Markup:
<svg class="${c}" data-state="${spec.initial}" viewBox="${spec.viewBox.join(" ")}">
${markup}
</svg>
Change state with: svg.dataset.state = "${states[1] ?? spec.initial}"
Springs compile to CSS linear() easing (Chrome 113+, Firefox 112+, Safari 17.2+). Shape morphs use the CSS d property (Chrome, Firefox). */\n\n`;
  spec.elements.forEach((el) => {
    const o = originOf(el);
    css += `.${c}__${el.id} { transform-box: view-box; transform-origin: ${+o[0].toFixed(3)}px ${+o[1].toFixed(3)}px; }\n`;
  });
  for (const s of states) {
    const tm = timingOf(findTransition(spec, "*", s) ?? (spec.transitions ?? []).find((t) => t.to === s));
    css += `\n/* → ${s} */\n`;
    spec.elements.forEach((el, i) => {
      const r = resolve(spec, s, el),
        delay = tm.delay + i * tm.stagger,
        sh = shapes.get(el.id)!;
      const t = (p: string) => `${p} ${tm.duration}ms ${tm.css} ${delay}ms`;
      css += `.${c}[data-state="${s}"] .${c}__${el.id} {\n  transform: ${cssTransform(r)};\n  opacity: ${+r.opacity.toFixed(
        3,
      )};\n  transition: ${t("transform")}, ${t("opacity")};\n}\n`;
      css += `.${c}[data-state="${s}"] .${c}__${el.id} path {\n  fill: ${r.fill};\n  stroke: ${r.stroke};\n`;
      if (sh.matched) css += `  d: path("${sh.byState[s]}");\n`;
      css += `  transition: ${t("fill")}, ${t("stroke")}${sh.matched ? `, ${t("d")}` : ""};\n}\n`;
    });
    const unmatched = spec.elements.filter((el) => !shapes.get(el.id)!.matched).map((e) => e.id);
    if (unmatched.length && s === states[0])
      css += `/* ${unmatched.join(", ")}: more than two shapes, so use the runtime or WAAPI output for those morphs. */\n`;
  }
  return css;
}

/** Web Animations API: a self-contained ES module with animateTo(svg, from, to). */
export function compileWAAPI(spec: MotionSpec): string {
  const states = Object.keys(spec.states);
  const values: Record<string, Record<string, Omit<Resolved, "d">>> = {};
  for (const s of states) {
    values[s] = {};
    for (const el of spec.elements) {
      const { d: _d, ...rest } = resolve(spec, s, el);
      values[s][el.id] = rest;
    }
  }
  const timing: Record<string, { duration: number; delay: number; stagger: number; easing: string }> = {};
  const shapes: Record<string, Record<string, [string, string]>> = {};
  for (const a of states)
    for (const b of states) {
      if (a === b) continue;
      const key = `${a}>${b}`,
        tm = timingOf(findTransition(spec, a, b));
      timing[key] = { duration: tm.duration, delay: tm.delay, stagger: tm.stagger, easing: tm.css };
      for (const el of spec.elements) {
        const da = resolve(spec, a, el).d,
          db = resolve(spec, b, el).d;
        if (da === db) continue;
        const m = createMorph(da, db, { fit: false, padding: el.stroke && el.stroke !== "none" ? "merge" : "collapse" });
        (shapes[key] ??= {})[el.id] = [m.d(0), m.d(1)];
      }
    }
  const origins = Object.fromEntries(spec.elements.map((el) => [el.id, originOf(el).map((v) => +v.toFixed(3))]));
  return `// ${spec.name}: generated by the vector morph engine from a motion spec.
// Markup: <svg viewBox="${spec.viewBox.join(" ")}">, one <g data-el="id"><path/></g> per element.
// Usage: animateTo(svg, "${spec.initial}", "${states[1] ?? spec.initial}")
const ORDER = ${JSON.stringify(spec.elements.map((e) => e.id))};
const ORIGIN = ${JSON.stringify(origins)};
const VALUES = ${JSON.stringify(values)};
const TIMING = ${JSON.stringify(timing)};
const SHAPES = ${JSON.stringify(shapes)};

const tf = (v, o) => \`translate(\${v.x}px, \${v.y}px) rotate(\${v.rotate}deg) scale(\${v.scale})\`;

export function animateTo(svg, from, to) {
  const key = from + ">" + to, t = TIMING[key];
  if (!t) return [];
  const anims = [];
  ORDER.forEach((id, i) => {
    const g = svg.querySelector(\`[data-el="\${id}"]\`), path = g && g.querySelector("path");
    if (!g || !path) return;
    const a = VALUES[from][id], b = VALUES[to][id], o = ORIGIN[id];
    g.style.transformBox = "view-box";
    g.style.transformOrigin = \`\${o[0]}px \${o[1]}px\`;
    const opts = { duration: t.duration, delay: t.delay + i * t.stagger, easing: t.easing, fill: "forwards" };
    anims.push(g.animate([{ transform: tf(a), opacity: a.opacity }, { transform: tf(b), opacity: b.opacity }], opts));
    anims.push(path.animate([{ fill: a.fill, stroke: a.stroke }, { fill: b.fill, stroke: b.stroke }], opts));
    const s = SHAPES[key] && SHAPES[key][id];
    if (s) anims.push(path.animate([{ d: \`path("\${s[0]}")\` }, { d: \`path("\${s[1]}")\` }], opts)); // Chrome, Firefox
  });
  svg.dataset.state = to;
  return anims;
}
`;
}

/* ---- Lottie ---- */

type LShape = { c: boolean; v: number[][]; i: number[][]; o: number[][] };

function lottieShapesFromBuffer(m: Morph, e: number, S: number, vx: number, vy: number): LShape[] {
  const buf = m.at(e, new Float32Array(m.plan.a.length));
  const r = (n: number) => +n.toFixed(3);
  return m.plan.layout.map((L) => {
    const v: number[][] = [],
      ins: number[][] = [],
      outs: number[][] = [];
    let x = (buf[L.offset] - vx) * S,
      y = (buf[L.offset + 1] - vy) * S;
    v.push([r(x), r(y)]);
    ins.push([0, 0]);
    for (let j = 0; j < L.segs; j++) {
      const o = L.offset + 2 + j * 6;
      const c1x = (buf[o] - vx) * S,
        c1y = (buf[o + 1] - vy) * S,
        c2x = (buf[o + 2] - vx) * S,
        c2y = (buf[o + 3] - vy) * S,
        ex = (buf[o + 4] - vx) * S,
        ey = (buf[o + 5] - vy) * S;
      outs[j] = [r(c1x - x), r(c1y - y)];
      if (j === L.segs - 1 && L.closed) ins[0] = [r(c2x - ex), r(c2y - ey)];
      else {
        v.push([r(ex), r(ey)]);
        ins.push([r(c2x - ex), r(c2y - ey)]);
      }
      x = ex;
      y = ey;
    }
    while (outs.length < v.length) outs.push([0, 0]);
    return { c: L.closed, v, i: ins, o: outs };
  });
}

const rgba01 = (c: string, fallback = "#13212b") => {
  const v = parseColor(c === "currentColor" || c === "none" ? fallback : c) ?? [0, 0, 0, 1];
  return [+(v[0] / 255).toFixed(4), +(v[1] / 255).toFixed(4), +(v[2] / 255).toFixed(4), 1];
};

/**
 * One transition as Lottie. Curves are baked: keyframes every 2 frames, linear between,
 * so springs and any cubic-bezier play back identically in every Lottie player.
 */
export function compileLottie(
  spec: MotionSpec,
  from: string,
  to: string,
  opts: { fps?: number; size?: number; currentColor?: string } = {},
): object {
  const fps = opts.fps ?? 60,
    [vx, vy, vw, vh] = spec.viewBox,
    S = (opts.size ?? 512) / Math.max(vw, vh);
  const tm = timingOf(findTransition(spec, from, to));
  const n = spec.elements.length;
  const endMs = tm.delay + (n - 1) * tm.stagger + tm.duration;
  const op = Math.max(2, Math.ceil((endMs / 1000) * fps) + Math.round(fps * 0.4));
  const lin = { o: { x: 0, y: 0 }, i: { x: 1, y: 1 } };
  const cc = opts.currentColor ?? "#13212b";

  const layers = spec.elements.map((el, i) => {
    const A = resolve(spec, from, el),
      B = resolve(spec, to, el),
      o = originOf(el);
    const f0 = Math.round(((tm.delay + i * tm.stagger) / 1000) * fps),
      f1 = f0 + Math.max(1, Math.round((tm.duration / 1000) * fps));
    const frames: number[] = [];
    for (let f = f0; f < f1; f += 2) frames.push(f);
    frames.push(f1);
    const eAt = (f: number) => tm.ease((f - f0) / (f1 - f0));
    const prop = (get: (r: Resolved) => number[], same: boolean) =>
      same
        ? { a: 0, k: get(A) }
        : {
            a: 1,
            k: [
              ...frames.map((f) => {
                const e = eAt(f);
                const a = get(A),
                  b = get(B);
                return { t: f, s: a.map((v, k) => +(v + (b[k] - v) * e).toFixed(4)), ...lin };
              }),
              { t: op, s: get(B) },
            ],
          };
    const pos = (r: Resolved) => [(o[0] + r.x - vx) * S, (o[1] + r.y - vy) * S, 0];
    let morph: Morph | null = null;
    if (A.d !== B.d) morph = createMorph(A.d, B.d, { fit: false, padding: el.stroke && el.stroke !== "none" ? "merge" : "collapse" });
    const base = morph ?? createMorph(A.d, A.d, { fit: false });
    const shapeItems = base.plan.layout.map((_, k) => ({
      ty: "sh",
      ind: k,
      nm: `Path ${k + 1}`,
      ks: morph
        ? {
            a: 1,
            k: [
              ...frames.map((f) => ({ t: f, s: [lottieShapesFromBuffer(morph!, eAt(f), S, vx, vy)[k]], ...lin })),
              { t: op, s: [lottieShapesFromBuffer(morph, 1, S, vx, vy)[k]] },
            ],
          }
        : { a: 0, k: lottieShapesFromBuffer(base, 0, S, vx, vy)[k] },
    }));
    const colour = (key: "fill" | "stroke") =>
      A[key] === B[key]
        ? { a: 0, k: rgba01(A[key], cc) }
        : {
            a: 1,
            k: [
              ...frames.map((f) => {
                const e = eAt(f),
                  a = rgba01(A[key], cc),
                  b = rgba01(B[key], cc);
                return { t: f, s: a.map((v, j) => +(v + (b[j] - v) * e).toFixed(4)), ...lin };
              }),
              { t: op, s: rgba01(B[key], cc) },
            ],
          };
    const paints: object[] = [];
    if (A.stroke !== "none" || B.stroke !== "none")
      paints.push({
        ty: "st",
        nm: "Stroke",
        c: colour("stroke"),
        o: { a: 0, k: 100 },
        w: { a: 0, k: +(A.strokeWidth * S).toFixed(3) },
        lc: 2,
        lj: 2,
        ml: 4,
        bm: 0,
      });
    if (A.fill !== "none" || B.fill !== "none") paints.push({ ty: "fl", nm: "Fill", c: colour("fill"), o: { a: 0, k: 100 }, r: 1, bm: 0 });
    return {
      ddd: 0,
      ind: i + 1,
      ty: 4,
      nm: el.id,
      sr: 1,
      ao: 0,
      ip: 0,
      op,
      st: 0,
      bm: 0,
      ks: {
        a: { a: 0, k: [(o[0] - vx) * S, (o[1] - vy) * S, 0] },
        p: prop(pos, A.x === B.x && A.y === B.y),
        s: prop((r) => [r.scale * 100, r.scale * 100, 100], A.scale === B.scale),
        r: prop((r) => [r.rotate], A.rotate === B.rotate),
        o: prop((r) => [r.opacity * 100], A.opacity === B.opacity),
      },
      shapes: [
        {
          ty: "gr",
          nm: el.id,
          np: shapeItems.length + paints.length,
          bm: 0,
          it: [
            ...shapeItems,
            ...paints,
            {
              ty: "tr",
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 },
              sk: { a: 0, k: 0 },
              sa: { a: 0, k: 0 },
              nm: "Transform",
            },
          ],
        },
      ],
    };
  });
  // Lottie draws the first layer on top; SVG draws the last element on top.
  return {
    v: "5.7.4",
    fr: fps,
    ip: 0,
    op,
    w: Math.round(vw * S),
    h: Math.round(vh * S),
    nm: `${spec.name}: ${from} → ${to}`,
    ddd: 0,
    assets: [],
    markers: [],
    layers: layers.reverse(),
  };
}

/* ========================================================================== */
/*  Presets & the prompt agents get                                            */
/* ========================================================================== */

export const PRESET_SPECS: MotionSpec[] = [
  {
    version: 1,
    name: "Send to stop",
    viewBox: [0, 0, 48, 48],
    initial: "idle",
    elements: [
      { id: "bg", shape: '<circle cx="24" cy="24" r="18"/>', fill: "#0A62BC" },
      { id: "icon", shape: "M24 32V16M17 23l7-7 7 7", stroke: "#FFFFFF", strokeWidth: 3, fill: "none" },
    ],
    states: {
      idle: {},
      streaming: { bg: { scale: 0.9, fill: "#13212B" }, icon: { shape: "M18.5 18.5h11v11h-11z" } },
    },
    transitions: [
      { from: "*", to: "streaming", easing: "spring", spring: { stiffness: 340, damping: 20 } },
      { from: "*", to: "idle", duration: 260, easing: "ease-out" },
    ],
    triggers: [{ on: "click", to: "toggle" }],
  },
  {
    version: 1,
    name: "Toggle switch",
    viewBox: [0, 0, 64, 36],
    initial: "off",
    elements: [
      { id: "track", shape: '<rect x="2" y="4" width="60" height="28" rx="14"/>', fill: "#C9D3D9" },
      { id: "knob", shape: '<circle cx="18" cy="18" r="11"/>', fill: "#FFFFFF" },
    ],
    states: { off: {}, on: { track: { fill: "#1E7A4C" }, knob: { x: 28 } } },
    transitions: [
      { from: "*", to: "on", easing: "spring", spring: { stiffness: 420, damping: 24 } },
      { from: "*", to: "off", easing: "spring", spring: { stiffness: 420, damping: 30 } },
    ],
    triggers: [{ on: "click", to: "toggle" }],
  },
  {
    version: 1,
    name: "Saved toast",
    viewBox: [0, 0, 220, 64],
    initial: "hidden",
    elements: [
      { id: "card", shape: '<rect x="4" y="6" width="212" height="52" rx="12"/>', fill: "#13212B" },
      { id: "badge", shape: '<circle cx="32" cy="32" r="14"/>', fill: "#2A3A46" },
      { id: "icon", shape: "M27 37h10M25 33c2-2 2-4 2-8a5 5 0 0 1 10 0c0 4 0 6 2 8z", stroke: "#FFFFFF", strokeWidth: 2, fill: "none" },
      { id: "title", shape: '<rect x="56" y="22" width="120" height="7" rx="3.5"/>', fill: "#E1E8EC" },
      { id: "detail", shape: '<rect x="56" y="35" width="80" height="6" rx="3"/>', fill: "#8C9CA6" },
    ],
    states: {
      hidden: {
        card: { y: 20, opacity: 0 },
        badge: { y: 20, opacity: 0 },
        icon: { y: 20, opacity: 0 },
        title: { y: 20, opacity: 0 },
        detail: { y: 20, opacity: 0 },
      },
      shown: {},
      done: {
        badge: { fill: "#1E5A3C", scale: 1.08 },
        icon: { shape: "M25 32.5l5 5 9-10", stroke: "#7CE0A8" },
        detail: { fill: "#5FC28C" },
      },
    },
    transitions: [
      { from: "hidden", to: "shown", duration: 460, easing: [0.2, 0.9, 0.3, 1.15], stagger: 50 },
      { from: "*", to: "done", easing: "spring", spring: { stiffness: 300, damping: 18 } },
      { from: "*", to: "hidden", duration: 240, easing: "ease-in", stagger: 25 },
    ],
    triggers: [{ on: "click", to: "next" }],
  },
];

export const SPEC_TYPES = `type Easing = "linear"|"ease"|"ease-in"|"ease-out"|"ease-in-out"|"spring"|[x1,y1,x2,y2];
interface MotionSpec {
  name: string;
  viewBox: [minX, minY, width, height];          // keep it small, e.g. [0,0,48,48]
  elements: { id: string; shape: string;          // SVG path data, or one <circle>/<rect>/<ellipse> element string
              fill?: string; stroke?: string;     // hex colours or "none"
              strokeWidth?: number; origin?: [x,y] }[];
  states: Record<string, Record<elementId, { x?, y?, scale?, rotate?, opacity?, fill?, stroke?, shape? }>>;  // omitted props keep the element's base value
  transitions?: { from: string | "*"; to: string; duration?: ms; delay?: ms; stagger?: ms;
                  easing?: Easing; spring?: { stiffness: number; damping: number } }[];
  triggers?: { on: "click"|"hover"|"load"; to: string | "next" | "toggle" }[];
  initial: string;
}`;
