"use client";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { shapes } from "@remold-ui/core";
import { Remold } from "@remold-ui/react/canvas";
import { useEffect, useState } from "react";
import { useScene } from "./use-scene";
import "./particle-shapes.css";

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
  markFace: "#f5f3ff",
  markEdge: "#7c3aed",
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

/** A honeybee, nose to the right: striped abdomen, thorax, head, eyes, antennae, legs and wings. */
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

/** A butterfly wing reaching out to the right from the body, edged dark and glowing amber inside. */
const butterflyWing = (radii: [number, number], angle: number, height: number) =>
  shapes
    .oval({ radii, edge: 0.3 })
    .at([radii[0], 0, 0])
    .rotate({ z: angle })
    .rotate({ y: 18 })
    .mirror("x")
    .at([0, height, 0])
    .tone(({ along }) => (along > 0.97 ? "wingEdge" : along > 0.55 ? "orange" : "amber"));

/** A butterfly seen from above: four wings in a shallow V, a slender body, a head and two antennae. */
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

/** The Remold mark's path, made solid: a pale face front and back, with violet edges. */
const MARK = "M7 23.5V8.5A1.5 1.5 0 0 1 8.5 7H14A11 11 0 0 1 25 18H18A4 4 0 0 0 14 14V23.5A1.5 1.5 0 0 1 12.5 25H8.5A1.5 1.5 0 0 1 7 23.5Z";
const logo = shapes.fromPath(MARK, { depth: 0.45 }).tone(({ z }) => (Math.abs(z) > 0.22 ? "markFace" : "markEdge"));

const SHAPES = { galaxy, helix, lorenz, bee, butterfly, logo };

export const PARTICLE_SHAPES = ["galaxy", "helix", "lorenz", "bee", "butterfly", "logo"] as const;
export type ParticleShape = (typeof PARTICLE_SHAPES)[number];

const NAMES: Record<ParticleShape, string> = {
  galaxy: "Spiral galaxy",
  helix: "Double helix",
  lorenz: "Lorenz attractor",
  bee: "Honeybee",
  butterfly: "Butterfly",
  logo: "Remold mark",
};

/** A still field of faint stars behind the dots, the same every time. */
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
  /** The shape the dots form. */
  shape: ParticleShape;
  /** Called when a shape is picked from the row of names. */
  onShapeChange?: (shape: ParticleShape) => void;
  /** Stop the turning. It also holds still offscreen and with reduced motion. */
  paused?: boolean;
  /** How many dots. Fewer are used on narrow screens. Default 2600. */
  count?: number;
}

/** Thousands of dots that turn in 3D and flow from one shape into the next. */
export function ParticleShapes({ shape, onShapeChange, paused = false, count = 2600 }: ParticleShapesProps) {
  const [dots, setDots] = useState(count);
  useEffect(() => {
    setDots(window.matchMedia("(max-width: 520px)").matches ? Math.round(count * 0.6) : count);
  }, [count]);

  return (
    <figure className="pts">
      <Remold.Canvas draw={drawStars} className="pts-canvas" aria-hidden="true" />
      <Remold.Particles
        shape={SHAPES[shape]}
        count={dots}
        label={`Particles forming a ${NAMES[shape].toLowerCase()}`}
        palette={PALETTE}
        pairing="flow"
        transition={{ type: "scatter", spread: 1.3, hold: 0.35, stagger: 0.5 }}
        camera={{ spin: paused ? 0 : 0.035, tilt: 24 }}
        blend="add"
        dot="square"
        radius={0.9}
        padding={6}
        pointer={{ radius: 110, strength: 28 }}
        spring={{ duration: 1.8, bounce: 0.08 }}
        className="pts-canvas"
      />
      <figcaption className="pts-caption">
        <ToggleGroup
          className="pts-shapes"
          aria-label="Shape"
          value={[shape]}
          onValueChange={(values) => values[0] && onShapeChange?.(values[0] as ParticleShape)}
        >
          {PARTICLE_SHAPES.map((name) => (
            <Toggle key={name} value={name} className="pts-shape">
              {NAMES[name]}
            </Toggle>
          ))}
        </ToggleGroup>
      </figcaption>
    </figure>
  );
}

// The docs demo: a short scripted scene that plays the element above. Your app doesn't need it.

const BEATS: readonly { shape: ParticleShape; ms: number }[] = [
  { shape: "galaxy", ms: 6000 },
  { shape: "helix", ms: 6000 },
  { shape: "lorenz", ms: 7000 },
  { shape: "bee", ms: 7000 },
  { shape: "butterfly", ms: 7000 },
  { shape: "logo", ms: 7000 },
];

const fromBeat = (step: number) => BEATS[step]!.shape;

export interface ParticleShapesDemoProps {
  /** On the home page, whether its card is playing. */
  playing?: boolean;
}

export function ParticleShapesDemo({ playing }: ParticleShapesDemoProps = {}) {
  const { ref, state, takeOver } = useScene(BEATS, fromBeat, playing ?? true);
  return (
    <div ref={ref} className="pts-stage not-prose">
      <ParticleShapes shape={state} onShapeChange={takeOver} paused={playing === false} />
    </div>
  );
}
