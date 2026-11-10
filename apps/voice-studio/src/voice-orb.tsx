import { Toggle } from "@base-ui/react/toggle";
import { shapes } from "@remold-ui/core";
import { Remold } from "@remold-ui/react/canvas";
import { useEffect, useMemo, useState } from "react";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

const palette = {
  calmTop: "#bdeafe",
  calmBottom: "#468cff",
  listenTop: "#67e8f9",
  listenBottom: "#2563eb",
  think: "#9b8afb",
  thinkGlow: "#e6d8ff",
  speakTop: "#f9c8e1",
  speakBottom: "#ef65a9",
};

const sphere = shapes.sphere({ radius: 0.82 });
const status: Record<VoiceState, string> = {
  idle: "Ready when you are",
  listening: "Listening to the customer",
  thinking: "Building a helpful answer",
  speaking: "Drafting your reply",
};

function shapeFor(state: VoiceState, beat: number, level: number) {
  if (state === "thinking") {
    return shapes
      .torus({ radius: 0.72, tube: 0.16 })
      .rotate({ x: 62 })
      .tone(({ along }) => (Math.sin(along * Math.PI * 8) > 0.6 ? "thinkGlow" : "think"));
  }
  if (state === "idle") return sphere.scale(beat % 2 ? 1.05 : 1).tone(({ y }) => (y > 0 ? "calmTop" : "calmBottom"));
  const phase = beat * 0.9;
  if (state === "listening") {
    return sphere
      .warp(({ x, y, z }) => {
        const push = 1 + level * 0.14 * Math.sin(y * 6 - phase);
        return [x * push, y * push, z * push];
      })
      .tone(({ y }) => (y > 0 ? "listenTop" : "listenBottom"));
  }
  return sphere
    .warp(({ x, y, z }) => {
      const push = 1 + level * 0.2 * Math.sin(Math.atan2(z, x) * 5 + phase) * Math.cos(y * 1.6);
      return [x * push, y * push, z * push];
    })
    .tone(({ y }) => (y > 0 ? "speakTop" : "speakBottom"));
}

export function VoiceOrb({ state, onListeningChange }: { state: VoiceState; onListeningChange: (value: boolean) => void }) {
  const [beat, setBeat] = useState(0);
  const [from, setFrom] = useState(state);

  useEffect(() => setFrom(state), [state]);
  useEffect(() => {
    const rate = state === "idle" ? 1800 : state === "thinking" ? 0 : 140;
    if (!rate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setBeat((current) => current + 1), rate);
    return () => window.clearInterval(timer);
  }, [state]);

  const level = 0.58 + 0.35 * Math.sin(beat * 1.7) * Math.sin(beat * 0.6);
  const shape = useMemo(() => shapeFor(state, beat, level), [state, beat, level]);
  const pairing = from !== state && (from === "thinking" || state === "thinking") ? "flow" : "index";

  return (
    <section className="orb-panel" aria-label="Clearline voice assistant">
      <div className="orb-halo" />
      <Remold.Particles
        shape={shape}
        count={2100}
        label={status[state]}
        palette={palette}
        pairing={pairing}
        camera={{ spin: state === "thinking" ? 0.22 : 0.04, tilt: 16 }}
        blend="add"
        dot="square"
        radius={0.94}
        padding={10}
        pointer={false}
        spring={{ duration: 0.5, bounce: 0.15 }}
        className="orb-canvas"
      />
      <div className="orb-copy" aria-live="polite">
        <span className={`state-dot ${state}`} />
        <strong><Remold.Text>{status[state]}</Remold.Text></strong>
      </div>
      <Toggle
        className="listen-button"
        pressed={state === "listening"}
        onPressedChange={onListeningChange}
        aria-label={state === "listening" ? "Stop listening" : "Start listening"}
      >
        <span className="mic-icon" aria-hidden="true" />
        {state === "listening" ? "Listening" : "Start listening"}
      </Toggle>
    </section>
  );
}
