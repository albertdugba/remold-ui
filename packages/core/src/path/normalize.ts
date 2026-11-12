import { lerpPoint, type Point } from "../interpolate";
import type { PathCommand } from "./parse";

/** A cubic Bézier: start, two handles, end. */
export interface Cubic {
  p0: Point;
  p1: Point;
  p2: Point;
  p3: Point;
}

/** One unbroken stroke of the pen: everything between one M and the next. */
export interface Subpath {
  segments: Cubic[];
  closed: boolean;
}

export interface Arc {
  rx: number;
  ry: number;
  rotation: number;
  largeArc: boolean;
  sweep: boolean;
}

const SAME_POINT = 1e-9;
const ANGLE_EPSILON = 1e-9;
const QUARTER_TURN = Math.PI / 2;
const FULL_TURN = 2 * Math.PI;

const at = (x: number, y: number): Point => ({ x, y });

const isSamePoint = (p: Point, q: Point) => Math.abs(p.x - q.x) <= SAME_POINT && Math.abs(p.y - q.y) <= SAME_POINT;

/** A point on the curve, `t` of the way along (0 is the start, 1 the end). */
export function pointAt(curve: Cubic, t: number): Point {
  const first = lerpPoint(curve.p0, curve.p1, t);
  const middle = lerpPoint(curve.p1, curve.p2, t);
  const last = lerpPoint(curve.p2, curve.p3, t);

  return lerpPoint(lerpPoint(first, middle, t), lerpPoint(middle, last, t), t);
}

export function lineToCubic(from: Point, to: Point): Cubic {
  return { p0: from, p1: lerpPoint(from, to, 1 / 3), p2: lerpPoint(from, to, 2 / 3), p3: to };
}

export function quadToCubic(from: Point, handle: Point, to: Point): Cubic {
  return {
    p0: from,
    p1: lerpPoint(from, handle, 2 / 3),
    p2: lerpPoint(to, handle, 2 / 3),
    p3: to,
  };
}

const angleBetween = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);

interface Frame {
  cos: number;
  sin: number;
  x: number;
  y: number;
}

interface Ellipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  cos: number;
  sin: number;
}

function uprightFrame(from: Point, to: Point, rotation: number): Frame {
  const angle = (rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const halfX = (from.x - to.x) / 2;
  const halfY = (from.y - to.y) / 2;

  return { cos, sin, x: cos * halfX + sin * halfY, y: -sin * halfX + cos * halfY };
}

function fittedRadii(arc: Arc, frame: Frame) {
  const reach = (frame.x * frame.x) / (arc.rx * arc.rx) + (frame.y * frame.y) / (arc.ry * arc.ry);
  const grow = reach > 1 ? Math.sqrt(reach) : 1;

  return { rx: Math.abs(arc.rx) * grow, ry: Math.abs(arc.ry) * grow };
}

function uprightCentre(arc: Arc, frame: Frame, rx: number, ry: number) {
  const rx2 = rx * rx;
  const ry2 = ry * ry;
  const numerator = rx2 * ry2 - rx2 * frame.y * frame.y - ry2 * frame.x * frame.x;
  const denominator = rx2 * frame.y * frame.y + ry2 * frame.x * frame.x;
  const side = arc.largeArc === arc.sweep ? -1 : 1;
  const coefficient = side * Math.sqrt(Math.max(0, numerator / denominator));

  return { x: (coefficient * rx * frame.y) / ry, y: (coefficient * -ry * frame.x) / rx };
}

function sweepFor(raw: number, clockwise: boolean): number {
  if (!clockwise && raw > 0) return raw - FULL_TURN;

  if (clockwise && raw < 0) return raw + FULL_TURN;

  return raw;
}

function arcAngles(arc: Arc, frame: Frame, centre: Point, rx: number, ry: number) {
  const ux = (frame.x - centre.x) / rx;
  const uy = (frame.y - centre.y) / ry;
  const vx = (-frame.x - centre.x) / rx;
  const vy = (-frame.y - centre.y) / ry;

  return { start: angleBetween(1, 0, ux, uy), sweep: sweepFor(angleBetween(ux, uy, vx, vy), arc.sweep) };
}

const onEllipse = ({ cx, cy, rx, ry, cos, sin }: Ellipse, u: number, v: number): Point => ({
  x: cx + rx * cos * u - ry * sin * v,
  y: cy + rx * sin * u + ry * cos * v,
});

function arcPieces(ellipse: Ellipse, from: Point, to: Point, start: number, sweep: number): Cubic[] {
  const count = Math.max(1, Math.ceil(Math.abs(sweep) / QUARTER_TURN - ANGLE_EPSILON));
  const step = sweep / count;
  const handle = (4 / 3) * Math.tan(step / 4);

  return Array.from({ length: count }, (_, index) => {
    const startAngle = start + index * step;
    const [cosStart, sinStart] = [Math.cos(startAngle), Math.sin(startAngle)];
    const [cosEnd, sinEnd] = [Math.cos(startAngle + step), Math.sin(startAngle + step)];

    return {
      p0: index === 0 ? from : onEllipse(ellipse, cosStart, sinStart),
      p1: onEllipse(ellipse, cosStart - handle * sinStart, sinStart + handle * cosStart),
      p2: onEllipse(ellipse, cosEnd + handle * sinEnd, sinEnd - handle * cosEnd),
      p3: index === count - 1 ? to : onEllipse(ellipse, cosEnd, sinEnd),
    };
  });
}

export function arcToCubics(from: Point, arc: Arc, to: Point): Cubic[] {
  if (from.x === to.x && from.y === to.y) return [];

  if (arc.rx === 0 || arc.ry === 0) return [lineToCubic(from, to)];

  const frame = uprightFrame(from, to, arc.rotation);
  const { rx, ry } = fittedRadii(arc, frame);
  const centre = uprightCentre(arc, frame, rx, ry);
  const { start, sweep } = arcAngles(arc, frame, centre, rx, ry);

  const ellipse: Ellipse = {
    cx: frame.cos * centre.x - frame.sin * centre.y + (from.x + to.x) / 2,
    cy: frame.sin * centre.x + frame.cos * centre.y + (from.y + to.y) / 2,
    rx,
    ry,
    cos: frame.cos,
    sin: frame.sin,
  };

  return arcPieces(ellipse, from, to, start, sweep);
}

function segmentsFor(command: PathCommand, pen: Point, start: Point): Cubic[] {
  switch (command.type) {
    case "L":
      return [lineToCubic(pen, at(command.x, command.y))];
    case "C":
      return [{ p0: pen, p1: at(command.x1, command.y1), p2: at(command.x2, command.y2), p3: at(command.x, command.y) }];
    case "Q":
      return [quadToCubic(pen, at(command.x1, command.y1), at(command.x, command.y))];
    case "A":
      return arcToCubics(pen, command, at(command.x, command.y));
    case "Z":
      return isSamePoint(pen, start) ? [] : [lineToCubic(pen, start)];
    default:
      return [];
  }
}

const openSubpath = (): Subpath => ({ segments: [], closed: false });

/** Turn parsed commands into subpaths made only of cubics. */
export function toCubics(commands: PathCommand[]): Subpath[] {
  const subpaths: Subpath[] = [];
  let current = openSubpath();
  let pen = at(0, 0);
  let start = pen;

  const finish = () => {
    if (current.segments.length > 0) subpaths.push(current);

    current = openSubpath();
  };

  for (const command of commands) {
    if (command.type === "M") {
      finish();
      pen = start = at(command.x, command.y);
      continue;
    }

    const segments = segmentsFor(command, pen, start);

    current.segments.push(...segments);
    pen = segments.at(-1)?.p3 ?? pen;

    if (command.type === "Z") {
      current.closed = true;
      finish();
      pen = start;
    }
  }

  finish();

  return subpaths;
}
