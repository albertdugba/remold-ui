/**
 * Launch reveal: a product launch hero. Dust drifts in, gathers into the logo, opens out into the
 * wordmark, then the launch line, and loops. Dots are coloured left to right along a gradient
 * by their tone, so the colour sweeps as they travel. "Lumen" and its mark are made up.
 */
import { particles, sampleTextPoints, type Particles } from "@remold-ui/canvas";
import { samplePath, type CloudPoint, type Point } from "@remold-ui/core";
import { Remold } from "@remold-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMotion } from "../motion";

const PALETTE = ["#22d3ee", "#38bdf8", "#818cf8", "#a78bfa", "#e879f9", "#fb7185"];
const DOTS = 3200;
const FONT = `800 200px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif`;
/** The mark: a disc with an off-centre disc cut out, which leaves a thick crescent of light. */
const MARK = "M6 50 A44 44 0 1 1 94 50 A44 44 0 1 1 6 50 Z M34 42 A26 26 0 1 0 86 42 A26 26 0 1 0 34 42 Z";

type Beat = "dust" | "mark" | "word" | "launch";
const BEATS: Beat[] = ["dust", "mark", "word", "launch"];
const LINES: Record<Beat, string> = {
  dust: "Something is coming.",
  mark: "Lumen.",
  word: "Search that reads your whole codebase.",
  launch: "Launch week starts Monday.",
};
const HOLD: Record<Beat, number> = { dust: 1600, mark: 2600, word: 2600, launch: 3000 };

/** Colour each point by how far across the shape it is. */
const sweep = (points: Point[]): CloudPoint[] => {
  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    min = Math.min(min, p.x);
    max = Math.max(max, p.x);
  }
  return points.map((p) => ({ ...p, tone: max > min ? (p.x - min) / (max - min) : 0 }));
};

function beats(): Record<Beat, CloudPoint[]> {
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  // Dust: scattered across a wide field, colours at random.
  const dust = Array.from({ length: DOTS }, () => ({ x: random() * 320, y: random() * 120, tone: random() }));
  return {
    dust,
    mark: sweep(samplePath(MARK, { count: DOTS })),
    word: sweep(sampleTextPoints("Lumen", { font: FONT, count: DOTS })),
    launch: sweep(sampleTextPoints("Launch week", { font: FONT, count: DOTS })),
  };
}

export function LaunchReveal() {
  const { loop, reducedMotion, slow } = useMotion();
  const [beat, setBeat] = useState<Beat>("dust");
  const [round, setRound] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const dots = useRef<Particles | null>(null);
  const shapes = useMemo(beats, []);

  useEffect(() => {
    dots.current = particles(canvas.current!, {
      points: shapes.dust,
      palette: PALETTE,
      radius: 1.6,
      padding: 40,
      spring: { duration: 1.2, bounce: 0.15 },
      label: LINES.dust,
      reducedMotion,
      loop,
    });
    return () => dots.current?.destroy();
  }, [loop, reducedMotion, shapes]);

  useEffect(() => {
    dots.current?.to(shapes[beat], { label: LINES[beat], radius: beat === "dust" ? 1.3 : 1.7 });
    const timer = setTimeout(() => setBeat(BEATS[(BEATS.indexOf(beat) + 1) % BEATS.length]!), HOLD[beat] * (slow ? 2.5 : 1));
    return () => clearTimeout(timer);
  }, [beat, round, shapes, slow]);

  return (
    <div className="pro-stage dark launch">
      <canvas ref={canvas} className="launch-canvas" />
      <Remold.Text className="launch-line" loop={loop} reducedMotion={reducedMotion}>
        {LINES[beat]}
      </Remold.Text>
      <button
        type="button"
        className="launch-replay"
        onClick={() => {
          setBeat("dust");
          setRound((r) => r + 1);
        }}
      >
        Replay
      </button>
    </div>
  );
}
