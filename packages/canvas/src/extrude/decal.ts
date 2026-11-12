import type { DrawContext, DrawState } from "../object-looks";
import { scaled } from "./strokes";

export interface ExtrudeDecal {
  text?: string;
  icon?: string;
  iconViewBox?: number;
  iconStyle?: "stroke" | "fill";
  align?: "center" | "start" | "end";
  rotate?: number;
  at?: readonly [number, number];
  size?: number;
  color?: string;
  fit?: "contain" | "stretch";
  weight?: number;
}

interface Placement {
  along: number;
  across: number;
  size: number;
  color: string;
}

const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
const DEFAULT_VIEW_BOX = 24;
const STRETCH_MARGIN = 0.04;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

function strokeStyle(ctx: CanvasRenderingContext2D, color: string, weight: number | undefined) {
  ctx.strokeStyle = color;
  ctx.lineWidth = weight ?? 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function stretchedIcon(ctx: CanvasRenderingContext2D, { box }: DrawState, decal: ExtrudeDecal & { icon: string }, color: string) {
  const viewBox = decal.iconViewBox ?? DEFAULT_VIEW_BOX;
  const width = box.width * (1 - STRETCH_MARGIN * 2);
  const height = box.depth * (1 - STRETCH_MARGIN * 2);
  const shape = new Path2D();
  const transform = { a: width / viewBox, b: 0, c: 0, d: height / viewBox, e: -width / 2, f: -height / 2 } as DOMMatrix2DInit;

  shape.addPath(new Path2D(decal.icon), transform);
  strokeStyle(ctx, color, decal.weight);
  ctx.stroke(shape);
}

function placedIcon(ctx: CanvasRenderingContext2D, decal: ExtrudeDecal & { icon: string }, text: string, { along, across, color }: Placement) {
  const viewBox = decal.iconViewBox ?? DEFAULT_VIEW_BOX;
  const iconSize = decal.size ?? Math.min(along, across) * 0.36;
  const scale = iconSize / viewBox;
  const x = text ? -along / 2 + iconSize * 0.9 : 0;
  const icon = new Path2D(decal.icon);

  ctx.save();
  ctx.translate(x - iconSize / 2, -iconSize / 2);
  ctx.scale(scale, scale);

  if (decal.iconStyle === "fill") {
    ctx.fillStyle = color;
    ctx.fill(icon);
  } else {
    strokeStyle(ctx, color, decal.weight);
    ctx.stroke(icon);
  }

  ctx.restore();
}

function decalText(ctx: CanvasRenderingContext2D, decal: ExtrudeDecal, text: string, { along, across, size, color }: Placement) {
  const align = decal.align ?? "center";
  const pad = across * 0.18;

  ctx.font = `500 ${size}px ${MONO}`;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;

  if (align === "center") {
    ctx.textAlign = "center";
    ctx.fillText(text, decal.icon ? size * 0.6 : 0, 0, along * 0.86);
    return;
  }

  ctx.textAlign = align === "start" ? "left" : "right";
  ctx.fillText(text, align === "start" ? -along / 2 + pad : along / 2 - pad, 0, along * 0.8);
}

function placement(state: DrawState, decal: ExtrudeDecal): Placement {
  const { box, palette } = state;
  const turned = Math.abs(Math.sin(toRadians(decal.rotate ?? 0))) > 0.7;
  const across = turned ? box.width : box.depth;

  return {
    along: turned ? box.depth : box.width,
    across,
    size: decal.size ?? Math.min(26, across * 0.2),
    color: decal.color ?? palette.text,
  };
}

export function paintDecal(context: DrawContext, state: DrawState, decal: ExtrudeDecal, z: number): void {
  const { ctx, view, pixelRatio } = context;
  const { box } = state;
  const text = decal.text ?? state.label;

  if (!text && !decal.icon) return;

  const plane = view.plane(z);

  ctx.save();
  ctx.setTransform(...scaled(plane, pixelRatio));
  ctx.translate(box.x + box.width * (0.5 + (decal.at?.[0] ?? 0)), box.y + box.depth * (0.5 + (decal.at?.[1] ?? 0)));

  if (decal.rotate) ctx.rotate(toRadians(decal.rotate));

  if (plane[0] < 0 && decal.fit !== "stretch") ctx.rotate(Math.PI);

  const placed = placement(state, decal);

  if (decal.icon && decal.fit === "stretch") stretchedIcon(ctx, state, { ...decal, icon: decal.icon }, placed.color);
  else if (decal.icon) placedIcon(ctx, { ...decal, icon: decal.icon }, text, placed);

  if (text) decalText(ctx, decal, text, placed);

  ctx.restore();
}
