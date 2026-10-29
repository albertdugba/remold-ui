/**
 * The dark build-tool look the canvas illustrations share: near-black tops, violet sides, grey
 * wire, a violet glow. Pair it with the `.night-stage` backdrop in `night-stage.css`.
 */
import "./night-stage.css";

export const NIGHT = {
  top: "#17161d",
  sides: ["#0f0d18", "#241a4a", "#6a4cff"],
  line: "150, 148, 170",
  glow: "124, 92, 255",
  text: "#d9d6ea",
} as const;

/** Ink for the platform each scene stands on. */
export const PLATFORM_INK = "rgba(124, 92, 255, 0.55)";
/** Ink for wireframe pieces: things not there yet. */
export const WIRE_INK = "rgba(170, 166, 195, 0.7)";
export const VIOLET = "#7c5cff";
