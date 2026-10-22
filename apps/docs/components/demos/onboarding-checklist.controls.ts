import type { Customizable } from "../customize/controls";

/** The onboarding checklist's settings, for its docs page. */
export const onboardingChecklistControls: Customizable = {
  importName: "OnboardingChecklist",
  importFrom: "@/components/remold/onboarding-checklist",
  controls: {
    accent: {
      type: "color",
      label: "Accent",
      default: "#4f46e5",
      description: "The colour of the progress, the ticks and the main button.",
    },
    every: {
      type: "number",
      label: "Step duration",
      min: 1000,
      max: 4000,
      step: 100,
      default: 1800,
      description: "Milliseconds per beat of the scene; busy moments take half as long.",
    },
    bounce: {
      type: "number",
      label: "Bounce",
      min: 0,
      max: 0.4,
      step: 0.01,
      default: 0.15,
      description: "How much the springs overshoot.",
    },
    height: {
      type: "number",
      label: "Height",
      min: 460,
      max: 720,
      step: 20,
      default: 560,
      description: "The height of the whole thing in pixels.",
    },
    showApp: {
      type: "toggle",
      label: "Show the app",
      default: true,
      description: "Show the app behind the checklist, which fills in as steps are done.",
    },
    autoplay: {
      type: "toggle",
      label: "Autoplay",
      default: true,
      description: "Play the scene while on screen, until someone takes over.",
    },
  },
};
