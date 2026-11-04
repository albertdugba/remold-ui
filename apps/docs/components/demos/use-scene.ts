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
    every: (index) => beats[index]!.ms,
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

/** Beats that type `text` one character at a time after `from`, at an even pace, holding on the last. */
export function typing<S>(
  text: string,
  state: (typed: string) => S,
  { from = "", every = 65, hold = 600 }: { from?: string; every?: number; hold?: number } = {},
): (S & { ms: number })[] {
  const characters = [...text];
  return characters.map((_, index) => ({
    ...state(from + characters.slice(0, index + 1).join("")),
    ms: index === characters.length - 1 ? hold : every,
  }));
}
