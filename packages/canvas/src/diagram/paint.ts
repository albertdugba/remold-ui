import type { Point } from "./path";
import type { DiagramColors, LinkState, NodeStatus } from "./types";

export type MarkStyle = "solid" | "line";

const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
const FULL_TURN = Math.PI * 2;
const BADGE_RADIUS = 9;
const PULSE_PERIOD = 1.4;
const PULSE_REACH = 2.2;
const PACKET_DOT = 5;
const LINE_DOT = 3.5;
const LINE_BADGE_SCALE = 0.85;
const PILL_HEIGHT = 20;
const PILL_PADDING = 14;

interface Pill {
  at: Point;
  text: string;
  font: string;
  fill: string;
  color: string;
  alpha: number;
  /** Draw only the outline, in this colour. */
  stroke?: string;
}

function roundedPill(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  const radius = height / 2;

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function pill(ctx: CanvasRenderingContext2D, { at, text, font, fill, color, alpha, stroke }: Pill) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = font;

  const width = ctx.measureText(text).width + PILL_PADDING;

  roundedPill(ctx, at.x - width / 2, at.y - PILL_HEIGHT / 2, width, PILL_HEIGHT);
  ctx.fillStyle = fill;
  ctx.fill();

  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, at.x, at.y + 0.5);
  ctx.restore();
}

function caption(ctx: CanvasRenderingContext2D, at: Point, text: string, color: string, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `500 11px ${MONO}`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, at.x, at.y);
  ctx.restore();
}

export function paintNodeLabel(ctx: CanvasRenderingContext2D, at: Point, text: string, alpha: number, colors: DiagramColors, style: MarkStyle) {
  if (!text || alpha < 0.02) return;

  if (style === "line") {
    caption(ctx, at, text, colors.label, alpha);
    return;
  }

  pill(ctx, { at, text, font: `600 12px ${SANS}`, fill: `rgba(${colors.surface}, 0.86)`, color: colors.label, alpha });
}

export function paintCountdown(ctx: CanvasRenderingContext2D, at: Point, text: string, colors: DiagramColors, style: MarkStyle) {
  const font = `600 11.5px ${MONO}`;

  if (style === "line") {
    pill(ctx, { at, text, font, fill: `rgb(${colors.surface})`, color: `rgb(${colors.pending})`, stroke: `rgb(${colors.pending})`, alpha: 1 });
    return;
  }

  pill(ctx, { at, text, font, fill: `rgb(${colors.pending})`, color: colors.packetText, alpha: 1 });
}

function solidPacket(ctx: CanvasRenderingContext2D, at: Point, label: string | undefined, color: string, colors: DiagramColors) {
  ctx.shadowColor = `rgba(${color}, 0.55)`;
  ctx.shadowBlur = 12;

  if (label) {
    pill(ctx, { at, text: label, font: `600 11px ${MONO}`, fill: `rgb(${color})`, color: colors.packetText, alpha: 1 });
    return;
  }

  ctx.fillStyle = `rgb(${color})`;
  ctx.beginPath();
  ctx.arc(at.x, at.y, PACKET_DOT, 0, FULL_TURN);
  ctx.fill();
}

function linePacket(ctx: CanvasRenderingContext2D, at: Point, label: string | undefined, color: string, colors: DiagramColors) {
  if (label) {
    pill(ctx, { at, text: label, font: `500 11px ${MONO}`, fill: `rgb(${colors.surface})`, color: `rgb(${color})`, stroke: `rgb(${color})`, alpha: 1 });
    return;
  }

  ctx.fillStyle = `rgb(${color})`;
  ctx.beginPath();
  ctx.arc(at.x, at.y, LINE_DOT, 0, FULL_TURN);
  ctx.fill();
}

export function paintPacket(ctx: CanvasRenderingContext2D, at: Point, label: string | undefined, color: string, colors: DiagramColors, style: MarkStyle) {
  ctx.save();

  if (style === "line") linePacket(ctx, at, label, color, colors);
  else solidPacket(ctx, at, label, color, colors);

  ctx.restore();
}

function glyph(ctx: CanvasRenderingContext2D, at: Point, status: Exclude<NodeStatus, null>, radius: number) {
  const unit = radius / BADGE_RADIUS;

  ctx.beginPath();

  if (status === "ok") {
    ctx.moveTo(at.x - 3.5 * unit, at.y + 0.2 * unit);
    ctx.lineTo(at.x - 1 * unit, at.y + 2.7 * unit);
    ctx.lineTo(at.x + 3.8 * unit, at.y - 2.5 * unit);
  } else if (status === "error") {
    ctx.moveTo(at.x, at.y - 3.6 * unit);
    ctx.lineTo(at.x, at.y + 0.6 * unit);
    ctx.moveTo(at.x, at.y + 3.4 * unit);
    ctx.lineTo(at.x, at.y + 3.5 * unit);
  } else {
    ctx.arc(at.x, at.y, 3.6 * unit, -Math.PI / 2, Math.PI * 0.9);
  }

  ctx.stroke();
}

function pulse(ctx: CanvasRenderingContext2D, at: Point, color: string, time: number) {
  const phase = (time % PULSE_PERIOD) / PULSE_PERIOD;

  ctx.strokeStyle = `rgba(${color}, ${0.5 * (1 - phase)})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(at.x, at.y, BADGE_RADIUS * (1 + (PULSE_REACH - 1) * phase), 0, FULL_TURN);
  ctx.stroke();
}

export interface Badge {
  at: Point;
  status: Exclude<NodeStatus, null>;
  /** 0 to 1, how far it has popped in. */
  pop: number;
  time: number;
  still: boolean;
  style: MarkStyle;
}

function badgeDisc(ctx: CanvasRenderingContext2D, { at, pop, style }: Badge, color: string, colors: DiagramColors) {
  const radius = BADGE_RADIUS * pop * (style === "line" ? LINE_BADGE_SCALE : 1);

  ctx.beginPath();
  ctx.arc(at.x, at.y, radius, 0, FULL_TURN);
  ctx.fillStyle = `rgb(${color})`;
  ctx.fill();

  if (style === "line") {
    ctx.strokeStyle = `rgb(${colors.surface})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

export function paintBadge(ctx: CanvasRenderingContext2D, badge: Badge, colors: DiagramColors) {
  const { at, status, pop, time, still, style } = badge;
  const color = colors[status];

  if (BADGE_RADIUS * pop < 0.5) return;

  ctx.save();

  if (status === "error" && !still) pulse(ctx, at, color, time);

  badgeDisc(ctx, badge, color, colors);
  ctx.strokeStyle = colors.packetText;
  ctx.lineWidth = (style === "line" ? 1.5 : 1.8) * pop;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  glyph(ctx, at, status, BADGE_RADIUS * pop * (style === "line" ? LINE_BADGE_SCALE : 1));
  ctx.restore();
}

export function paintLinkState(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  state: Exclude<LinkState, null>,
  colors: DiagramColors,
  style: MarkStyle,
) {
  if (points.length < 2) return;

  const color = state === "error" ? colors.error : colors.ok;

  ctx.save();
  ctx.strokeStyle = `rgba(${color}, 0.9)`;
  ctx.lineWidth = style === "line" ? 1.5 : 2.5;
  ctx.lineCap = "round";
  ctx.setLineDash(state === "error" ? [5, 6] : []);
  ctx.shadowColor = `rgba(${color}, 0.45)`;
  ctx.shadowBlur = state === "active" && style === "solid" ? 8 : 0;
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);

  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);

  ctx.stroke();
  ctx.restore();
}

function polygonPath(ctx: CanvasRenderingContext2D, points: readonly Point[]) {
  ctx.beginPath();

  for (const [index, point] of points.entries()) {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }

  ctx.closePath();
}

export function paintHighlight(ctx: CanvasRenderingContext2D, top: readonly Point[], bottom: readonly Point[], color: string, alpha: number) {
  if (top.length < 3 || alpha < 0.02) return;

  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";
  ctx.strokeStyle = `rgba(${color}, ${0.55 * alpha})`;
  polygonPath(ctx, bottom);
  ctx.stroke();
  ctx.fillStyle = `rgba(${color}, ${0.1 * alpha})`;
  ctx.strokeStyle = `rgba(${color}, ${alpha})`;
  polygonPath(ctx, top);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

const LEADER_GAP = 8;
const LEADER_LENGTH = 34;
const LEADER_TEXT_GAP = 8;

export function paintSideLabel(ctx: CanvasRenderingContext2D, from: Point, text: string, alpha: number, colors: DiagramColors, style: MarkStyle) {
  if (!text || alpha < 0.02) return;

  const start = from.x + LEADER_GAP;
  const end = start + LEADER_LENGTH;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colors.label;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(start, from.y);
  ctx.lineTo(end, from.y);
  ctx.stroke();
  ctx.font = style === "line" ? `500 11px ${MONO}` : `600 12px ${SANS}`;
  ctx.fillStyle = colors.label;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, end + LEADER_TEXT_GAP, from.y);
  ctx.restore();
}

export function paintLit(ctx: CanvasRenderingContext2D, top: readonly Point[], color: string, alpha: number) {
  if (top.length < 3 || alpha < 0.02) return;

  ctx.save();
  polygonPath(ctx, top);
  ctx.fillStyle = `rgba(${color}, ${0.88 * alpha})`;
  ctx.fill();
  ctx.lineJoin = "round";
  ctx.lineWidth = 1;
  ctx.strokeStyle = `rgba(${color}, ${alpha})`;
  ctx.stroke();
  ctx.restore();
}
