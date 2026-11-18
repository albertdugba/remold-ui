"use client";

import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { useAutoplay } from "@remold-ui/react/canvas";
import { MotionConfig, motion } from "motion/react";
import { useId } from "react";
import { VoiceOrb } from "./voice-orb";
import { ORB_STEPS } from "./voice-orb-steps";

const SLIDE = { type: "spring" as const, duration: 0.45, bounce: 0.18 };

const TABS =
  "inline-flex max-w-full overflow-x-auto rounded-full bg-[rgb(24_24_27/0.05)] p-1 shadow-[inset_0_0_0_1px_rgb(24_24_27/0.05)] [scrollbar-width:none] dark:bg-[rgb(255_255_255/0.06)] dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07),inset_0_1px_0_rgb(255_255_255/0.08)] [&::-webkit-scrollbar]:hidden";

const TAB =
  "relative inline-flex h-[34px] flex-none cursor-pointer items-center rounded-full border-0 bg-transparent px-3.5 text-[13px] font-medium tracking-[-0.005em] whitespace-nowrap text-[rgb(24_24_27/0.55)] transition-colors duration-250 ease-out not-data-pressed:hover:text-[rgb(24_24_27/0.85)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(24_24_27/0.7)] data-pressed:text-[#18181b] motion-reduce:transition-none dark:text-white/50 dark:not-data-pressed:hover:text-white/85 dark:focus-visible:outline-white/70 dark:data-pressed:text-white";

const PICKED =
  "absolute inset-0 rounded-[inherit] bg-white shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_rgb(24_24_27/0.04)] dark:bg-white/11 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.1)]";

export function VoiceOrbStates() {
  const id = useId();
  const { ref, step, setStep } = useAutoplay(ORB_STEPS.length, { every: 2800 });
  const current = ORB_STEPS[step]!;

  return (
    <MotionConfig reducedMotion="user">
      <div ref={ref} className="not-prose grid w-full justify-items-center gap-7 py-2">
        <VoiceOrb state={current.state} status={current.status} size={240} />
        <ToggleGroup
          className={TABS}
          aria-label="State"
          value={[current.tab]}
          onValueChange={([tab]) => tab && setStep(ORB_STEPS.findIndex((candidate) => candidate.tab === tab))}
        >
          {ORB_STEPS.map(({ tab }) => (
            <Toggle key={tab} value={tab} className={TAB}>
              {tab === current.tab && <motion.span layoutId={`${id}-picked`} className={PICKED} transition={SLIDE} />}
              <span className="relative">{tab}</span>
            </Toggle>
          ))}
        </ToggleGroup>
      </div>
    </MotionConfig>
  );
}
