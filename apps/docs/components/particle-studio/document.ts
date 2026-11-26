/**
 * A particle film as plain data: a canvas, one look for every dot, and frames the dots rebuild into
 * one after another. The studio edits it, the canvas plays it, and export turns it into code.
 */

export const FILM_VERSION = 1;

export type FrameSource =
  | { kind: "text"; text: string; weight: number }
  | { kind: "image"; src: string; by: "dark" | "light" | "alpha" }
  | { kind: "path"; path: string; outline?: boolean };

/** How a text or path frame is shaded, which picks each dot's colour and character. */
export type Shade = "flat" | "gradient" | "rings" | "noise";

export interface FilmFrame {
  id: string;
  name: string;
  /** How long the frame holds once the dots arrive, in milliseconds. */
  ms: number;
  source: FrameSource;
  shade: Shade;
  /** How the dots get here from the frame before. */
  transition: "direct" | "scatter";
}

export type DotLook = "circle" | "square" | "ascii";

export interface FilmLook {
  dot: DotLook;
  /** Dot radius in CSS pixels, for circles and squares. */
  radius: number;
  /** ASCII characters from lightest to densest. */
  characters: string;
  /** ASCII cell height in CSS pixels. */
  cell: number;
  /** From faint to strong; tones are spread across these. */
  colors: string[];
  blend: "normal" | "add";
  camera: { on: boolean; spin: number; tilt: number };
}

/** What the film is about: the guided studio builds the frames from this. */
export interface Brand {
  name: string;
  tagline: string;
  logo: { kind: "path"; path: string; outline: boolean; label: string } | { kind: "image"; src: string } | null;
}

export interface Film {
  version: typeof FILM_VERSION;
  title: string;
  /** Set when the frames were built from a brand and a style. */
  brand?: Brand;
  style?: string;
  canvas: { width: number; height: number; background: string };
  /** How many dots. */
  count: number;
  look: FilmLook;
  frames: FilmFrame[];
}

export const CHARACTER_SETS = [
  { name: "Classic", characters: ".:-=+*#%@" },
  { name: "Blocks", characters: "░▒▓█" },
  { name: "Binary", characters: "01" },
  { name: "Dots", characters: "·•●" },
  { name: "Lines", characters: "-=≡" },
] as const;

export const CANVAS_SIZES = [
  { name: "16:9", width: 960, height: 540 },
  { name: "1:1", width: 720, height: 720 },
  { name: "4:5", width: 640, height: 800 },
  { name: "9:16", width: 540, height: 960 },
] as const;

export const RAMP_STEPS = 8;

const hexChannels = (hex: string): [number, number, number] => {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? [...value].map((c) => c + c).join("") : value.padEnd(6, "0").slice(0, 6);
  const number = Number.parseInt(full, 16);
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
};

const toHex = (channels: number[]) => `#${channels.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;

/** `steps` colours spread evenly through `colors`, faint to strong. */
export function colorRamp(colors: readonly string[], steps = RAMP_STEPS): string[] {
  if (colors.length === 0) return [];
  if (colors.length === 1) return [colors[0]!];
  const stops = colors.map(hexChannels);
  return Array.from({ length: steps }, (_, step) => {
    const position = (step / (steps - 1)) * (stops.length - 1);
    const from = Math.min(stops.length - 2, Math.floor(position));
    const amount = position - from;
    return toHex(stops[from]!.map((channel, i) => channel + (stops[from + 1]![i]! - channel) * amount));
  });
}

let counter = 0;
export const frameId = () => `frame-${Date.now().toString(36)}-${(counter++).toString(36)}`;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isString = (value: unknown): value is string => typeof value === "string";

function validSource(source: unknown): source is FrameSource {
  if (!isRecord(source)) return false;
  if (source.kind === "text") return isString(source.text) && isNumber(source.weight);
  if (source.kind === "image") return isString(source.src) && (source.by === "dark" || source.by === "light" || source.by === "alpha");
  if (source.kind === "path") return isString(source.path) && (source.outline === undefined || typeof source.outline === "boolean");
  return false;
}

/** Checks a film that came from storage or someone's paste, before the studio opens it. */
export function validateFilm(value: unknown): { film: Film } | { error: string } {
  if (!isRecord(value) || value.version !== FILM_VERSION) return { error: "That isn't a particle film." };
  const { title, canvas, count, look, frames } = value;
  if (!isString(title) || !isNumber(count)) return { error: "The film is missing its title or dot count." };
  if (!isRecord(canvas) || !isNumber(canvas.width) || !isNumber(canvas.height) || !isString(canvas.background)) return { error: "The canvas needs a width, height and background." };
  if (!isRecord(look) || !["circle", "square", "ascii"].includes(look.dot as string) || !Array.isArray(look.colors) || !look.colors.every(isString)) {
    return { error: "The look needs a dot style and colours." };
  }
  if (!Array.isArray(frames) || frames.length === 0) return { error: "A film needs at least one frame." };
  for (const frame of frames) {
    if (!isRecord(frame) || !isString(frame.id) || !isString(frame.name) || !isNumber(frame.ms) || !validSource(frame.source)) {
      return { error: "A frame is missing its id, name, timing or source." };
    }
  }
  return { film: value as unknown as Film };
}
