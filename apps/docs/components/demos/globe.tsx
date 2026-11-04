"use client";

import { Remold, type GlobeArcEvent } from "@remold-ui/react";
import { useEffect, useState } from "react";
import { useScene } from "./use-scene";

const CITIES = [
  { lat: 37.8, lon: -122.4 },
  { lat: 40.7, lon: -74 },
  { lat: -23.5, lon: -46.6 },
  { lat: 51.5, lon: -0.1 },
  { lat: 6.5, lon: 3.4 },
  { lat: 52.5, lon: 13.4 },
  { lat: -1.3, lon: 36.8 },
  { lat: 19.1, lon: 72.9 },
  { lat: 1.35, lon: 103.8 },
  { lat: 35.7, lon: 139.7 },
  { lat: -33.9, lon: 151.2 },
  { lat: 5.6, lon: -0.2 },
];

const LOOKS = {
  night: {
    label: "Night",
    colors: { land: "#7d9be0", sphere: "#0c1633", glow: "#3d6bff", accent: "#ff7ac6", arc: ["#ff7ac6", "#5ab0ff"] },
  },
  ink: {
    label: "Ink",
    colors: { accent: "#f97316" },
  },
  paper: {
    label: "Paper",
    colors: { land: "#9a8c70", sphere: "#f6f0e2", accent: "#e2553f", arc: ["#e2553f", "#2f6f6a"] },
  },
} as const;

type Look = keyof typeof LOOKS;

const BEATS = Array.from({ length: 24 }, () => ({ ms: 900 }));
const MARKERS = CITIES.slice(0, 6).map((city) => ({ ...city, size: 2 }));

const journey = (id: number): GlobeArcEvent => ({
  id,
  from: CITIES[(id * 5) % CITIES.length]!,
  to: CITIES[(id * 7 + 3) % CITIES.length]!,
});

export function GlobeDemo({ playing }: { playing?: boolean }) {
  const scene = useScene(BEATS, (step) => step, playing);
  const [look, setLook] = useState<Look>("night");
  const [arcs, setArcs] = useState<GlobeArcEvent[]>([]);
  const surface = {
    night: "bg-[#070d1f] text-[#e6ecff] [--gb-muted:#8693b8] [--gb-soft:#121b36] [--gb-surface:#070d1f]",
    paper: "bg-[#fffaf0] text-[#3b3427] [--gb-muted:#8a7f6a] [--gb-soft:#f1e9d6] [--gb-surface:#fffaf0]",
    ink: "bg-white text-[#18181b] [--gb-muted:#71717a] [--gb-soft:#f4f4f5] [--gb-surface:#fff] dark:bg-[#1c1c1f] dark:text-[#fafafa] dark:[--gb-muted:#a1a1aa] dark:[--gb-soft:#27272a] dark:[--gb-surface:#1c1c1f]",
  }[look];

  useEffect(() => {
    setArcs((items) => [...items.slice(-6), journey(Number(items.at(-1)?.id ?? -1) + 1)]);
  }, [scene.step]);

  return (
    <div className={`grid w-full max-w-[440px] justify-items-center gap-4 rounded-3xl p-5 font-sans transition-colors duration-300 ${surface}`} ref={scene.ref}>
      <Remold.Globe
        className="block aspect-square w-full text-current"
        start={-10}
        scale={0.8}
        colors={LOOKS[look].colors}
        markers={MARKERS}
        arcs={arcs}
        label="Globe with arcs flying between cities"
      />
      <div className="flex gap-0.5 rounded-full bg-[var(--gb-soft)] p-[3px]" role="group" aria-label="Look" data-rm-autoplay-control="">
        {(Object.keys(LOOKS) as Look[]).map((key) => (
          <button key={key} type="button" className="rounded-full bg-transparent px-3.5 py-1.5 text-[13px] font-semibold text-[var(--gb-muted)] transition-[background-color,color] duration-200 aria-pressed:bg-current aria-pressed:text-[var(--gb-surface)] focus-visible:outline-2 focus-visible:outline-current focus-visible:outline-offset-2" aria-pressed={look === key} onClick={() => setLook(key)}>
            {LOOKS[key].label}
          </button>
        ))}
      </div>
    </div>
  );
}
