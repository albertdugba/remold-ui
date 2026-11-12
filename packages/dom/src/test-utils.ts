import type { FrameCallback, FrameLoop } from "./frames";

let installed = false;

export function useFakeLayout(): void {
  if (installed) return;

  installed = true;
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const [x = 0, y = 0, width = 0, height = 0] = (this.getAttribute("data-box") ?? "").split(" ").filter(Boolean).map(Number);

    return {
      x,
      y,
      width,
      height,
      left: x,
      top: y,
      right: x + width,
      bottom: y + height,
      toJSON() {
        return this;
      },
    } as DOMRect;
  };
}

export function manualLoop() {
  const callbacks = new Set<FrameCallback>();
  const loop: FrameLoop = {
    add(callback) {
      callbacks.add(callback);

      return () => callbacks.delete(callback);
    },
  };
  const step = (dt = 1 / 60) => {
    for (const callback of [...callbacks]) if (!callback(dt)) callbacks.delete(callback);
  };
  return {
    loop,
    step,
    run(seconds = 3) {
      for (let t = 0; t < seconds && callbacks.size > 0; t += 1 / 60) step();
    },
    get active() {
      return callbacks.size;
    },
  };
}

export function mount(html: string, box = "0 0 1000 800"): HTMLElement {
  document.body.replaceChildren();
  const root = document.createElement("div");

  root.setAttribute("data-box", box);
  root.innerHTML = html;
  document.body.append(root);

  return root;
}
