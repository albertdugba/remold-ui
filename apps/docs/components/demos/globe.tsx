"use client";

import { Remold, type GlobeArcEvent } from "@remold-ui/react";
import { useEffect, useState } from "react";
import { useScene } from "./use-scene";
import "./globe.css";

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

  useEffect(() => {
    setArcs((items) => [...items.slice(-6), journey(Number(items.at(-1)?.id ?? -1) + 1)]);
  }, [scene.step]);

  return (
    <div className="gb" data-look={look} ref={scene.ref}>
      <Remold.Globe
        className="gb-canvas"
        start={-10}
        scale={0.8}
        colors={LOOKS[look].colors}
        markers={MARKERS}
        arcs={arcs}
        label="Globe with arcs flying between cities"
      />
      <div className="gb-looks" role="group" aria-label="Look" data-rm-autoplay-control="">
        {(Object.keys(LOOKS) as Look[]).map((key) => (
          <button key={key} type="button" className="gb-look" aria-pressed={look === key} onClick={() => setLook(key)}>
            {LOOKS[key].label}
          </button>
        ))}
      </div>
    </div>
  );
}
