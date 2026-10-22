"use client";
/**
 * The world as a few hundred dots on one 2D canvas. Each dot knows its latitude and longitude,
 * so it has a place on a flat map and a place on a globe; one spring blends between the two,
 * another turns the globe to face a region. Drag sideways to spin the globe (or slide the map);
 * a flick keeps it turning, then it eases to a stop.
 */
import { deceleration, project, value, velocityTracker } from "@remold-ui/core";
import { frames, prefersReducedMotion } from "@remold-ui/dom";
import { Remold } from "@remold-ui/react";
import { useEffect, useRef } from "react";
import "./world.css";

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

/** Dots every 4.5°. Between two surveyed parallels, a dot is land only if both agree. */
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
/** Each dot's latitude sine and cosine, worked out once instead of every frame. */
const SIN_LAT = Float64Array.from(DOTS, (d) => Math.sin(d.lat * RADIANS));
const COS_LAT = Float64Array.from(DOTS, (d) => Math.cos(d.lat * RADIANS));
/** Twelve steps of see-through, from almost clear to solid: one fill each. */
const SHADES = Array.from({ length: 12 }, (_, i) => `rgba(140, 200, 255, ${(i / 11).toFixed(3)})`);
/** Each view, and the longitude it turns to face (null keeps turning). */
const VIEWS: [string, number | null][] = [
  ["World map", null],
  ["Globe", null],
  ["Europe", -15],
  ["Asia", -95],
  ["Americas", 80],
];

/** Pixels a press can move before it counts as a drag rather than a click. */
const DRAG = 4;
/** Degrees of longitude per pixel dragged. */
const DEGREES_PER_PIXEL = 0.4;

export function WorldDemo({ index = 0, onInteract }: { index?: number; onInteract?: () => void }) {
  const interact = useRef(onInteract);
  interact.current = onInteract;
  const [name] = VIEWS[index % VIEWS.length]!;
  const canvas = useRef<HTMLCanvasElement>(null);
  const control = useRef<((view: number) => void) | null>(null);

  useEffect(() => {
    const element = canvas.current!;
    const ctx = element.getContext("2d")!;
    const still = prefersReducedMotion();
    const globe = value(0, { spring: { duration: 1.1, bounce: 0.1 }, precision: 0.001 });
    // The longitude facing you, in degrees.
    const turn = value(-15, { spring: { duration: 1, bounce: 0.15 }, precision: 0.05 });
    let mode = 0;
    let width = 0;
    let height = 0;
    let ratio = 1;
    let visible = true;
    let stop: (() => void) | null = null;

    const resize = () => {
      width = element.clientWidth;
      height = element.clientHeight;
      ratio = Math.min(2, devicePixelRatio || 1);
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

      // The flat map slides with the same turn, wrapping round, so a drag means the same thing in both.
      // Dots are grouped by how see-through they are, so each group is one path and one fill
      // instead of a fill (and a new colour string) per dot.
      const shift = turn.current + 15;
      const groups = Array.from({ length: SHADES.length }, () => new Path2D());
      const sinT = Math.sin(TILT);
      const cosT = Math.cos(TILT);
      for (let k = 0; k < DOTS.length; k++) {
        const { lat, lon } = DOTS[k]!;
        const sinφ = SIN_LAT[k]!;
        const cosφ = COS_LAT[k]!;
        const λ = lon * RADIANS - λ0;
        const cosλ = Math.cos(λ);
        const facing = sinT * sinφ + cosT * cosφ * cosλ;
        const mapLon = ((((lon - shift + 180) % 360) + 360) % 360) - 180;
        const mapX = cx + (mapLon / 360) * mapWidth;
        const mapY = cy - (lat / 180) * (mapWidth / 2) + mapWidth * 0.04;
        const globeX = cx + radius * cosφ * Math.sin(λ);
        const globeY = cy - radius * (cosT * sinφ - sinT * cosφ * cosλ);
        // On the far side, dots shrink to nothing as the map curls into a globe.
        const depth = facing > 0 ? 0.35 + 0.65 * facing : 0;
        const alpha = 1 - g + g * depth;
        if (alpha < 0.02) continue;
        const size = (1 - g) * 1.7 + g * (0.6 + 1.6 * depth);
        const x = mapX + (globeX - mapX) * g;
        const y = mapY + (globeY - mapY) * g;
        const path = groups[Math.min(SHADES.length - 1, Math.round(alpha * (SHADES.length - 1)))]!;
        path.moveTo(x + size, y);
        path.arc(x, y, size, 0, Math.PI * 2);
      }
      groups.forEach((path, i) => {
        ctx.fillStyle = SHADES[i]!;
        ctx.fill(path);
      });
    };

    // The plain globe view keeps turning slowly.
    const spinning = () => mode === 1 && !still;
    const tick = (dt: number) => {
      if (spinning() && !turn.held && turn.settled) turn.set(turn.current + 14 * dt);
      const moving = [globe.step(dt), turn.step(dt)].some(Boolean);
      draw();
      const go = visible && (moving || spinning() || turn.held);
      if (!go) stop = null;
      return go;
    };
    const start = () => {
      if (!stop && visible) stop = frames(tick);
    };

    control.current = (next) => {
      mode = next;
      const go = (v: typeof globe, target: number) => (still ? v.set(target) : v.to(target));
      go(globe, next === 0 ? 0 : 1);
      const facing = VIEWS[next]![1];
      // Turn the short way round.
      if (facing !== null) go(turn, facing + 360 * Math.round((turn.current - facing) / 360));
      if (still) draw();
      start();
    };

    // Drag sideways to turn. A flick carries on, slowing to a stop where the throw would land.
    const tracker = velocityTracker();
    let drag: { x: number; turn: number; moved: boolean } | null = null;
    const down = (e: PointerEvent) => {
      drag = { x: e.clientX, turn: turn.current, moved: false };
      tracker.add(e.timeStamp, turn.current);
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved) {
        if (Math.abs(dx) < DRAG) return;
        drag.moved = true;
        turn.hold();
        element.setPointerCapture?.(e.pointerId);
        interact.current?.();
        start();
      }
      turn.set(drag.turn - dx * DEGREES_PER_PIXEL);
      tracker.add(e.timeStamp, turn.current);
    };
    const up = () => {
      if (!drag) return;
      const { moved } = drag;
      drag = null;
      if (!moved) return;
      const velocity = still ? 0 : tracker.velocity(performance.now());
      turn.release({ velocity, target: turn.current + (still ? 0 : project(velocity, deceleration.fast)) });
      start();
    };
    // A drag isn't a click: stop it reaching whatever steps the demo on click.
    let swallow = false;
    const pointerUp = () => {
      swallow = drag?.moved ?? false;
      up();
    };
    const click = (e: MouseEvent) => {
      if (!swallow) return;
      swallow = false;
      e.stopPropagation();
    };
    element.addEventListener("pointerdown", down);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", pointerUp);
    element.addEventListener("pointercancel", up);
    element.addEventListener("click", click);

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
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", pointerUp);
      element.removeEventListener("pointercancel", up);
      element.removeEventListener("click", click);
      resizer.disconnect();
      watcher.disconnect();
      control.current = null;
    };
  }, []);

  useEffect(() => control.current?.(index % VIEWS.length), [index]);

  return (
    <div className="rm-world">
      <canvas ref={canvas} className="rm-world-canvas" role="img" aria-label={`A dotted world: ${name}`} />
      <Remold.Text className="rm-world-label">{name}</Remold.Text>
    </div>
  );
}
