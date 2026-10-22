/**
 * The camera: how a flat world with height is drawn on a flat screen.
 *
 * The world is a floor (x to the right, y towards you) with z pointing up. The camera turns the
 * floor around its vertical axis (`yaw`) and tilts it away from you (`pitch`): pitch 0 looks
 * straight down, like a diagram; pitch 60 with yaw 45 is the classic isometric toy-on-a-table.
 */

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
  /**
   * The transform that draws onto the floor raised to height `z`: draw in world units and the
   * shapes come out lying flat in the scene. Multiply by the pixel ratio before using it.
   */
  plane(z: number): Matrix;
  /** How far "into" the screen a floor point is; larger is nearer. For painting order. */
  depth(x: number, y: number): number;
  /** cos and sin of yaw and pitch, for looks that need them. */
  readonly cosYaw: number;
  readonly sinYaw: number;
  readonly cosPitch: number;
  readonly sinPitch: number;
}

const RADIANS = Math.PI / 180;

/** The scene's origin sits a little below the middle, leaving room for things that stand up. */
const ORIGIN_Y = 0.54;

export function projector(camera: Camera, viewport: Viewport): Projector {
  const cosYaw = Math.cos(camera.yaw * RADIANS);
  const sinYaw = Math.sin(camera.yaw * RADIANS);
  const cosPitch = Math.cos(camera.pitch * RADIANS);
  const sinPitch = Math.sin(camera.pitch * RADIANS);
  const scale = (Math.min(viewport.width, viewport.height) / WORLD_UNIT) * camera.zoom;
  const ox = viewport.width / 2;
  const oy = viewport.height * ORIGIN_Y;
  const cx = camera.centerX;
  const cy = camera.centerY;

  return {
    scale,
    cosYaw,
    sinYaw,
    cosPitch,
    sinPitch,
    project(x, y, z = 0) {
      const dx = x - cx;
      const dy = y - cy;
      return {
        x: ox + scale * (cosYaw * dx - sinYaw * dy),
        y: oy + scale * (cosPitch * (sinYaw * dx + cosYaw * dy) - sinPitch * z),
      };
    },
    plane(z) {
      return [
        scale * cosYaw,
        scale * sinYaw * cosPitch,
        -scale * sinYaw,
        scale * cosYaw * cosPitch,
        ox - scale * (cosYaw * cx - sinYaw * cy),
        oy - scale * (cosPitch * (sinYaw * cx + cosYaw * cy) + z * sinPitch),
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

/**
 * A top-down camera that fits `boxes` into the viewport with some room around them.
 * Used for layouts that should read as a flat diagram at any canvas size.
 */
export function fitCamera(boxes: readonly FloorBox[], viewport: Viewport, padding = 0.1): Camera {
  if (boxes.length === 0) return flat();
  const x0 = Math.min(...boxes.map((b) => b.x));
  const y0 = Math.min(...boxes.map((b) => b.y));
  const x1 = Math.max(...boxes.map((b) => b.x + b.width));
  const y1 = Math.max(...boxes.map((b) => b.y + b.depth));
  const base = Math.min(viewport.width, viewport.height) / WORLD_UNIT;
  const room = 1 - 2 * padding;
  const zoom = Math.min((viewport.width * room) / Math.max(1, x1 - x0), (viewport.height * room) / Math.max(1, y1 - y0)) / base;
  // The origin sits below the middle (ORIGIN_Y), so shift the centre to keep the fit balanced.
  const shift = ((ORIGIN_Y - 0.5) * viewport.height) / (base * zoom);
  return flat({ zoom, centerX: (x0 + x1) / 2, centerY: (y0 + y1) / 2 + shift });
}
