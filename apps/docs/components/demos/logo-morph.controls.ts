import type { Customizable } from "../customize/controls";

/** The logo morph's settings, for its docs page. */
export const logoMorphControls: Customizable = {
  importName: "LogoMorph",
  importFrom: "@/components/remold/logo-morph",
  controls: {
    color: { type: "color", label: "Colour", default: "#18181b", description: "The colour of the shapes." },
    every: {
      type: "number",
      label: "Hold",
      min: 1200,
      max: 5000,
      step: 100,
      default: 1800,
      description: "Milliseconds each shape is held while playing.",
    },
    bounce: { type: "number", label: "Bounce", min: 0, max: 0.4, step: 0.01, default: 0.12, description: "How much the morph overshoots." },
    height: {
      type: "number",
      label: "Height",
      min: 200,
      max: 480,
      step: 20,
      default: 300,
      description: "The height of the stage in pixels.",
    },
    autoplay: {
      type: "toggle",
      label: "Autoplay",
      default: true,
      description: "Play name → logo → name through the brands while on screen, until someone takes over.",
    },
  },
};
