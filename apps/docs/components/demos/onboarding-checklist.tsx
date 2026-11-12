"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, ArrowUp01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Checkbox } from "@base-ui/react/checkbox";
import { Remold } from "@remold-ui/react";
import { motion } from "motion/react";
import { useEffect, useRef, type Ref } from "react";
import { useControllableState, type ChangeDetails } from "./use-controllable-state";
import { useScene } from "./use-scene";

interface Step {
  id: string;
  title: string;
  detail: string;
  action: string;
}

const STEPS: Step[] = [
  {
    id: "project",
    title: "Create your project",
    detail: "Name it and pick the region closest to your users.",
    action: "Create project",
  },
  {
    id: "team",
    title: "Invite your team",
    detail: "Bring in the people you build with. You can add more later.",
    action: "Invite people",
  },
  {
    id: "domain",
    title: "Connect a domain",
    detail: "Point your DNS at us. It takes about two minutes.",
    action: "Connect domain",
  },
  {
    id: "billing",
    title: "Add billing",
    detail: "Nothing is charged until your trial ends in 14 days.",
    action: "Add a card",
  },
  {
    id: "deploy",
    title: "Ship your first deploy",
    detail: "Push to main and watch it go live on your domain.",
    action: "Deploy now",
  },
];

export interface OnboardingChecklistValue {
  done: readonly string[];
  collapsed: boolean;
}

const SPRING = { duration: 0.65, bounce: 0.28 };
const FILL = { type: "spring" as const, duration: 0.7, bounce: 0.1 };

const PALETTE = [
  "[--ob-surface:#ffffff] [--ob-panel:#f7f7f8] [--ob-line:rgb(24_24_27/0.08)] [--ob-ink:#18181b] [--ob-on-ink:#fafafa] [--ob-muted:#71717a] [--ob-quiet:#a1a1aa]",
  "[--ob-accent:#4f46e5] [--ob-good:#059669] [--ob-track:#ececf0]",
  "dark:[--ob-surface:#1f1f23] dark:[--ob-panel:#26262b] dark:[--ob-line:rgb(255_255_255/0.08)] dark:[--ob-ink:#fafafa] dark:[--ob-on-ink:#18181b] dark:[--ob-muted:#a1a1aa] dark:[--ob-quiet:#71717a]",
  "dark:[--ob-accent:#818cf8] dark:[--ob-good:#34d399] dark:[--ob-track:#34343a]",
].join(" ");

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ob-accent)";
const COPY = "grid min-w-0 flex-1 gap-px";
const ICON_BUTTON = `grid size-[30px] flex-none cursor-pointer place-items-center rounded-[9px] border-0 bg-transparent text-(--ob-quiet) hover:bg-(--ob-panel) hover:text-(--ob-ink) [&_svg]:size-4 ${FOCUS}`;

function Ring({ value, small }: { value: number; small?: boolean }) {
  return (
    <svg
      className={`flex-none overflow-visible ${small ? "size-[34px]" : "size-[38px]"}`}
      viewBox="0 0 36 36"
      aria-hidden="true"
    >
      <circle cx="18" cy="18" r="15" className="fill-none stroke-(--ob-track) [stroke-width:3.5]" />
      <motion.circle
        cx="18"
        cy="18"
        r="15"
        className="fill-none stroke-(--ob-accent) [stroke-linecap:round] [stroke-width:3.5]"
        transform="rotate(-90 18 18)"
        initial={false}
        animate={{ pathLength: value }}
        transition={FILL}
      />
      {value >= 1 && (
        <path
          d="M12.5 18.5l3.5 3.5 7.5-8"
          className="animate-draw-check fill-none stroke-(--ob-good) [stroke-dasharray:20] [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2.6]"
        />
      )}
    </svg>
  );
}

export interface OnboardingChecklistProps {
  value?: OnboardingChecklistValue;
  defaultValue?: OnboardingChecklistValue;
  onValueChange?: (value: OnboardingChecklistValue, details: ChangeDetails) => void;
  ref?: Ref<HTMLDivElement>;
}

export function OnboardingChecklist({
  value,
  defaultValue = { done: [], collapsed: false },
  onValueChange,
  ref,
}: OnboardingChecklistProps) {
  const [checklist, setChecklist] = useControllableState({ value, defaultValue, onValueChange });
  const count = checklist.done.length;
  const all = count === STEPS.length;
  const active = STEPS.find((step) => !checklist.done.includes(step.id));

  const toggle = (id: string, on: boolean) =>
    setChecklist((current) => {
      const done = on ? [...current.done, id] : current.done.filter((doneId) => doneId !== id);
      return { ...current, done };
    });

  const before = useRef(count);
  useEffect(() => {
    const finished = before.current < STEPS.length && count === STEPS.length;
    before.current = count;
    if (!finished) return;
    const timer = setTimeout(
      () => setChecklist((current) => ({ ...current, collapsed: true }), "timer"),
      1400,
    );
    return () => clearTimeout(timer);
  }, [count, setChecklist]);

  return (
    <div ref={ref} className={`not-prose grid w-[min(100%,380px)] font-sans text-(--ob-ink) ${PALETTE}`}>
      <Remold.Morph
        trigger={[count, checklist.collapsed]}
        spring={SPRING}
        className="grid min-h-[470px] items-center justify-items-center"
      >
        {checklist.collapsed ? (
          <section
            className="flex w-[260px] items-center gap-[11px] rounded-full bg-(--ob-surface) py-2 pr-2 pl-[9px]"
            aria-label="Setup"
          >
            <Ring value={count / STEPS.length} small />
            <span className={COPY}>
              <b className="text-[14px] font-[650]">{all ? "You're all set" : "Finish setting up"}</b>
              <span className="text-[12px] text-(--ob-muted)">{`${count} of ${STEPS.length} done`}</span>
            </span>
            <button
              type="button"
              className={ICON_BUTTON}
              aria-label="Show the checklist"
              onClick={() => setChecklist((current) => ({ ...current, collapsed: false }))}
            >
              <HugeiconsIcon icon={ArrowUp01Icon} aria-hidden="true" />
            </button>
          </section>
        ) : (
          <section
            className="grid w-full rounded-[22px] bg-(--ob-surface) px-4 pt-4 pb-3.5"
            aria-label="Get started"
          >
            <header className="flex items-center gap-3">
              <Ring value={count / STEPS.length} />
              <span className={COPY}>
                <b className="text-[15px] font-[650]">{all ? "You're all set" : "Get started"}</b>
                <span className="text-[12.5px] text-(--ob-muted)">{`${count} of ${STEPS.length} done`}</span>
              </span>
              <button
                type="button"
                className={ICON_BUTTON}
                aria-label="Hide the checklist"
                onClick={() => setChecklist((current) => ({ ...current, collapsed: true }))}
              >
                <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
              </button>
            </header>

            <ol className="m-0 mt-3.5 grid list-none gap-0.5 p-0">
              {STEPS.map((step) => {
                const done = checklist.done.includes(step.id);
                const open = step === active;
                return (
                  <li
                    key={step.id}
                    className="group/step flex items-start gap-[11px] rounded-[14px] px-2.5 py-[9px] data-open:bg-(--ob-panel)"
                    data-done={done || undefined}
                    data-open={open || undefined}
                  >
                    <Checkbox.Root
                      data-rm-ignore=""
                      className={`mt-px grid size-5 flex-none cursor-pointer place-items-center rounded-full border-[1.5px] border-solid border-[color-mix(in_oklab,var(--ob-ink)_25%,transparent)] bg-transparent p-0 transition-[background-color,border-color] duration-200 group-data-open/step:not-data-checked:border-(--ob-accent) data-checked:border-(--ob-good) data-checked:bg-(--ob-good) ${FOCUS}`}
                      checked={done}
                      onCheckedChange={(on) => toggle(step.id, on)}
                      aria-label={step.title}
                    >
                      <Checkbox.Indicator
                        className="grid [&_svg]:size-[13px] [&_svg]:fill-none [&_svg]:stroke-white [&_svg]:[stroke-linecap:round] [&_svg]:[stroke-linejoin:round] [&_svg]:[stroke-width:2.4]"
                        keepMounted
                      >
                        <svg viewBox="0 0 16 16" aria-hidden="true">
                          <motion.path
                            d="M4 8.5l2.5 2.5L12 5.5"
                            initial={false}
                            animate={{ pathLength: done ? 1 : 0 }}
                            transition={{ duration: 0.3, ease: "easeOut", delay: done ? 0.1 : 0 }}
                          />
                        </svg>
                      </Checkbox.Indicator>
                    </Checkbox.Root>
                    <span className="grid min-w-0 gap-1">
                      <span className="text-[13.5px] leading-[22px] font-medium group-data-done/step:text-(--ob-quiet) group-data-done/step:line-through group-data-done/step:decoration-[color-mix(in_oklab,var(--ob-quiet)_60%,transparent)] group-data-open/step:font-semibold">
                        {step.title}
                      </span>
                      {open && (
                        <>
                          <span className="text-[12.5px] leading-[1.45] text-(--ob-muted)">{step.detail}</span>
                          <button
                            type="button"
                            className={`mt-1.5 inline-flex h-[30px] cursor-pointer items-center gap-[5px] justify-self-start rounded-[9px] border-0 bg-(--ob-ink) px-[11px] text-[12.5px] font-semibold text-(--ob-on-ink) [&_svg]:size-3.5 ${FOCUS}`}
                            onClick={() => toggle(step.id, true)}
                          >
                            {step.action}
                            <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>

            {all && (
              <button
                type="button"
                className={`mt-2.5 h-9 cursor-pointer rounded-[11px] border-0 bg-(--ob-panel) text-[13px] font-semibold text-(--ob-ink) ${FOCUS}`}
                onClick={() => setChecklist((current) => ({ ...current, collapsed: true }))}
              >
                Done, tuck it away
              </button>
            )}
          </section>
        )}
      </Remold.Morph>
    </div>
  );
}

const BEATS: readonly (OnboardingChecklistValue & { ms: number })[] = [
  { done: ["project", "team"], collapsed: false, ms: 1900 },
  { done: ["project", "team", "domain"], collapsed: false, ms: 1500 },
  { done: ["project", "team", "domain", "billing"], collapsed: false, ms: 1500 },
  { done: STEPS.map((step) => step.id), collapsed: false, ms: 1000 },
  { done: STEPS.map((step) => step.id), collapsed: true, ms: 2800 },
];

const fromBeat = (step: number): OnboardingChecklistValue => ({
  done: BEATS[step]!.done,
  collapsed: BEATS[step]!.collapsed,
});

interface OnboardingChecklistDemoProps {
  playing?: boolean;
}

export function OnboardingChecklistDemo({ playing }: OnboardingChecklistDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  return <OnboardingChecklist ref={scene.ref} value={scene.state} onValueChange={scene.onValueChange} />;
}
