import { extrude, parseColor } from "../extrude";
import { looks, type Look, type LookName, type Palette } from "../object-looks";
import { SHAPES, type ShapeName } from "../object-looks/system";
import type { DiagramColors } from "./types";

export interface DiagramSkin {
  /** The look a node is drawn with, given the look it asked for. */
  look(look: LookName | Look): Look;
  palette: Palette;
  colors: Partial<DiagramColors>;
  /** "solid" fills badges, packets and label pills; "line" draws them as outlines with plain mono captions. */
  style: "solid" | "line";
}

export interface LineSkinOptions {
  /** The one colour everything is drawn in. Default a soft white. */
  ink?: string;
  /** The background the drawing sits on, which every face is filled with. Default near-black. */
  paper?: string;
  /** How strongly lines show against the paper, from 0 to 1. Default 0.62. */
  strength?: number;
  /** Line width in CSS pixels. Default 1. */
  width?: number;
  /** The one colour that stands out: packets, live links, healthy and waiting marks. Default the ink. */
  accent?: string;
  /** The colour of failures. Default a muted red. */
  error?: string;
}

const DEFAULT_INK = "#ececf0";
const DEFAULT_PAPER = "#0b0c0e";
const DEFAULT_STRENGTH = 0.62;
const DEFAULT_ERROR = "#f87171";
const LABEL_STRENGTH = 0.58;

const rgbText = (color: string) => parseColor(color).join(", ");

function mix(ink: string, paper: string, amount: number): string {
  const [inkRed, inkGreen, inkBlue] = parseColor(ink);
  const [paperRed, paperGreen, paperBlue] = parseColor(paper);
  const blend = (from: number, to: number) => Math.round(to + (from - to) * amount);

  return `rgb(${blend(inkRed, paperRed)}, ${blend(inkGreen, paperGreen)}, ${blend(inkBlue, paperBlue)})`;
}

const isShape = (name: string): name is ShapeName => name in SHAPES;

/** Hairline drawings in a single ink on dark (or light) paper, like a technical figure. */
export function lineSkin(options: LineSkinOptions = {}): DiagramSkin {
  const ink = options.ink ?? DEFAULT_INK;
  const paper = options.paper ?? DEFAULT_PAPER;
  const strength = options.strength ?? DEFAULT_STRENGTH;
  const line = mix(ink, paper, strength);
  const faint = mix(ink, paper, Math.max(LABEL_STRENGTH, strength));
  const accent = rgbText(options.accent ?? ink);
  const drawn = new Map<ShapeName, Look>();

  const draw = (name: ShapeName): Look => {
    const shape = SHAPES[name];
    const decal = "decal" in shape ? { ...shape.decal, color: line, weight: 1.1 } : undefined;
    const look = drawn.get(name) ?? extrude({ ...shape, decal, ink: line, inkWidth: options.width ?? 1, sides: "flat", shadow: false, top: paper });

    drawn.set(name, look);

    return look;
  };

  return {
    look: (look) => (typeof look !== "string" ? look : isShape(look) ? draw(look) : looks[look]),
    palette: { top: paper, sides: [paper, paper, paper], line: rgbText(line), glow: rgbText(ink), text: line },
    colors: {
      ok: accent,
      pending: options.accent ? accent : rgbText(faint),
      error: rgbText(options.error ?? DEFAULT_ERROR),
      packet: accent,
      packetText: paper,
      label: faint,
      surface: rgbText(paper),
    },
    style: "line",
  };
}

/** Ready-made skins. */
export const skins = { line: lineSkin };
