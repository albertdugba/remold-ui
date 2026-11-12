import { shapesToPath, type ShapeNode } from "@remold-ui/core";

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
  d: string;
  look: IconLook;
}

const SHAPES = "path, circle, ellipse, rect, line, polyline, polygon";
const NOT_DRAWN = "defs, clipPath, mask, symbol, pattern, marker";
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

export function iconToPath(source: Element): IconPath | null {
  const svg = source.localName === "svg" ? source : source.querySelector("svg");
  const root = svg ?? source;
  const nodes: ShapeNode[] = [];
  let first: Element | null = null;

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
    first ??= shape;
  }
  const d = shapesToPath(nodes);
  if (!d) return null;
  const look: IconLook = {};
  for (const [key, attribute] of LOOK) {
    const value = svg?.getAttribute(attribute) ?? (key === "viewBox" ? null : first?.getAttribute(attribute));
    if (value != null) look[key] = value;
  }
  return { d, look };
}
