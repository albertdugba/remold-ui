"use client";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { shapes, type Shape, type Vec3 } from "@remold-ui/core";
import { Remold } from "@remold-ui/react/canvas";
import { MotionConfig, motion } from "motion/react";
import { useEffect, useId, useState } from "react";
import { useScene } from "./use-scene";

const PALETTE = {
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
  bagFace: "#52525b",
  bagEdge: "#d4d4d8",
  dealGold: "#fcd34d",
  dealEdge: "#f59e0b",
  handle: "#fbbf24",
  roseFace: "#9f1239",
  roseEdge: "#fda4af",
  tag: "#fb7185",
  sparkle: "#fef3c7",
  headline: "#fafafa",
  offer: "#fcd34d",
  dragonGlow: "#6366f1",
};


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

const BAG = "M18 30L82 30L88 96L12 96Z";
const BAG_DEPTH = 0.42;

const ring = (x: number, y: number, outer: number, inner: number) =>
  `M${x - outer} ${y}A${outer} ${outer} 0 1 0 ${x + outer} ${y}A${outer} ${outer} 0 1 0 ${x - outer} ${y}Z` +
  `M${x - inner} ${y}A${inner} ${inner} 0 1 1 ${x + inner} ${y}A${inner} ${inner} 0 1 1 ${x - inner} ${y}Z`;
const PERCENT = `${ring(36, 52, 11, 5.5)}${ring(64, 78, 11, 5.5)}M66 40L74 40L34 90L26 90Z`;

const handle = shapes
  .curve({
    through: [
      [-0.3, 0.86, BAG_DEPTH / 2],
      [-0.27, 1.12, BAG_DEPTH / 2],
      [-0.14, 1.27, BAG_DEPTH / 2],
      [0.14, 1.27, BAG_DEPTH / 2],
      [0.27, 1.12, BAG_DEPTH / 2],
      [0.3, 0.86, BAG_DEPTH / 2],
    ],
  })
  .mirror("z")
  .tone("handle");

const TAG = "M8 30L30 4L96 4L96 56L30 56ZM24 30A6 6 0 1 0 36 30A6 6 0 1 0 24 30Z";
const SPARKLE = "M50 0L58 42L100 50L58 58L50 100L42 58L0 50L42 42Z";

const heroBag = shapes.compose([
  { share: 40, shape: shapes.fromPath(BAG, { depth: BAG_DEPTH }).tone(({ z }) => (Math.abs(z) > BAG_DEPTH / 2 - 0.02 ? "bagFace" : "bagEdge")) },
  {
    share: 22,
    shape: shapes
      .fromPath(PERCENT, { depth: 0.08, fillRule: "evenodd" })
      .scale(0.64)
      .at([0, -0.03, BAG_DEPTH / 2 + 0.06])
      .tone(({ z }) => (z > BAG_DEPTH / 2 + 0.09 ? "dealGold" : "dealEdge")),
  },
  { share: 7, shape: handle },
]);

const sideBag = shapes
  .compose([
    { share: 14, shape: shapes.fromPath(BAG, { depth: 0.34 }).tone(({ z }) => (Math.abs(z) > 0.15 ? "roseFace" : "roseEdge")) },
    { share: 3, shape: handle.tone("roseEdge") },
  ])
  .scale(0.74)
  .rotate({ y: 26 })
  .at([-1.02, -0.26, -0.36]);

const priceTag = shapes.compose([
  { share: 6, shape: shapes.fromPath(TAG, { depth: 0.06, fillRule: "evenodd" }).tone("tag").scale(0.4).rotate({ z: -58 }).at([1.16, 0.5, 0.26]) },
  { share: 1, shape: shapes.curve({ through: [[0.3, 1.0, 0.21], [0.72, 0.98, 0.24], [1.06, 0.68, 0.26]] }).tone("handle") },
]);

const sparkle = (at: Vec3, size: number) => shapes.fromPath(SPARKLE, { depth: 0.04 }).scale(size).at(at).tone("sparkle");

const SPARKLES: readonly [Vec3, number][] = [
  [[-0.95, 1.05, 0.25], 0.13],
  [[0.95, 1.25, -0.1], 0.1],
  [[1.3, -0.45, 0.3], 0.08],
  [[-1.45, 0.55, 0.15], 0.07],
  [[0.2, 1.5, -0.05], 0.06],
];

const sparkles = shapes.compose(SPARKLES.map(([at, size]) => ({ share: size, shape: sparkle(at, size) })));

const haul = shapes.compose([
  { share: 69, shape: heroBag },
  { share: 17, shape: sideBag },
  { share: 7, shape: priceTag },
  { share: 5, shape: sparkles },
]);

const blackFriday = haul.scale(0.78).at([0.06, -0.16, 0]);

const TEXT_SIZE = 160;

function lettering(text: string, weight: number, tracking: number) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return null;
  const font = `${weight} ${TEXT_SIZE}px ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif`;
  context.font = font;
  context.letterSpacing = `${tracking}px`;
  canvas.width = Math.ceil(context.measureText(text).width) + TEXT_SIZE / 4;
  canvas.height = Math.ceil(TEXT_SIZE * 1.25);
  context.font = font;
  context.letterSpacing = `${tracking}px`;
  context.textBaseline = "middle";
  context.fillText(text, TEXT_SIZE / 8, canvas.height / 2);
  return shapes.fromPixels(context.getImageData(0, 0, canvas.width, canvas.height), { by: "alpha", depth: 0.14 });
}

function blackFridayPoster() {
  const headline = lettering("BLACK FRIDAY", 900, 6);
  const offer = lettering("UP TO 40% OFF", 800, 10);
  if (!headline || !offer) return blackFriday;
  return shapes.compose([
    { share: 36, shape: headline.tone("headline").scale(1.42).at([0, 1.2, 0.1]) },
    { share: 46, shape: haul.scale(0.6).at([0.05, 0.02, 0]) },
    { share: 18, shape: offer.tone("offer").scale(0.92).at([0, -0.98, 0.1]) },
  ]);
}

function useBlackFriday() {
  const [poster, setPoster] = useState<Shape>(blackFriday);
  useEffect(() => setPoster(blackFridayPoster()), []);
  return poster;
}

const DRAGON_IMAGE = "/particles/dragon.webp";
const DRAGON_DOTS = 5;

const dragonPlaceholder = shapes.ellipsoid({ radii: [0.7, 1, 0.4] }).fuzz(0.08).tone("dragonGlow");

function useDragon() {
  const [dragon, setDragon] = useState<{ shape: Shape; palette: Record<string, string> } | null>(null);
  useEffect(() => {
    let live = true;
    const image = new Image();
    image.decoding = "async";
    image.src = DRAGON_IMAGE;
    image
      .decode()
      .then(() => {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context || !live) return;
        context.drawImage(image, 0, 0);
        const portrait = shapes.fromPixels(context.getImageData(0, 0, canvas.width, canvas.height), {
          by: "alpha",
          colors: 64,
          depth: 0.08,
          bulge: 0.28,
        });
        setDragon({ shape: portrait.scale(1.08), palette: { ...portrait.palette } });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return dragon;
}

const SHAPES = { blackFriday, lorenz, bee, butterfly, grok, dragon: dragonPlaceholder };

export const PARTICLE_SHAPES = ["blackFriday", "lorenz", "bee", "butterfly", "grok", "dragon"] as const;
export type ParticleShape = (typeof PARTICLE_SHAPES)[number];

const NAMES: Record<ParticleShape, string> = {
  blackFriday: "Black Friday",
  lorenz: "Lorenz attractor",
  bee: "Honeybee",
  butterfly: "Butterfly",
  grok: "Grok",
  dragon: "Dragon",
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
  const poster = useBlackFriday();
  const dragon = useDragon();
  const id = useId();
  useEffect(() => {
    setDots(window.matchMedia("(max-width: 520px)").matches ? Math.round(count * 0.6) : count);
  }, [count]);

  const turning = paused ? 0 : spin;
  const camera =
    shape === "grok" || shape === "blackFriday" || shape === "dragon"
      ? { spin: turning, tilt: tilt / 3, sway: 28, angle: 0, distance }
      : { spin: turning, tilt, sway: 0, distance };

  return (
    <MotionConfig reducedMotion="user">
      <figure className="pts relative m-0 grid overflow-hidden rounded-[20px] bg-[radial-gradient(120%_90%_at_50%_40%,#15132a_0%,#07070b_70%)]">
        {stars && <Remold.Canvas draw={drawStars} className={CANVAS} aria-hidden="true" />}
        <Remold.Particles
          key={[radius, dot, glow, duration, bounce, pointer].join()}
          shape={shape === "blackFriday" ? poster : shape === "dragon" && dragon ? dragon.shape : SHAPES[shape]}
          count={shape === "dragon" ? dots * DRAGON_DOTS : dots}
          label={`Particles forming a ${NAMES[shape].toLowerCase()}`}
          palette={dragon ? { ...PALETTE, ...dragon.palette } : PALETTE}
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
        <figcaption data-shape-picker className="absolute inset-x-0 bottom-[18px] flex justify-center px-3">
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
    </MotionConfig>
  );
}

const BEATS: readonly { shape: ParticleShape; ms: number }[] = [
  { shape: "blackFriday", ms: 7000 },
  { shape: "lorenz", ms: 7000 },
  { shape: "bee", ms: 7000 },
  { shape: "butterfly", ms: 7000 },
  { shape: "grok", ms: 7000 },
  { shape: "dragon", ms: 7000 },
];

const fromBeat = (step: number) => BEATS[step]!.shape;

export interface ParticleShapesDemoProps extends Omit<ParticleShapesProps, "shape" | "onShapeChange" | "paused"> {
  playing?: boolean;
}

export function ParticleShapesDemo({ playing, ...settings }: ParticleShapesDemoProps = {}) {
  const { ref, state, takeOver } = useScene(BEATS, fromBeat, playing, true);
  return (
    <div ref={ref} className="not-prose grid w-full">
      <ParticleShapes {...settings} shape={state} onShapeChange={takeOver} paused={playing === false} />
    </div>
  );
}
