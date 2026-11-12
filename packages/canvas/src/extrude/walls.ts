import type { Projector } from "../camera";
import type { Outline, ScreenPoint } from "../geometry";
import { outlineArea } from "./rings";

export interface Wall {
  /** The wall's four corners on screen: bottom start, bottom end, top end, top start. */
  quad: [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint];
  /** -1 (turned away to the left, in shadow) to 1 (to the right, lit). */
  light: number;
  /** Larger is nearer; paint in increasing order. */
  depth: number;
}

export interface WallOptions {
  outline: Outline;
  z0: number;
  z1: number;
  view: Projector;
  inward?: boolean;
}

export interface InkLinesOptions extends WallOptions {
  uprights?: boolean;
}

export type Line = [ScreenPoint, ScreenPoint];

const CREASE = Math.cos((25 * Math.PI) / 180);

const windingOf = (outline: Outline) => Math.sign(outlineArea(outline)) || 1;

function isFacing(a: ScreenPoint, b: ScreenPoint, up: ScreenPoint, direction: number, inward: boolean): boolean {
  const turn = (b.x - a.x) * (up.y - a.y) - (b.y - a.y) * (up.x - a.x);

  return turn * direction * (inward ? -1 : 1) > 0;
}

function lightOf(view: Projector, a: { x: number; y: number }, b: { x: number; y: number }, direction: number, inward: boolean, z0: number) {
  const nx = (b.y - a.y) * direction;
  const ny = -(b.x - a.x) * direction;
  const length = Math.hypot(nx, ny) || 1;
  const middleX = (a.x + b.x) / 2;
  const middleY = (a.y + b.y) / 2;
  const outward = inward ? -1 : 1;
  const tip = view.project(middleX + (nx / length) * outward, middleY + (ny / length) * outward, z0);
  const base = view.project(middleX, middleY, z0);
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;

  return { light: dx / (Math.hypot(dx, dy) || 1), depth: view.depth(middleX, middleY) };
}

/** The walls of an outline raised from z0 to z1 that face the viewer, far to near. */
export function walls({ outline, z0, z1, view, inward = false }: WallOptions): Wall[] {
  if (outline.length < 3 || z1 - z0 <= 0) return [];

  const direction = windingOf(outline);

  const facing = outline.flatMap((a, index): Wall[] => {
    const b = outline[(index + 1) % outline.length]!;
    const a0 = view.project(a.x, a.y, z0);
    const b0 = view.project(b.x, b.y, z0);
    const b1 = view.project(b.x, b.y, z1);
    const a1 = view.project(a.x, a.y, z1);

    if (!isFacing(a0, b0, a1, direction, inward)) return [];

    return [{ quad: [a0, b0, b1, a1], ...lightOf(view, a, b, direction, inward, z0) }];
  });

  return facing.sort((p, q) => p.depth - q.depth);
}

function facingWalls({ outline, z0, z1, view, inward = false }: WallOptions): boolean[] {
  const direction = windingOf(outline);

  return outline.map((a, index) => {
    const b = outline[(index + 1) % outline.length]!;

    return isFacing(view.project(a.x, a.y, z0), view.project(b.x, b.y, z0), view.project(a.x, a.y, z1), direction, inward);
  });
}

function isCrease(previous: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  const ux = a.x - previous.x;
  const uy = a.y - previous.y;
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const cos = (ux * vx + uy * vy) / ((Math.hypot(ux, uy) || 1) * (Math.hypot(vx, vy) || 1));

  return cos < CREASE;
}

/** The ink lines of an outline raised from z0 to z1, as segments on screen. */
export function inkLines({ outline, z0, z1, view, inward = false, uprights = true }: InkLinesOptions): Line[] {
  if (outline.length < 3 || z1 - z0 <= 0) return [];

  const facing = facingWalls({ outline, z0, z1, view, inward });
  const count = outline.length;

  return outline.flatMap((a, index): Line[] => {
    const b = outline[(index + 1) % count]!;
    const previousIndex = (index - 1 + count) % count;
    const before = facing[previousIndex]!;
    const after = facing[index]!;
    const upright = before !== after || (before && after && isCrease(outline[previousIndex]!, a, b));
    const lines: Line[] = [];

    if (after) lines.push([view.project(a.x, a.y, z0), view.project(b.x, b.y, z0)]);

    if (upright && uprights) lines.push([view.project(a.x, a.y, z0), view.project(a.x, a.y, z1)]);

    return lines;
  });
}
