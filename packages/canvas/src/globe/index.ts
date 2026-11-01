/**
 * Globe: a dotted Earth that turns on its own, can be spun with a finger, pulses wherever
 * something happens, and flies arcs between places. Built on the painter, so it stays sharp,
 * sleeps off screen and holds still for reduced motion.
 *
 * Colours come from `colors`, or from CSS when left out: `color` paints the land, `accent-color`
 * the pulses, and `--globe-sphere`, `--globe-glow` and `--globe-arc` the ocean, halo and arcs.
 *
 * ```ts
 * const earth = globe(canvas, { colors: { sphere: "#0d1b3e", glow: "#3b82f6" } });
 * earth.pulse({ lat: 6.5, lon: 3.4 });
 * earth.arc({ from: { lat: 6.5, lon: 3.4 }, to: { lat: 51.5, lon: -0.1 } });
 * earth.focus({ lat: 51.5, lon: -0.1, label: "London · 73 now" });
 * ```
 */
import type { ReducedMotion } from "@remold-ui/dom";
import { parseColor } from "../extrude";
import { painter } from "../painter";
import { LAND } from "./land";

export interface GlobePoint {
  /** Degrees north. */
  lat: number;
  /** Degrees east. */
  lon: number;
}

export interface GlobeFocus extends GlobePoint {
  /** A tag drawn above the point. */
  label?: string;
}

export interface GlobeMarker extends GlobePoint {
  /** Default: the accent colour. */
  color?: string;
  /** Radius in CSS pixels. Default 3. */
  size?: number;
}

export interface GlobePulseOptions extends GlobePoint {
  /** Default: the accent colour. */
  color?: string;
}

export interface GlobeArc {
  from: GlobePoint;
  to: GlobePoint;
  /** Default: the next arc colour. */
  color?: string;
  /** Pulse where it lands. Default true. */
  pulse?: boolean;
}

export interface GlobeColors {
  /** The land dots. Default: CSS `color`. */
  land?: string;
  /** The ocean, drawn as a solid ball behind the land. It also hides the far side. Default: `--globe-sphere`, or none. */
  sphere?: string;
  /** A halo around the edge. Default: `--globe-glow`, or none. */
  glow?: string;
  /** Pulses, markers and the focus tag. Default: CSS `accent-color`. */
  accent?: string;
  /** Arcs. Pass several to take turns. Default: `--globe-arc`, or the accent. */
  arc?: string | readonly string[];
}

/** Everything that can change after the globe is made. */
export interface GlobeLook {
  /** Colours for each part. Anything left out comes from CSS. */
  colors?: GlobeColors;
  /** Places that stay lit. */
  markers?: readonly GlobeMarker[];
  /** Degrees per second it turns on its own. Default 7; 0 holds it still. */
  spin?: number;
  /** Degrees it leans towards you while turning. Default 18. */
  tilt?: number;
  /** Scales every land dot. Default 1. */
  dotSize?: number;
  /** How much of the canvas the globe fills, from 0 to 1. Leave room for a glow or tall arcs. Default 1. */
  scale?: number;
}

export interface GlobeOptions extends GlobeLook {
  /** The longitude facing you at the start. Default 0. */
  start?: number;
  /** Let a drag spin it, with a fling. Default true. */
  draggable?: boolean;
  /** Dots spread over the whole sphere; the land keeps about a third. Default 14000. */
  dots?: number;
  /** The canvas's accessible name. */
  label?: string;
  /** "user" (default) follows the system setting; "always" and "never" override it. */
  reducedMotion?: ReducedMotion;
  /** Stored pixels per CSS pixel are capped at this. Default 2. */
  maxPixelRatio?: number;
}

export interface Globe {
  /** A ring that spreads from a point, which stays lit for a few seconds. */
  pulse(at: GlobePulseOptions): void;
  /** An arc that flies from one place to another, then fades. */
  arc(arc: GlobeArc): void;
  /** Turn to face a point and hold there, or `null` to let it spin again. */
  focus(at: GlobeFocus | null): void;
  /** Change colours, markers, spin, tilt, dot size or scale. */
  set(look: GlobeLook): void;
  /** Draw again now, after a CSS change. */
  redraw(): void;
  /** Stop drawing and let go of the canvas. */
  destroy(): void;
}

const PULSE = 2200;
const LIT = PULSE * 4;
const GROW = 1300;
const HOLD = 300;
const FADE = 900;
const LIFT = 0.45;
const STEPS = 48;
const rad = (deg: number) => (deg * Math.PI) / 180;
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const clamp = (n: number, limit: number) => Math.max(-limit, Math.min(limit, n));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

type Vec = [number, number, number];

const toVec = ({ lat, lon }: GlobePoint): Vec => [
  Math.cos(rad(lat)) * Math.sin(rad(lon)),
  Math.sin(rad(lat)),
  Math.cos(rad(lat)) * Math.cos(rad(lon)),
];

/** Rings parsed once, with their bounds for a quick reject. */
const rings = LAND.map((ring) => {
  const points = ring.split(" ").map((pair) => pair.split(",").map(Number) as [number, number]);
  const lons = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  return { points, box: [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)] as const };
});

const sampled = new Map<number, Float32Array>();

/** Evenly spread points on a sphere (a Fibonacci lattice), kept where they fall on land. */
function landDots(count: number): Float32Array {
  const cached = sampled.get(count);
  if (cached) return cached;
  const out: number[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const lat = Math.asin(1 - (2 * (i + 0.5)) / count);
    const lon = wrap(golden * i);
    if (onLand((lon * 180) / Math.PI, (lat * 180) / Math.PI)) out.push(Math.sin(lat), Math.cos(lat), lon);
  }
  const dots = new Float32Array(out);
  sampled.set(count, dots);
  return dots;
}

function onLand(lon: number, lat: number): boolean {
  let inside = false;
  for (const { points, box } of rings) {
    if (lon < box[0] || lon > box[1] || lat < box[2] || lat > box[3]) continue;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i]!;
      const [xj, yj] = points[j]!;
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

/** A point along the great circle from `a` to `b`, lifted off the surface towards the middle. */
function along(a: Vec, b: Vec, angle: number, t: number): Vec {
  const lift = 1 + LIFT * (angle / Math.PI) * Math.sin(Math.PI * t);
  if (angle < 1e-6) return [a[0] * lift, a[1] * lift, a[2] * lift];
  const s = Math.sin(angle);
  const ka = (Math.sin((1 - t) * angle) / s) * lift;
  const kb = (Math.sin(t * angle) / s) * lift;
  return [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
}

export function globe(canvas: HTMLCanvasElement, options: GlobeOptions = {}): Globe {
  const dots = landDots(options.dots ?? 14000);
  const look: GlobeLook = { ...options };
  const view = { lon: rad(options.start ?? 0), lat: rad(look.tilt ?? 18) };
  let velocity = rad(look.spin ?? 7);
  let target: GlobeFocus | null = null;
  let drag: { x: number; t: number; y: number } | null = null;
  let pulses: (GlobePulseOptions & { t: number; turn?: number })[] = [];
  let arcs: { a: Vec; b: Vec; angle: number; to: GlobePoint; color?: string; pulse: boolean; t: number; landed: boolean; turn: number }[] = [];
  let colors = { land: "#18181b", sphere: "", glow: "", accent: "#16a34a", arc: ["#16a34a"] as readonly string[], text: "#fff" };
  let launched = 0;
  let frames = 0;

  const spin = () => rad(look.spin ?? 7);
  const tilt = () => rad(look.tilt ?? 18);

  const readColors = () => {
    const css = getComputedStyle(canvas);
    const custom = (name: string) => css.getPropertyValue(name).trim();
    const given = look.colors ?? {};
    const accent = given.accent ?? (css.accentColor && css.accentColor !== "auto" ? css.accentColor : css.color);
    const [r, g, b] = parseColor(accent);
    colors = {
      land: given.land ?? css.color,
      sphere: given.sphere ?? custom("--globe-sphere"),
      glow: given.glow ?? custom("--globe-glow"),
      accent,
      arc: typeof given.arc === "string" ? [given.arc] : given.arc?.length ? given.arc : [custom("--globe-arc") || accent],
      text: r * 0.299 + g * 0.587 + b * 0.114 > 160 ? "#111" : "#fff",
    };
  };

  const turn = ([x, y, z]: Vec): Vec => {
    const sinL = Math.sin(view.lon);
    const cosL = Math.cos(view.lon);
    const x1 = x * cosL - z * sinL;
    const z1 = x * sinL + z * cosL;
    return [x1, Math.cos(view.lat) * y - Math.sin(view.lat) * z1, Math.sin(view.lat) * y + Math.cos(view.lat) * z1];
  };

  const settled = () => !target || (Math.abs(wrap(rad(target.lon) - view.lon)) < 1e-3 && Math.abs(clamp(rad(target.lat), 0.6) - view.lat) < 1e-3);

  const paint = painter(canvas, {
    label: options.label,
    reducedMotion: options.reducedMotion,
    maxPixelRatio: options.maxPixelRatio,
    get continuous() {
      return drag !== null || pulses.length > 0 || arcs.length > 0 || (target ? !settled() : spin() !== 0 || velocity !== 0);
    },
    draw(context, { width, height, dt, still }) {
      if (frames++ % 30 === 0) readColors();
      const now = performance.now();

      if (target) {
        const pull = still ? 1 : 1 - Math.exp(-dt * 5);
        view.lon += wrap(rad(target.lon) - view.lon) * pull;
        view.lat += (clamp(rad(target.lat), 0.6) - view.lat) * pull;
        velocity = 0;
      } else if (!drag && !still) {
        velocity += (spin() - velocity) * (1 - Math.exp(-dt * 1.2));
        if (Math.abs(velocity - spin()) < 1e-4) velocity = spin();
        view.lon += velocity * dt;
        view.lat += (tilt() - view.lat) * (1 - Math.exp(-dt * 1.5));
      }

      const r = (Math.min(width, height) / 2 - 2) * Math.max(0.1, Math.min(1, look.scale ?? 1));
      const cx = width / 2;
      const cy = height / 2;
      const sinV = Math.sin(view.lat);
      const cosV = Math.cos(view.lat);
      const dotSize = look.dotSize ?? 1;
      const screen = ([x, y]: Vec) => [cx + r * x, cy - r * y] as const;

      if (colors.glow) {
        const outer = Math.max(r + 1, Math.min(r * 1.25, Math.min(width, height) / 2));
        const halo = context.createRadialGradient(cx, cy, r * 0.92, cx, cy, outer);
        halo.addColorStop(0, colors.glow);
        halo.addColorStop(1, "transparent");
        context.globalAlpha = 0.6;
        context.fillStyle = halo;
        context.beginPath();
        context.arc(cx, cy, outer, 0, Math.PI * 2);
        context.fill();
      }
      if (colors.sphere) {
        context.globalAlpha = 1;
        context.fillStyle = colors.sphere;
        context.beginPath();
        context.arc(cx, cy, r, 0, Math.PI * 2);
        context.fill();
      }

      context.fillStyle = colors.land;
      for (let band = colors.sphere ? 0 : -1; band < 4; band++) {
        context.globalAlpha = band < 0 ? 0.07 : 0.22 + band * 0.2;
        context.beginPath();
        for (let i = 0; i < dots.length; i += 3) {
          const sin = dots[i]!;
          const cos = dots[i + 1]!;
          const d = dots[i + 2]! - view.lon;
          const z = sinV * sin + cosV * cos * Math.cos(d);
          if ((z <= 0 ? -1 : Math.min(3, Math.floor(z * 4))) !== band) continue;
          const x = cx + r * cos * Math.sin(d);
          const y = cy - r * (cosV * sin - sinV * cos * Math.cos(d));
          const size = (z <= 0 ? 0.7 : 0.7 + z * 0.75) * dotSize;
          context.moveTo(x + size, y);
          context.arc(x, y, size, 0, Math.PI * 2);
        }
        context.fill();
      }

      for (const marker of look.markers ?? []) {
        const p = turn(toVec(marker));
        if (p[2] <= 0.05) continue;
        const [x, y] = screen(p);
        context.globalAlpha = Math.min(1, p[2] * 3);
        context.fillStyle = marker.color ?? colors.accent;
        context.beginPath();
        context.arc(x, y, marker.size ?? 3, 0, Math.PI * 2);
        context.fill();
      }

      context.lineCap = "round";
      arcs = arcs.filter((arc) => now - arc.t < GROW + HOLD + FADE);
      for (const arc of arcs) {
        const age = now - arc.t;
        const head = still ? 1 : ease(Math.min(1, age / GROW));
        const tail = still ? 0 : ease(Math.max(0, Math.min(1, (age - GROW - HOLD) / FADE)));
        if (head >= 1 && !arc.landed) {
          arc.landed = true;
          if (arc.pulse) pulses.push({ ...arc.to, color: arc.color, turn: arc.turn, t: now });
        }
        const color = arc.color ?? colors.arc[arc.turn % colors.arc.length]!;
        context.strokeStyle = color;
        context.lineWidth = 1.6;
        let last: readonly [number, number] | null = null;
        const count = Math.max(2, Math.ceil(STEPS * (head - tail)));
        for (let k = 0; k <= count; k++) {
          const t = tail + ((head - tail) * k) / count;
          const p = turn(along(arc.a, arc.b, arc.angle, t));
          const hidden = p[2] < 0 && p[0] * p[0] + p[1] * p[1] < 1;
          const point = screen(p);
          if (last && !hidden) {
            context.globalAlpha = 0.25 + 0.75 * (k / count);
            context.beginPath();
            context.moveTo(last[0], last[1]);
            context.lineTo(point[0], point[1]);
            context.stroke();
          }
          last = hidden ? null : point;
        }
        if (head < 1 && last) {
          context.globalAlpha = 1;
          context.fillStyle = color;
          context.beginPath();
          context.arc(last[0], last[1], 2.5, 0, Math.PI * 2);
          context.fill();
        }
      }

      pulses = pulses.filter((p) => now - p.t < LIT);
      context.lineWidth = 1.5;
      for (const pulse of pulses) {
        const p = turn(toVec(pulse));
        if (p[2] <= 0.05) continue;
        const [x, y] = screen(p);
        const age = (now - pulse.t) / PULSE;
        const fade = Math.min(1, p[2] * 3);
        const color = pulse.color ?? (pulse.turn === undefined ? colors.accent : colors.arc[pulse.turn % colors.arc.length]!);
        context.fillStyle = color;
        context.strokeStyle = color;
        if (age < 1 && !still) {
          context.globalAlpha = (1 - age) * 0.7 * fade;
          context.beginPath();
          context.arc(x, y, 3 + age * 16, 0, Math.PI * 2);
          context.stroke();
        }
        context.globalAlpha = Math.max(0, 1 - Math.max(0, age - 2) / 2) * fade;
        context.beginPath();
        context.arc(x, y, 3, 0, Math.PI * 2);
        context.fill();
      }

      const focused = target && turn(toVec(target));
      if (target && focused && focused[2] > 0.2) {
        const [x, y] = screen(focused);
        context.globalAlpha = 1;
        context.fillStyle = colors.accent;
        context.beginPath();
        context.arc(x, y, 4, 0, Math.PI * 2);
        context.fill();
        if (target.label) {
          context.globalAlpha = Math.min(1, focused[2] * 2);
          context.font = `600 12px ${getComputedStyle(canvas).fontFamily}`;
          const w = context.measureText(target.label).width + 20;
          const lx = Math.max(4, Math.min(width - w - 4, x - w / 2));
          context.beginPath();
          context.roundRect(lx, y - 38, w, 26, 13);
          context.fill();
          context.fillStyle = colors.text;
          context.textBaseline = "middle";
          context.fillText(target.label, lx + 10, y - 24.5);
        }
      }
      context.globalAlpha = 1;
    },
  });

  const down = (event: PointerEvent) => {
    canvas.setPointerCapture(event.pointerId);
    drag = { x: event.clientX, y: event.clientY, t: performance.now() };
    velocity = 0;
    target = null;
    canvas.style.cursor = "grabbing";
    paint.redraw();
  };
  const move = (event: PointerEvent) => {
    if (!drag) return;
    const size = canvas.clientWidth || 300;
    const now = performance.now();
    const dx = ((event.clientX - drag.x) / size) * Math.PI;
    view.lon -= dx;
    view.lat = clamp(view.lat + ((event.clientY - drag.y) / size) * Math.PI, 0.9);
    velocity = velocity * 0.5 - (dx / (Math.max(1, now - drag.t) / 1000)) * 0.5;
    drag = { x: event.clientX, y: event.clientY, t: now };
    paint.redraw();
  };
  const up = () => {
    if (drag && (performance.now() - drag.t > 80 || paint.still)) velocity = 0;
    drag = null;
    canvas.style.cursor = "grab";
    paint.redraw();
  };

  if (options.draggable !== false) {
    canvas.style.touchAction = "pan-y";
    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
  }

  return {
    pulse(at) {
      pulses.push({ ...at, t: performance.now() });
      paint.redraw();
    },
    arc({ from, to, color, pulse = true }) {
      const a = toVec(from);
      const b = toVec(to);
      const angle = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
      arcs.push({ a, b, angle, to, color, pulse, t: performance.now(), landed: false, turn: launched++ });
      paint.redraw();
    },
    focus(at) {
      target = at;
      paint.redraw();
    },
    set(next) {
      Object.assign(look, next);
      readColors();
      paint.redraw();
    },
    redraw() {
      readColors();
      paint.redraw();
    },
    destroy() {
      paint.destroy();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    },
  };
}
