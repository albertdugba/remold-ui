"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, ArrowUp01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Checkbox } from "@base-ui/react/checkbox";
import { Remold } from "@remold-ui/react";
import { motion } from "motion/react";
import { useEffect, useRef, type Ref } from "react";
import { useControllableState, type ChangeDetails } from "./use-controllable-state";
import { useScene } from "./use-scene";
import "./onboarding-checklist.css";

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

function Ring({ value }: { value: number }) {
  return (
    <svg className="ob-ring" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="15" className="ob-ring-track" />
      <motion.circle
        cx="18"
        cy="18"
        r="15"
        className="ob-ring-fill"
        transform="rotate(-90 18 18)"
        initial={false}
        animate={{ pathLength: value }}
        transition={FILL}
      />
      {value >= 1 && <path d="M12.5 18.5l3.5 3.5 7.5-8" className="ob-ring-check" />}
    </svg>
  );
}

export interface OnboardingChecklistProps {
  /** The ids of the finished steps, and whether the card is folded into its pill. */
  value?: OnboardingChecklistValue;
  defaultValue?: OnboardingChecklistValue;
  onValueChange?: (value: OnboardingChecklistValue, details: ChangeDetails) => void;
  ref?: Ref<HTMLDivElement>;
}

/** A getting-started checklist that folds into a progress pill, and folds itself away once every step is done. */
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
    <div ref={ref} className="ob ob-layer not-prose">
      <Remold.Morph trigger={[count, checklist.collapsed]} spring={SPRING} className="ob-stage">
        {checklist.collapsed ? (
          <section className="ob-pill" aria-label="Setup">
            <Ring value={count / STEPS.length} />
            <span className="ob-pill-copy">
              <b className="ob-title">{all ? "You're all set" : "Finish setting up"}</b>
              <span className="ob-count">{`${count} of ${STEPS.length} done`}</span>
            </span>
            <button
              type="button"
              className="ob-show"
              aria-label="Show the checklist"
              onClick={() => setChecklist((current) => ({ ...current, collapsed: false }))}
            >
              <HugeiconsIcon icon={ArrowUp01Icon} aria-hidden="true" />
            </button>
          </section>
        ) : (
          <section className="ob-card" aria-label="Get started">
            <header className="ob-head">
              <Ring value={count / STEPS.length} />
              <span className="ob-head-copy">
                <b className="ob-title">{all ? "You're all set" : "Get started"}</b>
                <span className="ob-count">{`${count} of ${STEPS.length} done`}</span>
              </span>
              <button
                type="button"
                className="ob-hide"
                aria-label="Hide the checklist"
                onClick={() => setChecklist((current) => ({ ...current, collapsed: true }))}
              >
                <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
              </button>
            </header>

            <ol className="ob-steps">
              {STEPS.map((step) => {
                const done = checklist.done.includes(step.id);
                const open = step === active;
                return (
                  <li
                    key={step.id}
                    className="ob-step"
                    data-done={done || undefined}
                    data-open={open || undefined}
                  >
                    <Checkbox.Root
                      data-rm-ignore=""
                      className="ob-check"
                      checked={done}
                      onCheckedChange={(on) => toggle(step.id, on)}
                      aria-label={step.title}
                    >
                      <Checkbox.Indicator className="ob-tick" keepMounted>
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
                    <span className="ob-step-body">
                      <span className="ob-step-title">{step.title}</span>
                      {open && (
                        <>
                          <span className="ob-step-detail">{step.detail}</span>
                          <button type="button" className="ob-action" onClick={() => toggle(step.id, true)}>
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
                className="ob-done"
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

// The docs demo: a short scripted scene that plays the element above. Your app doesn't need it.

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
