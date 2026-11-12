import type { LayoutBox } from "../scene";

type Extra = Partial<LayoutBox>;
type Boxes = Record<string, LayoutBox>;
type At = readonly [number, number];

interface BoxOptions {
  x: number;
  y: number;
  width: number;
  depth: number;
  extra?: Extra;
}

interface RingOptions {
  radius: number;
  size: number;
  start?: number;
  at?: At;
  extra?: Extra;
}

interface RowOptions {
  gap: number;
  size: number;
  axis?: "x" | "y";
  at?: At;
  extra?: Extra;
}

interface StackOptions {
  gap: number;
  size: number;
  z?: number;
  at?: At;
  extra?: Extra;
}

interface GridOptions {
  columns: number;
  gap: number;
  size: number;
  at?: At;
  extra?: Extra;
}

const boxesFor = (ids: readonly string[], place: (index: number) => LayoutBox): Boxes =>
  Object.fromEntries(ids.map((id, index) => [id, place(index)]));

const centred = (index: number, count: number, gap: number) => (index - (count - 1) / 2) * gap;

function box({ x, y, width, depth, extra = {} }: BoxOptions): LayoutBox {
  return { x, y, z: 0, width, depth, ...extra };
}

function square(cx: number, cy: number, size: number, extra: Extra = {}): LayoutBox {
  return box({ x: cx - size / 2, y: cy - size / 2, width: size, depth: size, extra });
}

function ring(ids: readonly string[], { radius, size, start = -90, at = [0, 0], extra }: RingOptions): Boxes {
  return boxesFor(ids, (index) => {
    const angle = ((start + (360 * index) / ids.length) * Math.PI) / 180;

    return square(at[0] + Math.cos(angle) * radius, at[1] + Math.sin(angle) * radius, size, extra);
  });
}

function row(ids: readonly string[], { gap, size, axis = "x", at = [0, 0], extra }: RowOptions): Boxes {
  const first = (-(ids.length - 1) * gap) / 2;

  return boxesFor(ids, (index) => {
    const offset = first + index * gap;

    return axis === "x" ? square(at[0] + offset, at[1], size, extra) : square(at[0], at[1] + offset, size, extra);
  });
}

function stack(ids: readonly string[], { gap, size, z = 0, at = [0, 0], extra }: StackOptions): Boxes {
  return boxesFor(ids, (index) => square(at[0], at[1], size, { ...extra, z: z + index * gap }));
}

function grid(ids: readonly string[], { columns, gap, size, at = [0, 0], extra }: GridOptions): Boxes {
  const rows = Math.ceil(ids.length / columns);

  return boxesFor(ids, (index) =>
    square(at[0] + centred(index % columns, columns, gap), at[1] + centred(Math.floor(index / columns), rows, gap), size, extra),
  );
}

export const layout = { box, square, ring, row, stack, grid };
