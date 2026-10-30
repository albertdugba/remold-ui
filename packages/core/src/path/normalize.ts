/**
 * Path normalisation.
 *
 * Turns lines, quadratic curves and arcs into cubic Béziers, so every later stage (splitting,
 * matching, morphing) handles exactly one kind of segment: four points, eight numbers.
 */
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

/** A point on the curve, `t` of the way along (0 is the start, 1 the end). */
export function pointAt(c: Cubic, t: number): Point {
  const a = lerpPoint(c.p0, c.p1, t);
  const b = lerpPoint(c.p1, c.p2, t);
  const d = lerpPoint(c.p2, c.p3, t);

  return lerpPoint(lerpPoint(a, b, t), lerpPoint(b, d, t), t);
}

/** A straight line is a cubic whose handles sit a third and two thirds of the way along. */
export function lineToCubic(from: Point, to: Point): Cubic {
  return { p0: from, p1: lerpPoint(from, to, 1 / 3), p2: lerpPoint(from, to, 2 / 3), p3: to };
}

/** A quadratic's one handle becomes two handles, each two thirds of the way towards it. */
export function quadToCubic(from: Point, handle: Point, to: Point): Cubic {
  return {
    p0: from,
    p1: lerpPoint(from, handle, 2 / 3),
    p2: lerpPoint(to, handle, 2 / 3),
    p3: to,
  };
}

/**
 * An elliptical arc as cubics, at most a quarter turn each.
 * Follows the SVG spec's implementation notes (F.6.5 centre conversion, F.6.6 radius correction).
 */
export function arcToCubics(from: Point, arc: Arc, to: Point): Cubic[] {
  if (from.x === to.x && from.y === to.y) return [];

  let rx = Math.abs(arc.rx);
  let ry = Math.abs(arc.ry);

  if (rx === 0 || ry === 0) return [lineToCubic(from, to)];

  // 1. Turn the picture so the ellipse is upright, measured from the chord's middle.
  const phi = (arc.rotation * Math.PI) / 180;
  const cos = Math.cos(phi),
    sin = Math.sin(phi);
  const dx = (from.x - to.x) / 2,
    dy = (from.y - to.y) / 2;
  const x1 = cos * dx + sin * dy;
  const y1 = -sin * dx + cos * dy;

  // 2. If the ellipse is too small to reach both ends, grow it just enough.
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);

  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }

  // 3. Find the centre. The two flags choose one of four possible arcs.
  const rx2 = rx * rx,
    ry2 = ry * ry;
  const num = rx2 * ry2 - rx2 * y1 * y1 - ry2 * x1 * x1;
  const den = rx2 * y1 * y1 + ry2 * x1 * x1;
  const coef = (arc.largeArc === arc.sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cx1 = (coef * rx * y1) / ry;
  const cy1 = (coef * -ry * x1) / rx;
  const cx = cos * cx1 - sin * cy1 + (from.x + to.x) / 2;
  const cy = sin * cx1 + cos * cy1 + (from.y + to.y) / 2;

  // 4. The start angle and how far round to go.
  const angle = ({ fromX, fromY, toX, toY }: { fromX: number; fromY: number; toX: number; toY: number }) =>
    Math.atan2(fromX * toY - fromY * toX, fromX * toX + fromY * toY);
  const ux = (x1 - cx1) / rx,
    uy = (y1 - cy1) / ry;
  const vx = (-x1 - cx1) / rx,
    vy = (-y1 - cy1) / ry;
  const start = angle({ fromX: 1, fromY: 0, toX: ux, toY: uy });
  let sweep = angle({ fromX: ux, fromY: uy, toX: vx, toY: vy });

  if (!arc.sweep && sweep > 0) sweep -= 2 * Math.PI;
  else if (arc.sweep && sweep < 0) sweep += 2 * Math.PI;

  // 5. Cut it into quarter turns or less, and draw each piece as a cubic.
  const count = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9));
  const step = sweep / count;
  const k = (4 / 3) * Math.tan(step / 4);
  const onEllipse = (u: number, v: number): Point => ({
    x: cx + rx * cos * u - ry * sin * v,
    y: cy + rx * sin * u + ry * cos * v,
  });

  const out: Cubic[] = [];

  for (let n = 0; n < count; n++) {
    const a1 = start + n * step,
      a2 = a1 + step;
    const c1 = Math.cos(a1),
      s1 = Math.sin(a1),
      c2 = Math.cos(a2),
      s2 = Math.sin(a2);
    out.push({
      p0: n === 0 ? from : onEllipse(c1, s1),
      p1: onEllipse(c1 - k * s1, s1 + k * c1),
      p2: onEllipse(c2 + k * s2, s2 - k * c2),
      p3: n === count - 1 ? to : onEllipse(c2, s2),
    });
  }
  return out;
}

/** Closer than this counts as the same point, absorbing rounding from relative coordinates. */
const EPSILON = 1e-9;

/**
 * Turn parsed commands into subpaths made only of cubics.
 * Subpaths with no segments (a lone M, or "M0 0 Z") are dropped.
 */
export function toCubics(commands: PathCommand[]): Subpath[] {
  const out: Subpath[] = [];
  let current: Subpath = { segments: [], closed: false };
  let pen: Point = { x: 0, y: 0 };
  let start: Point = pen;

  const finish = () => {
    if (current.segments.length > 0) out.push(current);
    current = { segments: [], closed: false };
  };
  const add = (c: Cubic) => {
    current.segments.push(c);
    pen = c.p3;
  };

  for (const cmd of commands) {
    switch (cmd.type) {
      case "M":
        finish();
        pen = start = { x: cmd.x, y: cmd.y };
        break;
      case "L":
        add(lineToCubic(pen, { x: cmd.x, y: cmd.y }));
        break;
      case "C":
        add({ p0: pen, p1: { x: cmd.x1, y: cmd.y1 }, p2: { x: cmd.x2, y: cmd.y2 }, p3: { x: cmd.x, y: cmd.y } });
        break;
      case "Q":
        add(quadToCubic(pen, { x: cmd.x1, y: cmd.y1 }, { x: cmd.x, y: cmd.y }));
        break;
      case "A":
        for (const c of arcToCubics(pen, cmd, { x: cmd.x, y: cmd.y })) add(c);
        break;
      case "Z":
        // Draw the last edge home, unless the pen is already there. A zero-length segment
        // would steal points from real edges when shapes are matched later.
        if (Math.abs(pen.x - start.x) > EPSILON || Math.abs(pen.y - start.y) > EPSILON) {
          add(lineToCubic(pen, start));
        }
        current.closed = true;
        finish();
        pen = start;
        break;
    }
  }
  finish();

  return out;
}
