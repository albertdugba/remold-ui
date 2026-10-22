/**
 * Turn what someone pastes into path data: raw `d`, or SVG markup with paths and basic shapes.
 * SVG markup is parsed with DOMParser as XML, which never runs scripts or loads anything, and
 * only geometry is read from it. `transform` attributes are not applied.
 */
import { bounds, parsePath, toCubics, type Bounds } from "@remold-ui/core";

const n = (el: Element, name: string) => Number.parseFloat(el.getAttribute(name) ?? "0") || 0;

function pointsToPath(points: string, close: boolean): string {
  const values = points
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter(Number.isFinite);
  if (values.length < 4) return "";
  let d = `M${values[0]} ${values[1]}`;
  for (let i = 2; i + 1 < values.length; i += 2) d += `L${values[i]} ${values[i + 1]}`;
  return close ? `${d}Z` : d;
}

function ellipse(cx: number, cy: number, rx: number, ry: number): string {
  if (rx <= 0 || ry <= 0) return "";
  return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`;
}

function shapeToPath(el: Element): string {
  switch (el.localName) {
    case "path":
      return el.getAttribute("d") ?? "";
    case "rect": {
      const [x, y, w, h] = [n(el, "x"), n(el, "y"), n(el, "width"), n(el, "height")];
      return w > 0 && h > 0 ? `M${x} ${y}h${w}v${h}h${-w}Z` : "";
    }
    case "circle":
      return ellipse(n(el, "cx"), n(el, "cy"), n(el, "r"), n(el, "r"));
    case "ellipse":
      return ellipse(n(el, "cx"), n(el, "cy"), n(el, "rx"), n(el, "ry"));
    case "line":
      return `M${n(el, "x1")} ${n(el, "y1")}L${n(el, "x2")} ${n(el, "y2")}`;
    case "polyline":
      return pointsToPath(el.getAttribute("points") ?? "", false);
    case "polygon":
      return pointsToPath(el.getAttribute("points") ?? "", true);
    default:
      return "";
  }
}

/** Path data from pasted input. Throws with a readable message when there's nothing to draw. */
export function toPathData(input: string): string {
  const text = input.trim();
  if (!text) throw new Error("Paste an SVG or some path data.");
  let d = text;
  if (text.startsWith("<")) {
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    if (doc.querySelector("parsererror")) throw new Error("That SVG couldn't be read.");
    d = [...doc.querySelectorAll("path, rect, circle, ellipse, line, polyline, polygon")].map(shapeToPath).filter(Boolean).join(" ");
    if (!d) throw new Error("No shapes found in that SVG.");
  }
  // Throws with the position of anything it can't read.
  parsePath(d);
  return d;
}

/** The box around both shapes, with some room, as a viewBox. */
export function viewBoxFor(a: string, b: string): string {
  const boxes = [a, b].map((d) => bounds(toCubics(parsePath(d)))).filter((x): x is Bounds => x !== null);
  if (boxes.length === 0) return "0 0 24 24";
  const minX = Math.min(...boxes.map((x) => x.x));
  const minY = Math.min(...boxes.map((x) => x.y));
  const maxX = Math.max(...boxes.map((x) => x.x + x.width));
  const maxY = Math.max(...boxes.map((x) => x.y + x.height));
  const size = Math.max(maxX - minX, maxY - minY, 1);
  const pad = size * 0.12;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return `${cx - size / 2 - pad} ${cy - size / 2 - pad} ${size + pad * 2} ${size + pad * 2}`;
}
