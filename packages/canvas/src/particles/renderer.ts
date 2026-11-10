import { CLOUD_STRIDE, type AnimatedValue, type PointCloud } from "@remold-ui/core";
import type { CanvasSize } from "../canvas-size";
import type { ParticlePointer } from "./pointer";
import type { ParticleFill } from "./types";

export function createParticleRenderer({
  canvas,
  context,
  cloud,
  radius,
  pointer,
  getSize,
  color,
  getPalette,
  shape,
  blend,
  project,
  pointerEffect,
  reducedMotion,
  isDestroyed,
}: {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D | null;
  cloud: PointCloud;
  radius: AnimatedValue;
  pointer: ParticlePointer;
  getSize: () => CanvasSize;
  color: ParticleFill | ((context: CanvasRenderingContext2D, size: CanvasSize) => ParticleFill) | undefined;
  getPalette: () => readonly string[] | undefined;
  shape: "circle" | "square";
  blend: "normal" | "add";
  /** Where a point lands on screen and how big it draws there, for a 3D camera; null draws points where they are. */
  project: ((x: number, y: number, z: number) => { x: number; y: number; scale: number }) | null;
  pointerEffect: { radius: number; strength: number } | null;
  reducedMotion: () => boolean;
  isDestroyed: () => boolean;
}): { render: () => void; resetFill: () => void } {
  let fill: ParticleFill | null = null;
  const resolveFill = (drawingContext: CanvasRenderingContext2D) => {
    const resolved = typeof color === "function" ? color(drawingContext, getSize()) : color;

    if (resolved !== undefined && resolved !== "currentColor") return resolved;

    return (typeof getComputedStyle === "function" ? getComputedStyle(canvas).color : "") || "#000";
  };
  const render = () => {
    if (!context || isDestroyed()) return;

    const size = getSize();

    context.setTransform(size.pixelRatio, 0, 0, size.pixelRatio, 0, 0);
    context.clearRect(0, 0, size.width, size.height);
    context.globalCompositeOperation = blend === "add" ? "lighter" : "source-over";
    const drawParticle = createParticleDrawer({ context, cloud, radius, pointer, shape, project, pointerEffect, reducedMotion });
    const palette = getPalette();

    if (!palette || palette.length === 1) {
      if (palette) {
        context.fillStyle = palette[0]!;
      } else {
        if (fill === null) fill = resolveFill(context);
        context.fillStyle = fill;
      }
      context.beginPath();
      drawAll({ count: cloud.length, drawParticle });
      context.fill();
    } else {
      drawPalette({ context, cloud, palette, drawParticle });
    }
    context.globalCompositeOperation = "source-over";
  };
  return { render, resetFill: () => (fill = null) };
}

function createParticleDrawer({
  context,
  cloud,
  radius,
  pointer,
  shape,
  project,
  pointerEffect,
  reducedMotion,
}: {
  context: CanvasRenderingContext2D;
  cloud: PointCloud;
  radius: AnimatedValue;
  pointer: ParticlePointer;
  shape: "circle" | "square";
  project: ((x: number, y: number, z: number) => { x: number; y: number; scale: number }) | null;
  pointerEffect: { radius: number; strength: number } | null;
  reducedMotion: () => boolean;
}) {
  const leaning = pointerEffect !== null && !reducedMotion() && pointer.presence.current > 0.01;
  const strength = (pointerEffect?.strength ?? 0) * pointer.presence.current;
  const reach = pointerEffect?.radius ?? 0;

  return (index: number) => {
    const offset = index * CLOUD_STRIDE;
    const scale = cloud.data[offset + 2]!;

    if (scale < 0.02) return;

    const seen = project ? project(cloud.data[offset]!, cloud.data[offset + 1]!, cloud.data[offset + 4]!) : null;
    const point = leanPoint({
      x: seen ? seen.x : cloud.data[offset]!,
      y: seen ? seen.y : cloud.data[offset + 1]!,
      pointer,
      leaning,
      reach,
      strength,
    });
    const particleRadius = radius.current * scale * (seen ? seen.scale : 1);

    if (shape === "square") context.rect(point.x - particleRadius, point.y - particleRadius, particleRadius * 2, particleRadius * 2);
    else {
      context.moveTo(point.x + particleRadius, point.y);
      context.arc(point.x, point.y, particleRadius, 0, Math.PI * 2);
    }
  };
}

function leanPoint({
  x,
  y,
  pointer,
  leaning,
  reach,
  strength,
}: {
  x: number;
  y: number;
  pointer: ParticlePointer;
  leaning: boolean;
  reach: number;
  strength: number;
}) {
  if (!leaning) return { x, y };

  const deltaX = x - pointer.x.current;
  const deltaY = y - pointer.y.current;
  const distance = Math.hypot(deltaX, deltaY);

  if (distance >= reach || distance <= 0.01) return { x, y };

  const lean = (1 - distance / reach) ** 2 * strength;

  return { x: x + (deltaX / distance) * lean, y: y + (deltaY / distance) * lean };
}

function drawAll({ count, drawParticle }: { count: number; drawParticle: (index: number) => void }): void {
  for (let index = 0; index < count; index++) drawParticle(index);
}

function drawPalette({
  context,
  cloud,
  palette,
  drawParticle,
}: {
  context: CanvasRenderingContext2D;
  cloud: PointCloud;
  palette: readonly string[];
  drawParticle: (index: number) => void;
}): void {
  const lastColor = palette.length - 1;
  const buckets = Array.from({ length: palette.length }, (): number[] => []);

  for (let index = 0; index < cloud.length; index++) {
    const colorIndex = Math.min(lastColor, Math.max(0, Math.round(cloud.data[index * CLOUD_STRIDE + 3]! * lastColor)));

    buckets[colorIndex]!.push(index);
  }
  for (let colorIndex = 0; colorIndex <= lastColor; colorIndex++) {
    if (buckets[colorIndex]!.length === 0) continue;

    context.fillStyle = palette[colorIndex]!;
    context.beginPath();
    for (const pointIndex of buckets[colorIndex]!) drawParticle(pointIndex);
    context.fill();
  }
}
