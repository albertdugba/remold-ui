import type { ScenePort, SceneLink } from "../scene";

export interface FloorBox {
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
}

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

interface Point2 {
  x: number;
  y: number;
}

type Port = Point3 & { nx: number; ny: number };

const CURVE_STEPS = 28;
const CORNER_STEPS = 6;
const CORNER_RADIUS = 18;
const MIN_REACH = 18;
const MAX_REACH = 160;
const REACH_SHARE = 0.42;

const centreOf = (box: FloorBox): Point2 => ({ x: box.x + box.width / 2, y: box.y + box.depth / 2 });

const isOver = (point: Point2, box: FloorBox) =>
  point.x > box.x && point.x < box.x + box.width && point.y > box.y && point.y < box.y + box.depth;

function portNormal(box: FloorBox, toward: Point2, port: ScenePort | undefined): [number, number] {
  if (port === "left") return [-1, 0];

  if (port === "right") return [1, 0];

  if (port === "front") return [0, 1];

  if (port === "back") return [0, -1];

  const centre = centreOf(box);
  const dx = (toward.x - centre.x) / Math.max(1, box.width);
  const dy = (toward.y - centre.y) / Math.max(1, box.depth);

  return Math.abs(dx) >= Math.abs(dy) ? [Math.sign(dx) || 1, 0] : [0, Math.sign(dy) || 1];
}

export function sidePort(box: FloorBox, toward: Point2, port?: ScenePort): Port {
  const centre = centreOf(box);
  const [nx, ny] = portNormal(box, toward, port);

  return { x: centre.x + (nx * box.width) / 2, y: centre.y + (ny * box.depth) / 2, z: box.z, nx, ny };
}

function riser(a: FloorBox, b: FloorBox): Point3[] {
  const [centreA, centreB] = [centreOf(a), centreOf(b)];
  const small = a.width * a.depth <= b.width * b.depth ? centreA : centreB;
  const aLow = a.z <= b.z;
  const fromTop = aLow ? { ...small, z: a.z + a.height } : { ...small, z: a.z };
  const toEnd = aLow ? { ...small, z: b.z } : { ...small, z: b.z + b.height };

  return [fromTop, toEnd];
}

function cubicPath(from: Port, to: Port): Point2[] {
  const reach = Math.min(MAX_REACH, Math.max(MIN_REACH, Math.hypot(to.x - from.x, to.y - from.y) * REACH_SHARE));
  const c1 = { x: from.x + from.nx * reach, y: from.y + from.ny * reach };
  const c2 = { x: to.x + to.nx * reach, y: to.y + to.ny * reach };

  return Array.from({ length: CURVE_STEPS + 1 }, (_, step) => {
    const t = step / CURVE_STEPS;
    const u = 1 - t;

    return {
      x: u * u * u * from.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * to.x,
      y: u * u * u * from.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * to.y,
    };
  });
}

function orthogonalCorners(from: Port, to: Port): Point2[] {
  const fromAlongX = from.nx !== 0;
  const toAlongX = to.nx !== 0;

  if (fromAlongX !== toAlongX) return [fromAlongX ? { x: to.x, y: from.y } : { x: from.x, y: to.y }];

  if (fromAlongX) {
    const middle = (from.x + to.x) / 2;

    return [{ x: middle, y: from.y }, { x: middle, y: to.y }];
  }

  const middle = (from.y + to.y) / 2;

  return [{ x: from.x, y: middle }, { x: to.x, y: middle }];
}

function cornerCurve(previous: Point2, at: Point2, next: Point2, radius: number): Point2[] {
  const inLength = Math.hypot(at.x - previous.x, at.y - previous.y);
  const outLength = Math.hypot(next.x - at.x, next.y - at.y);

  if (inLength < 0.5 || outLength < 0.5) return [];

  const r = Math.min(radius, inLength / 2, outLength / 2);
  const start = { x: at.x - ((at.x - previous.x) / inLength) * r, y: at.y - ((at.y - previous.y) / inLength) * r };
  const end = { x: at.x + ((next.x - at.x) / outLength) * r, y: at.y + ((next.y - at.y) / outLength) * r };

  return Array.from({ length: CORNER_STEPS + 1 }, (_, step) => {
    const t = step / CORNER_STEPS;
    const u = 1 - t;

    return { x: u * u * start.x + 2 * u * t * at.x + t * t * end.x, y: u * u * start.y + 2 * u * t * at.y + t * t * end.y };
  });
}

function roundCorners(corners: readonly Point2[], radius: number): Point2[] {
  const middle = corners.slice(1, -1).flatMap((at, index) => cornerCurve(corners[index]!, at, corners[index + 2]!, radius));

  return [corners[0]!, ...middle, corners.at(-1)!];
}

function orthogonalPath(from: Port, to: Port): Point2[] {
  const corners = [{ x: from.x, y: from.y }, ...orthogonalCorners(from, to), { x: to.x, y: to.y }];
  const first = corners[1]!;
  const backwards = (first.x - from.x) * from.nx + (first.y - from.y) * from.ny < -0.5;

  return backwards ? cubicPath(from, to) : roundCorners(corners, CORNER_RADIUS);
}

function flatPath(from: Port, to: Port, route: NonNullable<SceneLink["route"]>): Point2[] {
  if (route === "straight") return [{ x: from.x, y: from.y }, { x: to.x, y: to.y }];

  if (route === "orthogonal") return orthogonalPath(from, to);

  return cubicPath(from, to);
}

function withHeight(path: readonly Point2[], from: Port, to: Port): Point3[] {
  const last = path.length - 1;

  return path.map((point, index) => {
    const t = last === 0 ? 0 : index / last;
    const ease = t * t * (3 - 2 * t);

    return { x: point.x, y: point.y, z: from.z + (to.z - from.z) * ease };
  });
}

export function routeOnFloor(
  a: FloorBox,
  b: FloorBox,
  spec: Pick<SceneLink, "route" | "fromPort" | "toPort">,
): { points: Point3[]; riser: boolean } {
  const [centreA, centreB] = [centreOf(a), centreOf(b)];

  if (isOver(centreA, b) || isOver(centreB, a)) return { points: riser(a, b), riser: true };

  const from = sidePort(a, centreB, spec.fromPort);
  const to = sidePort(b, centreA, spec.toPort);

  return { points: withHeight(flatPath(from, to, spec.route ?? "curve"), from, to), riser: false };
}
