/**
 * The frame loop: one shared `requestAnimationFrame` loop for every animation on the page.
 *
 * Callbacks receive the real time since the last frame in seconds, so motion runs at the same
 * speed on 60 Hz and 120 Hz screens. The loop sleeps when nothing is animating.
 */

/** A frame callback. Receives seconds since the last frame; return `true` to keep running. */
export type FrameCallback = (dt: number) => boolean;

/** What the loop needs from the platform. Defaults to `requestAnimationFrame` and `performance.now`. */
export interface FrameScheduler {
  request(callback: (time: number) => void): number;
  cancel(id: number): void;
  now(): number;
}

export interface FrameLoopOptions {
  scheduler?: FrameScheduler;
  /**
   * The longest step a callback will see, in seconds (default 1/30). After a stall, such as a
   * background tab, things carry on from where they were instead of leaping ahead.
   */
  maxDelta?: number;
}

export interface FrameLoop {
  /** Run `callback` every frame until it returns false. Returns a function that stops it early. */
  add(callback: FrameCallback): () => void;
}

const browserScheduler = (): FrameScheduler => ({
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
  now: () => performance.now(),
});

function elapsedSeconds({ time, previousTime, maxDelta }: { time: number; previousTime: number; maxDelta: number }): number {
  return Math.min(maxDelta, Math.max(0, (time - previousTime) / 1000));
}

function runCallback({ callback, delta }: { callback: FrameCallback; delta: number }): boolean {
  try {
    return callback(delta);
  } catch (error) {
    queueMicrotask(() => {
      throw error;
    });
    return false;
  }
}

function advanceCallbacks({ callbacks, delta }: { callbacks: Set<FrameCallback>; delta: number }): void {
  for (const callback of [...callbacks]) {
    if (!runCallback({ callback, delta })) callbacks.delete(callback);
  }
}

export function createFrameLoop({ scheduler, maxDelta = 1 / 30 }: FrameLoopOptions = {}): FrameLoop {
  const callbacks = new Set<FrameCallback>();
  let platform: FrameScheduler | undefined = scheduler;
  let frame: number | null = null;
  let last = 0;

  const tick = (time: number) => {
    frame = null;
    const dt = elapsedSeconds({ time, previousTime: last, maxDelta });
    last = time;
    advanceCallbacks({ callbacks, delta: dt });
    if (callbacks.size > 0) frame = platform!.request(tick);
  };

  return {
    add(callback) {
      platform ??= browserScheduler();
      callbacks.add(callback);
      if (frame === null) {
        last = platform.now();
        frame = platform.request(tick);
      }
      return () => {
        callbacks.delete(callback);
        if (callbacks.size === 0 && frame !== null) {
          platform!.cancel(frame);
          frame = null;
        }
      };
    },
  };
}

let shared: FrameLoop | undefined;

/**
 * Run `callback` every frame on the page's shared loop until it returns false.
 *
 * ```ts
 * const x = value(0);
 * x.to(100);
 * frames((dt) => {
 *   x.step(dt);
 *   el.style.translate = `${x.current}px`;
 *   return !x.settled;
 * });
 * ```
 */
export function frames(callback: FrameCallback): () => void {
  shared ??= createFrameLoop();
  return shared.add(callback);
}
