import {
  converter,
  modeA98,
  modeHsl,
  modeHwb,
  modeLab,
  modeLch,
  modeLrgb,
  modeOklab,
  modeOklch,
  modeP3,
  modeProphoto,
  modeRec2020,
  modeRgb,
  modeXyz50,
  modeXyz65,
  useMode,
} from "culori/fn";
import type { Rgba } from "@remold-ui/core";

[
  modeRgb,
  modeHsl,
  modeHwb,
  modeLab,
  modeLch,
  modeLrgb,
  modeOklab,
  modeOklch,
  modeP3,
  modeA98,
  modeProphoto,
  modeRec2020,
  modeXyz50,
  modeXyz65,
].forEach(useMode);

const toRgb = converter("rgb");
const colorCache = new Map<string, Rgba>();

const clamp = (value: number): number => Math.min(1, Math.max(0, value));
const byte = (value: number): number => Math.round(clamp(value) * 255);

/** Convert a computed CSS colour to sRGB byte channels and a unit alpha. */
export function parseColor(value: string): Rgba {
  if (!value || value === "none") return [0, 0, 0, 0];

  const cached = colorCache.get(value);

  if (cached) return cached;

  const color = toRgb(value);
  const result: Rgba = color ? [byte(color.r), byte(color.g), byte(color.b), clamp(color.alpha ?? 1)] : [0, 0, 0, 1];

  colorCache.set(value, result);

  return result;
}
