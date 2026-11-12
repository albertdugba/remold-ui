
/** A camera in radians, checked. */
export interface Camera {
  /** Turn around the vertical axis, in degrees. */
  yaw: number;
  /** Tilt away from straight down, in degrees (0 = top-down, 90 = edge-on). */
  pitch: number;
  /** 1 fits about `unit` world units into the smaller side of the canvas. */
  zoom: number;
  /** The world point at the centre of the view. */
  centerX: number;
  centerY: number;
}

export interface Viewport {
  width: number;
  height: number;
}

/** Isometric: the default 3D look. */
export function iso({ yaw = 45, pitch = 60, zoom = 1, centerX = 0, centerY = 0 }: Partial<Camera> = {}): Camera {
  return { yaw, pitch, zoom, centerX, centerY };
}

/** Straight down: a flat diagram. */
export function flat({ zoom = 1, centerX = 0, centerY = 0 }: Partial<Omit<Camera, "yaw" | "pitch">> = {}): Camera {
  return { yaw: 0, pitch: 0, zoom, centerX, centerY };
}

/** World units that fit across the smaller side of the canvas at zoom 1. */
export const WORLD_UNIT = 800;

/** A 2D affine transform as `CanvasRenderingContext2D.setTransform` takes it: [a, b, c, d, e, f]. */
export type Matrix = [number, number, number, number, number, number];

export interface Projector {
  /** CSS pixels per world unit. */
  scale: number;
  /** Where a world point lands on screen, in CSS pixels. */
  project(x: number, y: number, z?: number): { x: number; y: number };
  /** The transform that draws onto the floor raised to height `z`. */
  plane(z: number): Matrix;
  /** How far "into" the screen a floor point is; larger is nearer. */
  depth(x: number, y: number): number;
  /** cos and sin of yaw and pitch, for looks that need them. */
  readonly cosYaw: number;
  readonly sinYaw: number;
  readonly cosPitch: number;
  readonly sinPitch: number;
}

const RADIANS = Math.PI / 180;

const ORIGIN_Y = 0.54;

/** Projects floor coordinates to screen pixels for a camera and viewport. */
export function projector(camera: Camera, viewport: Viewport): Projector {
  const cosYaw = Math.cos(camera.yaw * RADIANS);
  const sinYaw = Math.sin(camera.yaw * RADIANS);
  const cosPitch = Math.cos(camera.pitch * RADIANS);
  const sinPitch = Math.sin(camera.pitch * RADIANS);
  const scale = (Math.min(viewport.width, viewport.height) / WORLD_UNIT) * camera.zoom;
  const originX = viewport.width / 2;
  const originY = viewport.height * ORIGIN_Y;
  const { centerX, centerY } = camera;

  return {
    scale,
    cosYaw,
    sinYaw,
    cosPitch,
    sinPitch,
    project(x, y, z = 0) {
      const dx = x - centerX;
      const dy = y - centerY;

      return {
        x: originX + scale * (cosYaw * dx - sinYaw * dy),
        y: originY + scale * (cosPitch * (sinYaw * dx + cosYaw * dy) - sinPitch * z),
      };
    },

    plane(z) {
      return [
        scale * cosYaw,
        scale * sinYaw * cosPitch,
        -scale * sinYaw,
        scale * cosYaw * cosPitch,
        originX - scale * (cosYaw * centerX - sinYaw * centerY),
        originY - scale * (cosPitch * (sinYaw * centerX + cosYaw * centerY) + z * sinPitch),
      ];
    },

    depth(x, y) {
      return sinYaw * x + cosYaw * y;
    },
  };
}

export interface FloorBox {
  x: number;
  y: number;
  width: number;
  depth: number;
}

/** A top-down camera that fits `boxes` into the viewport with some room around them. */
export function fitCamera(boxes: readonly FloorBox[], viewport: Viewport, padding = 0.1): Camera {
  if (boxes.length === 0) return flat();

  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.depth));
  const base = Math.min(viewport.width, viewport.height) / WORLD_UNIT;
  const room = 1 - 2 * padding;
  const fitWidth = (viewport.width * room) / Math.max(1, right - left);
  const fitHeight = (viewport.height * room) / Math.max(1, bottom - top);
  const zoom = Math.min(fitWidth, fitHeight) / base;
  const shift = ((ORIGIN_Y - 0.5) * viewport.height) / (base * zoom);

  return flat({ zoom, centerX: (left + right) / 2, centerY: (top + bottom) / 2 + shift });
}
