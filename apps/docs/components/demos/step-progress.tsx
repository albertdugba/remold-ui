"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, CircleIcon, RadioButtonIcon } from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import { Frame } from "./frame";
import { useScene } from "./use-scene";

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

const MARKERS = {
  upcoming: CircleIcon,
  current: RadioButtonIcon,
  done: CheckmarkCircle02Icon,
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
    <section
      ref={ref}
      className="grid w-[420px] max-w-full gap-[22px] rounded-[18px] bg-white px-5 pt-[22px] pb-[18px] font-sans text-zinc-900 dark:bg-[#232327] dark:text-zinc-50"
      aria-label="Checkout progress"
    >
      <Remold.Connectors
        shape="curve"
        gap={6}
        className="relative [&_.rm-connector]:stroke-zinc-900/16 [&_.rm-connector]:[stroke-linecap:round] [&_.rm-connector]:[stroke-width:2] [&_.rm-connector]:transition-[stroke] [&_.rm-connector]:duration-350 motion-reduce:[&_.rm-connector]:transition-none dark:[&_.rm-connector]:stroke-white/18 [&_.rm-connector[data-line=done]]:stroke-green-700 dark:[&_.rm-connector[data-line=done]]:stroke-green-400"
      >
        <ol className="m-0 grid list-none grid-cols-4 p-0">
          {STEPS.map((name, index) => {
            const phase = index < current ? "done" : index === current ? "current" : "upcoming";
            return (
              <li key={name} className="group/step relative grid justify-items-center gap-2" data-state={phase}>
                <Remold.Anchor
                  name={name}
                  linkTo={index > 0 ? STEPS[index - 1] : null}
                  fromSide="right"
                  toSide="left"
                  line={index > 0 && index - 1 < current ? "done" : undefined}
                  render={
                    <button
                      type="button"
                      className="relative z-1 grid size-7 cursor-pointer place-items-center rounded-full text-zinc-300 transition-colors duration-250 group-data-[state=current]/step:text-zinc-900 group-data-[state=done]/step:text-green-700 disabled:cursor-default motion-reduce:transition-none dark:text-zinc-600 dark:group-data-[state=current]/step:text-zinc-50 dark:group-data-[state=done]/step:text-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-50 [&_svg]:size-6 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:[stroke-linecap:round] [&_svg]:[stroke-linejoin:round]"
                      aria-current={phase === "current" ? "step" : undefined}
                      aria-label={`${name}${phase === "done" ? ", done" : phase === "current" ? ", current step" : ""}`}
                      disabled={phase === "upcoming"}
                      onClick={() => go(index)}
                    />
                  }
                >
                  <Remold.Icon icon={<HugeiconsIcon icon={MARKERS[phase]} />} strokeWidth={phase === "current" ? 2.2 : 1.8} aria-hidden="true" />
                </Remold.Anchor>
                <span className="text-[12px] text-zinc-500 transition-colors duration-250 group-data-[state=current]/step:font-semibold group-data-[state=current]/step:text-zinc-900 motion-reduce:transition-none dark:text-zinc-400 dark:group-data-[state=current]/step:text-zinc-50">
                  {name}
                </span>
              </li>
            );
          })}
        </ol>
      </Remold.Connectors>

      <div className="flex items-center justify-between gap-3 pt-4 shadow-[0_-1px_0_rgb(24_24_27/0.08)] dark:shadow-[0_-1px_0_rgb(255_255_255/0.08)]">
        <p className="m-0 grid gap-px" aria-live="polite">
          <Remold.Text className="text-[12px] text-zinc-500 dark:text-zinc-400">{done ? "All done" : `Step ${current + 1} of ${STEPS.length}`}</Remold.Text>
          <Remold.Text className="text-[14.5px] font-semibold">{done ? "Order placed" : STEPS[current]!}</Remold.Text>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="h-[34px] cursor-pointer rounded-full px-3.5 text-[13px] font-medium text-zinc-500 disabled:cursor-default disabled:opacity-40 dark:text-zinc-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-50"
            disabled={current === 0} onClick={() => go(done ? 0 : current - 1)}>
            <Remold.Text>{done ? "Start over" : "Back"}</Remold.Text>
          </button>
          <button
            type="button"
            className="h-[34px] cursor-pointer rounded-full bg-zinc-900 px-3.5 text-[13px] font-medium text-white disabled:cursor-default disabled:opacity-35 dark:bg-zinc-50 dark:text-[#232327] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-50"
            disabled={done} onClick={() => go(current + 1)}>
            <Remold.Text>{current === LAST ? "Place order" : done ? "Done" : "Continue"}</Remold.Text>
          </button>
        </div>
      </div>
    </section>
  );

  return framed ? <Frame>{body}</Frame> : body;
}
