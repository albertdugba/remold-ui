/**
 * Read an icon from the page as one path, so it can be morphed.
 *
 * Icons from any set (Lucide, Heroicons, your own SVG files) are made of several shapes: paths,
 * circles, rounded rectangles, lines. `iconToPath` reads them in drawing order, turns each into
 * path data (core `shapesToPath`) and joins them, and reads the icon's look from its `<svg>`:
 * the viewBox and how it's painted (fill, stroke, stroke width, line caps and joins).
 *
 * It reads attributes only, never layout, so it's cheap and works on hidden elements. Shapes
 * inside `<defs>`, `<clipPath>`, `<mask>`, `<symbol>`, `<pattern>` and `<marker>` aren't drawn,
 * so they're skipped. `transform` attributes can't be flattened here: an icon that uses them
 * throws, with the element named, so you can flatten it once in your SVG editor.
 */
import { shapesToPath, type ShapeNode } from "@remold-ui/core";

/** How the icon is painted, from its `<svg>` element. Only what the icon sets is included. */
export interface IconLook {
  viewBox?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: string;
  strokeLinecap?: string;
  strokeLinejoin?: string;
  fillRule?: string;
}

export interface IconPath {
  /** Every shape of the icon as one path. */
  d: string;
  look: IconLook;
}

const SHAPES = "path, circle, ellipse, rect, line, polyline, polygon";
const NOT_DRAWN = "defs, clipPath, mask, symbol, pattern, marker";
/** The attributes each shape needs, read as written. */
const GEOMETRY = ["d", "cx", "cy", "r", "rx", "ry", "x", "y", "width", "height", "x1", "y1", "x2", "y2", "points"];
const LOOK: [keyof IconLook, string][] = [
  ["viewBox", "viewBox"],
  ["fill", "fill"],
  ["stroke", "stroke"],
  ["strokeWidth", "stroke-width"],
  ["strokeLinecap", "stroke-linecap"],
  ["strokeLinejoin", "stroke-linejoin"],
  ["fillRule", "fill-rule"],
];

/**
 * The icon in `source` (an `<svg>`, or an element holding one) as a single path and its look, or
 * null when it has no shapes yet.
 *
 * ```ts
 * const { d, look } = iconToPath(document.querySelector(".lucide-heart"))!;
 * ```
 */
export function iconToPath(source: Element): IconPath | null {
  const svg = source.localName === "svg" ? source : source.querySelector("svg");
  const root = svg ?? source;
  const nodes: ShapeNode[] = [];

  for (const shape of root.querySelectorAll(SHAPES)) {
    if (shape.closest(NOT_DRAWN)) continue;

    for (let el: Element | null = shape; el && el !== root.parentElement; el = el.parentElement) {
      if (el.hasAttribute("transform")) {
        throw new RangeError(`iconToPath: <${el.localName}> has a transform, which can't be flattened here. Flatten it in your SVG first.`);
      }
      if (el === root) break;
    }
    const attributes: Record<string, string> = {};
    for (const name of GEOMETRY) {
      const value = shape.getAttribute(name);
      if (value !== null) attributes[name] = value;
    }
    nodes.push([shape.localName, attributes]);
  }
  const d = shapesToPath(nodes);
  if (!d) return null;
  const look: IconLook = {};
  if (svg) {
    for (const [key, attribute] of LOOK) {
      const value = svg.getAttribute(attribute);
      if (value !== null) look[key] = value;
    }
  }
  return { d, look };
}
