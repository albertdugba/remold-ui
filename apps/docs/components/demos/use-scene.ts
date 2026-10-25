"use client";
/**
 * A demo that plays a scene by itself until someone takes over. The scene is a list of beats, each
 * turned into the demo's state; the moment someone does something, the demo keeps its own state from
 * then on and the scene stops.
 *
 * On its own page the demo stops itself on the first touch. On a home page card, the card owns play
 * and pause and passes `playing`: pressing play again hands the demo back to the scene.
 */
import { useAutoplay } from "@remold-ui/react";
import { useCallback, useEffect, useState } from "react";

export function useScene<S>(beats: readonly { ms: number }[], beatState: (step: number) => S, playing?: boolean) {
  const standalone = playing === undefined;
  const autoplay = useAutoplay(beats.length, { every: (i) => beats[i]!.ms, stopOnInteraction: standalone });
  const { setPlaying } = autoplay;
  const [own, setOwn] = useState<S | null>(null);

  useEffect(() => {
    if (standalone) return;
    setPlaying(playing);
    if (playing) setOwn(null);
  }, [standalone, playing, setPlaying]);

  const state = own ?? beatState(autoplay.step);

  /** Take over from the scene with a new state, or an update to the current one. */
  const take = useCallback(
    (next: S | ((current: S) => S)) => {
      setPlaying(false);
      setOwn((current) => {
        const base = current ?? beatState(autoplay.step);
        return typeof next === "function" ? (next as (current: S) => S)(base) : next;
      });
    },
    [setPlaying, beatState, autoplay.step],
  );

  return { ref: autoplay.ref, step: autoplay.step, state, take, live: own === null && autoplay.playing };
}
