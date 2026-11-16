interface Timer {
  at: number;
  resolve: () => void;
  reject: (reason: unknown) => void;
}

export interface Clock {
  readonly now: number;
  readonly paused: boolean;
  readonly waiting: boolean;
  after(seconds: number): Promise<void>;
  advance(seconds: number): void;
  cancel(): void;
  pause(): void;
  resume(): void;
}

export const resetError = () => new DOMException("The diagram was reset", "AbortError");

export function createClock(): Clock {
  let now = 0;
  let paused = false;
  let timers: Timer[] = [];

  const settleDue = () => {
    const due = timers.filter((timer) => timer.at <= now);

    timers = timers.filter((timer) => timer.at > now);

    for (const timer of due) timer.resolve();
  };

  return {
    get now() {
      return now;
    },

    get paused() {
      return paused;
    },

    get waiting() {
      return timers.length > 0;
    },

    after(seconds) {
      return new Promise((resolve, reject) => {
        timers.push({ at: now + Math.max(0, seconds), resolve, reject });
      });
    },

    advance(seconds) {
      if (paused) return;

      now += seconds;
      settleDue();
    },

    cancel() {
      const cancelled = timers;

      timers = [];

      for (const timer of cancelled) timer.reject(resetError());
    },

    pause() {
      paused = true;
    },

    resume() {
      paused = false;
    },
  };
}
