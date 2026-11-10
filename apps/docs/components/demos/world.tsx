"use client";

import type { PainterFrame } from "@remold-ui/canvas";
import { deceleration, project, velocityTracker } from "@remold-ui/core";
import { Remold } from "@remold-ui/react/canvas";
import { useMemo, useRef, useState, type PointerEvent } from "react";

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
const onLand = (ranges: [number, number][], lon: number) =>
  ranges.some(([from, to]) => lon >= from - STEP / 2 && lon <= to + STEP / 2);

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

const SIN_LAT = Float64Array.from(DOTS, (dot) => Math.sin(dot.lat * RADIANS));
const COS_LAT = Float64Array.from(DOTS, (dot) => Math.cos(dot.lat * RADIANS));

const SHADES = Array.from({ length: 12 }, (_, index) => `rgba(140, 200, 255, ${(index / 11).toFixed(3)})`);

const VIEWS: [string, number | null][] = [
  ["World map", null],
  ["Globe", null],
  ["Europe", -15],
  ["Asia", -95],
  ["Americas", 80],
];

const DRAG = 4;

const DEGREES_PER_PIXEL = 0.4;

type World = { globe: number; turn: number };

const SPRINGS = {
  globe: { duration: 1.1, bounce: 0.1 },
  turn: { duration: 1, bounce: 0.15 },
};

export function WorldDemo({ index = 0, onInteract }: { index?: number; onInteract?: () => void }) {
  const view = index % VIEWS.length;
  const [name, facing] = VIEWS[view]!;
  const actions = useRef<Remold.CanvasActions<World>>(null);

  const aim = useRef(-15);

  const spin = useRef(0);
  const [dragging, setDragging] = useState(false);

  const turn = useMemo(() => {
    if (facing !== null) {
      const want = facing - spin.current;
      aim.current = want + 360 * Math.round((aim.current - want) / 360);
    }
    return aim.current;
  }, [view]);
  const values = { globe: view === 0 ? 0 : 1, turn };

  const draw = (
    ctx: CanvasRenderingContext2D,
    { width, height, values: frame, dt, still }: PainterFrame<World>,
  ) => {
    if (view === 1 && !dragging && !still) spin.current += 14 * dt;
    const globeAmount = frame.globe;
    const longitude = frame.turn + spin.current;
    const cx = width / 2;
    const cy = height / 2;
    const mapWidth = Math.min(width * 0.94, height * 1.9);
    const radius = Math.min(width, height) * 0.42;
    const λ0 = longitude * RADIANS;

    if (globeAmount > 0.01) {
      const sea = ctx.createRadialGradient(
        cx - radius * 0.35,
        cy - radius * 0.4,
        radius * 0.1,
        cx,
        cy,
        radius,
      );
      sea.addColorStop(0, `rgba(80, 120, 255, ${0.28 * globeAmount})`);
      sea.addColorStop(1, `rgba(30, 40, 110, ${0.18 * globeAmount})`);
      ctx.fillStyle = sea;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * (0.6 + 0.4 * globeAmount), 0, Math.PI * 2);
      ctx.fill();
    }

    const shift = longitude + 15;
    const groups = Array.from({ length: SHADES.length }, () => new Path2D());
    const sinT = Math.sin(TILT);
    const cosT = Math.cos(TILT);
    for (let dot = 0; dot < DOTS.length; dot++) {
      const { lat, lon } = DOTS[dot]!;
      const sinφ = SIN_LAT[dot]!;
      const cosφ = COS_LAT[dot]!;
      const λ = lon * RADIANS - λ0;
      const cosλ = Math.cos(λ);
      const facingYou = sinT * sinφ + cosT * cosφ * cosλ;
      const mapLon = ((((lon - shift + 180) % 360) + 360) % 360) - 180;
      const mapX = cx + (mapLon / 360) * mapWidth;
      const mapY = cy - (lat / 180) * (mapWidth / 2) + mapWidth * 0.04;
      const globeX = cx + radius * cosφ * Math.sin(λ);
      const globeY = cy - radius * (cosT * sinφ - sinT * cosφ * cosλ);

      const depth = facingYou > 0 ? 0.35 + 0.65 * facingYou : 0;
      const alpha = 1 - globeAmount + globeAmount * depth;
      if (alpha < 0.02) continue;
      const size = (1 - globeAmount) * 1.7 + globeAmount * (0.6 + 1.6 * depth);
      const x = mapX + (globeX - mapX) * globeAmount;
      const y = mapY + (globeY - mapY) * globeAmount;
      const path = groups[Math.min(SHADES.length - 1, Math.round(alpha * (SHADES.length - 1)))]!;
      path.moveTo(x + size, y);
      path.arc(x, y, size, 0, Math.PI * 2);
    }
    groups.forEach((path, index) => {
      ctx.fillStyle = SHADES[index]!;
      ctx.fill(path);
    });
  };

  const tracker = useRef(velocityTracker());
  const drag = useRef<{ x: number; turn: number; moved: boolean } | null>(null);
  const swallow = useRef(false);
  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    const from = actions.current?.values.turn ?? aim.current;
    drag.current = { x: event.clientX, turn: from, moved: false };
    tracker.current = velocityTracker();
    tracker.current.add(event.timeStamp, from);
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const gesture = drag.current;
    if (!gesture) return;
    const dx = event.clientX - gesture.x;
    if (!gesture.moved) {
      if (Math.abs(dx) < DRAG) return;
      gesture.moved = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setDragging(true);
      onInteract?.();
    }
    const turn = gesture.turn - dx * DEGREES_PER_PIXEL;
    actions.current?.set({ turn });
    tracker.current.add(event.timeStamp, turn);
  };
  const up = () => {
    const gesture = drag.current;
    drag.current = null;
    if (!gesture?.moved) return;
    setDragging(false);
    const painter = actions.current;
    if (!painter) return;
    const velocity = painter.still ? 0 : tracker.current.velocity(performance.now());
    aim.current = painter.values.turn + project(velocity, deceleration.fast);
    painter.to({ turn: aim.current }, { velocity: { turn: velocity } });
  };

  return (
    <div className="grid w-full justify-items-center gap-2">
      <Remold.Canvas
        actionsRef={actions}
        values={values}
        spring={SPRINGS}
        continuous={view === 1 && !dragging}
        draw={draw}
        label={`A dotted world: ${name}`}
        className="block h-[280px] w-full touch-pan-y cursor-grab active:cursor-grabbing"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={() => {
          swallow.current = drag.current?.moved ?? false;
          up();
        }}
        onPointerCancel={up}
        onClickCapture={(event) => {
          if (!swallow.current) return;
          swallow.current = false;
          event.stopPropagation();
        }}
      />
      <span className="text-[13px] font-semibold text-white/70">{name}</span>
    </div>
  );
}
