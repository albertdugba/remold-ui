/**
 * `extrude()`: a look made from any flat shape pushed up into a solid. A rounded slab, a disc,
 * a star, a letter, a logo you drew: give it a rectangle, an ellipse or SVG path data.
 *
 * Unlike the built-in prisms, the sides are drawn wall by wall, nearest last, so concave shapes
 * (a star's points, the inside of a "C") come out right. Holes in the path go all the way
 * through, a `well` hollows the top out like a tray, and `decal` puts text or an icon on top.
 */
import { parsePath, pointAt, toCubics, type Subpath } from "@remold-ui/core";
import type { Matrix, Projector } from "../camera";
import { ellipse, projectOutline, roundedRect, type Box3, type Outline, type ScreenPoint } from "../geometry";
import { halo } from "../glow";
import type { DrawContext, DrawState, Look, Palette } from "../object-looks";

export type ExtrudeShape =
  | "rect"
  | "ellipse"
  /** SVG path data, stretched to fill the object's footprint. Later subpaths inside the first are holes. */
  | { path: string };

export interface ExtrudeDecal {
  /** Text on the top face. Defaults to the object's label; pass "" for none. */
  text?: string;
  /** SVG path data for an icon on the top face, drawn in a box `iconViewBox` wide. */
  icon?: string;
  /** Default 24, for icons drawn on a 24 × 24 grid. */
  iconViewBox?: number;
  /** "stroke" (default) for outline icons, "fill" for solid ones. */
  iconStyle?: "stroke" | "fill";
  /** Where along the top the text sits. Default "center". */
  align?: "center" | "start" | "end";
  /** Turn the text and icon on the top face, in degrees. */
  rotate?: number;
  /**
   * Where the decal sits, from the middle of the top face, as fractions of its width and depth
   * (-0.5 to 0.5). `[0, 0.36]` puts it near the front edge, where it shows on a stacked card.
   */
  at?: readonly [number, number];
  /** Text height (or icon size) in floor units. Default: scaled to the object. */
  size?: number;
  /** Default: the palette's text colour. */
  color?: string;
  /**
   * `"contain"` (default) draws the icon square. `"stretch"` stretches it over the whole top face
   * (with a small margin), for details that belong to the face: an envelope's flap, lines on a
   * card, a parcel's tape. The line keeps its width either way.
   */
  fit?: "contain" | "stretch";
  /** Line width for outline icons, in floor units. Default 2. */
  weight?: number;
}

export interface ExtrudeOptions {
  /** The footprint. Default "rect". */
  shape?: ExtrudeShape;
  /** Corner radius for "rect", as a fraction of the shorter side. Default 0.14. */
  radius?: number;
  /** Thickness when a layout doesn't give one. Default 16. */
  height?: number;
  /** How the sides are painted. "sheen" adds bright streaks, like brushed or lit glass. Default "gradient". */
  sides?: "gradient" | "sheen" | "flat";
  /** A glowing rim round the top. Default false. */
  edge?: boolean;
  /** Hollow the top out into a tray: `inset` from the rim and `depth` down, both 0 to 1 of the size. */
  well?: { inset?: number; depth?: number };
  decal?: ExtrudeDecal;
  /** Overrides the palette's top colour. */
  top?: string;
  /** Draw before links and other objects, as scenery. */
  background?: boolean;
  /** Not hovered, focused or reachable by keyboard unless the object says otherwise. */
  passive?: boolean;
  /**
   * Line art, like a technical drawing: ink on every edge you can see (the top's outline, the
   * silhouette, sharp creases and the base), with a soft shadow on the floor instead of a glow.
   * `true` uses the palette's line colour; or pass a colour. Pairs well with the `sketch` palette.
   */
  ink?: boolean | string;
  /** Ink width in CSS pixels. Default 1.25. */
  inkWidth?: number;
  /**
   * A see-through container: its back edges show faintly through the front, and what it holds
   * rises inside it to the layout's `fill` level (0 to 1), springing as the level changes.
   */
  glass?: boolean;
  /**
   * The colour of what the object holds, up to the layout's `fill` level: the contents of a glass
   * container, or a band up the walls of a solid one. Default: the palette's glow colour.
   */
  fillColor?: string;
  /** A soft shadow on the floor under the object. Default: on for `ink`, off otherwise. */
  shadow?: boolean;
}

/* Geometry, kept pure so it can be tested without a canvas. */

interface Rings {
  outer: Outline;
  holes: Outline[];
}

/** Twice the signed area of an outline on the floor: the sign gives its direction. */
export function outlineArea(outline: Outline): number {
  let sum = 0;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) sum += outline[j]!.x * outline[i]!.y - outline[i]!.x * outline[j]!.y;
  return sum;
}

function inside(point: { x: number; y: number }, outline: Outline): boolean {
  let hit = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const a = outline[i]!;
    const b = outline[j]!;
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

/** Points along a subpath, a few per curve. */
function sample(subpath: Subpath, perSegment: number): Outline {
  const points: Outline = [];
  for (const c of subpath.segments) for (let k = 0; k < perSegment; k++) points.push(pointAt(c, k / perSegment));
  return points;
}

/** Path data → outlines in a unit square, parsed once per path. */
const pathCache = new Map<string, Rings>();
/** A morph makes a new path every frame; keep the cache from growing without end. */
const CACHE_LIMIT = 256;

function unitRings(d: string): Rings {
  const cached = pathCache.get(d);
  if (cached) return cached;
  if (pathCache.size >= CACHE_LIMIT) pathCache.clear();
  const outlines = toCubics(parsePath(d))
    .map((s) => sample(s, 6))
    .filter((p) => p.length >= 3);
  if (outlines.length === 0) throw new Error(`extrude: the path has no closed shape to extrude: "${d.slice(0, 40)}"`);
  const xs = outlines.flat().map((p) => p.x);
  const ys = outlines.flat().map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX || 1;
  const h = Math.max(...ys) - minY || 1;
  const unit = outlines.map((o) => o.map((p) => ({ x: (p.x - minX) / w, y: (p.y - minY) / h })));
  // The biggest outline is the body; outlines inside it are holes, the rest are ignored.
  unit.sort((a, b) => Math.abs(outlineArea(b)) - Math.abs(outlineArea(a)));
  const [outer, ...rest] = unit;
  const rings = { outer: outer!, holes: rest.filter((o) => inside(o[0]!, outer!)) };
  pathCache.set(d, rings);
  return rings;
}

const toPath = (rings: Rings, k: number) =>
  [rings.outer, ...rings.holes].map((o) => `M${o.map((p) => `${(p.x * k).toFixed(2)} ${(p.y * k).toFixed(2)}`).join("L")}Z`).join("");

/**
 * Path data for a shape in a 100 × 100 box, so two shapes drawn at different sizes can morph
 * into each other. Rectangles and ellipses come out as the outlines `extrude()` draws.
 */
export function unitPath(shape: ExtrudeShape, radius = 0.14): string {
  if (shape === "rect" || shape === "ellipse") return toPath(shapeRings(shape, { x: 0, y: 0, width: 1, depth: 1 }, radius), 100);
  return toPath(unitRings(shape.path), 100);
}

/** The outline (and holes) of `shape` filling the footprint of `box`. */
export function shapeRings(shape: ExtrudeShape, box: Pick<Box3, "x" | "y" | "width" | "depth">, radius = 0.14): Rings {
  if (shape === "rect")
    return {
      outer: roundedRect({
        x: box.x,
        y: box.y,
        width: box.width,
        depth: box.depth,
        radius: Math.min(box.width, box.depth) * radius,
        segments: 6,
      }),
      holes: [],
    };
  if (shape === "ellipse") return { outer: ellipse({ x: box.x, y: box.y, width: box.width, depth: box.depth, segments: 48 }), holes: [] };
  const unit = unitRings(shape.path);
  const place = (o: Outline) => o.map((p) => ({ x: box.x + p.x * box.width, y: box.y + p.y * box.depth }));
  return { outer: place(unit.outer), holes: unit.holes.map(place) };
}

/** Shrink an outline towards the middle of its box by `fraction` of the box on every side. */
function insetRing(outline: Outline, box: Pick<Box3, "x" | "y" | "width" | "depth">, fraction: number): Outline {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.depth / 2;
  const inset = Math.min(box.width, box.depth) * fraction;
  const kx = Math.max(0, (box.width - inset * 2) / box.width);
  const ky = Math.max(0, (box.depth - inset * 2) / box.depth);
  return outline.map((p) => ({ x: cx + (p.x - cx) * kx, y: cy + (p.y - cy) * ky }));
}

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

/**
 * The walls of an outline raised from z0 to z1 that face the viewer, far to near. For a hole
 * (`inward`), the walls you see are the ones facing into the hole, on its far side.
 */
export function walls({ outline, z0, z1, view, inward = false }: WallOptions): Wall[] {
  if (outline.length < 3 || z1 - z0 <= 0) return [];
  const direction = Math.sign(outlineArea(outline)) || 1;
  const result: Wall[] = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]!;
    const b = outline[(i + 1) % outline.length]!;
    const a0 = view.project(a.x, a.y, z0);
    const b0 = view.project(b.x, b.y, z0);
    const b1 = view.project(b.x, b.y, z1);
    const a1 = view.project(a.x, a.y, z1);
    // Which way the wall turns on screen: the sign of its projected area, against the outline's direction.
    const turn = (b0.x - a0.x) * (a1.y - a0.y) - (b0.y - a0.y) * (a1.x - a0.x);
    const facing = turn * direction * (inward ? -1 : 1) > 0;
    if (!facing) continue;
    // The wall's outward normal on the floor, projected to see whether it points left or right.
    const nx = (b.y - a.y) * direction;
    const ny = -(b.x - a.x) * direction;
    const length = Math.hypot(nx, ny) || 1;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const tip = view.project(mx + (nx / length) * (inward ? -1 : 1), my + (ny / length) * (inward ? -1 : 1), z0);
    const base = view.project(mx, my, z0);
    const dx = tip.x - base.x;
    const dy = tip.y - base.y;
    result.push({ quad: [a0, b0, b1, a1], light: dx / (Math.hypot(dx, dy) || 1), depth: view.depth(mx, my) });
  }
  return result.sort((p, q) => p.depth - q.depth);
}

/** Which walls of an outline face the viewer, one flag per edge, in outline order. */
function facingWalls({ outline, z0, z1, view, inward = false }: WallOptions): boolean[] {
  const direction = Math.sign(outlineArea(outline)) || 1;
  return outline.map((a, i) => {
    const b = outline[(i + 1) % outline.length]!;
    const a0 = view.project(a.x, a.y, z0);
    const b0 = view.project(b.x, b.y, z0);
    const a1 = view.project(a.x, a.y, z1);
    const turn = (b0.x - a0.x) * (a1.y - a0.y) - (b0.y - a0.y) * (a1.x - a0.x);
    return turn * direction * (inward ? -1 : 1) > 0;
  });
}

/** How sharply the outline turns at a corner before its edges count as separate faces. */
const CREASE = Math.cos((25 * Math.PI) / 180);

/**
 * The ink lines of an outline raised from z0 to z1, as segments on screen: the base of every wall
 * that faces the viewer, and the upright edges where the solid's silhouette turns away or where
 * two walls meet at a sharp corner. Rounded corners get no upright lines, as in a drawing.
 */
export function inkLines({ outline, z0, z1, view, inward = false, uprights = true }: InkLinesOptions): [ScreenPoint, ScreenPoint][] {
  if (outline.length < 3 || z1 - z0 <= 0) return [];
  const facing = facingWalls({ outline, z0, z1, view, inward });
  const lines: [ScreenPoint, ScreenPoint][] = [];
  const n = outline.length;
  for (let i = 0; i < n; i++) {
    const a = outline[i]!;
    const b = outline[(i + 1) % n]!;
    if (facing[i]) lines.push([view.project(a.x, a.y, z0), view.project(b.x, b.y, z0)]);
    // The upright edge at corner `a`, between the wall before it and the wall after.
    const before = facing[(i - 1 + n) % n]!;
    const after = facing[i]!;
    let upright = before !== after;
    if (!upright && before && after) {
      const p = outline[(i - 1 + n) % n]!;
      const ux = a.x - p.x;
      const uy = a.y - p.y;
      const vx = b.x - a.x;
      const vy = b.y - a.y;
      const cos = (ux * vx + uy * vy) / ((Math.hypot(ux, uy) || 1) * (Math.hypot(vx, vy) || 1));
      upright = cos < CREASE;
    }
    if (upright && uprights) lines.push([view.project(a.x, a.y, z0), view.project(a.x, a.y, z1)]);
  }
  return lines;
}

function strokeLines(ctx: CanvasRenderingContext2D, lines: readonly [ScreenPoint, ScreenPoint][]): void {
  if (lines.length === 0) return;
  ctx.beginPath();
  for (const [p, q] of lines) {
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
  }
  ctx.stroke();
}

/* Drawing */

const scaled = (m: Matrix, k: number): Matrix => [m[0] * k, m[1] * k, m[2] * k, m[3] * k, m[4] * k, m[5] * k];

const lerp = (p: ScreenPoint, q: ScreenPoint, k: number): ScreenPoint => ({ x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k });

function trace(ctx: CanvasRenderingContext2D, points: readonly ScreenPoint[]): void {
  for (const [index, point] of points.entries()) {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }
  ctx.closePath();
}

type Rgb = [number, number, number];

/** A colour as red, green, blue: `#rgb`, `#rrggbb`, `rgb(r, g, b)` or the palettes' bare `"r, g, b"`. */
export function parseColor(color: string): Rgb {
  const c = color.trim();
  const long = /^#?([0-9a-f]{6})$/i.exec(c);
  if (long) {
    const n = Number.parseInt(long[1]!, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(c);
  if (short) return [short[1]!, short[2]!, short[3]!].map((h) => Number.parseInt(h + h, 16)) as Rgb;
  const parts = /^(?:rgba?\()?\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(c);
  if (parts) return [Number(parts[1]), Number(parts[2]), Number(parts[3])];
  return [128, 128, 128];
}

const hex = parseColor;
const css = ([r, g, b]: Rgb, alpha = 1) => (alpha >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`);

/** `color` lit by `light` (-1 shadow to 1 lit): towards black in shadow, towards white in light. */
function lit(color: Rgb, light: number): string {
  const t = Math.max(-1, Math.min(1, light));
  const toward = t < 0 ? 0 : 255;
  const k = t < 0 ? -t * 0.3 : t * 0.32;
  return css(color.map((v) => Math.round(v + (toward - v) * k)) as Rgb);
}

/** A colour between the palette's three side colours: -1 shadow, 0 middle, 1 lit. */
function shade(palette: Palette, light: number): string {
  const [s0, s1, s2] = palette.sides.map(hex) as [[number, number, number], [number, number, number], [number, number, number]];
  const t = Math.max(-1, Math.min(1, light));
  const [from, to, k] = t < 0 ? [s1, s0, -t] : [s1, s2, t];
  const mix = (i: 0 | 1 | 2) => Math.round(from[i] + (to[i] - from[i]) * k);
  return `rgb(${mix(0)}, ${mix(1)}, ${mix(2)})`;
}

/** A repeatable pseudo-random number from a string, so each object keeps its own streaks. */
function seeded(text: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

interface PaintWallsOptions {
  context: CanvasRenderingContext2D;
  walls: Wall[];
  palette: Palette;
  style: ExtrudeOptions["sides"];
  seed: string;
}

function paintWalls({ context, walls: wallList, palette, style, seed }: PaintWallsOptions): void {
  if (wallList.length === 0) return;
  for (const wall of wallList) {
    context.beginPath();
    trace(context, wall.quad);
    context.fillStyle = style === "flat" ? palette.sides[1] : shade(palette, wall.light * 0.9 + 0.1);
    context.fill();
    // A hairline in the wall's own colour hides the seams between neighbouring walls.
    context.strokeStyle = context.fillStyle;
    context.lineWidth = 0.6;
    context.stroke();
  }
  if (style === "sheen") paintSheen(context, wallList, seed);
}

/** Bright streaks across all the walls together, like light caught in brushed metal or glass. */
function paintSheen(ctx: CanvasRenderingContext2D, list: Wall[], seed: string): void {
  if (list.length === 0) return;
  const xs = list.flatMap((w) => w.quad.map((p) => p.x));
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  if (right - left < 1) return;
  const random = seeded(seed);
  const gradient = ctx.createLinearGradient(left, 0, right, 0);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
  for (let i = 0; i < 7; i++) {
    const at = 0.06 + random() * 0.88;
    const width = 0.01 + random() * 0.05;
    const strength = 0.12 + random() * 0.38;
    gradient.addColorStop(Math.max(0, at - width), "rgba(255, 255, 255, 0)");
    gradient.addColorStop(at, `rgba(255, 255, 255, ${strength})`);
    gradient.addColorStop(Math.min(1, at + width), "rgba(255, 255, 255, 0)");
  }
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.save();
  ctx.beginPath();
  for (const w of list) trace(ctx, w.quad);
  ctx.clip();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = gradient;
  ctx.fillRect(left, Math.min(...list.flatMap((w) => w.quad.map((p) => p.y))) - 2, right - left, 4000);
  ctx.restore();
}

function paintDecal(context: DrawContext, state: DrawState, decal: ExtrudeDecal, z: number): void {
  const { ctx, view, pixelRatio } = context;
  const { box, palette } = state;
  const text = decal.text ?? state.label;
  if (!text && !decal.icon) return;
  const plane = view.plane(z);
  ctx.save();
  ctx.setTransform(...scaled(plane, pixelRatio));
  ctx.translate(box.x + box.width * (0.5 + (decal.at?.[0] ?? 0)), box.y + box.depth * (0.5 + (decal.at?.[1] ?? 0)));
  if (decal.rotate) ctx.rotate((decal.rotate * Math.PI) / 180);
  // Turned past halfway, text on the floor would read upside down: flip it. A stretched drawing belongs to the face, so it stays put.
  if (plane[0] < 0 && decal.fit !== "stretch") ctx.rotate(Math.PI);
  const color = decal.color ?? palette.text;
  const turned = Math.abs(Math.sin(((decal.rotate ?? 0) * Math.PI) / 180)) > 0.7;
  const along = turned ? box.depth : box.width;
  const across = turned ? box.width : box.depth;
  const size = decal.size ?? Math.min(26, across * 0.2);

  if (decal.icon && decal.fit === "stretch") {
    // Stretched over the face: transform the path itself, so the line keeps its width.
    const viewBox = decal.iconViewBox ?? 24;
    const margin = 0.04;
    const w = box.width * (1 - margin * 2);
    const h = box.depth * (1 - margin * 2);
    const shape = new Path2D();
    shape.addPath(new Path2D(decal.icon), { a: w / viewBox, b: 0, c: 0, d: h / viewBox, e: -w / 2, f: -h / 2 } as DOMMatrix2DInit);
    ctx.strokeStyle = color;
    ctx.lineWidth = decal.weight ?? 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(shape);
  } else if (decal.icon) {
    const viewBox = decal.iconViewBox ?? 24;
    const iconSize = decal.size ?? Math.min(along, across) * 0.36;
    const k = iconSize / viewBox;
    const x = text ? -along / 2 + iconSize * 0.9 : 0;
    ctx.save();
    ctx.translate(x - iconSize / 2, -iconSize / 2);
    ctx.scale(k, k);
    const icon = new Path2D(decal.icon);
    if (decal.iconStyle === "fill") {
      ctx.fillStyle = color;
      ctx.fill(icon);
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = decal.weight ?? 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke(icon);
    }
    ctx.restore();
  }

  if (text) {
    ctx.font = `500 ${size}px ui-monospace, "SF Mono", Menlo, monospace`;
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    const align = decal.align ?? "center";
    const pad = across * 0.18;
    if (align === "center") {
      ctx.textAlign = "center";
      ctx.fillText(text, decal.icon ? size * 0.6 : 0, 0, along * 0.86);
    } else {
      ctx.textAlign = align === "start" ? "left" : "right";
      ctx.fillText(text, align === "start" ? -along / 2 + pad : along / 2 - pad, 0, along * 0.8);
    }
  }
  ctx.restore();
}

/** Make a look from any flat shape, extruded. See `ExtrudeOptions`. */
export function extrude(options: ExtrudeOptions = {}): Look {
  const shape = options.shape ?? "rect";
  const radius = options.radius ?? 0.14;
  const style = options.sides ?? "gradient";
  if (typeof shape === "object") unitRings(shape.path); // Fail early, with the reason, on a bad path.

  const look: Look = {
    defaultHeight: options.height ?? 16,
    background: options.background,
    passive: options.passive,
    path: unitPath(shape, radius),
    outline: (box) => shapeRings(shape, box, radius).outer,
    draw: (context, state) => paint(context, state, false),
    // A tray (a `well`) can hold things: its front walls are drawn again over what's inside.
    drawFront: options.well ? (context, state) => paint(context, state, true) : undefined,
  };
  return look;

  /** Draw the whole solid, or with `front` only the walls that face the viewer (for containers). */
  function paint(context: DrawContext, state: DrawState, front: boolean): void {
    const { ctx, view, pixelRatio } = context;
    const { box, palette, glow } = state;
    // A layout can give the object its own outline, which morphs from one layout to the next.
    const rings = state.shape ? shapeRings({ path: state.shape }, box, radius) : shapeRings(shape, box, radius);
    const z0 = box.z;
    const z1 = box.z + box.height;
    const seed = `${state.label}:${box.width.toFixed(0)}:${box.depth.toFixed(0)}`;
    const inked = options.ink !== undefined && options.ink !== false;
    const ink = inked ? (typeof options.ink === "string" ? parseColor(options.ink) : parseColor(palette.line)) : null;
    const inkWidth = options.inkWidth ?? 1.25;
    const level = Math.max(0, Math.min(1, state.fill ?? 0));
    const zf = z0 + box.height * level;
    const contents = parseColor(state.color ?? options.fillColor ?? palette.glow);
    const ghost = Math.max(0, Math.min(1, state.ghost ?? 0));
    /** Fills fade as the object turns to a ghost; its ink stays. */
    const solid = 1 - ghost;
    const baseAlpha = ctx.globalAlpha;
    const upright = box.height > 0.5 && view.sinPitch > 0.02;
    ctx.save();
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // A soft shadow on the floor. The shape that casts it sits under the solid, so only the blur shows.
    if (!front && (options.shadow ?? inked) && upright) {
      ctx.save();
      ctx.translate(0, 7);
      ctx.beginPath();
      trace(ctx, projectOutline(rings.outer, z0, view));
      ctx.globalAlpha = baseAlpha * solid;
      ctx.fillStyle = "rgba(15, 15, 30, 0.06)";
      ctx.fill();
      halo({ context: ctx, color: "15, 15, 30", alpha: 0.07, radius: 13, core: 0, steps: 7 });
      ctx.restore();
    }

    if (front) {
      drawFront();
    } else if (options.glass) {
      drawGlass();
    } else {
      drawSolid();
    }
    ctx.restore();

    /** The walls that face the viewer, with their colour band, streaks and ink: drawn over a container's contents. */
    function drawFront(): void {
      if (!upright) return;
      const outer = walls({ outline: rings.outer, z0, z1, view });
      ctx.globalAlpha = baseAlpha * solid;
      paintWalls({ context: ctx, walls: outer, palette, style: style === "sheen" ? "gradient" : style, seed });
      if (level > 0.002) {
        for (const w of outer) {
          const [a0, b0, b1, a1] = w.quad;
          ctx.beginPath();
          trace(ctx, [a0, b0, lerp(b0, b1, level), lerp(a0, a1, level)]);
          ctx.fillStyle = lit(contents, w.light * 0.9 + 0.1);
          ctx.fill();
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
      if (style === "sheen") paintSheen(ctx, outer, seed);
      ctx.globalAlpha = baseAlpha;
      if (!ink) return;
      inkStyle(1 - 0.5 * ghost);
      strokeLines(ctx, inkLines({ outline: rings.outer, z0, z1, view }));
      // The top edge of each front wall: the near half of the rim's outline.
      strokeLines(
        ctx,
        outer.map((w) => [w.quad[3], w.quad[2]] as [ScreenPoint, ScreenPoint]),
      );
    }

    function inkStyle(alpha = 1): void {
      ctx.strokeStyle = css(ink!, alpha);
      ctx.lineWidth = inkWidth;
    }

    /** The top face's outline, with any holes, ready to fill or stroke. */
    function topPath(holes: Outline[]): void {
      ctx.beginPath();
      trace(ctx, projectOutline(rings.outer, z1, view));
      for (const hole of holes) trace(ctx, projectOutline(hole, z1, view));
    }

    function drawSolid(): void {
      if (upright) {
        const outer = walls({ outline: rings.outer, z0, z1, view });
        ctx.save();
        ctx.globalAlpha = baseAlpha * solid;
        if (!inked) {
          // Without ink, a soft glow around the whole solid (the walls cover its middle).
          ctx.beginPath();
          for (const w of outer) trace(ctx, w.quad);
          halo({ context: ctx, color: palette.glow, alpha: 0.6 * (0.18 + 0.4 * glow), radius: 18 * (0.5 + glow) });
        }
        // Streaks go on last, over the colour band too.
        paintWalls({ context: ctx, walls: outer, palette, style: style === "sheen" ? "gradient" : style, seed });
        ctx.restore();
        // What it holds: a band of colour up the walls, to the fill level.
        if (level > 0.002) {
          ctx.globalAlpha = baseAlpha * solid;
          for (const w of outer) {
            // The wall's corners: bottom start, bottom end, top end, top start.
            const [a0, b0, b1, a1] = w.quad;
            ctx.beginPath();
            trace(ctx, [a0, b0, lerp(b0, b1, level), lerp(a0, a1, level)]);
            ctx.fillStyle = lit(contents, w.light * 0.9 + 0.1);
            ctx.fill();
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
          ctx.globalAlpha = baseAlpha;
          if (inked && level < 0.998) {
            // The line where the band meets the wall.
            inkStyle(0.55);
            strokeLines(ctx, inkLines({ outline: rings.outer, z0: zf, z1, view, inward: false, uprights: false }));
          }
        }
      }

      if (upright && style === "sheen") {
        ctx.save();
        ctx.globalAlpha = baseAlpha * solid;
        paintSheen(ctx, walls({ outline: rings.outer, z0, z1, view }), seed);
        ctx.restore();
      }

      // The top face, with holes (and the well's opening) left open.
      const well = options.well;
      const opening = well ? insetRing(rings.outer, box, well.inset ?? 0.1) : null;
      const holes = [...rings.holes, ...(opening ? [opening] : [])];
      topPath(holes);
      ctx.fillStyle = options.top ?? palette.top;
      ctx.globalAlpha = baseAlpha * solid;
      ctx.fill("evenodd");
      ctx.globalAlpha = baseAlpha;
      if (inked) {
        // A ghost shows its far edges through itself, and its ink lightens a little.
        if (ghost > 0.01 && upright) {
          inkStyle(0.3 * ghost);
          strokeLines(ctx, inkLines({ outline: rings.outer, z0, z1, view, inward: true }));
          topPath(holes);
        }
        inkStyle(1 - 0.5 * ghost);
        ctx.stroke();
        if (glow > 0.01) {
          ctx.save();
          halo({ context: ctx, color: palette.glow, alpha: 0.3 * glow, radius: 7 * glow, core: inkWidth + 0.5, steps: 8 });
          ctx.strokeStyle = `rgba(${palette.glow}, ${0.9 * glow})`;
          ctx.lineWidth = inkWidth + 0.5;
          ctx.stroke();
          ctx.restore();
        }
      } else if (options.edge || glow > 0.01) {
        ctx.save();
        halo({ context: ctx, color: palette.glow, alpha: 0.6 * (0.5 + 0.4 * glow), radius: 8 * (0.5 + glow), core: 1.2 });
        ctx.strokeStyle = `rgba(${palette.line}, ${options.edge ? 0.75 + 0.25 * glow : 0.45 * glow})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.strokeStyle = `rgba(${palette.line}, 0.28)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Through each hole and down into the well: the far walls, clipped to the opening.
      for (const hole of holes) {
        const isWell = hole === opening;
        const floor = isWell ? z1 - box.height * Math.min(0.95, well?.depth ?? 0.7) : z0;
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
        paintWalls({ context: ctx, walls: walls({ outline: hole, z0: floor, z1, view, inward: true }), palette, style, seed: `${seed}:in` });
        if (inked) {
          inkStyle(0.7);
          strokeLines(ctx, inkLines({ outline: hole, z0: floor, z1, view, inward: true }));
        }
        ctx.restore();
      }

      if (inked && upright) {
        inkStyle(1 - 0.5 * ghost);
        strokeLines(ctx, inkLines({ outline: rings.outer, z0, z1, view }));
      }
    }

    function drawGlass(): void {
      const back = parseColor(palette.line);
      if (upright) {
        // The far walls and the floor, seen through the front.
        ctx.beginPath();
        trace(ctx, projectOutline(rings.outer, z0, view));
        ctx.fillStyle = css(back, 0.03);
        ctx.fill();
        for (const w of walls({ outline: rings.outer, z0, z1, view, inward: true })) {
          ctx.beginPath();
          trace(ctx, w.quad);
          ctx.fillStyle = css(back, 0.025);
          ctx.fill();
        }
        if (ink) {
          inkStyle(0.2);
          strokeLines(ctx, inkLines({ outline: rings.outer, z0, z1, view, inward: true }));
        }
      }

      // What it holds, a little inside the glass, up to the fill level.
      if (level > 0.002 && upright) {
        const inner = insetRing(rings.outer, box, 0.04);
        const bottom = z0 + Math.min(1.5, box.height * 0.02);
        for (const w of walls({ outline: inner, z0: bottom, z1: zf, view })) {
          ctx.beginPath();
          trace(ctx, w.quad);
          ctx.fillStyle = lit(contents, w.light * 0.8);
          ctx.fill();
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
        ctx.beginPath();
        trace(ctx, projectOutline(inner, zf, view));
        ctx.fillStyle = lit(contents, 0.55);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // The front walls: a light haze, so the contents read as behind glass.
      if (upright) {
        for (const w of walls({ outline: rings.outer, z0, z1, view })) {
          ctx.beginPath();
          trace(ctx, w.quad);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.16 + 0.1 * Math.max(0, w.light)})`;
          ctx.fill();
        }
      }

      // The lid, and the edges.
      topPath(rings.holes);
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fill("evenodd");
      if (ink) {
        inkStyle(glow > 0.01 ? 1 : 0.85);
        ctx.stroke();
        if (upright) strokeLines(ctx, inkLines({ outline: rings.outer, z0, z1, view }));
      } else {
        ctx.strokeStyle = `rgba(${palette.line}, ${0.4 + 0.5 * glow})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        if (upright) strokeLines(ctx, inkLines({ outline: rings.outer, z0, z1, view }));
      }
    }

    if (!front && (options.decal !== undefined || state.label)) {
      ctx.save();
      // A ghost keeps its label, faintly, like a note on a drawing.
      ctx.globalAlpha = baseAlpha * Math.max(solid, 0.7 * ghost);
      paintDecal(context, state, options.decal ?? {}, z1);
      ctx.restore();
    }
  }
}

/**
 * A caption that always faces the screen, like a note on a diagram: mono, upper case and spaced
 * out. Pair it with a dashed link to point at what it describes. It has no body of its own.
 */
export const caption: Look = {
  defaultHeight: 0,
  passive: true,
  outline: (b) => roundedRect({ x: b.x, y: b.y, width: b.width, depth: b.depth, radius: 0 }),
  draw({ ctx, view, pixelRatio }, { box, label, palette, glow }) {
    if (!label) return;
    const at = view.project(box.x + box.width / 2, box.y + box.depth / 2, box.z + box.height);
    ctx.save();
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.font = `500 ${Math.max(10, Math.min(15, 13 * view.scale * 1.6))}px ui-monospace, "SF Mono", Menlo, monospace`;
    if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0.14em";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = palette.text;
    ctx.globalAlpha *= 0.72 + 0.28 * glow;
    ctx.fillText(label.toUpperCase(), at.x, at.y);
    ctx.restore();
  },
};

export interface CalloutOptions {
  /** Which way the line runs from the point it marks. Default "right". */
  side?: "left" | "right";
  /** The line's length in CSS pixels. Default 96. */
  length?: number;
}

/**
 * A label on a leader line, like a technical drawing: a thin rule runs from the point it marks
 * (the middle of its box, at the top) out to the side, with the label's first line above the rule
 * and any second line below it in mono, both at the far end. Put it at the edge of the object it
 * describes. Write the two lines as `"Title\nsubtitle"`. It always faces the screen.
 */
export function callout(options: CalloutOptions = {}): Look {
  const side = options.side ?? "right";
  const length = options.length ?? 96;
  return {
    defaultHeight: 0,
    passive: true,
    outline: (b) => roundedRect({ x: b.x, y: b.y, width: b.width, depth: b.depth, radius: 0 }),
    draw({ ctx, view, pixelRatio }, { box, label, palette, glow }) {
      if (!label) return;
      const at = view.project(box.x + box.width / 2, box.y + box.depth / 2, box.z + box.height);
      const dir = side === "right" ? 1 : -1;
      const end = at.x + dir * length;
      const [title, subtitle] = label.split("\n");
      ctx.save();
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.strokeStyle = `rgba(${palette.line}, ${0.75 + 0.25 * glow})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(at.x, at.y);
      ctx.lineTo(end, at.y);
      ctx.stroke();
      ctx.textAlign = side === "right" ? "right" : "left";
      ctx.fillStyle = palette.text;
      if (title) {
        ctx.font = `600 13px -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif`;
        ctx.textBaseline = "bottom";
        ctx.fillText(title, end, at.y - 6);
      }
      if (subtitle) {
        ctx.font = `400 12px ui-monospace, "SF Mono", Menlo, monospace`;
        ctx.textBaseline = "top";
        ctx.globalAlpha *= 0.62;
        ctx.fillText(subtitle, end, at.y + 6);
      }
      ctx.restore();
    },
  };
}
