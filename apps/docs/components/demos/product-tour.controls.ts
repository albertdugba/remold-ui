import type { Customizable } from "../customize/controls";

export const productTourControls: Customizable = {
  importName: "ProductTour",
  importFrom: "@/components/remold/product-tour",
  controls: {
    accent: {
      type: "color",
      label: "Accent",
      default: "#7c5cff",
      description: "The step count, the dots, Next and the glow round the spotlight.",
    },
    dim: {
      type: "number",
      label: "Dim",
      min: 0,
      max: 0.85,
      step: 0.05,
      default: 0.55,
      description: "How dark the app gets around the spotlight. Below 0.25 the ring and line take the accent instead.",
    },
    connector: {
      type: "toggle",
      label: "Line",
      default: true,
      description: "Draw the line from the tip to the control it explains.",
    },
    connectorStyle: {
      type: "select",
      label: "Line style",
      options: ["dotted", "dashed", "solid"],
      default: "dotted",
      description: "How the line is drawn.",
    },
    connectorShape: {
      type: "select",
      label: "Line shape",
      options: ["curve", "elbow", "straight"],
      default: "curve",
      description: "One smooth bend, a right-angled elbow, or straight across.",
    },
    pulse: {
      type: "toggle",
      label: "Light",
      default: true,
      description: "Send a light along the line at every step.",
    },
  },
};
