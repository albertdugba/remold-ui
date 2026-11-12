"use client";

import { Remold } from "@remold-ui/react";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { useRef, useState, type PointerEvent, type Ref } from "react";
import { Frame } from "./frame";
import { SCRIPT } from "./signature-glyphs";
import { useControllableState, type ChangeDetails } from "./use-controllable-state";
import { useScene } from "./use-scene";

const W = 420;
const H = 150;
const BASELINE = 104;

interface Point {
  x: number;
  y: number;

  t: number;
}

type Mode = "draw" | "type";

export interface SignatureValue {
  mode: Mode;
  strokes: readonly (readonly Point[])[];
  name: string;
}

function smooth(points: readonly Point[]): Point[] {
  if (points.length < 3) return [...points];
  const out: Point[] = [points[0]!];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    out.push({
      x: a.x * 0.75 + b.x * 0.25,
      y: a.y * 0.75 + b.y * 0.25,
      t: a.t * 0.75 + b.t * 0.25,
    });
    out.push({
      x: a.x * 0.25 + b.x * 0.75,
      y: a.y * 0.25 + b.y * 0.75,
      t: a.t * 0.25 + b.t * 0.75,
    });
  }
  out.push(points[points.length - 1]!);
  return out;
}

const roundTenth = (value: number) => Math.round(value * 10) / 10;

function thin(points: readonly Point[], gap = 2): Point[] {
  const out: Point[] = [];
  for (const point of points) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(point.x - last.x, point.y - last.y) >= gap) out.push(point);
  }
  const end = points[points.length - 1];
  if (end && out[out.length - 1] !== end) out.push(end);
  return out;
}

function inkOutline(raw: readonly Point[], rough = true): string {
  const points = thin(rough ? smooth(raw) : raw);
  if (points.length === 0) return "";
  if (points.length === 1) {
    const { x, y } = points[0]!;
    return `M${roundTenth(x - 1.6)} ${roundTenth(y)}a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0Z`;
  }
  const widths: number[] = [];
  let width = 2.2;
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)]!;
    const b = points[Math.min(points.length - 1, i + 1)]!;
    const speed = Math.hypot(b.x - a.x, b.y - a.y) / Math.max(4, b.t - a.t);
    const target = Math.min(3.4, Math.max(1.1, 3.4 - speed * 2.4));
    width += (target - width) * 0.35;

    const taper = Math.min(1, i / 6, (points.length - 1 - i) / 6);
    widths.push(width * (0.35 + 0.65 * taper));
  }
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)]!;
    const b = points[Math.min(points.length - 1, i + 1)]!;
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / length;
    const ny = (b.x - a.x) / length;
    const half = widths[i]! / 2;
    const point = points[i]!;
    left.push(`${roundTenth(point.x + nx * half)} ${roundTenth(point.y + ny * half)}`);
    right.push(`${roundTenth(point.x - nx * half)} ${roundTenth(point.y - ny * half)}`);
  }
  return `M${left.join("L")}L${right.reverse().join("L")}Z`;
}

const inkOf = (strokes: SignatureValue["strokes"]) =>
  strokes.map((stroke) => inkOutline(stroke, !SMOOTH.has(stroke))).join("");

const glyphs = SCRIPT.glyphs as Record<string, { d: string; adv: number }>;
const kerning = SCRIPT.kern as Record<string, number>;

function place(path: string, scale: number, dx: number, dy: number): string {
  let axis = 0;
  return path.replace(/[MLQCZ]|-?\d*\.?\d+/g, (token) => {
    if (/[MLQCZ]/.test(token)) {
      axis = 0;
      return token;
    }
    const value = axis++ % 2 === 0 ? Number(token) * scale + dx : Number(token) * scale + dy;
    return ` ${roundTenth(value)}`;
  });
}

function typed(name: string): string {
  const text = [...name.trim()].map((ch) => (glyphs[ch] ? ch : " "));
  if (!text.length) return "";
  let width = 0;
  const at: number[] = [];
  text.forEach((character, index) => {
    at.push(width);
    width +=
      glyphs[character]!.adv + (index < text.length - 1 ? (kerning[character + text[index + 1]] ?? 0) : 0);
  });
  const scale = Math.min(0.068, (W - 48) / width);
  const dx = (W - width * scale) / 2;
  return text
    .map((character, index) =>
      glyphs[character]!.d ? place(glyphs[character]!.d, scale, dx + at[index]! * scale, BASELINE) : "",
    )
    .join("");
}

const HAND: readonly (readonly [number, number][])[] = [
  [
    [40, 106],
    [52, 58],
    [56, 48],
    [60, 58],
    [64, 104],
    [70, 56],
    [74, 50],
    [80, 60],
    [84, 104],
    [90, 94],
    [94, 86],
    [102, 84],
    [96, 88],
    [94, 98],
    [100, 104],
    [108, 98],
    [110, 84],
    [110, 102],
    [116, 104],
    [122, 86],
    [124, 100],
    [130, 102],
    [136, 88],
    [136, 104],
    [134, 124],
    [128, 134],
    [122, 130],
    [126, 118],
    [140, 104],
    [152, 84],
    [146, 88],
    [144, 98],
    [150, 104],
    [158, 98],
    [160, 84],
    [160, 102],
    [168, 104],
    [176, 98],
  ],

  [
    [224, 52],
    [210, 58],
    [202, 76],
    [206, 96],
    [220, 104],
    [236, 96],
    [242, 74],
    [234, 56],
    [220, 52],
    [212, 62],
    [226, 80],
    [246, 88],
    [250, 82],
    [254, 86],
    [258, 104],
    [262, 96],
    [266, 84],
    [270, 50],
    [272, 84],
    [274, 104],
    [282, 100],
    [286, 86],
    [288, 104],
    [294, 100],
    [300, 86],
    [314, 84],
    [302, 100],
    [314, 102],
    [318, 116],
    [312, 132],
    [302, 134],
    [298, 124],
    [308, 112],
    [330, 104],
    [348, 98],
  ],

  [
    [258, 70],
    [274, 67],
    [290, 66],
  ],
  [
    [288, 74],
    [289, 73],
  ],
  [
    [54, 120],
    [120, 126],
    [220, 124],
    [330, 116],
    [372, 110],
  ],
];

function signed(): Point[][] {
  return HAND.map((points) => {
    const line: [number, number][] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]!;
      const p1 = points[i]!;
      const p2 = points[i + 1]!;
      const p3 = points[Math.min(points.length - 1, i + 2)]!;
      for (let step = 0; step < 6; step++) {
        const u = step / 6;
        const u2 = u * u;
        const u3 = u2 * u;

        const along = (a: number, b: number, c: number, d: number) =>
          0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (3 * b - a - 3 * c + d) * u3);
        line.push([along(p0[0], p1[0], p2[0], p3[0]), along(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    line.push(points[points.length - 1]!);
    let elapsed = 0;
    return line.map(([x, y], index) => {
      if (index > 0) {
        const [px, py] = line[index - 1]!;
        const [nx, ny] = line[Math.min(line.length - 1, index + 1)]!;
        const turn =
          1 -
          Math.abs(
            ((x - px) * (nx - x) + (y - py) * (ny - y)) /
              ((Math.hypot(x - px, y - py) || 1) * (Math.hypot(nx - x, ny - y) || 1)),
          );
        elapsed += Math.hypot(x - px, y - py) / (1.3 - 0.9 * Math.min(1, turn * 2));
      }
      return { x, y, t: elapsed };
    });
  });
}

const SIGNED = signed();

const SMOOTH = new WeakSet<readonly Point[]>(SIGNED);
const NAME = "Akua Asante";

const SPRING = { duration: 0.9, bounce: 0 };

export interface SignatureProps {
  value?: SignatureValue;
  defaultValue?: SignatureValue;
  onValueChange?: (value: SignatureValue, details: ChangeDetails) => void;
  replaceOnDraw?: boolean;
  ref?: Ref<HTMLElement>;
}

const FOCUS = "focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sg-ink)";

export function Signature({
  value,
  defaultValue = { mode: "draw", strokes: [], name: "" },
  onValueChange,
  replaceOnDraw = false,
  ref,
}: SignatureProps) {
  const [signature, setSignature] = useControllableState({ value, defaultValue, onValueChange });
  const pad = useRef<SVGSVGElement>(null);

  const [drawing, setDrawing] = useState<Point[] | null>(null);
  const started = useRef(0);
  const [adopted, setAdopted] = useState(false);

  const [inkKey, setInkKey] = useState(0);

  const ink = signature.mode === "draw" ? inkOf(signature.strokes) : typed(signature.name);
  const empty = !ink;

  const at = (event: PointerEvent): Point => {
    const box = pad.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * W,
      y: ((event.clientY - box.top) / box.height) * H,
      t: performance.now() - started.current,
    };
  };

  const down = (event: PointerEvent<SVGSVGElement>) => {
    if (signature.mode !== "draw") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    started.current = performance.now();
    setAdopted(false);
    setDrawing([at(event)]);

    if (replaceOnDraw) {
      setInkKey((key) => key + 1);
      setSignature((current) => ({ ...current, strokes: [] }));
    }
  };
  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (drawing) setDrawing([...drawing, at(event)]);
  };
  const up = () => {
    if (!drawing) return;
    const stroke = drawing;
    setDrawing(null);
    setInkKey((key) => key + 1);
    setSignature((current) => ({ ...current, strokes: [...current.strokes, stroke] }));
  };

  return (
    <section
      ref={ref}
      className="grid w-[min(100%,460px)] font-sans text-[13px] text-(--sg-ink) [--sg-faint:#b4b4b4] [--sg-fill:#f6f6f6] [--sg-ink:#111111] [--sg-line:rgb(0_0_0/0.08)] [--sg-muted:#737373] [--sg-surface:#ffffff] dark:[--sg-faint:#5c5c5c] dark:[--sg-fill:#212121] dark:[--sg-ink:#f5f5f5] dark:[--sg-line:rgb(255_255_255/0.1)] dark:[--sg-muted:#a3a3a3] dark:[--sg-surface:#171717]"
      aria-label="Adopt your signature"
    >
      <div className="grid gap-4 rounded-[18px] bg-(--sg-surface) p-[22px] in-[.rm-stage]:shadow-[inset_0_0_0_1px_var(--sg-line)]">
        <header className="grid gap-[3px]">
          <strong className="text-[15px] font-semibold">Adopt your signature</strong>
          <span className="text-(--sg-muted)">Used wherever you sign in this document.</span>
        </header>

        <label className="grid gap-1.5">
          <span className="text-[12px] font-medium text-(--sg-muted)">Full name</span>
          <input
            className="h-[38px] rounded-[10px] border-0 bg-(--sg-fill) px-3 text-[14px] text-inherit outline-none focus:bg-(--sg-surface) focus:shadow-[inset_0_0_0_1px_var(--sg-ink)]"
            value={signature.name}
            spellCheck={false}
            autoComplete="name"
            onChange={(event) => {
              setAdopted(false);
              setSignature((current) => ({ ...current, name: event.target.value }));
            }}
          />
        </label>

        <ToggleGroup
          className="relative grid grid-cols-2 rounded-[10px] bg-(--sg-fill) p-[3px] before:absolute before:top-[3px] before:bottom-[3px] before:left-[3px] before:w-[calc(50%-3px)] before:rounded-lg before:bg-(--sg-surface) before:shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_var(--sg-line)] before:transition-[translate] before:duration-350 before:ease-[cubic-bezier(0.32,0.72,0,1)] before:content-[''] data-[mode=type]:before:translate-x-full"
          aria-label="Signature style"
          data-mode={signature.mode}
          value={[signature.mode]}
          onValueChange={(values) => {
            const mode = values[0] as Mode | undefined;
            if (!mode) return;
            setAdopted(false);
            setSignature((current) => ({ ...current, mode }));
          }}
        >
          {(["draw", "type"] as const).map((mode) => (
            <Toggle
              key={mode}
              value={mode}
              className={`relative h-[30px] cursor-pointer border-0 bg-transparent font-medium text-(--sg-muted) transition-colors duration-200 data-pressed:text-(--sg-ink) ${FOCUS}`}
            >
              {mode === "draw" ? "Draw" : "Type"}
            </Toggle>
          ))}
        </ToggleGroup>

        <div
          data-mode={signature.mode}
          className="group/pad relative aspect-[420/150] rounded-xl shadow-[inset_0_0_0_1px_var(--sg-line)]"
        >
          <svg
            ref={pad}
            className="absolute inset-0 size-full group-data-[mode=draw]/pad:cursor-crosshair group-data-[mode=draw]/pad:touch-none"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={signature.mode === "type" ? `Signature: ${signature.name}` : "Your drawn signature"}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
          >
            <line className="stroke-(--sg-line) [stroke-width:1]" x1={28} x2={W - 28} y1={BASELINE + 22} y2={BASELINE + 22} />
            <text className="fill-(--sg-faint) text-[15px]" x={28} y={BASELINE + 16}>
              ×
            </text>
          </svg>
          <Remold.Icon
            key={inkKey}
            className="pointer-events-none absolute inset-0 size-full text-(--sg-ink)"
            path={ink || "M0 0"}
            viewBox={`0 0 ${W} ${H}`}
            fill="currentColor"
            stroke="none"
            spring={SPRING}
            aria-hidden="true"
          />
          {drawing && (
            <svg className="pointer-events-none absolute inset-0 size-full text-(--sg-ink)" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
              <path d={inkOutline(drawing)} fill="currentColor" />
            </svg>
          )}
          {empty && !drawing && (
            <span className="pointer-events-none absolute inset-0 grid place-items-center text-(--sg-faint)">
              {signature.mode === "draw" ? "Sign here" : "Type your name above"}
            </span>
          )}
        </div>

        <footer className="flex items-center justify-between">
          <button
            type="button"
            className={`cursor-pointer border-0 bg-transparent p-0 text-(--sg-muted) hover:text-(--sg-ink) disabled:cursor-default disabled:opacity-35 ${FOCUS}`}
            disabled={empty}
            onClick={() => {
              setAdopted(false);
              setInkKey((key) => key + 1);
              setSignature((current) =>
                current.mode === "draw" ? { ...current, strokes: [] } : { ...current, name: "" },
              );
            }}
          >
            Clear
          </button>
          <button
            type="button"
            className={`h-9 cursor-pointer rounded-[10px] border-0 bg-(--sg-ink) px-4 font-semibold text-(--sg-surface) disabled:cursor-default disabled:opacity-35 ${FOCUS}`}
            disabled={empty}
            onClick={() => setAdopted(true)}
          >
            {adopted ? "Adopted" : "Adopt and sign"}
          </button>
        </footer>
      </div>
    </section>
  );
}

const BEATS: readonly { mode: Mode; ms: number }[] = [
  { mode: "draw", ms: 2400 },
  { mode: "type", ms: 2600 },
];

const fromBeat = (step: number): SignatureValue => ({
  mode: BEATS[step]!.mode,
  strokes: SIGNED,
  name: NAME,
});

interface SignatureDemoProps {
  framed?: boolean;
  playing?: boolean;
}

export function SignatureDemo({ framed = true, playing }: SignatureDemoProps) {
  const scene = useScene(BEATS, fromBeat, playing);
  const element = (
    <Signature
      ref={scene.ref}
      value={scene.state}
      onValueChange={scene.onValueChange}
      replaceOnDraw={scene.live}
    />
  );
  return framed ? <Frame>{element}</Frame> : element;
}
