/**
 * Where to put things in a scene layout, without the arithmetic.
 *
 * ```ts
 * layouts: {
 *   All: { objects: { hub: layout.square(0, 0, 150), ...layout.ring(tiles, { radius: 280, size: 80 }) } },
 *   Stacked: { objects: layout.stack(layers, { size: 300, gap: 22 }) },
 * }
 * ```
 *
 * Positions are floor units, centred on (0, 0) unless you say otherwise; `z` is up. Every helper
 * takes `extra` for anything else a box can carry (height, opacity, label, shape).
 */
import type { LayoutBox } from "../scene";

type Extra = Partial<LayoutBox>;
type Boxes = Record<string, LayoutBox>;

interface BoxOptions {
  x: number;
  y: number;
  width: number;
  depth: number;
  extra?: Extra;
}

/** A box with its top-left corner at (x, y). */
function box({ x, y, width, depth, extra = {} }: BoxOptions): LayoutBox {
  return { x, y, z: 0, width, depth, ...extra };
}

/** A square of `size`, centred on (cx, cy). */
function square(cx: number, cy: number, size: number, extra: Extra = {}): LayoutBox {
  return box({ x: cx - size / 2, y: cy - size / 2, width: size, depth: size, extra });
}

/** Squares spaced evenly round a circle, the first at the top (or at `start` degrees). */
function ring(
  ids: readonly string[],
  {
    radius,
    size,
    start = -90,
    at = [0, 0],
    extra,
  }: { radius: number; size: number; start?: number; at?: readonly [number, number]; extra?: Extra },
): Boxes {
  const out: Boxes = {};

  ids.forEach((id, i) => {
    const angle = ((start + (360 * i) / ids.length) * Math.PI) / 180;
    out[id] = square(at[0] + Math.cos(angle) * radius, at[1] + Math.sin(angle) * radius, size, extra);
  });
  return out;
}

/** Squares in a line along x (or y), `gap` apart centre to centre, centred on `at`. */
function row(
  ids: readonly string[],
  {
    gap,
    size,
    axis = "x",
    at = [0, 0],
    extra,
  }: { gap: number; size: number; axis?: "x" | "y"; at?: readonly [number, number]; extra?: Extra },
): Boxes {
  const out: Boxes = {};
  const first = (-(ids.length - 1) * gap) / 2;

  ids.forEach((id, i) => {
    const offset = first + i * gap;
    out[id] = axis === "x" ? square(at[0] + offset, at[1], size, extra) : square(at[0], at[1] + offset, size, extra);
  });
  return out;
}

/** Squares on top of each other, the first at the bottom, `gap` apart in height, starting at `z`. */
function stack(
  ids: readonly string[],
  { gap, size, z = 0, at = [0, 0], extra }: { gap: number; size: number; z?: number; at?: readonly [number, number]; extra?: Extra },
): Boxes {
  const out: Boxes = {};

  ids.forEach((id, i) => {
    out[id] = square(at[0], at[1], size, { ...extra, z: z + i * gap });
  });
  return out;
}

/** Squares in rows of `columns`, `gap` apart centre to centre, centred on `at`. */
function grid(
  ids: readonly string[],
  { columns, gap, size, at = [0, 0], extra }: { columns: number; gap: number; size: number; at?: readonly [number, number]; extra?: Extra },
): Boxes {
  const out: Boxes = {};
  const rows = Math.ceil(ids.length / columns);

  ids.forEach((id, i) => {
    const column = i % columns;
    const line = Math.floor(i / columns);
    out[id] = square(at[0] + (column - (columns - 1) / 2) * gap, at[1] + (line - (rows - 1) / 2) * gap, size, extra);
  });
  return out;
}

export const layout = { box, square, ring, row, stack, grid };
