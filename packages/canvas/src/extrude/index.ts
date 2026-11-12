import type { Projector } from "../camera";
import { projectOutline, type Box3, type Outline, type ScreenPoint } from "../geometry";
import { halo } from "../glow";
import type { DrawContext, DrawState, Look, Palette } from "../object-looks";
import { css, lit, parseColor, shade, type Rgb } from "./color";
import { paintDecal, type ExtrudeDecal } from "./decal";
import { insetRing, shapeRings, unitPath, unitRings, type ExtrudeShape, type Rings } from "./rings";
import { fillQuad, lerp, paintSheen, paintWalls, strokeLines, trace, type WallStyle } from "./strokes";
import { inkLines, walls, type Line, type Wall } from "./walls";

export { parseColor } from "./color";
export { callout, caption, type CalloutOptions } from "./labels";
export { outlineArea, shapeRings, unitPath, type ExtrudeShape } from "./rings";
export { inkLines, walls, type Wall } from "./walls";
export type { ExtrudeDecal } from "./decal";

export interface ExtrudeOptions {
  shape?: ExtrudeShape;
  radius?: number;
  height?: number;
  sides?: "gradient" | "sheen" | "flat";
  edge?: boolean;
  well?: { inset?: number; depth?: number };
  decal?: ExtrudeDecal;
  top?: string;
  background?: boolean;
  passive?: boolean;
  ink?: boolean | string;
  inkWidth?: number;
  glass?: boolean;
  fillColor?: string;
  shadow?: boolean;
}

interface Paint {
  ctx: CanvasRenderingContext2D;
  view: Projector;
  box: Box3;
  palette: Palette;
  glow: number;
  rings: Rings;
  z0: number;
  z1: number;
  zf: number;
  seed: string;
  ink: Rgb | null;
  inked: boolean;
  inkWidth: number;
  level: number;
  contents: Rgb;
  ghost: number;
  solid: number;
  baseAlpha: number;
  upright: boolean;
  style: WallStyle;
  options: ExtrudeOptions;
}

const DEFAULT_RADIUS = 0.14;
const DEFAULT_HEIGHT = 16;
const DEFAULT_INK_WIDTH = 1.25;
const SHADOW = "15, 15, 30";
const LEVEL_EPSILON = 0.002;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const solidStyle = (style: WallStyle): WallStyle => (style === "sheen" ? "gradient" : style);

const outerWalls = (paint: Paint) => walls({ outline: paint.rings.outer, z0: paint.z0, z1: paint.z1, view: paint.view });

const outerInk = (paint: Paint, inward = false) => inkLines({ outline: paint.rings.outer, z0: paint.z0, z1: paint.z1, view: paint.view, inward });

function inkStyle({ ctx, ink, inkWidth }: Paint, alpha = 1): void {
  ctx.strokeStyle = css(ink!, alpha);
  ctx.lineWidth = inkWidth;
}

function topPath({ ctx, rings, z1, view }: Paint, holes: readonly Outline[]): void {
  ctx.beginPath();
  trace(ctx, projectOutline(rings.outer, z1, view));

  for (const hole of holes) trace(ctx, projectOutline(hole, z1, view));
}

function paintLevel({ ctx, level, contents }: Paint, wallList: readonly Wall[]) {
  for (const wall of wallList) {
    const [a0, b0, b1, a1] = wall.quad;

    fillQuad(ctx, [a0, b0, lerp(b0, b1, level), lerp(a0, a1, level)], lit(contents, wall.light * 0.9 + 0.1));
  }
}

function paintShadow(paint: Paint) {
  const { ctx, rings, z0, view, baseAlpha, solid } = paint;

  ctx.save();
  ctx.translate(0, 7);
  ctx.beginPath();
  trace(ctx, projectOutline(rings.outer, z0, view));
  ctx.globalAlpha = baseAlpha * solid;
  ctx.fillStyle = "rgba(15, 15, 30, 0.06)";
  ctx.fill();
  halo({ context: ctx, color: SHADOW, alpha: 0.07, radius: 13, core: 0, steps: 7 });
  ctx.restore();
}

function drawFront(paint: Paint): void {
  const { ctx, palette, style, seed, baseAlpha, solid, level, ink, ghost } = paint;

  if (!paint.upright) return;

  const outer = outerWalls(paint);

  ctx.globalAlpha = baseAlpha * solid;
  paintWalls(ctx, outer, palette, solidStyle(style), seed);

  if (level > LEVEL_EPSILON) paintLevel(paint, outer);

  if (style === "sheen") paintSheen(ctx, outer, seed);

  ctx.globalAlpha = baseAlpha;

  if (!ink) return;

  inkStyle(paint, 1 - 0.5 * ghost);
  strokeLines(ctx, outerInk(paint));
  strokeLines(ctx, outer.map((wall): Line => [wall.quad[3], wall.quad[2]]));
}

function solidWalls(paint: Paint) {
  const { ctx, palette, style, seed, baseAlpha, solid, inked, glow, level, rings, zf, z1, view } = paint;
  const outer = outerWalls(paint);

  ctx.save();
  ctx.globalAlpha = baseAlpha * solid;

  if (!inked) {
    ctx.beginPath();

    for (const wall of outer) trace(ctx, wall.quad);

    halo({ context: ctx, color: palette.glow, alpha: 0.6 * (0.18 + 0.4 * glow), radius: 18 * (0.5 + glow) });
  }

  paintWalls(ctx, outer, palette, solidStyle(style), seed);
  ctx.restore();

  if (level <= LEVEL_EPSILON) return;

  ctx.globalAlpha = baseAlpha * solid;
  paintLevel(paint, outer);
  ctx.globalAlpha = baseAlpha;

  if (inked && level < 1 - LEVEL_EPSILON) {
    inkStyle(paint, 0.55);
    strokeLines(ctx, inkLines({ outline: rings.outer, z0: zf, z1, view, inward: false, uprights: false }));
  }
}

function solidSheen(paint: Paint) {
  const { ctx, baseAlpha, solid, seed } = paint;

  ctx.save();
  ctx.globalAlpha = baseAlpha * solid;
  paintSheen(ctx, outerWalls(paint), seed);
  ctx.restore();
}

function glowingEdge(paint: Paint) {
  const { ctx, palette, glow, inkWidth } = paint;

  ctx.save();
  halo({ context: ctx, color: palette.glow, alpha: 0.3 * glow, radius: 7 * glow, core: inkWidth + 0.5, steps: 8 });
  ctx.strokeStyle = `rgba(${palette.glow}, ${0.9 * glow})`;
  ctx.lineWidth = inkWidth + 0.5;
  ctx.stroke();
  ctx.restore();
}

function inkedTopEdge(paint: Paint, holes: readonly Outline[]) {
  const { ctx, ghost, upright, glow } = paint;

  if (ghost > 0.01 && upright) {
    inkStyle(paint, 0.3 * ghost);
    strokeLines(ctx, outerInk(paint, true));
    topPath(paint, holes);
  }

  inkStyle(paint, 1 - 0.5 * ghost);
  ctx.stroke();

  if (glow > 0.01) glowingEdge(paint);
}

function plainTopEdge(paint: Paint) {
  const { ctx, palette, glow, options } = paint;

  if (options.edge || glow > 0.01) {
    ctx.save();
    halo({ context: ctx, color: palette.glow, alpha: 0.6 * (0.5 + 0.4 * glow), radius: 8 * (0.5 + glow), core: 1.2 });
    ctx.strokeStyle = `rgba(${palette.line}, ${options.edge ? 0.75 + 0.25 * glow : 0.45 * glow})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.strokeStyle = `rgba(${palette.line}, 0.28)`;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function paintHole(paint: Paint, hole: Outline, opening: Outline | null) {
  const { ctx, view, z0, z1, box, palette, style, seed, inked, options } = paint;
  const isWell = hole === opening;
  const floor = isWell ? z1 - box.height * Math.min(0.95, options.well?.depth ?? 0.7) : z0;

  ctx.save();
  ctx.beginPath();
  trace(ctx, projectOutline(hole, z1, view));
  ctx.clip();

  if (isWell) {
    ctx.beginPath();
    trace(ctx, projectOutline(hole, floor, view));
    ctx.fillStyle = shade(palette, -0.6);
    ctx.fill();
  }

  paintWalls(ctx, walls({ outline: hole, z0: floor, z1, view, inward: true }), palette, style, `${seed}:in`);

  if (inked) {
    inkStyle(paint, 0.7);
    strokeLines(ctx, inkLines({ outline: hole, z0: floor, z1, view, inward: true }));
  }

  ctx.restore();
}

function drawSolid(paint: Paint): void {
  const { ctx, upright, style, options, rings, box, palette, baseAlpha, solid, inked, ghost } = paint;

  if (upright) solidWalls(paint);

  if (upright && style === "sheen") solidSheen(paint);

  const opening = options.well ? insetRing(rings.outer, box, options.well.inset ?? 0.1) : null;
  const holes = [...rings.holes, ...(opening ? [opening] : [])];

  topPath(paint, holes);
  ctx.fillStyle = options.top ?? palette.top;
  ctx.globalAlpha = baseAlpha * solid;
  ctx.fill("evenodd");
  ctx.globalAlpha = baseAlpha;

  if (inked) inkedTopEdge(paint, holes);
  else plainTopEdge(paint);

  for (const hole of holes) paintHole(paint, hole, opening);

  if (inked && upright) {
    inkStyle(paint, 1 - 0.5 * ghost);
    strokeLines(ctx, outerInk(paint));
  }
}

function glassBack(paint: Paint, back: Rgb) {
  const { ctx, rings, z0, view, ink } = paint;

  ctx.beginPath();
  trace(ctx, projectOutline(rings.outer, z0, view));
  ctx.fillStyle = css(back, 0.03);
  ctx.fill();

  for (const wall of walls({ outline: rings.outer, z0, z1: paint.z1, view, inward: true })) {
    ctx.beginPath();
    trace(ctx, wall.quad);
    ctx.fillStyle = css(back, 0.025);
    ctx.fill();
  }

  if (ink) {
    inkStyle(paint, 0.2);
    strokeLines(ctx, outerInk(paint, true));
  }
}

function glassContents(paint: Paint) {
  const { ctx, rings, box, z0, zf, view, contents } = paint;
  const inner = insetRing(rings.outer, box, 0.04);
  const bottom = z0 + Math.min(1.5, box.height * 0.02);

  for (const wall of walls({ outline: inner, z0: bottom, z1: zf, view })) fillQuad(ctx, wall.quad, lit(contents, wall.light * 0.8));

  ctx.beginPath();
  trace(ctx, projectOutline(inner, zf, view));
  ctx.fillStyle = lit(contents, 0.55);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function glassFront(paint: Paint) {
  const { ctx } = paint;

  for (const wall of outerWalls(paint)) {
    ctx.beginPath();
    trace(ctx, wall.quad);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.16 + 0.1 * Math.max(0, wall.light)})`;
    ctx.fill();
  }
}

function glassTop(paint: Paint) {
  const { ctx, rings, ink, glow, palette, upright } = paint;

  topPath(paint, rings.holes);
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.fill("evenodd");

  if (ink) {
    inkStyle(paint, glow > 0.01 ? 1 : 0.85);
  } else {
    ctx.strokeStyle = `rgba(${palette.line}, ${0.4 + 0.5 * glow})`;
    ctx.lineWidth = 1;
  }

  ctx.stroke();

  if (upright) strokeLines(ctx, outerInk(paint));
}

function drawGlass(paint: Paint): void {
  const { upright, level, palette } = paint;

  if (upright) glassBack(paint, parseColor(palette.line));

  if (level > LEVEL_EPSILON && upright) glassContents(paint);

  if (upright) glassFront(paint);

  glassTop(paint);
}

function paintFor(context: DrawContext, state: DrawState, options: ExtrudeOptions, shape: ExtrudeShape, radius: number): Paint {
  const { ctx, view } = context;
  const { box, palette, glow } = state;
  const inked = options.ink !== undefined && options.ink !== false;
  const level = clamp01(state.fill ?? 0);
  const ghost = clamp01(state.ghost ?? 0);

  return {
    ctx,
    view,
    box,
    palette,
    glow,
    rings: state.shape ? shapeRings({ path: state.shape }, box, radius) : shapeRings(shape, box, radius),
    z0: box.z,
    z1: box.z + box.height,
    zf: box.z + box.height * level,
    seed: `${state.label}:${box.width.toFixed(0)}:${box.depth.toFixed(0)}`,
    ink: inked ? parseColor(typeof options.ink === "string" ? options.ink : palette.line) : null,
    inked,
    inkWidth: options.inkWidth ?? DEFAULT_INK_WIDTH,
    level,
    contents: parseColor(state.color ?? options.fillColor ?? palette.glow),
    ghost,
    solid: 1 - ghost,
    baseAlpha: ctx.globalAlpha,
    upright: box.height > 0.5 && view.sinPitch > 0.02,
    style: options.sides ?? "gradient",
    options,
  };
}

function paintBody(paint: Paint, pixelRatio: number, front: boolean) {
  const { ctx, options, inked, upright } = paint;

  ctx.save();
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (!front && (options.shadow ?? inked) && upright) paintShadow(paint);

  if (front) drawFront(paint);
  else if (options.glass) drawGlass(paint);
  else drawSolid(paint);

  ctx.restore();
}

function paintLabel(context: DrawContext, state: DrawState, paint: Paint) {
  const { ctx, baseAlpha, solid, ghost, z1, options } = paint;

  ctx.save();
  ctx.globalAlpha = baseAlpha * Math.max(solid, 0.7 * ghost);
  paintDecal(context, state, options.decal ?? {}, z1);
  ctx.restore();
}

export function extrude(options: ExtrudeOptions = {}): Look {
  const shape = options.shape ?? "rect";
  const radius = options.radius ?? DEFAULT_RADIUS;

  if (typeof shape === "object") unitRings(shape.path);

  const paint = (context: DrawContext, state: DrawState, front: boolean) => {
    const prepared = paintFor(context, state, options, shape, radius);

    paintBody(prepared, context.pixelRatio, front);

    if (!front && (options.decal !== undefined || state.label)) paintLabel(context, state, prepared);
  };

  return {
    defaultHeight: options.height ?? DEFAULT_HEIGHT,
    background: options.background,
    passive: options.passive,
    path: unitPath(shape, radius),
    outline: (box) => shapeRings(shape, box, radius).outer,
    draw: (context, state) => paint(context, state, false),
    drawFront: options.well ? (context, state) => paint(context, state, true) : undefined,
  };
}

export type { ScreenPoint };
