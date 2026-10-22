import type { Customizable } from "../customize/controls";

/** The edge delivery scene's settings, for its docs page. */
export const edgeDeliveryControls: Customizable = {
  importName: "EdgeDelivery",
  importFrom: "@/components/remold/edge-delivery",
  remount: true,
  controls: {
    accent: {
      type: "color",
      label: "Accent",
      default: "#2563eb",
      description: "The colour of the file, its copies and the light along the routes.",
    },
    every: {
      type: "number",
      label: "Step duration",
      min: 1800,
      max: 6000,
      step: 100,
      default: 3200,
      description: "Milliseconds per step while playing.",
    },
    height: {
      type: "number",
      label: "Height",
      min: 340,
      max: 640,
      step: 20,
      default: 440,
      description: "The height of the scene in pixels.",
    },
    provider: {
      type: "select",
      label: "Provider",
      options: ["aws", "gcp", "cloudflare", "generic"],
      default: "aws",
      description: "Whose names to use for the parts (text only, no logos). Pass `names` for your own.",
    },
    showStats: { type: "toggle", label: "Numbers", default: true, description: "Show the numbers along the top." },
    autoplay: {
      type: "toggle",
      label: "Autoplay",
      default: true,
      description: "Step through the story while on screen, until someone takes over.",
    },
  },
};
