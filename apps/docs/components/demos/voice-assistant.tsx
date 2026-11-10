"use client";
import { Toggle } from "@base-ui/react/toggle";
import { Mic01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { shapes } from "@remold-ui/core";
import { Remold } from "@remold-ui/react/canvas";
import { useEffect, useMemo, useRef, useState } from "react";
import { typing, useScene } from "./use-scene";
import "./voice-assistant.css";

export type AssistantState = "idle" | "listening" | "thinking" | "speaking";

const PALETTE = {
  calmTop: "#bfdbfe",
  calmBottom: "#60a5fa",
  listenTop: "#67e8f9",
  listenBottom: "#2563eb",
  think: "#a78bfa",
  thinkGlow: "#e9d5ff",
  speakTop: "#fbcfe8",
  speakBottom: "#f472b6",
};

const STATUS: Record<AssistantState, string> = {
  idle: "Tap to talk",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
};

/** How often the orb takes its next breath or ripple, in milliseconds. */
const BEAT: Record<AssistantState, number> = { idle: 1800, listening: 140, thinking: 0, speaking: 140 };

const ball = shapes.sphere({ radius: 0.82 });

const toned = (top: string, bottom: string) => ({ y }: { y: number }) => (y > 0 ? top : bottom);

/** The orb's shape for a state, a moment `beat` into it, at a voice this loud (0 to 1). */
function orbFor(state: AssistantState, beat: number, level: number) {
  if (state === "thinking") {
    return shapes
      .torus({ radius: 0.72, tube: 0.16 })
      .rotate({ x: 62 })
      .tone(({ along }) => (Math.sin(along * Math.PI * 8) > 0.6 ? "thinkGlow" : "think"));
  }
  if (state === "idle") {
    // A slow breath: a little larger, then back.
    return ball.scale(beat % 2 ? 1.05 : 1).tone(toned("calmTop", "calmBottom"));
  }
  const phase = beat * 0.9;
  if (state === "listening") {
    // Rings of ripple travel up the orb, as tall as the voice is loud.
    return ball
      .warp(({ x, y, z }) => {
        const push = 1 + level * 0.14 * Math.sin(y * 6 - phase);
        return [x * push, y * push, z * push];
      })
      .tone(toned("listenTop", "listenBottom"));
  }
  // Speaking: the orb bulges in lobes round its middle, pulsing with the reply.
  return ball
    .warp(({ x, y, z }) => {
      const push = 1 + level * 0.2 * Math.sin(Math.atan2(z, x) * 5 + phase) * Math.cos(y * 1.6);
      return [x * push, y * push, z * push];
    })
    .tone(toned("speakTop", "speakBottom"));
}

export interface VoiceAssistantProps {
  state: AssistantState;
  /** What was heard, or what's being said back. */
  caption?: string;
  /** How loud the voice is, from 0 to 1. Left out, the orb makes up a lively one of its own. */
  level?: number;
  /** Called when the mic button is pressed (`true`) or let go (`false`). */
  onListeningChange?: (listening: boolean) => void;
  /** Hold the orb still. It also holds still offscreen and with reduced motion. */
  paused?: boolean;
  /** How many dots. Default 2200. */
  count?: number;
}

/** A voice assistant's orb of dots that breathes, ripples as it listens, swirls as it thinks and pulses as it speaks. */
export function VoiceAssistant({ state, caption, level, onListeningChange, paused = false, count = 2200 }: VoiceAssistantProps) {
  const figureRef = useRef<HTMLElement>(null);
  const [beat, setBeat] = useState(0);
  const [visible, setVisible] = useState(true);
  // The state the orb is coming from: the ring and the ball are different shapes, so a change
  // between them flows; anything else keeps every dot in its place on the ball.
  const [from, setFrom] = useState(state);
  useEffect(() => setFrom(state), [state]);
  const pairing = from !== state && (from === "thinking" || state === "thinking") ? "flow" : "index";

  useEffect(() => {
    const figure = figureRef.current;
    if (!figure) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? true));
    observer.observe(figure);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const every = BEAT[state];
    if (!every || paused || !visible || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setBeat((current) => current + 1), every);
    return () => clearInterval(timer);
  }, [state, paused, visible]);

  const loudness = level ?? 0.55 + 0.45 * Math.sin(beat * 1.7) * Math.sin(beat * 0.6);
  const orb = useMemo(() => orbFor(state, beat, loudness), [state, beat, loudness]);

  return (
    <figure ref={figureRef} className="vas" data-state={state}>
      <Remold.Particles
        shape={orb}
        count={count}
        label={`Voice assistant: ${STATUS[state].toLowerCase()}`}
        palette={PALETTE}
        pairing={pairing}
        camera={{ spin: paused ? 0 : state === "thinking" ? 0.22 : 0.04, tilt: 16 }}
        blend="add"
        dot="square"
        radius={0.95}
        padding={10}
        pointer={false}
        spring={{ duration: 0.5, bounce: 0.15 }}
        className="vas-orb"
      />
      <figcaption className="vas-copy" aria-live="polite">
        <Remold.Text className="vas-status">{STATUS[state]}</Remold.Text>
        <p className="vas-caption">{caption ?? " "}</p>
      </figcaption>
      <Toggle
        className="vas-mic"
        pressed={state === "listening"}
        onPressedChange={(pressed) => onListeningChange?.(pressed)}
        aria-label={state === "listening" ? "Stop listening" : "Start listening"}
      >
        <HugeiconsIcon icon={Mic01Icon} size={20} strokeWidth={1.8} aria-hidden="true" />
      </Toggle>
    </figure>
  );
}

// The docs demo: a short scripted scene that plays the element above. Your app doesn't need it.

interface Beat {
  state: AssistantState;
  caption?: string;
  ms: number;
}

const QUESTION = "What's on my calendar tomorrow?";
const ANSWER = "Two things: design review at 9:30, then lunch with Ama at 1.";

const BEATS: readonly Beat[] = [
  { state: "idle", ms: 2200 },
  { state: "listening", ms: 500 },
  ...typing(QUESTION, (typed) => ({ state: "listening" as const, caption: typed }), { every: 55, hold: 900 }),
  { state: "thinking", caption: QUESTION, ms: 2400 },
  { state: "speaking", caption: ANSWER, ms: 4200 },
];

const fromBeat = (step: number): Beat => BEATS[step]!;

export interface VoiceAssistantDemoProps {
  /** On the home page, whether its card is playing. */
  playing?: boolean;
}

export function VoiceAssistantDemo({ playing }: VoiceAssistantDemoProps = {}) {
  const { ref, state, takeOver } = useScene(BEATS, fromBeat, playing ?? true);
  return (
    <div ref={ref} className="vas-stage not-prose">
      <VoiceAssistant
        state={state.state}
        caption={state.caption}
        paused={playing === false}
        onListeningChange={(listening) =>
          takeOver(listening ? { state: "listening", caption: QUESTION, ms: 0 } : { state: "thinking", caption: QUESTION, ms: 0 })
        }
      />
    </div>
  );
}
