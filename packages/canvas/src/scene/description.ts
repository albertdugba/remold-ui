const HIDDEN_STYLE = {
  position: "absolute",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
};

export function createDescription(canvas: HTMLCanvasElement, label: string | undefined, keyboard: boolean): HTMLParagraphElement {
  const description = document.createElement("p");

  description.id = `rm-scene-${Math.random().toString(36).slice(2, 9)}`;
  description.setAttribute("aria-live", "polite");
  Object.assign(description.style, HIDDEN_STYLE);
  canvas.after(description);
  canvas.setAttribute("aria-describedby", description.id);

  if (label) canvas.setAttribute("aria-label", label);

  if (keyboard) {
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-roledescription", "interactive scene");
  } else {
    canvas.setAttribute("role", "img");
  }

  return description;
}
