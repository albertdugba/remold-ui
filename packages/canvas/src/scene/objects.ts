import { value, type SpringConfig } from "@remold-ui/core";
import { parseColor } from "../extrude";
import type { Box3 } from "../geometry";
import { looks, palettes, type DrawState, type Palette, type PaletteName } from "../object-looks";
import { CHANNELS, type Channel, type ChannelName, type ObjectChannels, type ObjectState, type SceneOptions, type ScenePort } from "./types";

export const QUICK: SpringConfig = { duration: 0.35, bounce: 0.1 };

const QUICK_CHANNELS = new Set<ChannelName>(["lift", "glow", "dim"]);
const POSITION_PRECISION = 0.05;
const FADE_PRECISION = 0.005;

export const resolvePalette = (palette: PaletteName | Palette | undefined, fallback: Palette): Palette =>
  palette === undefined ? fallback : typeof palette === "string" ? palettes[palette] : palette;

export const channel = (start: number, spring: SpringConfig, precision = POSITION_PRECISION) => value(start, { spring, precision });

const clamp01 = (amount: number) => Math.max(0, Math.min(1, amount));

function firstColorOf(options: SceneOptions, id: string, initial: string | undefined): string | undefined {
  return initial ?? Object.values(options.layouts).map((layout) => layout.objects[id]?.color).find((color) => color !== undefined);
}

function channelsFor(start: Record<ChannelName, number>, spring: SpringConfig): ObjectChannels {
  return Object.fromEntries(
    CHANNELS.map((name) => {
      const quick = QUICK_CHANNELS.has(name) || name === "opacity";

      return [name, channel(start[name], quick ? QUICK : spring, quick ? FADE_PRECISION : POSITION_PRECISION)];
    }),
  ) as ObjectChannels;
}

export function createObject(id: string, options: SceneOptions, firstLayout: string, spring: SpringConfig, basePalette: Palette): ObjectState {
  const spec = options.objects[id]!;
  const look = typeof spec.look === "string" ? looks[spec.look] : spec.look;
  const box = options.layouts[firstLayout]!.objects[id];
  const firstColor = firstColorOf(options, id, box?.color);
  const [red, green, blue] = firstColor ? parseColor(firstColor) : [0, 0, 0];

  const start: Record<ChannelName, number> = {
    x: box?.x ?? 0,
    y: box?.y ?? 0,
    z: box?.z ?? 0,
    width: box?.width ?? 0,
    depth: box?.depth ?? 0,
    height: box?.height ?? look.defaultHeight,
    opacity: box ? (box.opacity ?? 1) : 0,
    fill: box?.fill ?? 0,
    ghost: box?.ghost ?? 0,
    red,
    green,
    blue,
    lift: 0,
    glow: 0,
    dim: 1,
  };

  return {
    id,
    colored: firstColor !== undefined,
    pending: null,
    fade: null,
    travel: null,
    look,
    outline: { morph: null, target: box?.shape ?? null, t: channel(1, spring, 0.001) },
    palette: resolvePalette(spec.palette, basePalette),
    label: box?.label ?? spec.label ?? "",
    description: spec.description ?? "",
    interactive: spec.interactive ?? !(look.background || look.passive),
    c: channelsFor(start, spring),
  };
}

function arcLift({ travel, c }: ObjectState): number {
  if (!travel || travel.arc === 0) return 0;

  const total = Math.hypot(travel.toX - travel.fromX, travel.toY - travel.fromY);

  if (total < 1) return 0;

  const left = Math.hypot(travel.toX - c.x.current, travel.toY - c.y.current);
  const progress = clamp01(1 - left / total);

  return travel.arc * 4 * progress * (1 - progress);
}

export function boxOf(object: ObjectState): Box3 {
  const { c } = object;

  return {
    x: c.x.current,
    y: c.y.current,
    z: c.z.current + c.lift.current + arcLift(object),
    width: Math.max(1, c.width.current),
    depth: Math.max(1, c.depth.current),
    height: Math.max(0, c.height.current),
  };
}

export const shapeOf = ({ outline }: ObjectState): string | undefined =>
  outline.morph ? outline.morph.d(outline.t.current) : (outline.target ?? undefined);

export function colorOf({ colored, c }: ObjectState): string | undefined {
  if (!colored) return undefined;

  const byte = (amount: Channel) => Math.round(Math.max(0, Math.min(255, amount.current)));

  return `rgb(${byte(c.red)}, ${byte(c.green)}, ${byte(c.blue)})`;
}

export const alphaOf = ({ c }: ObjectState) => clamp01(c.opacity.current) * c.dim.current;

export function drawStateOf(object: ObjectState, box: Box3): DrawState {
  return {
    box,
    label: object.label,
    palette: object.palette,
    glow: object.c.glow.current,
    shape: shapeOf(object),
    fill: object.c.fill.current,
    ghost: object.c.ghost.current,
    color: colorOf(object),
  };
}

export function portCenter(object: ObjectState, port: ScenePort = "top") {
  const box = boxOf(object);
  const center = { x: box.x + box.width / 2, y: box.y + box.depth / 2, z: box.z + box.height / 2 };

  switch (port) {
    case "top":
      return { ...center, z: box.z + box.height };
    case "left":
      return { ...center, x: box.x };
    case "right":
      return { ...center, x: box.x + box.width };
    case "front":
      return { ...center, y: box.y + box.depth };
    case "back":
      return { ...center, y: box.y };
    default:
      return center;
  }
}
