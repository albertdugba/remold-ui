import svgpath from "svgpath";

/**
 * SVG basic shapes as path data.
 *
 * Icons are rarely one `<path>`: they mix circles, rounded rectangles, lines and polygons. A morph
 * needs one path, so each shape is turned into the path the browser would draw for it, following
 * the SVG spec: missing numbers are 0, a rect with only `rx` uses it for `ry` too (and the other
 * way round), corners are clamped to half the size, and a shape with no size draws nothing.
 * Every closed shape runs clockwise from the same starting point the browser uses.
 *
 * `transform` attributes aren't applied: flatten them in your icon first.
 */

/** A shape's attributes, as an SVG element or an icon set (`[tag, attributes]`) gives them. */
export type ShapeAttributes = Readonly<Record<string, string | number | undefined>>;

/** One element of an icon: its tag and attributes. Lucide's `IconNode` entries have this shape. */
export type ShapeNode = readonly [tag: string, attributes: ShapeAttributes];

const SHAPES = new Set(["path", "circle", "ellipse", "rect", "line", "polyline", "polygon"]);

/** Short, exact-enough numbers: 3 decimals at most, no trailing zeros. */
function n(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;

  return Object.is(rounded, -0) ? "0" : String(rounded);
}

function number(tag: string, attributes: ShapeAttributes, name: string): number {
  const raw = attributes[name];

  if (raw === undefined || raw === "") return 0;

  if (typeof raw === "number") {
    if (Number.isFinite(raw)) return raw;
  } else if (/^\s*[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?(px)?\s*$/i.test(raw)) {
    return parseFloat(raw);
  }
  throw new RangeError(
    `shapeToPath: <${tag}> has ${name}="${raw}", which isn't a plain number (percentages and units other than px can't be resolved without a page)`,
  );
}

function points(tag: string, raw: string | number | undefined): number[] {
  if (raw === undefined) return [];
  const values = String(raw)
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);
  if (values.some((v) => !Number.isFinite(v))) throw new RangeError(`shapeToPath: <${tag}> has points="${raw}", which aren't all numbers`);
  // An odd number out is ignored, as the spec says.
  return values.length % 2 ? values.slice(0, -1) : values;
}

/**
 * The path data for one SVG shape, or `""` when it draws nothing (no size, too few points, or a
 * tag that isn't a shape, such as `<g>` or `<text>`).
 *
 * ```ts
 * shapeToPath("circle", { cx: 12, cy: 12, r: 10 }); // "M22 12A10 10 0 0 1 2 12A10 10 0 0 1 22 12Z"
 * ```
 */
export function shapeToPath(tag: string, attributes: ShapeAttributes): string {
  const name = tag.toLowerCase();
  if (!SHAPES.has(name)) return "";
  const get = (key: string) => number(name, attributes, key);

  switch (name) {
    case "path":
      return String(attributes.d ?? "").trim();
    case "circle":
    case "ellipse": {
      const cx = get("cx");
      const cy = get("cy");
      const rx = name === "circle" ? get("r") : get("rx");
      const ry = name === "circle" ? rx : get("ry");
      if (rx <= 0 || ry <= 0) return "";
      return `M${n(cx + rx)} ${n(cy)}A${n(rx)} ${n(ry)} 0 0 1 ${n(cx - rx)} ${n(cy)}A${n(rx)} ${n(ry)} 0 0 1 ${n(cx + rx)} ${n(cy)}Z`;
    }
    case "rect": {
      const x = get("x");
      const y = get("y");
      const width = get("width");
      const height = get("height");
      if (width <= 0 || height <= 0) return "";
      const hasRx = attributes.rx !== undefined && attributes.rx !== "auto";
      const hasRy = attributes.ry !== undefined && attributes.ry !== "auto";
      let rx = hasRx ? Math.max(0, get("rx")) : 0;
      let ry = hasRy ? Math.max(0, get("ry")) : 0;
      if (hasRx && !hasRy) ry = rx;
      if (hasRy && !hasRx) rx = ry;
      rx = Math.min(rx, width / 2);
      ry = Math.min(ry, height / 2);
      if (rx === 0 || ry === 0) return `M${n(x)} ${n(y)}H${n(x + width)}V${n(y + height)}H${n(x)}Z`;
      const arc = (toX: number, toY: number) => `A${n(rx)} ${n(ry)} 0 0 1 ${n(toX)} ${n(toY)}`;
      return (
        `M${n(x + rx)} ${n(y)}H${n(x + width - rx)}${arc(x + width, y + ry)}` +
        `V${n(y + height - ry)}${arc(x + width - rx, y + height)}` +
        `H${n(x + rx)}${arc(x, y + height - ry)}` +
        `V${n(y + ry)}${arc(x + rx, y)}Z`
      );
    }
    case "line":
      return `M${n(get("x1"))} ${n(get("y1"))}L${n(get("x2"))} ${n(get("y2"))}`;
    default: {
      // polyline and polygon
      const p = points(name, attributes.points);
      if (p.length < 4) return "";
      let d = `M${n(p[0]!)} ${n(p[1]!)}`;
      for (let i = 2; i < p.length; i += 2) d += `L${n(p[i]!)} ${n(p[i + 1]!)}`;
      return name === "polygon" ? `${d}Z` : d;
    }
  }
}

/**
 * Several shapes as one path, in drawing order: an icon made of a circle, two lines and a path
 * becomes a single `d` that a morph can work with. Takes `[tag, attributes]` pairs, the format
 * icon sets such as Lucide publish (`IconNode`).
 */
export function shapesToPath(nodes: Iterable<ShapeNode>): string {
  let d = "";
  for (const [tag, attributes] of nodes) d += absoluteStart(shapeToPath(tag, attributes));
  return d;
}

/**
 * A path's first `m` is absolute on its own, but relative once it follows another shape (icon
 * sets often write `m21 21-4.3-4.3`). Normalize that first move before joining the paths.
 */
function absoluteStart(d: string): string {
  if (!/^m/.test(d)) return d;
  const path = svgpath(d) as ReturnType<typeof svgpath> & { err: string };
  if (path.err) throw new Error(`Invalid path data: ${path.err}`);
  return path.toString();
}
