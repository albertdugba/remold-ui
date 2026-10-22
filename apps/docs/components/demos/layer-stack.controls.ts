import type { Customizable } from "../customize/controls";

/** The layer stack's settings, for its docs page. */
export const layerStackControls: Customizable = {
  importName: "LayerStack",
  importFrom: "@/components/remold/layer-stack",
  remount: true,
  controls: {
    gap: { type: "number", label: "Gap", min: 32, max: 90, step: 2, default: 46, description: "Space between layers, in floor units." },
    thickness: { type: "number", label: "Thickness", min: 10, max: 44, step: 2, default: 30, description: "How thick each layer is." },
    ghost: {
      type: "number",
      label: "Ghost",
      min: 0,
      max: 1,
      step: 0.02,
      default: 0.92,
      description: "How see-through the layers above the focused one get.",
    },
    every: {
      type: "number",
      label: "Step duration",
      min: 1200,
      max: 6000,
      step: 100,
      default: 2600,
      description: "Milliseconds per layer while playing.",
    },
    height: { type: "number", label: "Height", min: 380, max: 680, step: 20, default: 520, description: "The stage height in pixels." },
    sheen: { type: "toggle", label: "Sheen", default: true, description: "Light streaks across the focused layer’s sides." },
    autoplay: {
      type: "toggle",
      label: "Autoplay",
      default: true,
      description: "Step through the layers while on screen, until someone takes over.",
    },
  },
};
