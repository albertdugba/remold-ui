import type { Diagram } from "./types";

export interface StoryOptions {
  /** Play again from the start when it ends. Default true. */
  loop?: boolean;
  /** Seconds to rest between runs. Default 1.5. */
  gap?: number;
}

export interface Story {
  readonly playing: boolean;
  /** Start from the beginning, unless it's already playing. */
  play(): void;
  /** Start again from the beginning. */
  replay(): void;
  /** Stop and put the diagram back how it started. */
  stop(): void;
  pause(): void;
  resume(): void;
}

const DEFAULT_GAP = 1.5;

const isReset = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

/** Play a script against a diagram, on a loop if you like; stopping or replaying cancels it cleanly. */
export function story(target: Diagram, script: (diagram: Diagram) => Promise<void>, options: StoryOptions = {}): Story {
  const loop = options.loop ?? true;
  const gap = options.gap ?? DEFAULT_GAP;

  let run = 0;
  let playing = false;

  async function once(token: number): Promise<boolean> {
    target.reset();
    await script(target);

    if (!loop || token !== run) return false;

    await target.wait(gap);

    return token === run;
  }

  async function start(token: number) {
    playing = true;

    try {
      while (await once(token));
    } catch (error) {
      if (!isReset(error)) throw error;
    } finally {
      if (token === run) playing = false;
    }
  }

  const stop = () => {
    run += 1;
    playing = false;
    target.reset();
  };

  return {
    get playing() {
      return playing;
    },

    play() {
      if (!playing) void start(++run);
    },

    replay() {
      stop();
      void start(++run);
    },

    stop,

    pause: () => target.pause(),

    resume: () => target.resume(),
  };
}
