import type { Palette } from "../object-looks";

export type Rgb = [number, number, number];

const LONG_HEX = /^#?([0-9a-f]{6})$/i;
const SHORT_HEX = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const RGB_FUNCTION = /^(?:rgba?\()?\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i;

export function parseColor(color: string): Rgb {
  const trimmed = color.trim();
  const long = LONG_HEX.exec(trimmed);

  if (long) {
    const value = Number.parseInt(long[1]!, 16);

    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }

  const short = SHORT_HEX.exec(trimmed);

  if (short) return [short[1]!, short[2]!, short[3]!].map((digit) => Number.parseInt(digit + digit, 16)) as Rgb;

  const parts = RGB_FUNCTION.exec(trimmed);

  return parts ? [Number(parts[1]), Number(parts[2]), Number(parts[3])] : [128, 128, 128];
}

export const css = ([red, green, blue]: Rgb, alpha = 1) =>
  alpha >= 1 ? `rgb(${red}, ${green}, ${blue})` : `rgba(${red}, ${green}, ${blue}, ${alpha})`;

const clampUnit = (value: number) => Math.max(-1, Math.min(1, value));

export function lit(color: Rgb, light: number): string {
  const t = clampUnit(light);
  const toward = t < 0 ? 0 : 255;
  const amount = t < 0 ? -t * 0.3 : t * 0.32;

  return css(color.map((channel) => Math.round(channel + (toward - channel) * amount)) as Rgb);
}

export function shade(palette: Palette, light: number): string {
  const [dark, middle, bright] = palette.sides.map(parseColor) as [Rgb, Rgb, Rgb];
  const t = clampUnit(light);
  const [from, to, amount] = t < 0 ? [middle, dark, -t] : [middle, bright, t];
  const mix = (channel: 0 | 1 | 2) => Math.round(from[channel] + (to[channel] - from[channel]) * amount);

  return `rgb(${mix(0)}, ${mix(1)}, ${mix(2)})`;
}
