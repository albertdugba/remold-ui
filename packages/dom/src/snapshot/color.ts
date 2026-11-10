/**
 * CSS colours to sRGB bytes, without a canvas: the functions browsers report computed colours in
 * (`rgb()`, `hsl()`, `hwb()`, `lab()`, `lch()`, `oklab()`, `oklch()`, `color()` with any CSS colour
 * profile) and hex. The maths and matrices are CSS Color 4's. Anything else (a colour name, say) is
 * read through a 2D canvas when there is one.
 */
import type { Rgba } from "@remold-ui/core";

type Vector = [number, number, number];
type Matrix = readonly [Vector, Vector, Vector];

const multiply = (matrix: Matrix, [a, b, c]: Vector): Vector => [
  matrix[0][0] * a + matrix[0][1] * b + matrix[0][2] * c,
  matrix[1][0] * a + matrix[1][1] * b + matrix[1][2] * c,
  matrix[2][0] * a + matrix[2][1] * b + matrix[2][2] * c,
];

const XYZ_TO_SRGB: Matrix = [
  [3.2409699419045226, -1.537383177570094, -0.4986107602930034],
  [-0.9692436362808796, 1.8759675015077202, 0.04155505740717559],
  [0.05563007969699366, -0.20397695888897652, 1.0569715142428786],
];
const D50_TO_D65: Matrix = [
  [0.9554734527042182, -0.023098536874261423, 0.0632593086610217],
  [-0.028369706963208136, 1.0099954580058226, 0.021041398966943008],
  [0.012314001688319899, -0.020507696433477912, 1.3303659366080753],
];
const D50_WHITE: Vector = [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585];

/** Each RGB colour profile: its curve to linear light, and its matrix to XYZ (D65, or D50 for ProPhoto). */
const signed = (curve: (value: number) => number) => (value: number) => Math.sign(value) * curve(Math.abs(value));
const srgbToLinear = signed((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
const PROFILES: Record<string, { linear: (value: number) => number; toXyz?: Matrix; d50?: boolean }> = {
  srgb: { linear: srgbToLinear },
  "srgb-linear": { linear: (value) => value },
  "display-p3": {
    linear: srgbToLinear,
    toXyz: [
      [0.4865709486482162, 0.26566769316909306, 0.1982172852343625],
      [0.2289745640697488, 0.6917385218365064, 0.079286914093745],
      [0, 0.04511338185890264, 1.043944368900976],
    ],
  },
  rec2020: {
    linear: signed((value) =>
      value < 0.018053968510807 * 4.5 ? value / 4.5 : ((value + 0.09929682680944) / 1.09929682680944) ** (1 / 0.45),
    ),
    toXyz: [
      [0.6369580483012914, 0.14461690358620832, 0.1688809751641721],
      [0.2627002120112671, 0.6779980715188708, 0.05930171646986196],
      [0, 0.028072693049087428, 1.060985057710791],
    ],
  },
  "a98-rgb": {
    linear: signed((value) => value ** (563 / 256)),
    toXyz: [
      [0.5766690429101305, 0.1855582379065463, 0.1882286462349947],
      [0.29734497525053605, 0.6273635662554661, 0.0752914584939978],
      [0.02703136138641234, 0.07068885253582723, 0.9913375368376388],
    ],
  },
  "prophoto-rgb": {
    linear: signed((value) => (value <= 16 / 512 ? value / 16 : value ** 1.8)),
    toXyz: [
      [0.7977604896723027, 0.13518583717574031, 0.0313493495815248],
      [0.2880711282292934, 0.7118432178101014, 0.00008565396060525902],
      [0, 0, 0.8251046025104601],
    ],
    d50: true,
  },
};

/** Linear sRGB from XYZ, adapting D50 to D65 first when it's D50. */
const fromXyz = (xyz: Vector, d50 = false): Vector => multiply(XYZ_TO_SRGB, d50 ? multiply(D50_TO_D65, xyz) : xyz);

function labToLinear([lightness, a, b]: Vector): Vector {
  const [kappa, epsilon] = [24389 / 27, 216 / 24389];
  const fy = (lightness + 16) / 116;
  const [fx, fz] = [a / 500 + fy, fy - b / 200];
  const curve = (f: number) => (f ** 3 > epsilon ? f ** 3 : (116 * f - 16) / kappa);
  const xyz: Vector = [curve(fx), lightness > kappa * epsilon ? fy ** 3 : lightness / kappa, curve(fz)];
  return fromXyz(xyz.map((value, axis) => value * D50_WHITE[axis]!) as Vector, true);
}

function oklabToLinear([lightness, a, b]: Vector): Vector {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const polar = (lightness: number, chroma: number, hue: number): Vector => [
  lightness,
  chroma * Math.cos((hue * Math.PI) / 180),
  chroma * Math.sin((hue * Math.PI) / 180),
];

function hslToRgb(hue: number, saturation: number, lightness: number): Vector {
  const channel = (offset: number) => {
    const k = (offset + hue / 30) % 12;
    return lightness - saturation * Math.min(lightness, 1 - lightness) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [channel(0), channel(8), channel(4)];
}

/** A number, a percentage of `full`, an angle in degrees (for `angle`), or `none`. */
function read(token: string | undefined, full: number, angle = false): number {
  if (token === undefined || token === "none") return 0;
  const value = Number.parseFloat(token);
  if (!Number.isFinite(value)) return Number.NaN;
  if (token.endsWith("%")) return (value / 100) * full;
  if (angle) {
    if (token.endsWith("rad")) return (value * 180) / Math.PI;
    if (token.endsWith("grad")) return value * 0.9;
    if (token.endsWith("turn")) return value * 360;
  }
  return value;
}

/** sRGB (0 to 1 a channel, unclamped) and alpha from a colour function, or null if it isn't one. */
function parseFunction(value: string): [Vector, number] | null {
  const match = /^([a-z-]+)\((.*)\)$/.exec(value);
  if (!match) return null;
  const [, name, body] = match as unknown as [string, string, string];
  const [channels = "", alphaToken] = body.split("/");
  const tokens = channels.trim().split(/[\s,]+/);
  // The legacy comma syntax puts alpha fourth.
  const alpha = clamp(read(alphaToken?.trim() ?? tokens[name === "color" ? 4 : 3] ?? "1", 1));

  const gamma = (linear: Vector): Vector =>
    linear.map(
      (channel) =>
        Math.sign(channel) * (Math.abs(channel) <= 0.0031308 ? 12.92 * Math.abs(channel) : 1.055 * Math.abs(channel) ** (1 / 2.4) - 0.055),
    ) as Vector;

  switch (name) {
    case "rgb":
    case "rgba":
      return [[read(tokens[0], 255) / 255, read(tokens[1], 255) / 255, read(tokens[2], 255) / 255], alpha];
    case "hsl":
    case "hsla":
      return [hslToRgb(read(tokens[0], 360, true), read(tokens[1], 100) / 100, read(tokens[2], 100) / 100), alpha];
    case "hwb": {
      const [hue, white, black] = [read(tokens[0], 360, true), read(tokens[1], 100) / 100, read(tokens[2], 100) / 100];
      if (white + black >= 1) return [[white / (white + black), white / (white + black), white / (white + black)], alpha];
      return [hslToRgb(hue, 1, 0.5).map((channel) => channel * (1 - white - black) + white) as Vector, alpha];
    }
    case "lab":
      return [gamma(labToLinear([read(tokens[0], 100), read(tokens[1], 125), read(tokens[2], 125)])), alpha];
    case "lch":
      return [gamma(labToLinear(polar(read(tokens[0], 100), read(tokens[1], 150), read(tokens[2], 360, true)))), alpha];
    case "oklab":
      return [gamma(oklabToLinear([read(tokens[0], 1), read(tokens[1], 0.4), read(tokens[2], 0.4)])), alpha];
    case "oklch":
      return [gamma(oklabToLinear(polar(read(tokens[0], 1), read(tokens[1], 0.4), read(tokens[2], 360, true)))), alpha];
    case "color": {
      const [space = "", ...rest] = tokens;
      const values = [read(rest[0], 1), read(rest[1], 1), read(rest[2], 1)] as Vector;
      if (space === "xyz" || space === "xyz-d65" || space === "xyz-d50") return [gamma(fromXyz(values, space === "xyz-d50")), alpha];
      const profile = PROFILES[space];
      if (!profile) return null;
      const linear = values.map(profile.linear) as Vector;
      return [gamma(profile.toXyz ? fromXyz(multiply(profile.toXyz, linear), profile.d50) : linear), alpha];
    }
    default:
      return null;
  }
}

function parseHex(value: string): Rgba | null {
  if (!/^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(value)) return null;
  const digits = value.length <= 5 ? [...value.slice(1)].map((digit) => digit + digit) : (value.slice(1).match(/../g) as string[]);
  const [red = "00", green = "00", blue = "00", alpha = "ff"] = digits;
  return [Number.parseInt(red, 16), Number.parseInt(green, 16), Number.parseInt(blue, 16), Number.parseInt(alpha, 16) / 255];
}

let probe: CanvasRenderingContext2D | null | undefined;

/** A colour the parser doesn't know (a name, say), as the browser's canvas reads it. */
function throughCanvas(value: string): Rgba | null {
  if (probe === undefined) {
    probe = typeof document === "undefined" ? null : (document.createElement("canvas").getContext("2d") ?? null);
  }
  if (!probe) return null;
  probe.fillStyle = "#010203";
  probe.fillStyle = value;
  const read = String(probe.fillStyle);
  if (read === "#010203" && value.toLowerCase() !== "#010203") return null;
  return parseHex(read) ?? toRgba(parseFunction(read));
}

const clamp = (value: number): number => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);
const byte = (value: number): number => Math.round(clamp(value) * 255);
const toRgba = (parsed: [Vector, number] | null): Rgba | null =>
  parsed ? [byte(parsed[0][0]), byte(parsed[0][1]), byte(parsed[0][2]), parsed[1]] : null;

const colorCache = new Map<string, Rgba>();

/** Convert a computed CSS colour to sRGB byte channels and a unit alpha. */
export function parseColor(value: string): Rgba {
  if (!value || value === "none") return [0, 0, 0, 0];

  const cached = colorCache.get(value);

  if (cached) return cached;

  const text = value.trim().toLowerCase();
  const result: Rgba =
    text === "transparent" ? [0, 0, 0, 0] : (parseHex(text) ?? toRgba(parseFunction(text)) ?? throughCanvas(text) ?? [0, 0, 0, 1]);

  colorCache.set(value, result);

  return result;
}
