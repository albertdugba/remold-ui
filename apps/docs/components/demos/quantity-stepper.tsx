"use client";
import { NumberField } from "@base-ui/react/number-field";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete02Icon, MinusSignIcon } from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, motion } from "motion/react";
import { Odometer } from "./odometer";
import { FK_STAGE, FORM_KIT } from "./form-kit";
import { useScene } from "./use-scene";

export interface QuantityStepperProps {
  value: number;
  onValueChange: (value: number) => void;
  max?: number;
}

const STRETCH = { type: "spring" as const, duration: 0.45, bounce: 0.16 };

const PILL = "h-9 flex-none rounded-full bg-(--fk-ink) text-(--fk-surface)";
const STEP_BUTTON =
  "grid size-[30px] cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-inherit transition-colors duration-150 not-data-disabled:hover:bg-[color-mix(in_oklab,var(--fk-surface)_14%,transparent)] data-disabled:cursor-default data-disabled:opacity-35 [&_svg]:size-4";

export function QuantityStepper({ value, onValueChange, max = 9 }: QuantityStepperProps) {
  return (
    <AnimatePresence initial={false} mode="popLayout">
      {value === 0 ? (
        <motion.button
          key="add"
          type="button"
          layoutId="stq-pill"
          className={`${PILL} cursor-pointer border-0 pr-3.5 pl-[11px] text-[13.5px] font-semibold`}
          onClick={() => onValueChange(1)}
          transition={STRETCH}
        >
          <motion.span
            className="inline-flex items-center gap-[5px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2.2} className="size-[15px]" />
            Add
          </motion.span>
        </motion.button>
      ) : (
        <NumberField.Root
          key="stepper"
          value={value}
          min={0}
          max={max}
          onValueChange={(next) => onValueChange(next ?? 0)}
          render={<motion.div layoutId="stq-pill" className={PILL} transition={STRETCH} />}
        >
          <NumberField.Group className="flex h-full items-center px-[3px]">
            <NumberField.Decrement
              className={STEP_BUTTON}
              aria-label={value === 1 ? "Remove from cart" : "Decrease quantity"}
              data-remove={value === 1 || undefined}
            >
              <Remold.Icon
                icon={<HugeiconsIcon icon={value === 1 ? Delete02Icon : MinusSignIcon} />}
                strokeWidth={2}
              />
            </NumberField.Decrement>
            <span className="relative grid min-w-[22px] place-items-center text-[14.5px] font-[650]">
              <Odometer value={String(value)} />
              <NumberField.Input
                className="absolute inset-0 w-full border-0 bg-transparent p-0 text-center text-transparent caret-transparent outline-none"
                aria-label="Quantity"
              />
            </span>
            <NumberField.Increment className={STEP_BUTTON} aria-label="Increase quantity">
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2.2} />
            </NumberField.Increment>
          </NumberField.Group>
        </NumberField.Root>
      )}
    </AnimatePresence>
  );
}

function Phone() {
  return (
    <svg viewBox="0 0 40 64" className="h-[38px] w-6 drop-shadow-[0_2px_3px_rgb(0_0_0/0.18)]">
      <defs>
        <linearGradient id="stq-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4a5d7a" />
          <stop offset="1" stopColor="#25324a" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="62" rx="7.5" fill="url(#stq-body)" />
      <rect x="1.5" y="1.5" width="37" height="61" rx="7" fill="none" stroke="rgb(255 255 255 / 0.18)" />
      <rect x="3.5" y="3.5" width="33" height="17" rx="5" fill="#1c2638" />
      <circle cx="10" cy="9" r="3.6" fill="#0b0f17" stroke="#3b4a63" strokeWidth="0.8" />
      <circle cx="10" cy="15.2" r="3.6" fill="#0b0f17" stroke="#3b4a63" strokeWidth="0.8" />
      <circle cx="16.2" cy="12.1" r="3.6" fill="#0b0f17" stroke="#3b4a63" strokeWidth="0.8" />
      <circle cx="9.4" cy="8.4" r="1" fill="#5b6f94" />
      <circle cx="9.4" cy="14.6" r="1" fill="#5b6f94" />
      <circle cx="15.6" cy="11.5" r="1" fill="#5b6f94" />
      <circle cx="30.5" cy="8" r="1.4" fill="#e9e3cf" opacity="0.8" />
    </svg>
  );
}

interface State {
  quantity: number;
}

const BEATS: readonly (State & { ms: number })[] = [
  { quantity: 0, ms: 1300 },
  { quantity: 1, ms: 900 },
  { quantity: 2, ms: 600 },
  { quantity: 3, ms: 1200 },
  { quantity: 2, ms: 500 },
  { quantity: 1, ms: 1300 },
  { quantity: 0, ms: 1200 },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

export function QuantityStepperDemo({ playing }: { playing?: boolean } = {}) {
  const { ref, state, takeOver } = useScene(BEATS, fromBeat, playing);
  return (
    <div ref={ref} className={FK_STAGE}>
      <div className={`flex w-[min(100%,360px)] items-center gap-3 ${FORM_KIT}`}>
        <span
          className="grid size-[52px] flex-none place-items-center rounded-[13px] bg-[linear-gradient(160deg,#f4f5f7,#e6e8ec)] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.04)] dark:bg-[linear-gradient(160deg,#2a2c31,#1f2024)]"
          aria-hidden="true"
        >
          <Phone />
        </span>
        <span className="grid min-w-0 flex-1 leading-[1.35]">
          <b className="text-[14px] font-semibold">iPhone 17 Pro</b>
          <span className="text-[13px] text-(--fk-muted)">256 GB · Deep Blue · £1,099</span>
        </span>
        <QuantityStepper value={state.quantity} onValueChange={(quantity) => takeOver({ quantity })} />
      </div>
    </div>
  );
}
