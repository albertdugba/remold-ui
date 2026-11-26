/**
 * Turns a frame into what `Remold.Particles` draws. Text and paths are sampled here so each dot can
 * carry a tone from the frame's shade; images take their tones from the colour ramp instead.
 */
import { sampleTextPoints, type ParticlePoint } from "@remold-ui/canvas";
import { samplePath, type Point } from "@remold-ui/core";
import { iconToPath } from "@remold-ui/dom";
import type { IconSvgElement } from "@hugeicons/react";
import type { ParticleShape } from "@remold-ui/react/canvas";
import type { FilmFrame, Shade } from "./document";

const TEXT_SIZE = 160;
const NOISE_SCALE = 0.045;

export const textFont = (weight: number) => `${weight} ${TEXT_SIZE}px system-ui, sans-serif`;

const clampUnit = (value: number) => Math.min(1, Math.max(0, value));

/** A tone for every point, from the shade and where the point sits in the shape. */
export function shadePoints(points: readonly Point[], shade: Shade): ParticlePoint[] {
  if (points.length === 0) return [];
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = Math.max(1, Math.max(...xs) - minX);
  const height = Math.max(1, Math.max(...ys) - minY);
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;
  const reach = Math.hypot(width, height) / 2;

  const toneOf = ({ x, y }: Point): number => {
    switch (shade) {
      case "flat":
        return 1;
      case "gradient":
        return clampUnit(0.15 + 0.85 * (0.35 * ((x - minX) / width) + 0.65 * ((y - minY) / height)));
      case "rings":
        return clampUnit(1 - Math.hypot(x - centerX, y - centerY) / reach);
      case "noise":
        return clampUnit(0.5 + 0.28 * Math.sin(x * NOISE_SCALE + Math.cos(y * NOISE_SCALE * 0.7) * 2) + 0.22 * Math.cos(y * NOISE_SCALE * 1.3 - x * NOISE_SCALE * 0.4));
    }
  };

  return points.map((point) => ({ x: point.x, y: point.y, tone: toneOf(point) }));
}

/** The points for a text or path frame, or null for an image, which the canvas samples itself. */
export function framePoints(frame: FilmFrame, count: number): ParticlePoint[] | null {
  const { source } = frame;
  if (source.kind === "image") return null;
  let points: Point[] = [];
  try {
    points =
      source.kind === "text"
        ? sampleTextPoints(source.text || " ", { count, font: textFont(source.weight) })
        : samplePath(source.path, { count, mode: source.outline ? "outline" : "fill" });
  } catch {
    points = [];
  }
  return shadePoints(points, frame.shade);
}

export function frameShape(frame: FilmFrame, points: readonly ParticlePoint[] | null): ParticleShape {
  if (frame.source.kind === "image") return { image: frame.source.src, by: frame.source.by, pattern: "grid" };
  return { points: points ?? [] };
}

export function frameLabel(frame: FilmFrame): string {
  if (frame.source.kind === "text") return frame.source.text;
  return frame.name;
}

/**
 * An SVG's shapes as one path. Drawn with strokes and no fill, the dots should follow the lines,
 * so it comes back marked as an outline.
 */
export function svgToPath(markup: string): { path: string; outline: boolean } {
  const svg = new DOMParser().parseFromString(markup, "image/svg+xml").querySelector("svg");
  if (!svg) throw new Error("That file has no <svg> in it.");
  const icon = iconToPath(svg);
  if (!icon) throw new Error("That SVG has no shapes to turn into dots.");
  const outline = icon.look.fill === "none" || (icon.look.stroke !== undefined && icon.look.stroke !== "none" && icon.look.fill === undefined);
  return { path: icon.d, outline };
}

const attribute = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** A Hugeicons icon as SVG markup, so it can go through `svgToPath` like an uploaded file. */
export function iconMarkup(icon: IconSvgElement): string {
  const shapes = icon
    .map(([tag, attributes]) => {
      const list = Object.entries(attributes)
        .filter(([name]) => name !== "key")
        .map(([name, value]) => `${attribute(name)}="${String(value)}"`)
        .join(" ");
      return `<${tag} ${list}/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">${shapes}</svg>`;
}
