import type { Matrix } from "../camera";
import { extent, type ScreenPoint } from "../geometry";
import type { Palette } from "../object-looks";
import { shade } from "./color";
import type { Line, Wall } from "./walls";

export type WallStyle = "gradient" | "sheen" | "flat" | undefined;

const SHEEN_STREAKS = 7;
const CLEAR = "rgba(255, 255, 255, 0)";

export const scaled = (matrix: Matrix, factor: number): Matrix => [
  matrix[0] * factor,
  matrix[1] * factor,
  matrix[2] * factor,
  matrix[3] * factor,
  matrix[4] * factor,
  matrix[5] * factor,
];

export const lerp = (p: ScreenPoint, q: ScreenPoint, amount: number): ScreenPoint => ({
  x: p.x + (q.x - p.x) * amount,
  y: p.y + (q.y - p.y) * amount,
});

export function trace(ctx: CanvasRenderingContext2D, points: readonly ScreenPoint[]): void {
  for (const [index, point] of points.entries()) {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }

  ctx.closePath();
}

export function strokeLines(ctx: CanvasRenderingContext2D, lines: readonly Line[]): void {
  if (lines.length === 0) return;

  ctx.beginPath();

  for (const [from, to] of lines) {
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
  }

  ctx.stroke();
}

export function fillQuad(ctx: CanvasRenderingContext2D, quad: readonly ScreenPoint[], color: string) {
  ctx.beginPath();
  trace(ctx, quad);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = 0.6;
  ctx.stroke();
}

function seeded(text: string): () => number {
  let hash = 2166136261;

  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);

  return () => {
    hash = Math.imul(hash ^ (hash >>> 15), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    hash ^= hash >>> 16;

    return (hash >>> 0) / 4294967296;
  };
}

export function paintWalls(ctx: CanvasRenderingContext2D, wallList: readonly Wall[], palette: Palette, style: WallStyle, seed: string): void {
  if (wallList.length === 0) return;

  for (const wall of wallList) fillQuad(ctx, wall.quad, style === "flat" ? palette.sides[1] : shade(palette, wall.light * 0.9 + 0.1));

  if (style === "sheen") paintSheen(ctx, wallList, seed);
}

function sheenGradient(ctx: CanvasRenderingContext2D, left: number, right: number, seed: string): CanvasGradient {
  const random = seeded(seed);
  const gradient = ctx.createLinearGradient(left, 0, right, 0);

  gradient.addColorStop(0, CLEAR);

  for (let streak = 0; streak < SHEEN_STREAKS; streak++) {
    const at = 0.06 + random() * 0.88;
    const width = 0.01 + random() * 0.05;
    const strength = 0.12 + random() * 0.38;

    gradient.addColorStop(Math.max(0, at - width), CLEAR);
    gradient.addColorStop(at, `rgba(255, 255, 255, ${strength})`);
    gradient.addColorStop(Math.min(1, at + width), CLEAR);
  }

  gradient.addColorStop(1, CLEAR);

  return gradient;
}

export function paintSheen(ctx: CanvasRenderingContext2D, wallList: readonly Wall[], seed: string): void {
  if (wallList.length === 0) return;

  const { minX: left, maxX: right, minY: top } = extent(wallList.flatMap((wall) => wall.quad));

  if (right - left < 1) return;

  const gradient = sheenGradient(ctx, left, right, seed);

  ctx.save();
  ctx.beginPath();

  for (const wall of wallList) trace(ctx, wall.quad);

  ctx.clip();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = gradient;
  ctx.fillRect(left, top - 2, right - left, 4000);
  ctx.restore();
}
