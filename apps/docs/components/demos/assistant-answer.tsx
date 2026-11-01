"use client";

import { Remold } from "@remold-ui/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useScene } from "./use-scene";
import "./assistant-answer.css";

const DOTS = 700;
const FONT = "650 140px -apple-system, BlinkMacSystemFont, Inter, sans-serif";
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const COLORS = ["var(--aa-accent)", "var(--aa-soft)"];
const FADE = { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 } };

const QUESTIONS = [
  { ask: "How many signups this week?", headline: "1,284", answer: "Up 18% on last week. Most arrived on Tuesday, the day the new pricing page went live." },
  { ask: "Which day was busiest?", headline: "Tuesday", answer: "412 signups, nearly a third of the week and the most in a single day since launch." },
  { ask: "What's our churn?", headline: "2.1%", answer: "Down from 2.6% last month. Annual plans churn least, at 0.8%." },
];

/** Dots spread over a disc like a sunflower's seeds: a full orb while waiting, a ring that turns with `spin` while thinking. */
function disc(spin: number | null) {
  return Array.from({ length: DOTS }, (_, i) => {
    const r = spin === null ? Math.sqrt((i + 0.5) / DOTS) : 0.7 + (i % 7) / 20;
    const a = i * GOLDEN + (spin ?? 0) * (0.3 + (i % 5) / 40);
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, tone: spin === null && i % 3 ? 1 : 0 };
  });
}

const ORB = { points: disc(null) };

interface State {
  question: number | null;
  answered: boolean;
}

const BEATS = [
  { question: null, answered: false, ms: 2400 },
  { question: 0, answered: false, ms: 1500 },
  { question: 0, answered: true, ms: 3800 },
  { question: 2, answered: false, ms: 1500 },
  { question: 2, answered: true, ms: 3800 },
] satisfies (State & { ms: number })[];

const fromBeat = (step: number): State => BEATS[step]!;

export function AssistantAnswerDemo({ playing }: { playing?: boolean } = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take, live } = scene;
  const [spin, setSpin] = useState(0);
  const asked = state.question === null ? null : QUESTIONS[state.question]!;
  const thinking = asked !== null && !state.answered;

  // While it thinks, the ring turns a step at a time; its springs blend the steps into a spin.
  useEffect(() => {
    if (!thinking) return;
    const id = setInterval(() => setSpin((s) => s + 1), 360);
    return () => clearInterval(id);
  }, [thinking]);

  // A question asked by hand gets its answer after a short think. The scene times its own.
  useEffect(() => {
    if (!thinking || live) return;
    const id = setTimeout(() => take((s) => ({ ...s, answered: true })), 1500);
    return () => clearTimeout(id);
  }, [thinking, live, take]);

  const ring = useMemo(() => ({ points: disc(spin) }), [spin]);
  const shape = !asked ? ORB : thinking ? ring : { text: asked.headline, font: FONT };

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={scene.ref}
        className="aa not-prose"
        aria-label="Ask about your data"
      >
        <header className="aa-head">
          <span role="heading" aria-level={3} className="aa-title">
            Insights
          </span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={asked?.ask ?? "none"} className="aa-sub" {...FADE}>
              {asked?.ask ?? "Ask anything about this week"}
            </motion.span>
          </AnimatePresence>
        </header>

        <div className="aa-stage">
          <Remold.Particles
            className="aa-canvas"
            shape={shape}
            count={DOTS}
            palette={COLORS}
            radius={1.4}
            padding={36}
            pointer={{ radius: 60, strength: 14 }}
            pairing={thinking ? "index" : "match"}
            transition={asked && !thinking ? "scatter" : "direct"}
            label={thinking ? "Thinking" : (asked?.headline ?? "Waiting for a question")}
          />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={`${state.question}-${state.answered}`} className="aa-answer" aria-live="polite" {...FADE}>
            {asked && !thinking ? asked.answer : <span>{thinking ? "Reading this week's events…" : "Pick a question below."}</span>}
          </motion.p>
        </AnimatePresence>

        <div className="aa-asks" role="group" aria-label="Suggested questions">
          {QUESTIONS.map((q, i) => (
            <button
              key={q.ask}
              type="button"
              className="aa-ask"
              aria-pressed={state.question === i}
              disabled={thinking}
              onClick={() => take({ question: i, answered: false })}
            >
              {q.ask}
            </button>
          ))}
        </div>
      </section>
    </MotionConfig>
  );
}
