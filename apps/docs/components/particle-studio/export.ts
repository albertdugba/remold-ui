/**
 * Turns a film into something to take away: the document as JSON, or a React component that plays
 * it with `@remold-ui/react/canvas`, sampling and shading text and paths the same way the studio does.
 */
import { componentName } from "../studio/export";
import { colorRamp, type Film } from "./document";

export const toJSON = (film: Film) => JSON.stringify(film, null, 2);

const literal = (value: unknown) => JSON.stringify(value, null, 2);

export function toReact(film: Film): string {
  const name = componentName(film.title);
  const { look, canvas } = film;
  const frames = film.frames.map(({ ms, source, shade, transition }) => ({ ms, source, shade, transition }));
  const ascii = look.dot === "ascii" ? `\n        ascii={{ characters: ${JSON.stringify(look.characters)}, size: ${look.cell} }}` : "";
  const camera = look.camera.on ? `\n        camera={{ spin: ${look.camera.spin}, tilt: ${look.camera.tilt} }}` : "";

  return `"use client";
// ${film.title}: made in the Remold particle studio.
import { sampleTextPoints, type ParticlePoint } from "@remold-ui/canvas";
import { samplePath, type Point } from "@remold-ui/core";
import { Remold, type ParticleShape } from "@remold-ui/react/canvas";
import { useEffect, useMemo, useState } from "react";

type Shade = "flat" | "gradient" | "rings" | "noise";
type Source = { kind: "text"; text: string; weight: number } | { kind: "image"; src: string; by: "dark" | "light" | "alpha" } | { kind: "path"; path: string; outline?: boolean };
type Frame = { ms: number; source: Source; shade: Shade; transition: "direct" | "scatter" };

const COUNT = ${film.count};
const PALETTE = ${literal(colorRamp(look.colors))};
const FRAMES: Frame[] = ${literal(frames)};

const clampUnit = (value: number) => Math.min(1, Math.max(0, value));

/** A tone for every point, which picks its colour${look.dot === "ascii" ? " and character" : ""}. */
function shade(points: readonly Point[], how: Shade): ParticlePoint[] {
  if (points.length === 0) return [];
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = Math.max(1, Math.max(...xs) - minX);
  const height = Math.max(1, Math.max(...ys) - minY);
  const reach = Math.hypot(width, height) / 2;
  const tone = ({ x, y }: Point) => {
    if (how === "flat") return 1;
    if (how === "gradient") return clampUnit(0.15 + 0.85 * (0.35 * ((x - minX) / width) + 0.65 * ((y - minY) / height)));
    if (how === "rings") return clampUnit(1 - Math.hypot(x - minX - width / 2, y - minY - height / 2) / reach);
    return clampUnit(0.5 + 0.28 * Math.sin(x * 0.045 + Math.cos(y * 0.0315) * 2) + 0.22 * Math.cos(y * 0.0585 - x * 0.018));
  };
  return points.map((point) => ({ x: point.x, y: point.y, tone: tone(point) }));
}

function shapeOf(frame: Frame): ParticleShape {
  const { source } = frame;
  if (source.kind === "image") return { image: source.src, by: source.by, pattern: "grid" };
  const points = source.kind === "text" ? sampleTextPoints(source.text, { count: COUNT, font: \`\${source.weight} 160px system-ui, sans-serif\` }) : samplePath(source.path, { count: COUNT, mode: source.outline ? "outline" : "fill" });
  return { points: shade(points, frame.shade) };
}

export function ${name}() {
  const [at, setAt] = useState(0);
  const frame = FRAMES[at]!;
  const shape = useMemo(() => shapeOf(frame), [frame]);

  useEffect(() => {
    const timer = setTimeout(() => setAt((i) => (i + 1) % FRAMES.length), frame.ms);
    return () => clearTimeout(timer);
  }, [frame]);

  return (
    <div style={{ width: ${canvas.width}, maxWidth: "100%", aspectRatio: "${canvas.width} / ${canvas.height}", background: ${JSON.stringify(canvas.background)} }}>
      <Remold.Particles
        style={{ display: "block", width: "100%", height: "100%" }}
        shape={shape}
        label=${JSON.stringify(film.title)}
        count={COUNT}
        palette={PALETTE}
        dot="${look.dot}"
        radius={${look.radius}}${ascii}${camera}
        blend="${look.blend}"
        pointer={false}
        transition={frame.transition}
      />
    </div>
  );
}
`;
}
