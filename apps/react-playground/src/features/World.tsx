/**
 * The world as a few hundred dots on one 2D canvas. Each dot knows its latitude and longitude,
 * so it has a place on a flat map and a place on a globe; one spring blends between the two,
 * another turns the globe. Cheap enough to run on every card: no 3D, no per-frame matching.
 */
import { deceleration, project, value, velocityTracker } from "@remold-ui/core";
import { useEffect, useRef, useState } from "react";
import { useAutoplay, type DemoProps, type Example } from "../examples/types";
import { useMotion } from "../motion";
import { Segmented } from "../ui/controls";

/** Land, roughly, as longitude ranges along every ninth parallel. */
const LAND: [number, [number, number][]][] = [
  [
    72,
    [
      [-160, -70],
      [-55, -20],
      [20, 30],
      [60, 180],
    ],
  ],
  [
    63,
    [
      [-165, -60],
      [-50, -38],
      [-22, -14],
      [5, 180],
    ],
  ],
  [
    54,
    [
      [-130, -58],
      [-10, 2],
      [8, 135],
      [155, 162],
    ],
  ],
  [
    45,
    [
      [-124, -65],
      [-1, 135],
      [140, 145],
    ],
  ],
  [
    36,
    [
      [-121, -76],
      [-8, 10],
      [27, 120],
      [128, 140],
    ],
  ],
  [
    27,
    [
      [-110, -80],
      [-15, 120],
    ],
  ],
  [
    18,
    [
      [-105, -88],
      [-16, 52],
      [72, 85],
      [95, 110],
      [120, 122],
    ],
  ],
  [
    9,
    [
      [-84, -60],
      [-13, 50],
      [76, 80],
      [98, 106],
      [118, 126],
    ],
  ],
  [
    0,
    [
      [-80, -50],
      [9, 42],
      [100, 118],
      [120, 135],
    ],
  ],
  [
    -9,
    [
      [-79, -35],
      [12, 40],
      [131, 150],
    ],
  ],
  [
    -18,
    [
      [-70, -40],
      [12, 38],
      [44, 50],
      [122, 146],
    ],
  ],
  [
    -27,
    [
      [-70, -48],
      [15, 33],
      [114, 153],
    ],
  ],
  [
    -36,
    [
      [-72, -57],
      [137, 150],
      [174, 178],
    ],
  ],
  [
    -45,
    [
      [-74, -66],
      [168, 171],
    ],
  ],
  [-54, [[-72, -66]]],
];
const STEP = 4.5;
const onLand = (ranges: [number, number][], lon: number) => ranges.some(([from, to]) => lon >= from - STEP / 2 && lon <= to + STEP / 2);

/** Dots every 4.5°. Between two surveyed parallels, a dot is land only if both agree: coasts stay crisp. */
const DOTS = (() => {
  const dots: { lat: number; lon: number }[] = [];
  for (let i = 0; i < LAND.length; i++) {
    const [lat, ranges] = LAND[i]!;
    const below = LAND[i + 1];
    for (let lon = -180 + STEP / 2; lon < 180; lon += STEP) {
      if (onLand(ranges, lon)) dots.push({ lat, lon });
      if (below && onLand(ranges, lon) && onLand(below[1], lon)) dots.push({ lat: lat - STEP, lon });
    }
  }
  return dots;
})();

const RADIANS = Math.PI / 180;
const TILT = 18 * RADIANS;

const VIEWS = { Map: null, Globe: null, Europe: -15, Asia: -95, Americas: 80 } as const;
type View = keyof typeof VIEWS;
const VIEW_ORDER = Object.keys(VIEWS) as View[];

function WorldCanvas({ view }: { view: View }) {
  const { loop, reducedMotion } = useMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const control = useRef<((view: View) => void) | null>(null);

  useEffect(() => {
    const element = canvas.current!;
    const ctx = element.getContext("2d")!;
    const still = reducedMotion === "always" || (reducedMotion === "user" && matchMedia("(prefers-reduced-motion: reduce)").matches);
    const globe = value(0, { spring: { duration: 1.1, bounce: 0.1 }, precision: 0.001 });
    // The longitude facing you, in degrees.
    const turn = value(-15, { spring: { duration: 1, bounce: 0.15 }, precision: 0.05 });
    let mode: View = "Map";
    let width = 0;
    let height = 0;
    let ratio = 1;
    let visible = true;
    let stop: (() => void) | null = null;

    const resize = () => {
      // Draw in the canvas's own CSS pixels; store pixels for the size it's shown at.
      const rect = element.getBoundingClientRect();
      width = element.clientWidth;
      height = element.clientHeight;
      ratio = Math.min(2, (devicePixelRatio || 1) * (width ? rect.width / width : 1));
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
    };

    const draw = () => {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const g = globe.current;
      const cx = width / 2;
      const cy = height / 2;
      const mapWidth = Math.min(width * 0.94, height * 1.9);
      const radius = Math.min(width, height) * 0.42;
      const λ0 = turn.current * RADIANS;

      // The globe's disc fades in behind the dots.
      if (g > 0.01) {
        const sea = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.4, radius * 0.1, cx, cy, radius);
        sea.addColorStop(0, `rgba(80, 120, 255, ${0.28 * g})`);
        sea.addColorStop(1, `rgba(30, 40, 110, ${0.18 * g})`);
        ctx.fillStyle = sea;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * (0.6 + 0.4 * g), 0, Math.PI * 2);
        ctx.fill();
      }

      for (const { lat, lon } of DOTS) {
        const φ = lat * RADIANS;
        const λ = lon * RADIANS - λ0;
        const facing = Math.sin(TILT) * Math.sin(φ) + Math.cos(TILT) * Math.cos(φ) * Math.cos(λ);
        const mapX = cx + (lon / 360) * mapWidth;
        const mapY = cy - (lat / 180) * (mapWidth / 2) + mapWidth * 0.04;
        const globeX = cx + radius * Math.cos(φ) * Math.sin(λ);
        const globeY = cy - radius * (Math.cos(TILT) * Math.sin(φ) - Math.sin(TILT) * Math.cos(φ) * Math.cos(λ));
        // On the far side, dots shrink to nothing as the map curls into a globe.
        const depth = facing > 0 ? 0.35 + 0.65 * facing : 0;
        const alpha = 1 - g + g * depth;
        if (alpha < 0.02) continue;
        const size = (1 - g) * 1.7 + g * (0.6 + 1.6 * depth);
        ctx.fillStyle = `rgba(140, 200, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(mapX + (globeX - mapX) * g, mapY + (globeY - mapY) * g, size, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const spinning = () => mode === "Globe" && !still;
    const tick = (dt: number) => {
      if (spinning() && !turn.held && turn.settled) turn.set(turn.current + 14 * dt);
      const moving = [globe.step(dt), turn.step(dt)].some(Boolean);
      draw();
      const go = visible && (moving || spinning() || turn.held);
      if (!go) stop = null;
      return go;
    };
    const start = () => {
      if (!stop && visible) stop = loop.add(tick);
    };

    control.current = (next) => {
      mode = next;
      const go = (v: typeof globe, target: number) => (still ? v.set(target) : v.to(target));
      go(globe, next === "Map" ? 0 : 1);
      const facing = VIEWS[next];
      if (facing !== null) {
        // Turn the short way round.
        go(turn, facing + 360 * Math.round((turn.current - facing) / 360));
      }
      if (still) draw();
      start();
    };

    // Drag to spin the globe; a flick keeps it turning, then it settles.
    const tracker = velocityTracker();
    let drag: { x: number; turn: number } | null = null;
    const down = (e: PointerEvent) => {
      if (mode === "Map") return;
      drag = { x: e.clientX, turn: turn.current };
      turn.hold();
      tracker.add(e.timeStamp, turn.current);
      element.setPointerCapture?.(e.pointerId);
      start();
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      turn.set(drag.turn - (e.clientX - drag.x) * 0.4);
      tracker.add(e.timeStamp, turn.current);
    };
    const up = () => {
      if (!drag) return;
      drag = null;
      const velocity = still ? 0 : tracker.velocity(performance.now());
      turn.release({ velocity, target: turn.current + (still ? 0 : project(velocity, deceleration.fast)) });
      start();
    };
    element.addEventListener("pointerdown", down);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", up);
    element.addEventListener("pointercancel", up);

    const resizer = new ResizeObserver(() => {
      resize();
      draw();
    });
    resizer.observe(element);
    const watcher = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) start();
    });
    watcher.observe(element);
    resize();
    draw();

    return () => {
      stop?.();
      resizer.disconnect();
      watcher.disconnect();
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", up);
      control.current = null;
    };
  }, [loop, reducedMotion]);

  useEffect(() => control.current?.(view), [view, loop, reducedMotion]);

  return (
    <canvas
      ref={canvas}
      className="world-canvas"
      role="img"
      aria-label={
        view === "Map"
          ? "A dotted map of the world"
          : view === "Globe"
          ? "A dotted globe, slowly turning"
          : `A dotted globe turned to show ${view}`
      }
    />
  );
}

function WorldDemo({ preview, autoplay }: DemoProps) {
  const [view, setView] = useState<View>("Map");
  useAutoplay(autoplay, 2600, () => setView((v) => VIEW_ORDER[(VIEW_ORDER.indexOf(v) + 1) % VIEW_ORDER.length]!));
  return (
    <div className="demo-panel dark">
      <WorldCanvas view={view} />
      {!preview && <Segmented label="View" options={VIEW_ORDER} value={view} onChange={setView} tone="dark" />}
    </div>
  );
}

export const world: Example = {
  id: "world",
  category: "Canvas",
  title: "Map to globe",
  summary: "A dotted world map that curls up into a turning globe, and back. Hundreds of dots on one light 2D canvas.",
  headline: (
    <>
      Flat map,
      <br />
      round world.
    </>
  ),
  lead: "Every dot is a latitude and a longitude, so it has a place on a flat map and a place on a globe. One spring blends each dot between the two; another turns the globe. Dots on the far side shrink away as it curls up. It's plain 2D drawing, light enough to leave running on a landing page.",
  tries: [
    "Switch Map and Globe: the map curls up and starts turning.",
    "Pick Europe, Asia or Americas: the globe turns the short way round.",
    "Drag the globe and flick it. It keeps turning, then settles back into its slow spin.",
    "Turn on Reduce motion: it switches views instantly and stops spinning.",
  ],
  code: `
const globe = value(0, { spring: { duration: 1.1, bounce: 0.1 } });
const turn = value(-15);

// every frame, for every dot
const x = lerp(mapX(dot), globeX(dot, turn.current), globe.current);
const y = lerp(mapY(dot), globeY(dot, turn.current), globe.current);

globe.to(view === "map" ? 0 : 1);
`,
  uses: [
    { name: "value", role: "Two springs: how round the world is, and which longitude faces you." },
    { name: "velocityTracker / project", role: "Measure a flick and work out where the spin should coast to." },
  ],
  frame: "panel",
  Demo: WorldDemo,
};
