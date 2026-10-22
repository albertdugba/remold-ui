"use client";
/**
 * A stack of layers, like a toolchain or a product's parts, drawn as line art. Every few seconds
 * one layer takes the focus: its sides fill with its colour and a little sheen, the layers above
 * it fade to ghost outlines so you can see down to it, and its label turns dark with a short
 * caption. Hover or tap a label to focus that layer yourself; drag the scene to turn it.
 *
 * The slabs are canvas `extrude()` with `ink`; each layout sets a layer's `color`, `fill` and
 * `ghost`, which spring. The labels are real HTML buttons, moved onto the slabs after every
 * frame (`onDraw` + `anchor()`), so they're crisp, focusable and styled with Tailwind.
 * Harbor and its layers are made up.
 */
import { extrude } from "@remold-ui/canvas";
import { Remold, useAutoplay } from "@remold-ui/react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

export interface Layer {
  id: string;
  name: string;
  /** A few words shown beside the label while the layer is in focus. */
  role: string;
  /** Hex colour for the layer's sides when it's in focus. */
  color: string;
  /** A 24 × 24 outline icon, as path data, for the layer's top. */
  icon: string;
}

/** Top to bottom. */
const HARBOR: Layer[] = [
  {
    id: "harbor",
    name: "Harbor",
    role: "one tool for all of it",
    color: "#6d4aff",
    icon: "M12 3.5 20 8v8l-8 4.5L4 16V8Zm0 0v17M4 8l8 4.5L20 8",
  },
  { id: "keel", name: "Keel", role: "build tool", color: "#2563eb", icon: "M13 3.5 5.5 13.5H12l-1 7 7.5-10H12Z" },
  { id: "tide", name: "Tide", role: "test runner", color: "#16a34a", icon: "M5 12.5l4.5 4.5L19 7.5" },
  {
    id: "mast",
    name: "Mast",
    role: "bundler",
    color: "#ea580c",
    icon: "M4.5 7.5 12 3.5l7.5 4v9L12 20.5l-7.5-4ZM4.5 7.5 12 12l7.5-4.5M12 12v8.5",
  },
  { id: "hull", name: "Hull", role: "parser", color: "#0d9488", icon: "M8 6 3.5 12 8 18M16 6l4.5 6L16 18M13.5 4.5l-3 15" },
];

export interface LayerStackProps {
  /** The layers, top to bottom. Default: the made-up Harbor toolchain. */
  layers?: Layer[];
  /** Space between layers, in floor units. Default 46. */
  gap?: number;
  /** How thick each layer is. Default 30. */
  thickness?: number;
  /** How see-through the layers above the focused one get, from 0 to 1. Default 0.92. */
  ghost?: number;
  /** Light streaks across the focused layer's sides. Default true. */
  sheen?: boolean;
  /** Step through the layers by itself while on screen, until someone takes over. Default true. */
  autoplay?: boolean;
  /** Milliseconds per layer while playing. Default 2600. */
  every?: number;
  /** The stage's height in pixels. Default 520. */
  height?: number;
  /** Focus this layer (an index), controlled from outside; autoplay is then off. */
  focus?: number;
}

const SIZE = 210;

export function LayerStack({
  layers = HARBOR,
  gap = 46,
  thickness = 30,
  ghost = 0.92,
  sheen = true,
  autoplay: play = true,
  every = 2600,
  height = 520,
  focus: controlled,
}: LayerStackProps) {
  const autoplay = useAutoplay(layers.length, { every, autoStart: play && controlled === undefined });
  const { setPlaying, setStep } = autoplay;
  useEffect(() => setPlaying(play && controlled === undefined), [play, controlled, setPlaying]);
  useEffect(() => {
    if (controlled !== undefined) setStep(controlled % layers.length);
  }, [controlled, layers.length, setStep]);
  const focus = autoplay.step;
  const actions = useRef<Remold.Scene.Actions | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const labels = useRef(new Map<string, HTMLElement>());
  const [ready, setReady] = useState(false);

  const scene = useMemo(() => {
    const n = layers.length;
    const looks = Object.fromEntries(
      layers.map((l) => [
        l.id,
        extrude({ ink: true, radius: 0.18, sides: sheen ? "sheen" : "gradient", decal: { icon: l.icon, text: "", size: 46 } }),
      ]),
    );
    const layouts = Object.fromEntries(
      layers.map((focused, f) => [
        focused.id,
        {
          camera: { zoom: 1.55 },
          objects: Object.fromEntries(
            layers.map((l, i) => [
              l.id,
              {
                x: -SIZE / 2,
                y: -SIZE / 2,
                width: SIZE,
                depth: SIZE,
                // The first layer is on top; the stack is centred on the floor's middle, so it sits in the middle of the stage.
                z: ((n - 1) / 2 - i) * gap - thickness / 2,
                height: thickness,
                color: l.color,
                fill: i === f ? 1 : 0,
                ghost: i < f ? ghost : 0,
              },
            ]),
          ),
        },
      ]),
    );
    return {
      objects: Object.fromEntries(layers.map((l) => [l.id, { look: looks[l.id]!, label: l.name, description: l.role }])),
      layouts,
    };
  }, [layers, gap, thickness, ghost, sheen]);

  /** After every frame: put each label level with its layer, its line reaching to the slab's edge. */
  const place = () => {
    const box = stage.current;
    const scene = actions.current;
    if (!box || !scene) return;
    const width = box.clientWidth;
    layers.forEach((l, i) => {
      const el = labels.current.get(l.id);
      if (!el) return;
      const left = i % 2 === 0;
      // The layer's outermost point on this side, halfway up its wall: the line stops right on its edge.
      const point = scene.anchor(l.id, left ? "screen-left" : "screen-right");
      if (!point) return;
      const edge = left ? Math.max(16, width * 0.12) : Math.min(width - 16, width * 0.88);
      // The line starts where the label's button ends.
      const button = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
      el.style.top = `${point.y}px`;
      el.style.setProperty("--reach", `${Math.max(0, Math.abs(point.x - edge) - button - 6)}px`);
      el.style.left = left ? `${edge}px` : "";
      el.style.right = left ? "" : `${width - edge}px`;
    });
    if (!ready) setReady(true);
  };

  const choose = (i: number) => {
    setPlaying(false);
    setStep(i);
  };

  return (
    <div ref={autoplay.ref} className="not-prose my-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white font-sans text-zinc-900">
      <div ref={stage} className="relative" style={{ height }}>
        <Remold.Scene
          className="absolute inset-0 h-full w-full"
          label={`A stack of ${layers.length} layers: ${layers.map((l) => l.name).join(", ")}`}
          objects={scene.objects}
          layouts={scene.layouts}
          layout={layers[focus]!.id}
          palette="sketch"
          interact={{ tap: false, hover: false, keyboard: false }}
          actionsRef={actions}
          onDraw={place}
        />
        <ul className={`m-0 list-none p-0 transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`} aria-label="Layers">
          {layers.map((l, i) => {
            const on = i === focus;
            const left = i % 2 === 0;
            return (
              <li
                key={l.id}
                ref={(el) => {
                  if (el) labels.current.set(l.id, el);
                  else labels.current.delete(l.id);
                }}
                className={`absolute flex -translate-y-1/2 items-center ${left ? "flex-row" : "flex-row-reverse"}`}
                style={{ "--reach": "0px" } as CSSProperties}
              >
                <button
                  type="button"
                  aria-pressed={on}
                  onPointerEnter={() => choose(i)}
                  onFocus={() => choose(i)}
                  onClick={() => choose(i)}
                  className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px] tracking-wider uppercase transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 aria-pressed:border-zinc-900 aria-pressed:bg-zinc-900 aria-pressed:text-white"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d={l.icon} />
                  </svg>
                  {l.name}
                </button>
                {/* The leader line, out to the slab; the caption sits under it while in focus. */}
                <span aria-hidden="true" className="relative h-px bg-zinc-300" style={{ width: "var(--reach)" }}>
                  <span
                    className={`absolute top-1/2 size-[5px] -translate-y-1/2 rounded-full bg-zinc-400 ${
                      left ? "-right-[2.5px]" : "-left-[2.5px]"
                    }`}
                  />
                  <span
                    className={`absolute top-1.5 text-[11.5px] whitespace-nowrap text-zinc-500 transition-opacity duration-300 ${
                      left ? "left-1" : "right-1"
                    } ${on ? "opacity-100" : "opacity-0"}`}
                  >
                    {l.role}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** The docs page's name for it. */
export const LayerStackDemo = LayerStack;
