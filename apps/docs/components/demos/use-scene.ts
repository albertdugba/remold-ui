"use client";

import { useAutoplay } from "@remold-ui/react";
import { useCallback, useEffect, useState } from "react";

export function useScene<S>(
  beats: readonly { ms: number }[],
  beatState: (step: number) => S,
  playing?: boolean,
) {
  const standalone = playing === undefined;
  const autoplay = useAutoplay(beats.length, {
    every: (i) => beats[i]!.ms,
    stopOnInteraction: standalone,
    // On a docs page (no `playing` from outside) the scene waits to be touched; only the home page plays it.
    autoStart: !standalone,
  });
  const { setPlaying } = autoplay;
  const [own, setOwn] = useState<S | null>(null);

  useEffect(() => {
    if (standalone) return;
    setPlaying(playing);
    if (playing) setOwn(null);
  }, [standalone, playing, setPlaying]);

  const state = own ?? beatState(autoplay.step);

  const take = useCallback(
    (next: S | ((current: S) => S)) => {
      setPlaying(false);
      setOwn((current) => {
        const base = current ?? beatState(autoplay.step);
        return typeof next === "function"
          ? (next as (current: S) => S)(base)
          : next;
      });
    },
    [setPlaying, beatState, autoplay.step],
  );

  return {
    ref: autoplay.ref,
    step: autoplay.step,
    state,
    take,
    live: own === null && autoplay.playing,
  };
}
