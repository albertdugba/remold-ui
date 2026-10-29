"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, CircleIcon, Mic01Icon, PauseIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { useAutoplay } from "@remold-ui/react";
import { motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import "./hold-to-record.css";

type State =
  | { phase: "idle"; hint?: string }
  | {
      phase: "recording";
      by: "you" | "scene";
      started: number;
      levels: number[];
      keyboard: boolean;
    }
  | {
      phase: "clip";
      bars: number[];
      seconds: number;
      progress: number;
      playing: boolean;
    };

const BARS = 28;

const TICK = 80;

const SHORTEST = 500;
const LONGEST = 60_000;

const SPRING = { type: "spring" as const, duration: 0.32, bounce: 0.08 };
const QUIET = Array<number>(BARS).fill(0);

const clock = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function speech(i: number) {
  const word = Math.sin(i * 0.23) * 0.5 + 0.5;
  const syllable = Math.abs(Math.sin(i * 0.97 + Math.sin(i * 0.41) * 2));
  return Math.min(1, 0.06 + word * syllable * 0.8 + Math.random() * 0.2 * word);
}

function summarise(levels: number[]) {
  return Array.from({ length: BARS }, (_, i) => {
    const from = Math.floor((i * levels.length) / BARS);
    const to = Math.max(from + 1, Math.floor(((i + 1) * levels.length) / BARS));
    return Math.max(0, ...levels.slice(from, to));
  });
}

const STEPS = [
  { ms: 1600, act: "idle" },
  { ms: 3200, act: "press" },
  { ms: 1200, act: "release" },
  { ms: 3400, act: "play" },
  { ms: 900, act: "discard" },
] as const;

interface HoldToRecordDemoProps {
  playing?: boolean;
}

export function HoldToRecordDemo({ playing }: HoldToRecordDemoProps = {}) {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [said, setSaid] = useState("");
  const autoplay = useAutoplay(STEPS.length, {
    every: (i) => STEPS[i]!.ms,
    stopOnInteraction: playing === undefined,
  });
  const { step, playing: live, setPlaying: setLive } = autoplay;

  const stateRef = useRef(state);
  const hintTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(hintTimer.current), []);

  useEffect(() => {
    if (playing !== undefined) setLive(playing);
  }, [playing, setLive]);

  const set = useCallback((next: State) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const start = useCallback(
    (by: "you" | "scene", keyboard = false) => {
      clearTimeout(hintTimer.current);
      setSaid("Recording");
      set({
        phase: "recording",
        by,
        started: performance.now(),
        levels: [],
        keyboard,
      });
    },
    [set],
  );

  const finish = useCallback(
    (cancel = false) => {
      const current = stateRef.current;
      if (current.phase !== "recording") return;
      const held = performance.now() - current.started;
      if (cancel) {
        set({ phase: "idle" });
        setSaid("Recording cancelled");
      } else if (held < SHORTEST) {
        set({ phase: "idle", hint: "Keep holding" });
        setSaid("Keep holding to record");
        clearTimeout(hintTimer.current);
        hintTimer.current = setTimeout(() => {
          if (stateRef.current.phase === "idle") set({ phase: "idle" });
        }, 1400);
      } else {
        const seconds = Math.max(1, Math.round(held / 1000));
        set({
          phase: "clip",
          bars: summarise(current.levels),
          seconds,
          progress: 1,
          playing: false,
        });
        setSaid(`Recorded ${seconds} seconds`);
      }
    },
    [set],
  );

  const discard = useCallback(() => {
    set({ phase: "idle" });
    setSaid("Clip deleted");
  }, [set]);

  const recording = state.phase === "recording";
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => {
      const current = stateRef.current;
      if (current.phase !== "recording") return;
      if (performance.now() - current.started >= LONGEST) return finish();
      set({
        ...current,
        levels: [...current.levels, speech(current.levels.length)],
      });
    }, TICK);
    return () => clearInterval(timer);
  }, [recording, finish, set]);

  const clipPlaying = state.phase === "clip" && state.playing;
  useEffect(() => {
    if (!clipPlaying) return;
    const current = stateRef.current;
    if (current.phase !== "clip") return;
    const began = performance.now() - current.progress * current.seconds * 1000;
    let frame = requestAnimationFrame(function tick(now) {
      const clip = stateRef.current;
      if (clip.phase !== "clip" || !clip.playing) return;
      const progress = Math.min(1, (now - began) / (clip.seconds * 1000));
      set({ ...clip, progress, playing: progress < 1 });
      if (progress < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [clipPlaying, set]);

  const togglePlay = useCallback(() => {
    const clip = stateRef.current;
    if (clip.phase !== "clip") return;
    if (clip.playing) set({ ...clip, playing: false });
    else
      set({
        ...clip,
        playing: true,
        progress: clip.progress >= 1 ? 0 : clip.progress,
      });
  }, [set]);

  useEffect(() => {
    if (!live) return;
    const act = STEPS[step]!.act;
    if (act === "press") start("scene");
    else if (act === "release") finish();
    else if (act === "play") togglePlay();
    else if (stateRef.current.phase !== "idle") discard();
  }, [step, live, start, finish, togglePlay, discard]);

  useEffect(() => {
    const current = stateRef.current;
    if (!live && current.phase === "recording" && current.by === "scene")
      set({ phase: "idle" });
  }, [live, set]);

  const holdable = state.phase !== "clip";
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!holdable || e.button !== 0) return;
    setLive(false);
    start("you");

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) =>
    finish(e.type === "pointercancel");
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!holdable) return;
    if (e.key === "Escape") return finish(true);
    if ((e.key === " " || e.key === "Enter") && !e.repeat) {
      e.preventDefault();
      setLive(false);
      start("you", true);
    }
  };
  const onKeyUp = (e: KeyboardEvent<HTMLDivElement>) => {
    if (
      (e.key === " " || e.key === "Enter") &&
      state.phase === "recording" &&
      state.keyboard
    )
      finish();
  };

  let bars = QUIET;
  let progress = 1;
  let words = state.phase === "idle" ? state.hint ?? "Hold to record" : "";
  if (state.phase === "recording") {
    bars = [
      ...QUIET.slice(Math.min(BARS, state.levels.length)),
      ...state.levels.slice(-BARS),
    ];
    words = clock((performance.now() - state.started) / 1000);
  } else if (state.phase === "clip") {
    bars = state.bars;
    progress = state.progress;
    words = clock(
      state.playing ? state.seconds * state.progress : state.seconds,
    );
  }
  const icon =
    state.phase === "idle"
      ? Mic01Icon
      : state.phase === "recording"
      ? CircleIcon
      : state.playing
      ? PauseIcon
      : PlayIcon;
  const Icon = icon;

  return (
    <div ref={autoplay.ref} className="rec not-prose">
      <motion.div layout transition={SPRING} className="rec-stage">
        <motion.div
          layout
          transition={SPRING}
          className="rec-pill"
          data-phase={state.phase}
          {...(holdable
            ? {
                role: "button",
                tabIndex: 0,
                "aria-label": "Hold to record",
                "aria-pressed": recording,
              }
            : {
                role: "group",
                "aria-label": `Voice clip, ${
                  state.phase === "clip" ? state.seconds : 0
                } seconds`,
              })}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onBlur={() =>
            state.phase === "recording" && state.keyboard && finish(true)
          }
          onContextMenu={(e) => e.preventDefault()}
        >
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            className="rec-lead"
            tabIndex={holdable ? -1 : 0}
            aria-hidden={holdable || undefined}
            aria-label={
              state.phase === "clip"
                ? state.playing
                  ? "Pause"
                  : "Play"
                : undefined
            }
            onClick={togglePlay}
          >
            <HugeiconsIcon icon={Icon} aria-hidden="true" />
          </motion.button>
          <motion.span layout className="rec-words">{words}</motion.span>
          <span className="rec-wave" aria-hidden="true">
            {bars.map((level, i) => (
              <i
                key={i}
                style={{ height: `${Math.round(14 + level * 86)}%` }}
                data-dim={i / BARS >= progress ? "" : undefined}
              />
            ))}
          </span>
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            className="rec-end"
            tabIndex={holdable ? -1 : 0}
            aria-hidden={holdable || undefined}
            aria-label={holdable ? undefined : "Delete clip"}
            onClick={discard}
          >
            <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
          </motion.button>
        </motion.div>
      </motion.div>
      <p className="rec-said" role="status">
        {said}
      </p>
    </div>
  );
}
