import type { Projector } from "../camera";
import type { Point3 } from "../links";
import type { Palette } from "../object-looks";
import type { SceneLink } from "./types";

interface Point2 {
  x: number;
  y: number;
}

interface Path {
  screen: Point2[];
  lengths: number[];
  total: number;
}

export interface LinkPaint {
  spec: SceneLink;
  points: readonly Point3[];
  alpha: number;
  index: number;
  time: number;
  flowing: boolean;
}

const ARROW_LENGTH = 7;
const ARROW_SPREAD = 0.45;
const FLOW_DOTS = 2;
const FULL_TURN = Math.PI * 2;

function pathOf(points: readonly Point3[], view: Projector): Path {
  const screen = points.map((point) => view.project(point.x, point.y, point.z));
  const lengths = [0];

  for (let index = 1; index < screen.length; index++) {
    lengths.push(lengths[index - 1]! + Math.hypot(screen[index]!.x - screen[index - 1]!.x, screen[index]!.y - screen[index - 1]!.y));
  }

  return { screen, lengths, total: lengths.at(-1)! };
}

function pointAlong({ screen, lengths, total }: Path, t: number): Point2 & { angle: number } {
  const want = t * total;
  let index = 1;

  while (index < lengths.length - 1 && lengths[index]! < want) index++;

  const from = screen[index - 1]!;
  const to = screen[index]!;
  const span = lengths[index]! - lengths[index - 1]! || 1;
  const amount = (want - lengths[index - 1]!) / span;

  return { x: from.x + (to.x - from.x) * amount, y: from.y + (to.y - from.y) * amount, angle: Math.atan2(to.y - from.y, to.x - from.x) };
}

function strokePath(ctx: CanvasRenderingContext2D, { screen }: Path, palette: Palette, alpha: number, dashed: boolean | undefined) {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = `rgba(${palette.line}, ${0.55 * alpha})`;
  ctx.lineWidth = 1.25;
  ctx.setLineDash(dashed ? [4, 5] : []);
  ctx.beginPath();
  ctx.moveTo(screen[0]!.x, screen[0]!.y);

  for (let index = 1; index < screen.length; index++) ctx.lineTo(screen[index]!.x, screen[index]!.y);

  ctx.stroke();
  ctx.setLineDash([]);
}

function arrowHead(ctx: CanvasRenderingContext2D, point: Point2, angle: number) {
  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
  ctx.lineTo(point.x - Math.cos(angle - ARROW_SPREAD) * ARROW_LENGTH, point.y - Math.sin(angle - ARROW_SPREAD) * ARROW_LENGTH);
  ctx.lineTo(point.x - Math.cos(angle + ARROW_SPREAD) * ARROW_LENGTH, point.y - Math.sin(angle + ARROW_SPREAD) * ARROW_LENGTH);
  ctx.closePath();
  ctx.fill();
}

function arrows(ctx: CanvasRenderingContext2D, path: Path, arrow: SceneLink["arrow"]) {
  if (arrow === "end" || arrow === "both") arrowHead(ctx, path.screen.at(-1)!, pointAlong(path, 0.999).angle);

  if (arrow === "start" || arrow === "both") arrowHead(ctx, path.screen[0]!, pointAlong(path, 0.001).angle + Math.PI);
}

function linkLabel(ctx: CanvasRenderingContext2D, path: Path, label: string) {
  const middle = pointAlong(path, 0.5);

  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(label, middle.x, middle.y - 7);
}

function flowDots(ctx: CanvasRenderingContext2D, path: Path, palette: Palette, alpha: number, time: number, index: number) {
  for (let dot = 0; dot < FLOW_DOTS; dot++) {
    const at = (time * 0.32 + index * 0.21 + dot * 0.5) % 1;
    const point = pointAlong(path, at);

    ctx.fillStyle = `rgba(${palette.glow}, ${0.95 * alpha * Math.sin(at * Math.PI)})`;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2.2, 0, FULL_TURN);
    ctx.fill();
  }
}

export function paintLink(ctx: CanvasRenderingContext2D, view: Projector, pixelRatio: number, palette: Palette, link: LinkPaint): void {
  const path = pathOf(link.points, view);

  if (path.total < 1) return;

  const { spec, alpha } = link;

  ctx.save();
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  strokePath(ctx, path, palette, alpha, spec.dashed);
  ctx.fillStyle = `rgba(${palette.line}, ${0.85 * alpha})`;
  arrows(ctx, path, spec.arrow);

  if (spec.label) linkLabel(ctx, path, spec.label);

  if (spec.flow && link.flowing) flowDots(ctx, path, palette, alpha, link.time, link.index);

  ctx.restore();
}
