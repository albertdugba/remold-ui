// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { dragToDismiss } from "./dismiss";
import { manualLoop } from "./test-utils";

/** A pointer at (0, y) at time t, on the primary button. */
const pointer = (type: string, y: number, t: number) => {
  const e = new PointerEvent(type, { clientX: 0, clientY: y, button: 0, pointerId: 1, bubbles: true });
  Object.defineProperty(e, "timeStamp", { value: t });
  return e;
};

const sheet = () => {
  const el = document.createElement("div");
  document.body.append(el);
  return el;
};

describe("dragToDismiss", () => {
  it("dismisses when pulled far enough, and leaves the offset for what follows", () => {
    const el = sheet();
    const onDismiss = vi.fn();
    dragToDismiss(el, { onDismiss, reducedMotion: "never" });
    el.dispatchEvent(pointer("pointerdown", 0, 0));
    el.dispatchEvent(pointer("pointermove", 60, 400));
    el.dispatchEvent(pointer("pointermove", 140, 800));
    expect(el.style.transform).toBe("translateY(140px)");
    el.dispatchEvent(pointer("pointerup", 140, 1000));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(el.style.transform).toBe("translateY(140px)");
  });

  it("dismisses a short, fast flick", () => {
    const el = sheet();
    const onDismiss = vi.fn();
    dragToDismiss(el, { onDismiss, reducedMotion: "never" });
    el.dispatchEvent(pointer("pointerdown", 0, 0));
    el.dispatchEvent(pointer("pointermove", 20, 10));
    el.dispatchEvent(pointer("pointermove", 40, 20));
    el.dispatchEvent(pointer("pointerup", 40, 25));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("springs back from a short, slow drag", () => {
    const el = sheet();
    const onDismiss = vi.fn();
    const frames = manualLoop();
    dragToDismiss(el, { onDismiss, reducedMotion: "never", loop: frames.loop });
    el.dispatchEvent(pointer("pointerdown", 0, 0));
    el.dispatchEvent(pointer("pointermove", 30, 500));
    el.dispatchEvent(pointer("pointermove", 50, 1000));
    el.dispatchEvent(pointer("pointerup", 50, 1200));
    expect(onDismiss).not.toHaveBeenCalled();
    frames.step();
    const mid = Number.parseFloat(/-?\d+(\.\d+)?/.exec(el.style.transform)?.[0] ?? "0");
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(50);
    frames.run();
    expect(el.style.transform).toBe("");
  });

  it("stretches the wrong way instead of following the finger", () => {
    const el = sheet();
    dragToDismiss(el, { onDismiss: () => {}, reducedMotion: "never" });
    el.dispatchEvent(pointer("pointerdown", 300, 0));
    el.dispatchEvent(pointer("pointermove", 100, 500));
    const offset = Number.parseFloat(/-?\d+(\.\d+)?/.exec(el.style.transform)?.[0] ?? "0");
    expect(offset).toBeLessThan(0);
    expect(offset).toBeGreaterThan(-200);
  });

  it("ignores presses that never move past the slop, so clicks inside still work", () => {
    const el = sheet();
    dragToDismiss(el, { onDismiss: () => {}, reducedMotion: "never" });
    el.dispatchEvent(pointer("pointerdown", 0, 0));
    el.dispatchEvent(pointer("pointermove", 2, 50));
    el.dispatchEvent(pointer("pointerup", 2, 100));
    expect(el.style.transform).toBe("");
  });

  it("puts everything back when destroyed", () => {
    const el = sheet();
    const drag = dragToDismiss(el, { onDismiss: () => {} });
    expect(el.style.touchAction).toBe("pan-x");
    drag.destroy();
    expect(el.style.touchAction).toBe("");
  });
});
