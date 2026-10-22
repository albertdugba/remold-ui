import type { Customizable } from "../customize/controls";

/** The integrations hub's settings, for its docs page. */
export const integrationsHubControls: Customizable = {
  importName: "IntegrationsHub",
  importFrom: "@/components/remold/integrations-hub",
  remount: true,
  controls: {
    ringRadius: {
      type: "number",
      label: "Ring radius",
      min: 200,
      max: 360,
      step: 5,
      default: 285,
      description: "How far tiles sit from the hub in the All view, in floor units.",
    },
    focusRadius: {
      type: "number",
      label: "Focus radius",
      min: 150,
      max: 300,
      step: 5,
      default: 215,
      description: "How far a category’s tiles sit from the hub.",
    },
    tileSize: {
      type: "number",
      label: "Tile size",
      min: 50,
      max: 110,
      step: 2,
      default: 78,
      description: "Tile size in the All view; a category’s tiles are a fifth bigger.",
    },
    hubSize: { type: "number", label: "Hub size", min: 90, max: 220, step: 5, default: 150, description: "The hub’s size." },
    hubHeight: { type: "number", label: "Hub height", min: 10, max: 120, step: 2, default: 44, description: "How tall the hub stands." },
    zoom: { type: "number", label: "Zoom", min: 0.6, max: 1.4, step: 0.05, default: 1, description: "How close the camera is." },
    every: {
      type: "number",
      label: "Step duration",
      min: 1500,
      max: 8000,
      step: 100,
      default: 3200,
      description: "Milliseconds per category while playing.",
    },
    flow: { type: "toggle", label: "Flowing dots", default: true, description: "Dots flow along the lines." },
    showOthers: {
      type: "toggle",
      label: "Show others",
      default: true,
      description: "Keep tiles outside the category on a faint outer ring instead of hiding them.",
    },
  },
};
