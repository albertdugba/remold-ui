/**
 * Routing for scene links. A link is laid out on the floor, in the scene's own space, and only
 * then drawn in perspective: it leaves each object from the middle of the side that faces the
 * other one, at the object's base, and meets that side at a right angle. Lines routed this way
 * read as cables laid on the ground, and they turn with the scene instead of being redrawn flat
 * on the screen.
 */
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

/** Where a link meets a box: the middle of the side facing `toward` (or the side `port` names), at its base. */
export function sidePort(b: FloorBox, toward: Point2, port?: ScenePort): Point3 & { nx: number; ny: number } {
  const cx = b.x + b.width / 2;
  const cy = b.y + b.depth / 2;
  let nx = 0;
  let ny = 0;
  if (port === "left") nx = -1;
  else if (port === "right") nx = 1;
  else if (port === "front") ny = 1;
  else if (port === "back") ny = -1;
  else {
    // Measured against the box's own size, so a long, thin box uses its long sides.
    const dx = (toward.x - cx) / Math.max(1, b.width);
    const dy = (toward.y - cy) / Math.max(1, b.depth);
    if (Math.abs(dx) >= Math.abs(dy)) nx = Math.sign(dx) || 1;
    else ny = Math.sign(dy) || 1;
  }
  return { x: cx + (nx * b.width) / 2, y: cy + (ny * b.depth) / 2, z: b.z, nx, ny };
}

/**
 * The route between two boxes, as points in scene space. Boxes one above the other get a
 * straight vertical `riser` from the top of the lower to the bottom of the upper; everything
 * else follows `spec.route` on the floor, easing up or down if the two bases are at different heights.
 */
export function routeOnFloor(
  a: FloorBox,
  b: FloorBox,
  spec: Pick<SceneLink, "route" | "fromPort" | "toPort">,
): { points: Point3[]; riser: boolean } {
  const ca = { x: a.x + a.width / 2, y: a.y + a.depth / 2 };
  const cb = { x: b.x + b.width / 2, y: b.y + b.depth / 2 };

  const over = (p: Point2, box: FloorBox) => p.x > box.x && p.x < box.x + box.width && p.y > box.y && p.y < box.y + box.depth;
  if (over(ca, b) || over(cb, a)) {
    // Straight up and down: both ends sit under the middle of the smaller box, so the line is vertical.
    const aLow = a.z <= b.z;
    const small = a.width * a.depth <= b.width * b.depth ? ca : cb;
    const fromTop = aLow ? { ...small, z: a.z + a.height } : { ...small, z: a.z };
    const toEnd = aLow ? { ...small, z: b.z } : { ...small, z: b.z + b.height };
    return { points: [fromTop, toEnd], riser: true };
  }

  const pa = sidePort(a, cb, spec.fromPort);
  const pb = sidePort(b, ca, spec.toPort);
  const route = spec.route ?? "curve";
  const flat: Point2[] = [];
  const distance = Math.hypot(pb.x - pa.x, pb.y - pa.y);

  const cubic = () => {
    const k = Math.min(160, Math.max(18, distance * 0.42));
    const c1 = { x: pa.x + pa.nx * k, y: pa.y + pa.ny * k };
    const c2 = { x: pb.x + pb.nx * k, y: pb.y + pb.ny * k };
    for (let i = 0; i <= 28; i++) {
      const t = i / 28;
      const u = 1 - t;
      flat.push({
        x: u * u * u * pa.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * pb.x,
        y: u * u * u * pa.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * pb.y,
      });
    }
  };

  if (route === "straight") {
    flat.push({ x: pa.x, y: pa.y }, { x: pb.x, y: pb.y });
  } else if (route === "orthogonal") {
    // Runs along the floor's axes: out of A's side, across, and into B's side.
    const corners: Point2[] = [{ x: pa.x, y: pa.y }];
    const aAlongX = pa.nx !== 0;
    const bAlongX = pb.nx !== 0;
    if (aAlongX !== bAlongX) {
      corners.push(aAlongX ? { x: pb.x, y: pa.y } : { x: pa.x, y: pb.y });
    } else if (aAlongX) {
      const mid = (pa.x + pb.x) / 2;
      corners.push({ x: mid, y: pa.y }, { x: mid, y: pb.y });
    } else {
      const mid = (pa.y + pb.y) / 2;
      corners.push({ x: pa.x, y: mid }, { x: pb.x, y: mid });
    }
    corners.push({ x: pb.x, y: pb.y });
    // A route that would double back into A gets a curve instead.
    const first = corners[1]!;
    if ((first.x - pa.x) * pa.nx + (first.y - pa.y) * pa.ny < -0.5) cubic();
    else roundCorners(corners, 18, flat);
  } else {
    cubic();
  }

  const n = flat.length - 1;
  const points = flat.map((p, i) => {
    const t = n === 0 ? 0 : i / n;
    const ease = t * t * (3 - 2 * t);
    return { x: p.x, y: p.y, z: pa.z + (pb.z - pa.z) * ease };
  });
  return { points, riser: false };
}

/** A polyline with each corner replaced by a short quadratic bend of `radius`, sampled into `out`. */
function roundCorners(corners: Point2[], radius: number, out: Point2[]): void {
  out.push(corners[0]!);
  for (let i = 1; i < corners.length - 1; i++) {
    const prev = corners[i - 1]!;
    const at = corners[i]!;
    const next = corners[i + 1]!;
    const inLength = Math.hypot(at.x - prev.x, at.y - prev.y);
    const outLength = Math.hypot(next.x - at.x, next.y - at.y);
    if (inLength < 0.5 || outLength < 0.5) continue;
    const r = Math.min(radius, inLength / 2, outLength / 2);
    const start = { x: at.x - ((at.x - prev.x) / inLength) * r, y: at.y - ((at.y - prev.y) / inLength) * r };
    const end = { x: at.x + ((next.x - at.x) / outLength) * r, y: at.y + ((next.y - at.y) / outLength) * r };
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      const u = 1 - t;
      out.push({ x: u * u * start.x + 2 * u * t * at.x + t * t * end.x, y: u * u * start.y + 2 * u * t * at.y + t * t * end.y });
    }
  }
  out.push(corners[corners.length - 1]!);
}
