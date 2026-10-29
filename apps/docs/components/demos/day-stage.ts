/**
 * The warm, daylight look the story illustrations share: paper-white tops, soft clay sides, and a
 * few bright pieces that carry the story. Pair it with the `.day-stage` backdrop in `day-stage.css`.
 */
import "./day-stage.css";

type Palette = { top: string; sides: readonly [string, string, string]; line: string; glow: string; text: string };

const tone = (top: string, sides: [string, string, string], glow: string, text = "#ffffff"): Palette => ({
  top,
  sides,
  line: "90, 80, 65",
  glow,
  text,
});

/** The ground everything stands on, and quiet scenery. */
export const PAPER = tone("#fbf8f2", ["#cfc6b6", "#e3dccf", "#f3eee5"], "255, 170, 90", "#3a3128");
export const LEAF = tone("#86d19a", ["#2f7a45", "#4fa865", "#9fe0b0"], "80, 200, 120");
export const CLAY = tone("#e08d66", ["#8a3e22", "#c0643f", "#eda887"], "240, 140, 90");
export const BLOOM = tone("#ff8fb1", ["#a83a63", "#e0628c", "#ffb3cb"], "255, 120, 170");
export const SUN = tone("#ffd166", ["#a06a00", "#e0a21a", "#ffe08f"], "255, 200, 80", "#3a2a00");
export const ORANGE = tone("#ffb36b", ["#a3501a", "#e07a2e", "#ffc58f"], "255, 150, 70", "#3a1d05");
export const SKY = tone("#eef3fb", ["#8a9bb8", "#b9c6dc", "#dfe6f2"], "120, 160, 230", "#24324a");
export const MINT = tone("#5fd4a8", ["#16725a", "#2fae84", "#97ebcb"], "60, 210, 160");
export const STREET = tone("#e4ddd0", ["#b9b0a1", "#cdc5b7", "#ddd6c9"], "200, 190, 170", "#3a3128");
