import { CLOUD_STRIDE, type AnimatedValue, type PointCloud } from "@remold-ui/core";
import type { CanvasSize } from "../canvas-size";
import { createAsciiAtlases, drawAscii, type AsciiConfiguration, type LocatePoint } from "./ascii";
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
  ascii,
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
  shape: "circle" | "square" | "ascii";
  ascii: AsciiConfiguration | null;
  blend: "normal" | "add";
  project: ((x: number, y: number, z: number) => { x: number; y: number; scale: number }) | null;
  pointerEffect: { radius: number; strength: number } | null;
  reducedMotion: () => boolean;
  isDestroyed: () => boolean;
}): { render: () => void; resetFill: () => void; text: () => string } {
  let fill: ParticleFill | null = null;
  let shownText: () => string = () => "";
  const atlases = ascii ? createAsciiAtlases(ascii) : null;

  const resolveFill = (drawingContext: CanvasRenderingContext2D) => {
    const resolved = typeof color === "function" ? color(drawingContext, getSize()) : color;

    if (resolved !== undefined && resolved !== "currentColor") return resolved;

    return (typeof getComputedStyle === "function" ? getComputedStyle(canvas).color : "") || "#000";
  };

  const singleFill = (drawingContext: CanvasRenderingContext2D, palette: readonly string[] | undefined) => {
    if (palette) return palette[0]!;

    fill ??= resolveFill(drawingContext);

    return fill;
  };

  const render = () => {
    if (!context || isDestroyed()) return;

    const size = getSize();
    const locate = createLocator({ cloud, pointer, project, pointerEffect, reducedMotion });
    const palette = getPalette();

    context.setTransform(size.pixelRatio, 0, 0, size.pixelRatio, 0, 0);
    context.clearRect(0, 0, size.width, size.height);
    context.globalCompositeOperation = blend === "add" ? "lighter" : "source-over";

    if (ascii && atlases) {
      const tone = (index: number) => cloud.data[index * CLOUD_STRIDE + 3]!;
      const solid = !palette || palette.length === 1 ? singleFill(context, palette) : null;
      const fillOf = (index: number): ParticleFill => solid ?? palette![paletteIndex(tone(index), palette!.length)]!;

      shownText = drawAscii({ context, configuration: ascii, atlases, size, count: cloud.length, locate, tone, fillOf });
      context.globalCompositeOperation = "source-over";
      return;
    }

    const drawParticle = createParticleDrawer({ context, locate, radius, shape });

    if (!palette || palette.length === 1) drawSolid(context, singleFill(context, palette), cloud.length, drawParticle);
    else drawPalette({ context, cloud, palette, drawParticle });

    context.globalCompositeOperation = "source-over";
  };

  return {
    render,
    text: () => shownText(),
    resetFill: () => {
      fill = null;
      atlases?.clear();
    },
  };
}

function createLocator({
  cloud,
  pointer,
  project,
  pointerEffect,
  reducedMotion,
}: {
  cloud: PointCloud;
  pointer: ParticlePointer;
  project: ((x: number, y: number, z: number) => { x: number; y: number; scale: number }) | null;
  pointerEffect: { radius: number; strength: number } | null;
  reducedMotion: () => boolean;
}): LocatePoint {
  const leaning = pointerEffect !== null && !reducedMotion() && pointer.presence.current > 0.01;
  const strength = (pointerEffect?.strength ?? 0) * pointer.presence.current;
  const reach = pointerEffect?.radius ?? 0;

  return (index) => {
    const offset = index * CLOUD_STRIDE;
    const scale = cloud.data[offset + 2]!;

    if (scale < 0.02) return null;

    const seen = project ? project(cloud.data[offset]!, cloud.data[offset + 1]!, cloud.data[offset + 4]!) : null;
    const point = leanPoint({
      x: seen ? seen.x : cloud.data[offset]!,
      y: seen ? seen.y : cloud.data[offset + 1]!,
      pointer,
      leaning,
      reach,
      strength,
    });

    return { x: point.x, y: point.y, scale: scale * (seen ? seen.scale : 1) };
  };
}

function createParticleDrawer({
  context,
  locate,
  radius,
  shape,
}: {
  context: CanvasRenderingContext2D;
  locate: LocatePoint;
  radius: AnimatedValue;
  shape: "circle" | "square" | "ascii";
}) {
  return (index: number) => {
    const point = locate(index);

    if (!point) return;

    const particleRadius = radius.current * point.scale;

    if (shape === "square") {
      context.rect(point.x - particleRadius, point.y - particleRadius, particleRadius * 2, particleRadius * 2);
      return;
    }

    context.moveTo(point.x + particleRadius, point.y);
    context.arc(point.x, point.y, particleRadius, 0, Math.PI * 2);
  };
}

const paletteIndex = (tone: number, count: number) => Math.min(count - 1, Math.max(0, Math.round(tone * (count - 1))));

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

function drawSolid(context: CanvasRenderingContext2D, fill: ParticleFill, count: number, drawParticle: (index: number) => void): void {
  context.fillStyle = fill;
  context.beginPath();

  for (let index = 0; index < count; index++) drawParticle(index);

  context.fill();
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
    const colorIndex = paletteIndex(cloud.data[index * CLOUD_STRIDE + 3]!, palette.length);

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
