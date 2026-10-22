/**
 * Particles: thousands of dots rebuilding themselves into SVG shapes and words. Every shape is
 * sampled with `samplePath` or `sampleTextPoints`, and `particles` pairs each dot with a nearby spot
 * in the next shape (no ids), then springs it there.
 */
import { particles, sampleTextPoints, type Particles as ParticlesHandle } from "@remold-ui/canvas";
import { samplePath, type Point } from "@remold-ui/core";
import { useEffect, useRef, useState } from "react";
import { useAutoplay, type DemoProps, type Example } from "../examples/types";
import { useMotion } from "../motion";
import { Segmented } from "../ui/controls";

type Shape = "Heart" | "Bolt" | "Ring" | "Star" | "Word";
type Style = "Fill" | "Outline" | "Scatter";
type Density = "800" | "3,000" | "6,000";

const SHAPES: Shape[] = ["Heart", "Bolt", "Ring", "Star", "Word"];
const STYLES: Style[] = ["Fill", "Outline", "Scatter"];
const DENSITIES: Density[] = ["800", "3,000", "6,000"];

/** Invented shapes on a 100 × 100 grid. */
const star = (() => {
  const corners = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 48 : 20;
    const a = (i / 10) * 2 * Math.PI - Math.PI / 2;
    return `${(50 + r * Math.cos(a)).toFixed(2)} ${(52 + r * Math.sin(a)).toFixed(2)}`;
  });
  return `M${corners.join(" L")} Z`;
})();
const PATHS: Record<Exclude<Shape, "Word">, string> = {
  Heart: "M50 90 C20 68 4 50 4 31 C4 16 15 6 28 6 C38 6 46 12 50 21 C54 12 62 6 72 6 C85 6 96 16 96 31 C96 50 80 68 50 90 Z",
  Bolt: "M60 2 L16 58 H46 L38 98 L86 38 H54 Z",
  Ring: "M50 4 A46 46 0 1 1 49.99 4 Z M50 26 A24 24 0 1 0 50.01 26 Z",
  Star: star,
};
const FONT = `700 200px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif`;

function sample(shape: Shape, style: Style, count: number): Point[] {
  const jitter = style === "Scatter" ? 0.9 : 0;
  if (shape === "Word") return sampleTextPoints("Hello", { font: FONT, count, jitter });
  return samplePath(PATHS[shape], { count, jitter, mode: style === "Outline" ? "outline" : "fill", fillRule: "evenodd" });
}

const toCount = (d: Density) => Number(d.replace(",", ""));
/** Denser shapes get smaller dots; outlines get bigger ones, since they're a single line. */
const radiusFor = (count: number, style: Style) => (style === "Outline" ? 2.2 : count <= 800 ? 2.6 : count <= 3000 ? 1.5 : 1.1);

function ParticlesDemo({ preview, autoplay }: DemoProps) {
  const { loop, reducedMotion } = useMotion();
  const [shape, setShape] = useState<Shape>("Heart");
  const [style, setStyle] = useState<Style>("Fill");
  const [density, setDensity] = useState<Density>(preview ? "3,000" : "3,000");
  const [took, setTook] = useState<number | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const dots = useRef<ParticlesHandle | null>(null);

  useAutoplay(autoplay, 2400, (n) => {
    setShape(SHAPES[(n + 1) % SHAPES.length]!);
    if (n % SHAPES.length === SHAPES.length - 1) setStyle((s) => STYLES[(STYLES.indexOf(s) + 1) % STYLES.length]!);
  });

  useEffect(() => {
    const count = toCount(density);
    dots.current = particles(canvas.current!, {
      points: sample(shape, style, count),
      radius: radiusFor(count, style),
      padding: 28,
      color: (ctx, size) => {
        const g = ctx.createLinearGradient(0, 0, size.width, size.height);
        g.addColorStop(0, "#5eead4");
        g.addColorStop(0.5, "#818cf8");
        g.addColorStop(1, "#f472b6");
        return g;
      },
      reducedMotion,
      loop,
    });
    return () => dots.current?.destroy();
    // Created once with the first shape; later changes morph the same dots instead.
  }, [loop, reducedMotion]);

  useEffect(() => {
    const count = toCount(density);
    const started = performance.now();
    const points = sample(shape, style, count);
    dots.current?.to(points, { radius: radiusFor(count, style), label: `${shape}, ${style.toLowerCase()}, ${density} dots` });
    setTook(Math.round(performance.now() - started));
  }, [shape, style, density]);

  return (
    <div className="demo-panel dark particles-demo">
      <canvas ref={canvas} className="particles-canvas" />
      {!preview && (
        <div className="particles-controls">
          <Segmented label="Shape" options={SHAPES} value={shape} onChange={setShape} tone="dark" />
          <Segmented label="Style" options={STYLES} value={style} onChange={setStyle} tone="dark" />
          <Segmented label="Dots" options={DENSITIES} value={density} onChange={setDensity} tone="dark" />
          <p className="particles-stat" aria-live="polite">
            {density} dots{took !== null ? ` · sampled and matched in ${took} ms` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

export const particlesExample: Example = {
  id: "particles",
  category: "Canvas",
  title: "Particles",
  summary: "Thousands of dots that rebuild themselves into any SVG shape or word, with no ids. Hover to push them around.",
  headline: (
    <>
      Any shape,
      <br />
      made of dots.
    </>
  ),
  lead: "Give it an SVG path or some text and it fills the shape with evenly spaced dots. Change the shape and every dot finds a nearby spot in the new one and springs there, keeping its speed if you interrupt it. Spare dots shrink away, new ones grow in. Six thousand dots stay smooth on a plain 2D canvas.",
  tries: [
    "Switch shapes quickly: the dots change course mid-flight without jumping.",
    "Try Outline, then Fill: the edge dots spread inwards.",
    "Pick 6,000 dots and watch the timing: sampling and matching take a few hundred milliseconds at most.",
    "Move the pointer over the dots: they lean away and settle back.",
    "Turn on Reduce motion: shapes swap instantly.",
  ],
  code: `
const dots = particles(canvas, {
  points: samplePath(heart, { count: 3000 }),
  color: (ctx, size) => gradient(ctx, size),
});

dots.to(samplePath(bolt, { count: 3000 }));
dots.to(sampleTextPoints("Hello", { count: 3000 }));
dots.to(samplePath(ring, { mode: "outline", count: 800 }), { radius: 2.2 });
`,
  uses: [
    { name: "samplePath", role: "Fills an SVG path (or traces its outline) with exactly the number of dots asked for." },
    { name: "sampleTextPoints", role: "Draws a word off screen and samples its pixels." },
    { name: "particles", role: "Draws the dots, pairs them between shapes with matchPoints, and springs them with values()." },
  ],
  frame: "panel",
  Demo: ParticlesDemo,
};
