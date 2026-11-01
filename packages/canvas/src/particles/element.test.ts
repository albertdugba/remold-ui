// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleElementPoints } from "./element";

const rect = (left: number, top: number, width: number, height: number) =>
  ({ x: left, y: top, left, top, width, height, right: left + width, bottom: top + height, toJSON() {} }) as DOMRect;

/** Records what's painted. Every pixel reads back as opaque red, so the sampler fills the whole picture. */
function recorder({ tainted = false } = {}) {
  const calls = { boxes: [] as unknown[][], text: [] as { text: string; x: number; y: number; font: string; fill: unknown }[], images: 0, reads: 0 };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    const canvas = this;
    const context = {
      canvas,
      fillStyle: "" as unknown,
      font: "",
      textBaseline: "",
      setTransform() {},
      save() {},
      restore() {},
      beginPath() {},
      rect() {},
      clip() {},
      fill() {},
      roundRect: (...args: unknown[]) => calls.boxes.push(args),
      fillText: (text: string, x: number, y: number) => calls.text.push({ text, x, y, font: context.font, fill: context.fillStyle }),
      drawImage: (source: unknown) => {
        if (source instanceof HTMLImageElement) calls.images++;
      },
      getImageData: (_x: number, _y: number, width: number, height: number) => {
        calls.reads++;
        if (tainted && calls.reads === 1) throw new DOMException("tainted", "SecurityError");
        const data = new Uint8ClampedArray(width * height * 4);
        for (let i = 0; i < data.length; i += 4) data.set([255, 0, 0, 255], i);
        return { width, height, data };
      },
    };
    return context as unknown as CanvasRenderingContext2D;
  } as unknown as HTMLCanvasElement["getContext"]);
  return calls;
}

let card: HTMLElement;
let row: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = `
    <div id="card">
      <div id="row" style="background-color: rgb(255, 0, 0); border-top-left-radius: 9px">
        <span id="name" style="color: rgb(0, 0, 255); font-size: 14px; font-weight: 600">Q3 deck</span>
        <span style="display: none">Secret</span>
        <img id="art" alt="">
      </div>
    </div>`;
  card = document.getElementById("card")!;
  row = document.getElementById("row")!;
  // The card is scaled down to half size by a transform: 200 px on screen, 400 px of layout.
  card.getBoundingClientRect = () => rect(100, 50, 200, 100);
  Object.defineProperty(card, "offsetWidth", { value: 400 });
  row.getBoundingClientRect = () => rect(110, 60, 50, 20);
  document.getElementById("name")!.getBoundingClientRect = () => rect(112, 62, 30, 10);
  const art = document.getElementById("art") as HTMLImageElement;
  art.getBoundingClientRect = () => rect(140, 60, 20, 20);
  Object.defineProperty(art, "complete", { value: true });
  Object.defineProperty(art, "naturalWidth", { value: 20 });
  vi.spyOn(Range.prototype, "getClientRects").mockReturnValue([rect(112, 62, 30, 10)] as unknown as DOMRectList);
});

afterEach(() => vi.restoreAllMocks());

describe("sampleElementPoints", () => {
  it("paints backgrounds and text where the browser laid them out, in their own styles", () => {
    const calls = recorder();
    sampleElementPoints(row, { count: 50 });

    expect(calls.boxes).toEqual([[110, 60, 50, 20, 9]]);
    expect(calls.text).toEqual([{ text: "Q3 deck", x: 112, y: 67, font: expect.stringContaining("14px"), fill: "rgb(0, 0, 255)" }]);
    expect(calls.text[0]!.font).toContain("600");
    expect(calls.images).toBe(1);
  });

  it("can leave out the element's own background, but not its parts'", () => {
    const calls = recorder();
    document.getElementById("name")!.style.backgroundColor = "rgb(0, 255, 0)";
    sampleElementPoints(row, { count: 50, background: false });
    expect(calls.boxes).toEqual([[112, 62, 30, 10, 0]]);
  });

  it("leaves out parts that aren't shown", () => {
    const calls = recorder();
    sampleElementPoints(row, { count: 50 });
    expect(calls.text.map((t) => t.text)).not.toContain("Secret");
  });

  it("gives points in relativeTo's own CSS pixels, undoing a scaled ancestor", () => {
    recorder();
    const points = sampleElementPoints(row, { count: 200, relativeTo: card });

    // The row starts 10 px into the card on screen, which is 20 px of layout, and is 100 × 40 of layout.
    expect(points).toHaveLength(200);
    expect(Math.min(...points.map((p) => p.x))).toBeGreaterThanOrEqual(20);
    expect(Math.max(...points.map((p) => p.x))).toBeLessThanOrEqual(120);
    expect(Math.min(...points.map((p) => p.y))).toBeGreaterThanOrEqual(20);
    expect(Math.max(...points.map((p) => p.y))).toBeLessThanOrEqual(60);
  });

  it("tones points from a palette of CSS colours", () => {
    recorder();
    const points = sampleElementPoints(row, { count: 30, palette: ["rgb(0, 0, 255)", "#f00"] });
    expect(points.every((p) => p.tone === 1)).toBe(true);
  });

  it("paints again without images when one taints the canvas", () => {
    const calls = recorder({ tainted: true });
    expect(sampleElementPoints(row, { count: 20 })).toHaveLength(20);
    expect(calls.images).toBe(1);
    expect(calls.text).toHaveLength(2);
  });

  it("gives nothing for an element with no size, and rejects a bad resolution", () => {
    recorder();
    row.getBoundingClientRect = () => rect(0, 0, 0, 0);
    expect(sampleElementPoints(row)).toEqual([]);
    expect(() => sampleElementPoints(card, { resolution: 0 })).toThrow(/resolution/);
  });
});
