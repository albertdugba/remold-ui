// @vitest-environment happy-dom
import type { FrameCallback, FrameLoop } from "@remold-ui/dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dust } from "./dust";

const rect = (left: number, top: number, width: number, height: number) =>
  ({ x: left, y: top, left, top, width, height, right: left + width, bottom: top + height, toJSON() {} }) as DOMRect;

/** One fake 2D context for drawing and sampling: it records the dots of the last frame, and reads back every pixel as opaque. */
let arcs: { x: number; y: number }[] = [];
function fakeCanvas() {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    return {
      canvas: this,
      fillStyle: "",
      setTransform() {},
      clearRect: () => (arcs = []),
      beginPath() {},
      moveTo() {},
      arc: (x: number, y: number) => arcs.push({ x, y }),
      rect() {},
      fill() {},
      save() {},
      restore() {},
      clip() {},
      roundRect() {},
      fillText() {},
      drawImage() {},
      getImageData: (_x: number, _y: number, width: number, height: number) => ({ width, height, data: new Uint8ClampedArray(width * height * 4).fill(255) }),
    } as unknown as CanvasRenderingContext2D;
  } as unknown as HTMLCanvasElement["getContext"]);
}

function manualLoop() {
  const callbacks = new Set<FrameCallback>();
  const loop: FrameLoop = { add: (cb) => (callbacks.add(cb), () => callbacks.delete(cb)) };
  return {
    loop,
    run: (seconds = 4) => {
      for (let t = 0; t < seconds && callbacks.size; t += 1 / 60) for (const cb of [...callbacks]) if (!cb(1 / 60)) callbacks.delete(cb);
    },
  };
}

let card: HTMLElement;
let row: HTMLElement;
let bin: HTMLElement;

beforeEach(() => {
  fakeCanvas();
  document.body.innerHTML = `<section id="card"><div id="row" style="background-color: rgb(255, 0, 0)">Hello</div><span id="bin"></span></section>`;
  card = document.getElementById("card")!;
  row = document.getElementById("row")!;
  bin = document.getElementById("bin")!;
  card.getBoundingClientRect = () => rect(0, 0, 400, 300);
  row.getBoundingClientRect = () => rect(20, 20, 100, 20);
  bin.getBoundingClientRect = () => rect(340, 260, 20, 20);
  vi.spyOn(Range.prototype, "getClientRects").mockReturnValue([rect(20, 20, 40, 12)] as unknown as DOMRectList);
});

afterEach(() => vi.restoreAllMocks());

describe("dust", () => {
  it("lays a canvas over the container while it pours, and removes it once the dots land", async () => {
    const frames = manualLoop();
    const trail = dust(card, { count: 50, loop: frames.loop, background: true });
    const poured = trail.away(row, bin);

    expect(card.querySelectorAll("canvas")).toHaveLength(1);
    expect(card.style.position).toBe("relative");
    frames.run();
    await poured;
    expect(card.querySelector("canvas")).toBeNull();
  });

  it("starts the dots where the element is and gathers them at the target's middle", async () => {
    const frames = manualLoop();
    const trail = dust(card, { count: 50, loop: frames.loop, background: true, heap: 4 });
    const poured = trail.away(row, bin);

    expect(arcs.every((a) => a.x >= 20 && a.x <= 120 && a.y >= 20 && a.y <= 40)).toBe(true);
    frames.run();
    expect(arcs.length).toBeGreaterThan(0);
    expect(arcs.every((a) => Math.hypot(a.x - 350, a.y - 270) <= 4.5)).toBe(true);
    await poured;
  });

  it("pours back out of the source into the elements", async () => {
    const frames = manualLoop();
    const trail = dust(card, { count: 50, loop: frames.loop, background: true });
    const poured = trail.back([row], bin);

    expect(arcs.every((a) => Math.hypot(a.x - 350, a.y - 270) <= 6.5)).toBe(true);
    frames.run();
    expect(arcs.every((a) => a.x >= 20 && a.x <= 120 && a.y >= 20 && a.y <= 40)).toBe(true);
    await poured;
  });

  it("does nothing for elements with nothing to show", async () => {
    const trail = dust(card, { count: 50 });
    row.getBoundingClientRect = () => rect(0, 0, 0, 0);
    await trail.away(row, bin);
    expect(card.querySelector("canvas")).toBeNull();
  });

  it("stops every pour in flight on destroy, and lets them resolve", async () => {
    const frames = manualLoop();
    const trail = dust(card, { count: 50, loop: frames.loop, background: true });
    const poured = trail.away(row, bin);
    trail.destroy();
    await poured;
    expect(card.querySelector("canvas")).toBeNull();
  });
});
