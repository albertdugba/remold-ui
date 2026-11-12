import type { ReducedMotion } from "@remold-ui/dom";
import { parseColor } from "../extrude";
import { painter } from "../painter";
import { LAND } from "./land";

export interface GlobePoint {
  lat: number;
  lon: number;
}

export interface GlobeFocus extends GlobePoint {
  label?: string;
}

export interface GlobeMarker extends GlobePoint {
  color?: string;
  size?: number;
}

export interface GlobePulseOptions extends GlobePoint {
  color?: string;
}

export interface GlobeArc {
  from: GlobePoint;
  to: GlobePoint;
  color?: string;
  pulse?: boolean;
}

export interface GlobeColors {
  land?: string;
  sphere?: string;
  glow?: string;
  accent?: string;
  arc?: string | readonly string[];
}

export interface GlobeLook {
  colors?: GlobeColors;
  markers?: readonly GlobeMarker[];
  spin?: number;
  tilt?: number;
  dotSize?: number;
  scale?: number;
}

export interface GlobeOptions extends GlobeLook {
  start?: number;
  draggable?: boolean;
  dots?: number;
  label?: string;
  reducedMotion?: ReducedMotion;
  maxPixelRatio?: number;
}

export interface Globe {
  pulse(at: GlobePulseOptions): void;
  arc(arc: GlobeArc): void;
  focus(at: GlobeFocus | null): void;
  set(look: GlobeLook): void;
  redraw(): void;
  destroy(): void;
}

const PULSE = 2200;
const LIT = PULSE * 4;
const GROW = 1300;
const HOLD = 300;
const FADE = 900;
const LIFT = 0.45;
const STEPS = 48;
const FULL_TURN = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const DEFAULT_DOTS = 14000;
const DEFAULT_SPIN = 7;
const DEFAULT_TILT = 18;
const COLOR_REFRESH = 30;
const MAX_FOCUS_LAT = 0.6;
const MAX_DRAG_LAT = 0.9;
const FLING_WINDOW = 80;

const rad = (degrees: number) => (degrees * Math.PI) / 180;
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

type Vec = [number, number, number];
type ScreenPoint = readonly [number, number];

interface Colors {
  land: string;
  sphere: string;
  glow: string;
  accent: string;
  arc: readonly string[];
  text: string;
}

interface Pulse extends GlobePulseOptions {
  t: number;
  turn?: number;
}

interface Arc {
  a: Vec;
  b: Vec;
  angle: number;
  to: GlobePoint;
  color?: string;
  pulse: boolean;
  t: number;
  landed: boolean;
  turn: number;
}

interface View {
  lon: number;
  lat: number;
}

interface Projection {
  radius: number;
  cx: number;
  cy: number;
  sinV: number;
  cosV: number;
  turn: (vector: Vec) => Vec;
  screen: (vector: Vec) => ScreenPoint;
}

interface Ring {
  points: [number, number][];
  box: readonly [number, number, number, number];
}

const toVec = ({ lat, lon }: GlobePoint): Vec => [
  Math.cos(rad(lat)) * Math.sin(rad(lon)),
  Math.sin(rad(lat)),
  Math.cos(rad(lat)) * Math.cos(rad(lon)),
];

function toRing(ring: string): Ring {
  const points = ring.split(" ").map((pair) => pair.split(",").map(Number) as [number, number]);
  const lons = points.map((point) => point[0]);
  const lats = points.map((point) => point[1]);

  return { points, box: [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)] };
}

const rings = LAND.map(toRing);
const sampled = new Map<number, Float32Array>();

function crossings({ points }: Ring, lon: number, lat: number): number {
  let count = 0;

  for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
    const [xi, yi] = points[index]!;
    const [xj, yj] = points[previous]!;

    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) count++;
  }

  return count;
}

function onLand(lon: number, lat: number): boolean {
  const inBox = ({ box }: Ring) => lon >= box[0] && lon <= box[1] && lat >= box[2] && lat <= box[3];
  const total = rings.filter(inBox).reduce((sum, ring) => sum + crossings(ring, lon, lat), 0);

  return total % 2 === 1;
}

function landDots(count: number): Float32Array {
  const cached = sampled.get(count);

  if (cached) return cached;

  const values: number[] = [];

  for (let index = 0; index < count; index++) {
    const lat = Math.asin(1 - (2 * (index + 0.5)) / count);
    const lon = wrap(GOLDEN_ANGLE * index);

    if (onLand((lon * 180) / Math.PI, (lat * 180) / Math.PI)) values.push(Math.sin(lat), Math.cos(lat), lon);
  }

  const dots = new Float32Array(values);

  sampled.set(count, dots);

  return dots;
}

function along(a: Vec, b: Vec, angle: number, t: number): Vec {
  const lift = 1 + LIFT * (angle / Math.PI) * Math.sin(Math.PI * t);

  if (angle < 1e-6) return [a[0] * lift, a[1] * lift, a[2] * lift];

  const sine = Math.sin(angle);
  const fromA = (Math.sin((1 - t) * angle) / sine) * lift;
  const fromB = (Math.sin(t * angle) / sine) * lift;

  return [a[0] * fromA + b[0] * fromB, a[1] * fromA + b[1] * fromB, a[2] * fromA + b[2] * fromB];
}

function readColors(canvas: HTMLCanvasElement, look: GlobeLook): Colors {
  const css = getComputedStyle(canvas);
  const custom = (name: string) => css.getPropertyValue(name).trim();
  const given = look.colors ?? {};
  const accent = given.accent ?? (css.accentColor && css.accentColor !== "auto" ? css.accentColor : css.color);
  const [red, green, blue] = parseColor(accent);
  const arc = typeof given.arc === "string" ? [given.arc] : given.arc?.length ? given.arc : [custom("--globe-arc") || accent];

  return {
    land: given.land ?? css.color,
    sphere: given.sphere ?? custom("--globe-sphere"),
    glow: given.glow ?? custom("--globe-glow"),
    accent,
    arc,
    text: red * 0.299 + green * 0.587 + blue * 0.114 > 160 ? "#111" : "#fff",
  };
}

function rotate(view: View, [x, y, z]: Vec): Vec {
  const sinL = Math.sin(view.lon);
  const cosL = Math.cos(view.lon);
  const turnedX = x * cosL - z * sinL;
  const turnedZ = x * sinL + z * cosL;

  return [turnedX, Math.cos(view.lat) * y - Math.sin(view.lat) * turnedZ, Math.sin(view.lat) * y + Math.cos(view.lat) * turnedZ];
}

function projectionFor(view: View, width: number, height: number, scale: number): Projection {
  const radius = (Math.min(width, height) / 2 - 2) * Math.max(0.1, Math.min(1, scale));
  const cx = width / 2;
  const cy = height / 2;

  return {
    radius,
    cx,
    cy,
    sinV: Math.sin(view.lat),
    cosV: Math.cos(view.lat),
    turn: (vector) => rotate(view, vector),
    screen: ([x, y]) => [cx + radius * x, cy - radius * y],
  };
}

function drawGlow(context: CanvasRenderingContext2D, { radius, cx, cy }: Projection, color: string, width: number, height: number) {
  const outer = Math.max(radius + 1, Math.min(radius * 1.25, Math.min(width, height) / 2));
  const gradient = context.createRadialGradient(cx, cy, radius * 0.92, cx, cy, outer);

  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "transparent");
  context.globalAlpha = 0.6;
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(cx, cy, outer, 0, FULL_TURN);
  context.fill();
}

function drawSphere(context: CanvasRenderingContext2D, { radius, cx, cy }: Projection, color: string) {
  context.globalAlpha = 1;
  context.fillStyle = color;
  context.beginPath();
  context.arc(cx, cy, radius, 0, FULL_TURN);
  context.fill();
}

const depthBand = (z: number) => (z <= 0 ? -1 : Math.min(3, Math.floor(z * 4)));

function drawLandBand(context: CanvasRenderingContext2D, dots: Float32Array, projection: Projection, lon: number, band: number, dotSize: number) {
  const { radius, cx, cy, sinV, cosV } = projection;

  context.globalAlpha = band < 0 ? 0.07 : 0.22 + band * 0.2;
  context.beginPath();

  for (let start = 0; start < dots.length; start += 3) {
    const sin = dots[start]!;
    const cos = dots[start + 1]!;
    const delta = dots[start + 2]! - lon;
    const z = sinV * sin + cosV * cos * Math.cos(delta);

    if (depthBand(z) !== band) continue;

    const x = cx + radius * cos * Math.sin(delta);
    const y = cy - radius * (cosV * sin - sinV * cos * Math.cos(delta));
    const size = (z <= 0 ? 0.7 : 0.7 + z * 0.75) * dotSize;

    context.moveTo(x + size, y);
    context.arc(x, y, size, 0, FULL_TURN);
  }

  context.fill();
}

function drawLand(context: CanvasRenderingContext2D, dots: Float32Array, projection: Projection, lon: number, colors: Colors, dotSize: number) {
  context.fillStyle = colors.land;

  for (let band = colors.sphere ? 0 : -1; band < 4; band++) drawLandBand(context, dots, projection, lon, band, dotSize);
}

function drawMarkers(context: CanvasRenderingContext2D, projection: Projection, markers: readonly GlobeMarker[], accent: string) {
  for (const marker of markers) {
    const turned = projection.turn(toVec(marker));

    if (turned[2] <= 0.05) continue;

    const [x, y] = projection.screen(turned);

    context.globalAlpha = Math.min(1, turned[2] * 3);
    context.fillStyle = marker.color ?? accent;
    context.beginPath();
    context.arc(x, y, marker.size ?? 3, 0, FULL_TURN);
    context.fill();
  }
}

function strokeArcPath(context: CanvasRenderingContext2D, projection: Projection, arc: Arc, head: number, tail: number): ScreenPoint | null {
  const count = Math.max(2, Math.ceil(STEPS * (head - tail)));
  let last: ScreenPoint | null = null;

  for (let step = 0; step <= count; step++) {
    const t = tail + ((head - tail) * step) / count;
    const turned = projection.turn(along(arc.a, arc.b, arc.angle, t));
    const hidden = turned[2] < 0 && turned[0] * turned[0] + turned[1] * turned[1] < 1;
    const point = projection.screen(turned);

    if (last && !hidden) {
      context.globalAlpha = 0.25 + 0.75 * (step / count);
      context.beginPath();
      context.moveTo(last[0], last[1]);
      context.lineTo(point[0], point[1]);
      context.stroke();
    }

    last = hidden ? null : point;
  }

  return last;
}

function drawArc(context: CanvasRenderingContext2D, projection: Projection, arc: Arc, color: string, head: number, tail: number) {
  context.strokeStyle = color;
  context.lineWidth = 1.6;

  const last = strokeArcPath(context, projection, arc, head, tail);

  if (head >= 1 || !last) return;

  context.globalAlpha = 1;
  context.fillStyle = color;
  context.beginPath();
  context.arc(last[0], last[1], 2.5, 0, FULL_TURN);
  context.fill();
}

function drawPulse(context: CanvasRenderingContext2D, projection: Projection, pulse: Pulse, colors: Colors, now: number, still: boolean) {
  const turned = projection.turn(toVec(pulse));

  if (turned[2] <= 0.05) return;

  const [x, y] = projection.screen(turned);
  const age = (now - pulse.t) / PULSE;
  const fade = Math.min(1, turned[2] * 3);
  const color = pulse.color ?? (pulse.turn === undefined ? colors.accent : colors.arc[pulse.turn % colors.arc.length]!);

  context.fillStyle = color;
  context.strokeStyle = color;

  if (age < 1 && !still) {
    context.globalAlpha = (1 - age) * 0.7 * fade;
    context.beginPath();
    context.arc(x, y, 3 + age * 16, 0, FULL_TURN);
    context.stroke();
  }

  context.globalAlpha = Math.max(0, 1 - Math.max(0, age - 2) / 2) * fade;
  context.beginPath();
  context.arc(x, y, 3, 0, FULL_TURN);
  context.fill();
}

function drawTag(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, label: string, x: number, y: number, depth: number, width: number, textColor: string) {
  context.globalAlpha = Math.min(1, depth * 2);
  context.font = `600 12px ${getComputedStyle(canvas).fontFamily}`;

  const tagWidth = context.measureText(label).width + 20;
  const left = Math.max(4, Math.min(width - tagWidth - 4, x - tagWidth / 2));

  context.beginPath();
  context.roundRect(left, y - 38, tagWidth, 26, 13);
  context.fill();
  context.fillStyle = textColor;
  context.textBaseline = "middle";
  context.fillText(label, left + 10, y - 24.5);
}

function drawFocus(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, projection: Projection, target: GlobeFocus, colors: Colors, width: number) {
  const focused = projection.turn(toVec(target));

  if (focused[2] <= 0.2) return;

  const [x, y] = projection.screen(focused);

  context.globalAlpha = 1;
  context.fillStyle = colors.accent;
  context.beginPath();
  context.arc(x, y, 4, 0, FULL_TURN);
  context.fill();

  if (target.label) drawTag(context, canvas, target.label, x, y, focused[2], width, colors.text);
}

export function globe(canvas: HTMLCanvasElement, options: GlobeOptions = {}): Globe {
  const dots = landDots(options.dots ?? DEFAULT_DOTS);
  const look: GlobeLook = { ...options };
  const view: View = { lon: rad(options.start ?? 0), lat: rad(look.tilt ?? DEFAULT_TILT) };

  let velocity = rad(look.spin ?? DEFAULT_SPIN);
  let target: GlobeFocus | null = null;
  let drag: { x: number; t: number; y: number } | null = null;
  let pulses: Pulse[] = [];
  let arcs: Arc[] = [];
  let colors: Colors = { land: "#18181b", sphere: "", glow: "", accent: "#16a34a", arc: ["#16a34a"], text: "#fff" };
  let launched = 0;
  let frames = 0;

  const spin = () => rad(look.spin ?? DEFAULT_SPIN);
  const tilt = () => rad(look.tilt ?? DEFAULT_TILT);
  const refreshColors = () => (colors = readColors(canvas, look));

  const settled = () =>
    !target || (Math.abs(wrap(rad(target.lon) - view.lon)) < 1e-3 && Math.abs(clamp(rad(target.lat), MAX_FOCUS_LAT) - view.lat) < 1e-3);

  const steer = (dt: number, still: boolean) => {
    if (target) {
      const pull = still ? 1 : 1 - Math.exp(-dt * 5);

      view.lon += wrap(rad(target.lon) - view.lon) * pull;
      view.lat += (clamp(rad(target.lat), MAX_FOCUS_LAT) - view.lat) * pull;
      velocity = 0;
      return;
    }

    if (drag || still) return;

    velocity += (spin() - velocity) * (1 - Math.exp(-dt * 1.2));

    if (Math.abs(velocity - spin()) < 1e-4) velocity = spin();

    view.lon += velocity * dt;
    view.lat += (tilt() - view.lat) * (1 - Math.exp(-dt * 1.5));
  };

  const drawArcs = (context: CanvasRenderingContext2D, projection: Projection, now: number, still: boolean) => {
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

      drawArc(context, projection, arc, arc.color ?? colors.arc[arc.turn % colors.arc.length]!, head, tail);
    }
  };

  const drawPulses = (context: CanvasRenderingContext2D, projection: Projection, now: number, still: boolean) => {
    pulses = pulses.filter((pulse) => now - pulse.t < LIT);
    context.lineWidth = 1.5;

    for (const pulse of pulses) drawPulse(context, projection, pulse, colors, now, still);
  };

  const paint = painter(canvas, {
    label: options.label,
    reducedMotion: options.reducedMotion,
    maxPixelRatio: options.maxPixelRatio,

    get continuous() {
      return drag !== null || pulses.length > 0 || arcs.length > 0 || (target ? !settled() : spin() !== 0 || velocity !== 0);
    },

    draw(context, { width, height, dt, still }) {
      if (frames++ % COLOR_REFRESH === 0) refreshColors();

      const now = performance.now();

      steer(dt, still);

      const projection = projectionFor(view, width, height, look.scale ?? 1);

      if (colors.glow) drawGlow(context, projection, colors.glow, width, height);

      if (colors.sphere) drawSphere(context, projection, colors.sphere);

      drawLand(context, dots, projection, view.lon, colors, look.dotSize ?? 1);
      drawMarkers(context, projection, look.markers ?? [], colors.accent);
      drawArcs(context, projection, now, still);
      drawPulses(context, projection, now, still);

      if (target) drawFocus(context, canvas, projection, target, colors, width);

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
    view.lat = clamp(view.lat + ((event.clientY - drag.y) / size) * Math.PI, MAX_DRAG_LAT);
    velocity = velocity * 0.5 - (dx / (Math.max(1, now - drag.t) / 1000)) * 0.5;
    drag = { x: event.clientX, y: event.clientY, t: now };
    paint.redraw();
  };

  const up = () => {
    if (drag && (performance.now() - drag.t > FLING_WINDOW || paint.still)) velocity = 0;

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
      refreshColors();
      paint.redraw();
    },

    redraw() {
      refreshColors();
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
