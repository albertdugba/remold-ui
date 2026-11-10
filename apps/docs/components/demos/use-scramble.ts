"use client";
import { animate } from "motion/react";
import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

const glyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!;

interface ScrambleOptions {
  duration?: number;
  steady?: string;
}

export function useScramble(target: string, { duration = 0.7, steady = "•·_-" }: ScrambleOptions = {}) {
  const [text, setText] = useState(target);
  const shown = useRef(target);

  useEffect(() => {
    const from = shown.current;
    if (from === target) return;
    const length = Math.max(from.length, target.length);
    const settle = Array.from({ length }, (_, index) => 0.15 + (index / length) * 0.65 + Math.random() * 0.2);
    const controls = animate(0, 1, {
      duration,
      ease: "linear",
      onUpdate: (progress) => {
        let out = "";
        for (let i = 0; i < length; i++) {
          const to = target[i] ?? "";
          if (from[i] === to || progress >= settle[i]!) out += to;
          else if (steady.includes(to) && steady.includes(from[i] ?? "")) out += to;
          else out += to === "" ? (progress < settle[i]! * 0.5 ? glyph() : "") : glyph();
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
