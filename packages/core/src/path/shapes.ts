import { pathReader } from "./parse";

/** A shape's attributes, as an SVG element or an icon set (`[tag, attributes]`) gives them. */
export type ShapeAttributes = Readonly<Record<string, string | number | undefined>>;

/** One element of an icon: its tag and attributes. */
export type ShapeNode = readonly [tag: string, attributes: ShapeAttributes];

const SHAPES = new Set(["path", "circle", "ellipse", "rect", "line", "polyline", "polygon"]);

const PLAIN_NUMBER = /^\s*[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?(px)?\s*$/i;
const LIST_SEPARATOR = /[\s,]+/;
const LEADING_SEPARATORS = /^[\s,]+/;
const RELATIVE_MOVE = /^m/;
const NUMBER_START = /^[\d+\-.]/;
const DECIMALS = 1000;

function format(value: number): string {
  const rounded = Math.round(value * DECIMALS) / DECIMALS;

  return Object.is(rounded, -0) ? "0" : String(rounded);
}

function readNumber(tag: string, attributes: ShapeAttributes, name: string): number {
  const raw = attributes[name];

  if (raw === undefined || raw === "") return 0;

  if (typeof raw === "number" && Number.isFinite(raw)) return raw;

  if (typeof raw === "string" && PLAIN_NUMBER.test(raw)) return parseFloat(raw);

  throw new RangeError(
    `shapeToPath: <${tag}> has ${name}="${raw}", which isn't a plain number (percentages and units other than px can't be resolved without a page)`,
  );
}

function readPoints(tag: string, raw: string | number | undefined): number[] {
  if (raw === undefined) return [];

  const values = String(raw).trim().split(LIST_SEPARATOR).filter(Boolean).map(Number);

  if (values.some((value) => !Number.isFinite(value))) {
    throw new RangeError(`shapeToPath: <${tag}> has points="${raw}", which aren't all numbers`);
  }

  return values.length % 2 ? values.slice(0, -1) : values;
}

type Read = (key: string) => number;

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  if (rx <= 0 || ry <= 0) return "";

  const arcTo = (x: number) => `A${format(rx)} ${format(ry)} 0 0 1 ${format(x)} ${format(cy)}`;

  return `M${format(cx + rx)} ${format(cy)}${arcTo(cx - rx)}${arcTo(cx + rx)}Z`;
}

const hasRadius = (value: string | number | undefined) => value !== undefined && value !== "auto";

function cornerRadii(attributes: ShapeAttributes, read: Read, width: number, height: number) {
  const hasRx = hasRadius(attributes.rx);
  const hasRy = hasRadius(attributes.ry);
  const rx = hasRx ? Math.max(0, read("rx")) : 0;
  const ry = hasRy ? Math.max(0, read("ry")) : 0;

  return {
    rx: Math.min(hasRx || !hasRy ? rx : ry, width / 2),
    ry: Math.min(hasRy || !hasRx ? ry : rx, height / 2),
  };
}

function rectPath(attributes: ShapeAttributes, read: Read): string {
  const [x, y, width, height] = [read("x"), read("y"), read("width"), read("height")];

  if (width <= 0 || height <= 0) return "";

  const { rx, ry } = cornerRadii(attributes, read, width, height);

  if (rx === 0 || ry === 0) {
    return `M${format(x)} ${format(y)}H${format(x + width)}V${format(y + height)}H${format(x)}Z`;
  }

  const arc = (toX: number, toY: number) => `A${format(rx)} ${format(ry)} 0 0 1 ${format(toX)} ${format(toY)}`;
  const [right, bottom] = [x + width, y + height];

  return [
    `M${format(x + rx)} ${format(y)}H${format(right - rx)}${arc(right, y + ry)}`,
    `V${format(bottom - ry)}${arc(right - rx, bottom)}`,
    `H${format(x + rx)}${arc(x, bottom - ry)}`,
    `V${format(y + ry)}${arc(x + rx, y)}Z`,
  ].join("");
}

function polyPath(tag: string, raw: string | number | undefined, closed: boolean): string {
  const values = readPoints(tag, raw);

  if (values.length < 4) return "";

  const pairs = Array.from({ length: values.length / 2 }, (_, index) => [values[index * 2]!, values[index * 2 + 1]!]);
  const path = pairs.map(([x, y], index) => `${index === 0 ? "M" : "L"}${format(x!)} ${format(y!)}`).join("");

  return closed ? `${path}Z` : path;
}

/** The path data for one SVG shape, or `""` when it draws nothing. */
export function shapeToPath(tag: string, attributes: ShapeAttributes): string {
  const name = tag.toLowerCase();

  if (!SHAPES.has(name)) return "";

  const read: Read = (key) => readNumber(name, attributes, key);

  switch (name) {
    case "path":
      return String(attributes.d ?? "").trim();
    case "circle": {
      const radius = read("r");

      return ellipsePath(read("cx"), read("cy"), radius, radius);
    }
    case "ellipse":
      return ellipsePath(read("cx"), read("cy"), read("rx"), read("ry"));
    case "rect":
      return rectPath(attributes, read);
    case "line":
      return `M${format(read("x1"))} ${format(read("y1"))}L${format(read("x2"))} ${format(read("y2"))}`;
    default:
      return polyPath(name, attributes.points, name === "polygon");
  }
}

function absoluteStart(path: string): string {
  if (!RELATIVE_MOVE.test(path)) return path;

  const reader = pathReader(path);

  reader.advance();

  const [x, y] = [reader.number().text, reader.number().text];
  const rest = path.slice(reader.index).replace(LEADING_SEPARATORS, "");
  const following = rest && NUMBER_START.test(rest) ? `l${rest}` : rest;

  return `M${x} ${y}${following}`;
}

/** Several shapes as one path, in drawing order. */
export function shapesToPath(nodes: Iterable<ShapeNode>): string {
  return Array.from(nodes, ([tag, attributes]) => absoluteStart(shapeToPath(tag, attributes))).join("");
}
