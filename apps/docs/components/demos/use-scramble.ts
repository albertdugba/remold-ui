"use client";
/**
 * Text that resolves into a new value one character at a time, like a code being decoded. Each
 * character flickers through random glyphs and settles a little after the one before it. Driven by
 * Motion, so it keeps time with everything else on the page.
 */
import { animate } from "motion/react";
import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

const glyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!;

interface ScrambleOptions {
  /** Seconds the whole value takes to settle. */
  duration?: number;
  /** Characters that never flicker: they're shown as they are in the target, such as a mask dot. */
  steady?: string;
}

export function useScramble(target: string, { duration = 0.7, steady = "•·_-" }: ScrambleOptions = {}) {
  const [text, setText] = useState(target);
  const shown = useRef(target);

  useEffect(() => {
    const from = shown.current;
    if (from === target) return;
    const length = Math.max(from.length, target.length);
    // Each character settles at its own moment: left to right, with a little jitter.
    const settle = Array.from({ length }, (_, i) => 0.15 + (i / length) * 0.65 + Math.random() * 0.2);
    const controls = animate(0, 1, {
      duration,
      ease: "linear",
      onUpdate: (t) => {
        let out = "";
        for (let i = 0; i < length; i++) {
          const to = target[i] ?? "";
          // Characters that don't change (a key's prefix, its last four) stay put.
          if (from[i] === to || t >= settle[i]!) out += to;
          else if (steady.includes(to) && steady.includes(from[i] ?? "")) out += to;
          else out += to === "" ? (t < settle[i]! * 0.5 ? glyph() : "") : glyph();
        }
        shown.current = out;
        setText(out);
      },
      onComplete: () => {
        shown.current = target;
        setText(target);
      },
    });
    return () => controls.stop();
  }, [target, duration, steady]);

  return text;
}
