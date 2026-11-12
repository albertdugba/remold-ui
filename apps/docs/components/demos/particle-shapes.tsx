"use client";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { shapes } from "@remold-ui/core";
import { Remold } from "@remold-ui/react/canvas";
import { motion } from "motion/react";
import { useEffect, useId, useState } from "react";
import { useScene } from "./use-scene";

const PALETTE = {
  core: "#fff1d6",
  armInner: "#a5b4fc",
  armMiddle: "#8b5cf6",
  armOuter: "#6d28d9",
  strandA: "#67e8f9",
  strandB: "#f0abfc",
  rung: "#64748b",
  pathA: "#fbbf24",
  pathB: "#fb7185",
  pathC: "#f472b6",
  gold: "#fcd34d",
  brown: "#9a3412",
  wing: "#bae6fd",
  amber: "#fbbf24",
  orange: "#f97316",
  wingEdge: "#9a3412",
  grokFace: "#f4f4f5",
  grokEdge: "#71717a",
};

const galaxy = shapes
  .spiral({ arms: 3 })
  .tone(({ group, along }) => (group === 3 ? "core" : along < 0.4 ? "armInner" : along < 0.7 ? "armMiddle" : "armOuter"));

const helix = shapes.helix({ strands: 2, rungs: 26 }).tone(({ group }) => ["strandA", "strandB", "rung"][group]!);

const lorenz = shapes
  .attractor("lorenz")
  .tone(({ along }) => ["pathA", "pathB", "pathC"][Math.round(Math.sin(along * Math.PI * 6) + 1)]!);

const leg = (place: number) =>
  shapes
    .curve({
      through: [
        [0.24 + place * 0.14, -0.18, 0.1],
        [0.2 + place * 0.14, -0.42, 0.3],
        [0.08 + place * 0.22, -0.62, 0.28],
      ],
    })
    .mirror("z");

const wing = (radii: [number, number], angle: number, root: number) =>
  shapes
    .oval({ radii })
    .at([radii[0], 0, 0])
    .rotate({ z: angle })
    .rotate({ x: -35 })
    .mirror("z")
    .at([root, 0.26, 0])
    .tone("wing");

const bee = shapes.compose([
  { share: 36, shape: shapes.ellipsoid({ radii: [0.55, 0.37, 0.37] }).at([-0.28, 0, 0]).stripes({ every: 0.15, tones: ["gold", "brown"] }) },
  { share: 3, shape: shapes.curve({ through: [[-0.8, 0, 0], [-0.9, -0.02, 0], [-1, -0.05, 0]] }).tone("brown") },
  { share: 14, shape: shapes.sphere({ radius: 0.27 }).at([0.38, 0.03, 0]).tone("gold") },
  { share: 8, shape: shapes.ellipsoid({ radii: [0.19, 0.21, 0.19] }).at([0.72, -0.02, 0]).tone("brown") },
  { share: 3, shape: shapes.ellipsoid({ radii: [0.07, 0.1, 0.05] }).at([0.79, 0.03, 0.13]).mirror("z").tone("brown") },
  { share: 3, shape: shapes.curve({ through: [[0.82, 0.14, 0.06], [0.92, 0.42, 0.1], [1.08, 0.46, 0.2]] }).mirror("z").tone("brown") },
  { share: 7, shape: shapes.compose([0, 1, 2].map((place) => ({ share: 1, shape: leg(place) }))).tone("brown") },
  { share: 16, shape: wing([0.5, 0.19], 110, 0.36) },
  { share: 10, shape: wing([0.34, 0.13], 125, 0.26) },
]);

const butterflyWing = (radii: [number, number], angle: number, height: number) =>
  shapes
    .oval({ radii, edge: 0.3 })
    .at([radii[0], 0, 0])
    .rotate({ z: angle })
    .rotate({ y: 18 })
    .mirror("x")
    .at([0, height, 0])
    .tone(({ along }) => (along > 0.97 ? "wingEdge" : along > 0.55 ? "orange" : "amber"));

const butterfly = shapes.compose([
  { share: 34, shape: butterflyWing([0.62, 0.36], 28, 0.1) },
  { share: 24, shape: butterflyWing([0.44, 0.32], -38, -0.06) },
  { share: 8, shape: shapes.ellipsoid({ radii: [0.06, 0.5, 0.06] }).tone("brown") },
  { share: 3, shape: shapes.sphere({ radius: 0.08 }).at([0, 0.56, 0]).tone("brown") },
  {
    share: 3,
    shape: shapes
      .curve({ through: [[0.03, 0.62, 0], [0.12, 0.86, 0.02], [0.24, 1, 0.05]] })
      .mirror("x")
      .tone("brown"),
  },
]);

const GROK =
  "M32 77.8A33.4 33.4 0 0 0 83.3 39C85.5 32 82 20 95 7.3L39.8 62L72.7 40.6A24.8 24.8 0 0 1 41.9 73.7Z" +
  "M70.3 23.1A33.4 33.4 0 0 0 20.8 65.6C18.5 70 22 80 5.2 93L33.6 68A24.8 24.8 0 0 1 60.6 27.8Z";
const grok = shapes.fromPath(GROK, { depth: 0.32 }).tone(({ z }) => (Math.abs(z) > 0.15 ? "grokFace" : "grokEdge"));

const SHAPES = { galaxy, helix, lorenz, bee, butterfly, grok };

export const PARTICLE_SHAPES = ["galaxy", "helix", "lorenz", "bee", "butterfly", "grok"] as const;
export type ParticleShape = (typeof PARTICLE_SHAPES)[number];

const NAMES: Record<ParticleShape, string> = {
  galaxy: "Spiral galaxy",
  helix: "Double helix",
  lorenz: "Lorenz attractor",
  bee: "Honeybee",
  butterfly: "Butterfly",
  grok: "Grok",
};

const SLIDE = { type: "spring" as const, duration: 0.45, bounce: 0.18 };

function drawStars(context: CanvasRenderingContext2D, { width, height }: { width: number; height: number }) {
  const scatter = (seed: number) => {
    const value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  };
  context.fillStyle = "#e0e7ff";
  for (let star = 0; star < Math.round((width * height) / 2400); star++) {
    context.globalAlpha = 0.15 + scatter(star * 3) * 0.35;
    context.fillRect(scatter(star * 3 + 1) * width, scatter(star * 3 + 2) * height, 1, 1);
  }
  context.globalAlpha = 1;
}

export interface ParticleShapesProps {
  shape: ParticleShape;
  onShapeChange?: (shape: ParticleShape) => void;
  paused?: boolean;
  count?: number;
  radius?: number;
  dot?: "square" | "circle";
  glow?: boolean;
  stars?: boolean;
  spin?: number;
  tilt?: number;
  distance?: number;
  transition?: "scatter" | "direct";
  spread?: number;
  hold?: number;
  stagger?: number;
  pairing?: "flow" | "match" | "index";
  duration?: number;
  bounce?: number;
  pointer?: boolean;
}

const CANVAS = "col-start-1 row-start-1 block h-[clamp(340px,52vw,520px)] w-full in-[.hp-card.wide]:h-[clamp(480px,52vw,680px)]";

export function ParticleShapes({
  shape,
  onShapeChange,
  paused = false,
  count = 2600,
  radius = 0.9,
  dot = "square",
  glow = true,
  stars = true,
  spin = 0.035,
  tilt = 24,
  distance = 4,
  transition = "scatter",
  spread = 1.3,
  hold = 0.25,
  stagger = 0.35,
  pairing = "flow",
  duration = 1.3,
  bounce = 0.08,
  pointer = true,
}: ParticleShapesProps) {
  const [dots, setDots] = useState(count);
  const id = useId();
  useEffect(() => {
    setDots(window.matchMedia("(max-width: 520px)").matches ? Math.round(count * 0.6) : count);
  }, [count]);

  const turning = paused ? 0 : spin;
  const camera =
    shape === "grok"
      ? { spin: turning, tilt: tilt / 3, sway: 28, angle: 0, distance }
      : { spin: turning, tilt, sway: 0, distance };

  return (
    <figure className="pts relative m-0 grid overflow-hidden rounded-[20px] bg-[radial-gradient(120%_90%_at_50%_40%,#15132a_0%,#07070b_70%)]">
      {stars && <Remold.Canvas draw={drawStars} className={CANVAS} aria-hidden="true" />}
      <Remold.Particles
        key={[radius, dot, glow, duration, bounce, pointer].join()}
        shape={SHAPES[shape]}
        count={dots}
        label={`Particles forming a ${NAMES[shape].toLowerCase()}`}
        palette={PALETTE}
        pairing={pairing}
        transition={transition === "scatter" ? { type: "scatter", spread, hold, stagger } : "direct"}
        camera={camera}
        blend={glow ? "add" : "normal"}
        dot={dot}
        radius={radius}
        padding={6}
        pointer={pointer ? { radius: 110, strength: 28 } : false}
        spring={{ duration, bounce }}
        className={CANVAS}
      />
      <figcaption className="absolute inset-x-0 bottom-[18px] flex justify-center px-3">
        <ToggleGroup
          className="inline-flex max-w-full overflow-x-auto rounded-full bg-[rgb(20_20_28/0.55)] p-1 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07),inset_0_1px_0_rgb(255_255_255/0.08),0_10px_30px_-12px_rgb(0_0_0/0.6)] backdrop-blur-[14px] backdrop-saturate-[1.4] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Shape"
          value={[shape]}
          onValueChange={(values) => values[0] && onShapeChange?.(values[0] as ParticleShape)}
        >
          {PARTICLE_SHAPES.map((name) => (
            <Toggle
              key={name}
              value={name}
              className="relative inline-flex h-[34px] flex-none cursor-pointer items-center rounded-full border-0 bg-transparent px-3.5 text-[13px] font-medium tracking-[-0.005em] whitespace-nowrap text-white/50 transition-colors duration-250 ease-out not-data-pressed:hover:text-white/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 data-pressed:text-white motion-reduce:transition-none"
            >
              {name === shape && <motion.span layoutId={`${id}-picked`} className="absolute inset-0 rounded-[inherit] bg-white/11 shadow-[inset_0_1px_0_rgb(255_255_255/0.1)]" transition={SLIDE} />}
              <span className="relative">{NAMES[name]}</span>
            </Toggle>
          ))}
        </ToggleGroup>
      </figcaption>
    </figure>
  );
}

const BEATS: readonly { shape: ParticleShape; ms: number }[] = [
  { shape: "galaxy", ms: 6000 },
  { shape: "helix", ms: 6000 },
  { shape: "lorenz", ms: 7000 },
  { shape: "bee", ms: 7000 },
  { shape: "butterfly", ms: 7000 },
  { shape: "grok", ms: 7000 },
];

const fromBeat = (step: number) => BEATS[step]!.shape;

export interface ParticleShapesDemoProps extends Omit<ParticleShapesProps, "shape" | "onShapeChange" | "paused"> {
  playing?: boolean;
}

export function ParticleShapesDemo({ playing, ...settings }: ParticleShapesDemoProps = {}) {
  const { ref, state, takeOver } = useScene(BEATS, fromBeat, playing ?? true);
  return (
    <div ref={ref} className="not-prose grid w-full">
      <ParticleShapes {...settings} shape={state} onShapeChange={takeOver} paused={playing === false} />
    </div>
  );
}
