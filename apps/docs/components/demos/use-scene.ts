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
    autoStart: Boolean(playing),
  });
  const { setPlaying } = autoplay;
  const [userState, setUserState] = useState<S | null>(null);

  useEffect(() => {
    if (standalone) return;
    setPlaying(playing);
    if (playing) setUserState(null);
  }, [standalone, playing, setPlaying]);

  const state = userState ?? beatState(autoplay.step);

  const takeOver = useCallback(
    (update: S | ((current: S) => S)) => {
      setPlaying(false);
      setUserState((current) => {
        const base = current ?? beatState(autoplay.step);
        return typeof update === "function" ? (update as (current: S) => S)(base) : update;
      });
    },
    [setPlaying, beatState, autoplay.step],
  );

  const live = userState === null && autoplay.active;

  const onValueChange = useCallback(
    (value: S, details?: { reason: "interaction" | "timer" }) => {
      if (details?.reason === "timer" && live) return;
      takeOver(value);
    },
    [live, takeOver],
  );

  return { ref: autoplay.ref, step: autoplay.step, state, takeOver, onValueChange, live };
}

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
