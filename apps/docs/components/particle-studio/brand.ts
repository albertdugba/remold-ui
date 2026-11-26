/**
 * The guided studio: a brand (name, logo, tagline) and a style make a whole film. Styles are
 * complete looks, so the first result is already usable.
 */
import { FILM_VERSION, frameId, type Brand, type Film, type FilmFrame, type FilmLook, type Shade } from "./document";

export interface Style {
  name: string;
  description: string;
  background: string;
  look: FilmLook;
  count: number;
  weight: number;
  shade: { name: Shade; logo: Shade; tagline: Shade };
  transition: FilmFrame["transition"];
}

const camera = { on: false, spin: 0.05, tilt: 12 };

export const STYLES: Style[] = [
  {
    name: "Terminal",
    description: "Green ASCII on black, like a boot screen.",
    background: "#050806",
    look: { dot: "ascii", radius: 2, characters: ".:-=+*#%@", cell: 11, colors: ["#0b3d1c", "#22c55e", "#dcfce7"], blend: "normal", camera },
    count: 2800,
    weight: 800,
    shade: { name: "gradient", logo: "rings", tagline: "flat" },
    transition: "scatter",
  },
  {
    name: "Halftone",
    description: "Print dots on warm paper.",
    background: "#f4efe6",
    look: { dot: "circle", radius: 2.4, characters: ".:-=+*#%@", cell: 12, colors: ["#e8dccb", "#d9480f", "#1c1917"], blend: "normal", camera },
    count: 3200,
    weight: 900,
    shade: { name: "gradient", logo: "rings", tagline: "flat" },
    transition: "scatter",
  },
  {
    name: "Neon orbit",
    description: "Glowing dots turning in 3D.",
    background: "#050507",
    look: { dot: "circle", radius: 1.6, characters: "·•●", cell: 12, colors: ["#3b0764", "#c084fc", "#fdf4ff"], blend: "add", camera: { on: true, spin: 0.06, tilt: 16 } },
    count: 3000,
    weight: 900,
    shade: { name: "noise", logo: "rings", tagline: "noise" },
    transition: "scatter",
  },
  {
    name: "Blueprint",
    description: "Square dots on drafting blue.",
    background: "#0b2a4a",
    look: { dot: "square", radius: 1.5, characters: ".:-=+*#%@", cell: 12, colors: ["#1e4a7a", "#7dd3fc", "#f0f9ff"], blend: "normal", camera },
    count: 2600,
    weight: 700,
    shade: { name: "flat", logo: "flat", tagline: "flat" },
    transition: "direct",
  },
  {
    name: "Mono",
    description: "Black ASCII blocks on white.",
    background: "#ffffff",
    look: { dot: "ascii", radius: 2, characters: "░▒▓█", cell: 10, colors: ["#d4d4d4", "#525252", "#0a0a0a"], blend: "normal", camera },
    count: 3000,
    weight: 900,
    shade: { name: "gradient", logo: "rings", tagline: "flat" },
    transition: "direct",
  },
];

export const styleNamed = (name: string | undefined) => STYLES.find((style) => style.name === name) ?? STYLES[0]!;

export const DEFAULT_BRAND: Brand = { name: "remold", tagline: "motion for what changed", logo: null };

/** Name, then logo, then tagline, in the style's look, keeping the canvas size you chose. */
export function buildFilm(brand: Brand, styleName: string, canvas: { width: number; height: number } = { width: 960, height: 540 }): Film {
  const style = styleNamed(styleName);
  const frames: FilmFrame[] = [];
  const name = brand.name.trim() || "hello";

  frames.push({ id: frameId(), name: "Name", ms: 2000, source: { kind: "text", text: name, weight: style.weight }, shade: style.shade.name, transition: style.transition });

  if (brand.logo?.kind === "path") {
    frames.push({ id: frameId(), name: "Logo", ms: 1800, source: { kind: "path", path: brand.logo.path, outline: brand.logo.outline }, shade: style.shade.logo, transition: style.transition });
  } else if (brand.logo?.kind === "image") {
    frames.push({ id: frameId(), name: "Logo", ms: 1800, source: { kind: "image", src: brand.logo.src, by: "dark" }, shade: "flat", transition: style.transition });
  }

  if (brand.tagline.trim()) {
    frames.push({ id: frameId(), name: "Tagline", ms: 2200, source: { kind: "text", text: brand.tagline.trim(), weight: Math.min(700, style.weight) }, shade: style.shade.tagline, transition: style.transition });
  }

  return {
    version: FILM_VERSION,
    title: name,
    brand,
    style: style.name,
    canvas: { ...canvas, background: style.background },
    count: style.count,
    look: style.look,
    frames,
  };
}
