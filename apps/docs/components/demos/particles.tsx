"use client";
import type { Point } from "@remold-ui/core";
import { Remold, type ParticleShape } from "@remold-ui/react";
import { useEffect, useRef, useState } from "react";
import { Frame, Segmented } from "./frame";
import "./particles.css";

const HEADSET =
  "M14 36H86C94 36 98 42 98 50V60C98 68 93 73 86 73H66C61 73 58 65 50 65S39 73 34 73H14C7 73 2 68 2 60V50C2 42 6 36 14 36Z" +
  "M22 22H78C84 22 87 26 87 31H13C13 26 16 22 22 22Z";
const SNEAKER =
  "M3 74.5H91C97 74.5 99 82.5 92 84.5H9C2 84.5 0 76.5 3 74.5Z" +
  "M8 72C6 62 8 52 12 46L16 41C22 44 30 46 36 43L44 38C50 45 58 51 70 55C82 58 92 61 95 67C96 70 94 72 91 72Z" +
  "M47 46.6A1.6 1.6 0 1 0 47 49.8A1.6 1.6 0 1 0 47 46.6Z" +
  "M53 50.6A1.6 1.6 0 1 0 53 53.8A1.6 1.6 0 1 0 53 50.6Z" +
  "M59 53.8A1.6 1.6 0 1 0 59 57A1.6 1.6 0 1 0 59 53.8Z";

const LOGO =
  "M7 23.5V8.5A1.5 1.5 0 0 1 8.5 7H14A11 11 0 0 1 25 18H18A4 4 0 0 0 14 14V23.5A1.5 1.5 0 0 1 12.5 25H8.5A1.5 1.5 0 0 1 7 23.5Z";

const PIN =
  "M50 4C31 4 17 18 17 37C17 62 50 96 50 96S83 62 83 37C83 18 69 4 50 4Z" +
  "M50 24A13 13 0 1 0 50 50A13 13 0 1 0 50 24Z";

const NOTE =
  "M19 76a11 8 0 1 1 22 0a11 8 0 1 1-22 0Z" +
  "M61 68a11 8 0 1 1 22 0a11 8 0 1 1-22 0Z" +
  "M36 26H41V76H36Z" +
  "M78 18H83V68H78Z" +
  "M36 24L83 12V22L36 34Z";

function bars(): Point[] {
  const count = 12;
  const raw = Array.from(
    { length: count },
    (_, index) =>
      0.2 + 0.8 * Math.abs(Math.sin(index * 1.7 + Math.random() * 3)) * Math.random(),
  );
  const top = Math.max(...raw);
  const points: Point[] = [];

  raw.forEach((height, index) => {
    const half = (height / top) * 40;
    const x = 4.6 + index * 7.8;

    for (let row = 0; row < 50; row++) {
      const y = 50 - half + (2 * half * row) / 49;

      for (const offset of [0.8, 2.5, 4.2]) points.push({ x: x + offset, y });
    }
  });

  return points;
}

function snowflake(): string {
  const bar = (
    fromX: number,
    fromY: number,
    angle: number,
    length: number,
    half: number,
  ) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const at = (along: number, across: number) =>
      `${(50 + fromX + along * cos - across * sin).toFixed(2)} ${(
        50 +
        fromY +
        along * sin +
        across * cos
      ).toFixed(2)}`;
    return `M${at(0, -half)}L${at(length, -half)}L${at(length, half)}L${at(0, half)}Z`;
  };

  let path = "";

  for (let arm = 0; arm < 6; arm++) {
    const angle = (arm * Math.PI) / 3;

    path += bar(0, 0, angle, 47, 3);

    for (const [distance, length] of [
      [24, 15],
      [36, 9],
    ] as const) {
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      path +=
        bar(x, y, angle + Math.PI / 4, length, 2.4) +
        bar(x, y, angle - Math.PI / 4, length, 2.4);
    }
  }

  return path;
}

const COUNT = 1800;
const MAX_IMAGE_COUNT = 9000;
const FLAKE = snowflake();
const JACKET_IMAGE = "/returns-field-jacket.jpg";
const DEMO_PALETTE = [
  "#79afff",
  "#23251b",
  "#363a29",
  "#484d37",
  "#5b6046",
  "#707456",
  "#8a8060",
  "#aa946e",
] as const;
const HOME_PALETTE = ["#2563eb"] as const;

const FRAMES: Record<string, { label: string; shape: () => ParticleShape }> = {
  Text: { label: "Just landed", shape: () => "Just landed" },
  Headset: { label: "A headset", shape: () => ({ path: HEADSET }) },
  Sneaker: {
    label: "A running shoe",
    shape: () => ({ path: SNEAKER, fillRule: "evenodd" }),
  },
  Logo: { label: "A logo", shape: () => ({ path: LOGO }) },
  Snowflake: { label: "A snowflake", shape: () => ({ path: FLAKE }) },
  Pin: {
    label: "A map pin",
    shape: () => ({ path: PIN, fillRule: "evenodd" }),
  },
  Note: { label: "A music note", shape: () => ({ path: NOTE }) },
  Image: {
    label: "An olive field jacket rendered as halftone particles",
    shape: () => ({
      image: JACKET_IMAGE,
      by: "dark",
      threshold: 100,
      pattern: "grid",
      jitter: 0,
    }),
  },

  Bars: { label: "Equaliser bars", shape: () => ({ points: bars() }) },
};

const CHOICES = {
  Text: ["Text"],
  Headset: ["Headset"],
  Sneaker: ["Sneaker"],
  Logo: ["Logo"],
  Snowflake: ["Snowflake"],
  Pin: ["Pin"],
  Song: ["Note", "Bars"],
  Image: ["Image"],
} as const;
type Choice = keyof typeof CHOICES;
const ALL_FRAMES = Object.values(CHOICES).flat();
const BEAT = 900;

const BOUNCE = 420;

export function ParticlesDemo({
  framed = true,
  index,
}: {
  framed?: boolean;
  index?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [choice, setChoice] = useState<Choice>("Text");
  // Scatter dissolves each shape into a glittering cloud before it gathers into the next.
  const [motion, setMotion] = useState<"Scatter" | "Direct">("Scatter");
  const [frame, setFrame] = useState({
    name: "Text",
    shape: FRAMES.Text!.shape(),
    beat: false,
  });
  const [stageWidth, setStageWidth] = useState(0);

  const driven = index === undefined ? null : ALL_FRAMES[index % ALL_FRAMES.length]!;

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const updateWidth = () => setStageWidth(Math.round(container.clientWidth / 64) * 64);

    updateWidth();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateWidth);

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const show = (name: string, beat = false) => {
      setFrame({ name, shape: FRAMES[name]!.shape(), beat });
    };

    if (driven) {
      show(driven);
      return;
    }

    const frames = CHOICES[choice];

    show(frames[0]!);

    const timers = frames
      .slice(1)
      .map((name, step) => setTimeout(() => show(name), BEAT * (step + 1)));

    let bounce: ReturnType<typeof setInterval> | undefined;

    if (choice === "Song") {
      timers.push(
        setTimeout(() => {
          bounce = setInterval(() => show("Bars", true), BOUNCE);
        }, BEAT),
      );
    }

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(bounce);
    };
  }, [choice, driven]);

  const imageCount = Math.min(
    MAX_IMAGE_COUNT,
    Math.max(1200, Math.round(stageWidth ** 2 / 100)),
  );
  const body = (
    <div ref={containerRef} className="rm-particles">
      <Remold.Particles
        className={`rm-particles-canvas${
          frame.name === "Image" ? " rm-particles-canvas--image" : ""
        }`}
        shape={frame.shape}
        label={FRAMES[frame.name]!.label}
        count={frame.name === "Image" ? imageCount : COUNT}
        radius={frame.name === "Image" ? 2.1 : 1.5}
        palette={framed ? DEMO_PALETTE : HOME_PALETTE}
        padding={20}
        pairing={frame.beat ? "index" : "match"}
        // The equaliser's beats stay direct: scattering on every beat would never let it settle.
        transition={motion === "Scatter" && !frame.beat ? "scatter" : "direct"}
      />
      {frame.name === "Image" && index === undefined && (
        <div className="rm-particles-image-source">
          <img
            src={JACKET_IMAGE}
            alt="Olive field jacket source photograph"
            width={48}
            height={48}
          />
          <span>
            {imageCount.toLocaleString()} halftone dots sampled from the field
            jacket photograph
          </span>
        </div>
      )}
      {index === undefined && (
        <div className="rm-particles-controls">
          <Segmented
            label="Shape"
            value={choice}
            onChange={setChoice}
            options={Object.keys(CHOICES) as Choice[]}
          />
          <Segmented
            label="Transition"
            value={motion}
            onChange={setMotion}
            options={["Scatter", "Direct"] as const}
          />
        </div>
      )}
    </div>
  );
  return framed ? <Frame tone="dark">{body}</Frame> : body;
}
