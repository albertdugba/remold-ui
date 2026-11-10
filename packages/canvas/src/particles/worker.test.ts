// @vitest-environment happy-dom
import type { FrameCallback, FrameLoop } from "@remold-ui/dom";
import { matchPoints } from "@remold-ui/core";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { particles } from "./index";

/** A stand-in for the browser Worker: answers with the real matcher, but only when told to. */
class FakeWorker {
  static last: FakeWorker | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  inbox: { id: number; from: { x: number; y: number }[]; to: { x: number; y: number }[] }[] = [];
  constructor() {
    FakeWorker.last = this;
  }
  postMessage(message: FakeWorker["inbox"][number]) {
    this.inbox.push(message);
  }
  /** Answer the oldest request. */
  reply() {
    const { id, from, to } = this.inbox.shift()!;
    this.onmessage?.({ data: { id, matches: matchPoints(from, to) } });
  }
}

const context = new Proxy({} as Record<string, unknown>, {
  get: (t, k: string) => (k in t ? t[k] : k === "createLinearGradient" ? () => ({ addColorStop() {} }) : () => {}),
  set: (t, k: string, v) => ((t[k] = v), true),
});

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement["getContext"];
  Element.prototype.getBoundingClientRect = () =>
    ({ x: 0, y: 0, left: 0, top: 0, width: 400, height: 200, right: 400, bottom: 200, toJSON() {} }) as DOMRect;
  globalThis.Worker = FakeWorker as unknown as typeof Worker;
  URL.createObjectURL = () => "blob:match-worker";
});

function manualLoop() {
  const callbacks = new Set<FrameCallback>();
  const loop: FrameLoop = { add: (cb) => (callbacks.add(cb), () => callbacks.delete(cb)) };
  return { loop, running: () => callbacks.size > 0 };
}

/** A grid of `n` points, `columns` wide. Different widths are different shapes once fitted. */
const grid = (n: number, columns = 40) => Array.from({ length: n }, (_, i) => ({ x: (i % columns) * 3, y: Math.floor(i / columns) * 3 }));

const flushed = () => new Promise((r) => setTimeout(r, 0));

/** The worker's script loads the first time it's needed, so wait for requests to reach it. */
const requested = (count: number) => vi.waitFor(() => expect(FakeWorker.last?.inbox.length ?? 0).toBe(count));

describe("particles with big clouds", () => {
  it("pairs them in a worker, and only moves once the answer comes back", async () => {
    const frames = manualLoop();
    const dots = particles(document.createElement("canvas"), { points: grid(800), loop: frames.loop, reducedMotion: "never" });
    dots.to(grid(800, 20));
    // 800 × 800 is past the exact limit: the request went to the worker and nothing moved yet.
    await requested(1);
    expect(frames.running()).toBe(false);
    FakeWorker.last!.reply();
    await flushed();
    expect(frames.running()).toBe(true);
    dots.destroy();
  });

  it("drops an answer for a shape that's already been replaced", async () => {
    const frames = manualLoop();
    const dots = particles(document.createElement("canvas"), { points: grid(800), loop: frames.loop, reducedMotion: "never" });
    dots.to(grid(800, 20));
    dots.to(grid(900, 60));
    await requested(2);
    const worker = FakeWorker.last!;
    worker.reply();
    await flushed();
    // The first answer is stale: still waiting for the second.
    expect(dots.count).toBe(800);
    worker.reply();
    await flushed();
    expect(dots.count).toBe(900);
    dots.destroy();
  });

  it("falls back to the main thread when the worker fails", async () => {
    const frames = manualLoop();
    const dots = particles(document.createElement("canvas"), { points: grid(800), loop: frames.loop, reducedMotion: "never" });
    dots.to(grid(820, 20));
    await requested(1);
    FakeWorker.last!.onerror?.();
    await flushed();
    expect(dots.count).toBe(820);
    dots.destroy();
  });
});
