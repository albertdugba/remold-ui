"use client";

import { Remold } from "@remold-ui/react";
import { Frame } from "./frame";
import { useScene } from "./use-scene";
import "./step-progress.css";

/*
 * The steps of a checkout, as one row of markers joined by connector lines. Finishing a step
 * turns its marker's dot into a check and lights the line to the next one; going back undoes both. The
 * caption and the main button say where you are.
 */

const STEPS = ["Account", "Delivery", "Payment", "Review"] as const;
const LAST = STEPS.length - 1;

interface State {
  /** The step you're on. `STEPS.length` means every step is done. */
  current: number;
}

const BEATS = [
  { current: 0, ms: 1600 },
  { current: 1, ms: 1400 },
  { current: 2, ms: 1400 },
  { current: 3, ms: 1600 },
  { current: 4, ms: 2400 },
] as const;

const fromBeat = (step: number): State => ({ current: BEATS[step]!.current });

/** The three markers, drawn as strokes in one 24-unit box so each morphs into the next. */
const RING = "M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0Z";
const MARKERS = {
  upcoming: RING,
  // A small dot in the ring: the step you're on.
  current: `${RING}M13.6 12a1.6 1.6 0 1 1-3.2 0a1.6 1.6 0 1 1 3.2 0Z`,
  // The dot becomes a check.
  done: `${RING}M8.2 12.4l2.6 2.6l5-5.2`,
};

interface StepProgressDemoProps {
  framed?: boolean;

  playing?: boolean;
}

export function StepProgressDemo({ framed = true, playing }: StepProgressDemoProps) {
  const { ref, state, take } = useScene(BEATS, fromBeat, playing);
  const { current } = state;
  const done = current > LAST;
  const go = (next: number) => take({ current: Math.max(0, Math.min(STEPS.length, next)) });

  const body = (
    <section ref={ref} className="sp" aria-label="Checkout progress">
      {/* Each marker is an anchor linked to the one before it, so Connectors draws the line between them. */}
      <Remold.Connectors shape="curve" gap={6} className="sp-track">
        <ol className="sp-steps">
          {STEPS.map((name, i) => {
            const phase = i < current ? "done" : i === current ? "current" : "upcoming";
            return (
              <li key={name} className="sp-step" data-state={phase}>
                {/* Steps already done can be revisited; the rest wait their turn. */}
                <Remold.Anchor
                  name={name}
                  // The line in from the previous step, lit once that step is done.
                  linkTo={i > 0 ? STEPS[i - 1] : null}
                  fromSide="right"
                  toSide="left"
                  line={i > 0 && i - 1 < current ? "done" : undefined}
                  render={
                    <button
                      type="button"
                      className="sp-marker"
                      aria-current={phase === "current" ? "step" : undefined}
                      aria-label={`${name}${phase === "done" ? ", done" : phase === "current" ? ", current step" : ""}`}
                      disabled={phase === "upcoming"}
                      onClick={() => go(i)}
                    />
                  }
                >
                  <Remold.Icon d={MARKERS[phase]} strokeWidth={phase === "current" ? 2.2 : 1.8} aria-hidden="true" />
                </Remold.Anchor>
                <span className="sp-name">{name}</span>
              </li>
            );
          })}
        </ol>
      </Remold.Connectors>

      <div className="sp-foot">
        <p className="sp-caption" aria-live="polite">
          <Remold.Text className="sp-count">{done ? "All done" : `Step ${current + 1} of ${STEPS.length}`}</Remold.Text>
          <Remold.Text className="sp-title">{done ? "Order placed" : STEPS[current]!}</Remold.Text>
        </p>
        <div className="sp-actions">
          <button type="button" className="sp-back" disabled={current === 0} onClick={() => go(done ? 0 : current - 1)}>
            <Remold.Text>{done ? "Start over" : "Back"}</Remold.Text>
          </button>
          <button type="button" className="sp-next" disabled={done} onClick={() => go(current + 1)}>
            <Remold.Text>{current === LAST ? "Place order" : done ? "Done" : "Continue"}</Remold.Text>
          </button>
        </div>
      </div>
    </section>
  );

  return framed ? <Frame>{body}</Frame> : body;
}
