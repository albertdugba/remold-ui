import { fitPoints, type CloudPoint } from "@remold-ui/core";
import type { CanvasSize } from "../canvas-size";
import type { ParticleCamera, ParticleFit } from "./types";

/** A camera in radians, checked. */
export interface Camera {
  spin: number;
  sway: number;
  angle: number;
  tilt: number;
  distance: number;
}

const RADIANS = Math.PI / 180;
const DEFAULT_CAMERA = { spin: 0.04, angle: 0, tilt: 20, distance: 4, sway: 0 };
const MIN_DISTANCE = 1.5;

function checkCamera({ spin, angle, tilt, distance, sway }: typeof DEFAULT_CAMERA) {
  if (!(sway >= 0) || !Number.isFinite(sway)) throw new RangeError(`particles: camera.sway must be 0 or more degrees, got ${sway}`);

  for (const [name, given] of [["spin", spin], ["angle", angle], ["tilt", tilt]] as const) {
    if (!Number.isFinite(given)) throw new RangeError(`particles: camera.${name} must be a finite number, got ${given}`);
  }

  if (!(distance >= MIN_DISTANCE) || !Number.isFinite(distance)) {
    throw new RangeError(`particles: camera.distance must be at least 1.5, got ${distance}`);
  }
}

export function cameraOf(camera: ParticleCamera): Camera {
  const settings = {
    spin: camera.spin ?? DEFAULT_CAMERA.spin,
    angle: camera.angle ?? DEFAULT_CAMERA.angle,
    tilt: camera.tilt ?? DEFAULT_CAMERA.tilt,
    distance: camera.distance ?? DEFAULT_CAMERA.distance,
    sway: camera.sway ?? DEFAULT_CAMERA.sway,
  };

  checkCamera(settings);

  return {
    spin: settings.spin,
    sway: settings.sway * RADIANS,
    angle: settings.angle * RADIANS,
    tilt: settings.tilt * RADIANS,
    distance: settings.distance,
  };
}

export function changedCamera(camera: Camera, next: ParticleCamera, turn: number): Camera {
  return cameraOf({
    spin: next.spin ?? camera.spin,
    angle: next.angle ?? (camera.sway > 0 ? camera.angle : turn) / RADIANS,
    sway: next.sway ?? camera.sway / RADIANS,
    tilt: next.tilt ?? camera.tilt / RADIANS,
    distance: next.distance ?? camera.distance,
  });
}

export const restingTurn = (camera: Camera, swing: number) =>
  camera.sway > 0 ? camera.angle + camera.sway * Math.sin(swing) : camera.angle;

const roomFor = (size: CanvasSize, padding: number) => Math.max(Math.min(size.width, size.height) / 2 - padding, 1);

export function project({
  x,
  y,
  z,
  camera,
  angle,
  size,
  padding,
}: {
  x: number;
  y: number;
  z: number;
  camera: Camera;
  angle: number;
  size: CanvasSize;
  padding: number;
}): { x: number; y: number; scale: number } {
  const centreX = size.width / 2;
  const centreY = size.height / 2;
  const across = x - centreX;
  const down = y - centreY;
  const turnedX = across * Math.cos(angle) + z * Math.sin(angle);
  const turnedZ = z * Math.cos(angle) - across * Math.sin(angle);
  const leanedY = down * Math.cos(camera.tilt) + turnedZ * Math.sin(camera.tilt);
  const towardYou = turnedZ * Math.cos(camera.tilt) - down * Math.sin(camera.tilt);
  const eye = camera.distance * roomFor(size, padding);
  const scale = eye / Math.max(eye - towardYou, 1);

  return { x: centreX + turnedX * scale, y: centreY + leanedY * scale, scale };
}

function centreOf(points: readonly CloudPoint[]) {
  let [minX, minY, minZ] = [Infinity, Infinity, Infinity];
  let [maxX, maxY, maxZ] = [-Infinity, -Infinity, -Infinity];

  for (const { x, y, z = 0 } of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 };
}

function fitPoints3D(points: readonly CloudPoint[], size: CanvasSize, padding: number, camera: Camera): CloudPoint[] {
  if (points.length === 0) return [];

  const centre = centreOf(points);
  const reach = points.reduce((far, { x, y, z = 0 }) => Math.max(far, Math.hypot(x - centre.x, y - centre.y, z - centre.z)), 0);
  const scale = reach > 0 ? (roomFor(size, padding) * (camera.distance - 1)) / camera.distance / reach : 1;

  return points.map((point) => ({
    ...point,
    x: size.width / 2 + (point.x - centre.x) * scale,
    y: size.height / 2 + (point.y - centre.y) * scale,
    z: ((point.z ?? 0) - centre.z) * scale,
  }));
}

export function fitPointsToCanvas({
  points,
  fit,
  padding,
  size,
  camera,
}: {
  points: readonly CloudPoint[];
  fit: ParticleFit;
  padding: number;
  size: CanvasSize;
  camera: Camera | null;
}): readonly CloudPoint[] {
  if (fit === "none") return points;

  if (camera) return fitPoints3D(points, size, padding, camera);

  return fitPoints(points, { x: 0, y: 0, width: size.width, height: size.height }, { padding, from: fit === "contain" ? undefined : fit });
}
