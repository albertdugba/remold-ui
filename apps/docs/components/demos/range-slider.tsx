"use client";
import { Slider } from "@base-ui/react/slider";
import { LayoutGroup, motion } from "motion/react";
import { FK_DESCRIPTION, FK_LABEL, FK_STAGE, FORM_KIT } from "./form-kit";
import { useScene } from "./use-scene";

export interface RangeSliderProps {
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
  active: number | null;
  onActiveChange: (active: number | null) => void;
}

const MIN = 0;
const MAX = 400;
const STEP = 5;
const SPREAD = [2, 5, 9, 16, 24, 31, 35, 33, 28, 24, 19, 15, 12, 9, 7, 5, 4, 3, 2, 2];

const FLY = { type: "spring" as const, duration: 0.42, bounce: 0.16 };

const PRICE = "inline-block";
const BUBBLE =
  "pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 rounded-lg bg-(--fk-ink) px-2 py-1 text-[13px] font-[650] whitespace-nowrap text-(--fk-surface)";

function Price({ index, value, bubble }: { index: number; value: number; bubble?: boolean }) {
  return (
    <motion.span layoutId={`rng-${index}`} className={bubble ? BUBBLE : PRICE} transition={FLY}>
      ${value}
      {!bubble && index === 1 && value === MAX ? "+" : ""}
    </motion.span>
  );
}

function Ghost({ value }: { value: number }) {
  return <span className={`${PRICE} text-(--fk-faint)`}>${value}</span>;
}

export function RangeSlider({ value, onValueChange, active, onActiveChange }: RangeSliderProps) {
  const [lo, hi] = value;
  const inRange = (index: number) => {
    const from = (index / SPREAD.length) * MAX;
    return from >= lo && from < hi;
  };
  const count = SPREAD.reduce((sum, stays, index) => (inRange(index) ? sum + stays : sum), 0);

  return (
    <LayoutGroup>
      <Slider.Root
        className={`grid w-[min(100%,360px)] ${FORM_KIT}`}
        value={value}
        min={MIN}
        max={MAX}
        step={STEP}
        minStepsBetweenValues={4}
        onValueChange={(next, details) => {
          onValueChange(next as [number, number]);
          onActiveChange(details.activeThumbIndex);
        }}
        onValueCommitted={() => onActiveChange(null)}
      >
        <span className="mb-[18px] flex items-baseline justify-between">
          <Slider.Label className={FK_LABEL}>Price per night</Slider.Label>
          <span className="inline-flex items-baseline gap-[5px] text-[15px] font-[650]" aria-hidden="true">
            {active === 0 ? <Ghost value={lo} /> : <Price index={0} value={lo} />}
            <span className="text-(--fk-faint)">–</span>
            {active === 1 ? <Ghost value={hi} /> : <Price index={1} value={hi} />}
          </span>
        </span>

        <span className="flex h-12 items-end gap-0.5 px-2.5" aria-hidden="true">
          {SPREAD.map((stays, index) => (
            <i
              key={index}
              data-in={inRange(index) || undefined}
              className="min-h-0.5 flex-1 rounded-t-[2px] bg-(--fk-well-strong) transition-colors duration-200 data-in:bg-(--fk-ink)"
              style={{ height: `${(stays / 35) * 100}%` }}
            />
          ))}
        </span>

        <Slider.Control className="flex h-7 cursor-pointer touch-none items-center px-2.5">
          <Slider.Track className="relative h-[3px] w-full rounded-full bg-(--fk-well-strong)">
            <Slider.Indicator className="h-full rounded-[inherit] bg-(--fk-ink)" />
            {[0, 1].map((index) => (
              <Slider.Thumb
                key={index}
                index={index}
                className="size-[22px] cursor-grab rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.2),0_0_0_1px_rgb(0_0_0/0.08)] transition-shadow duration-150 has-focus-visible:shadow-[0_1px_3px_rgb(0_0_0/0.2),0_0_0_4px_color-mix(in_oklab,var(--fk-focus)_18%,transparent)] data-dragging:cursor-grabbing"
                aria-label={index === 0 ? "Lowest price" : "Highest price"}
              >
                {active === index && <Price index={index} value={value[index]!} bubble />}
              </Slider.Thumb>
            ))}
          </Slider.Track>
        </Slider.Control>

        <span className={`mt-2.5 ${FK_DESCRIPTION}`}>{count} stays in this range</span>
      </Slider.Root>
    </LayoutGroup>
  );
}

interface State {
  value: [number, number];
  active: number | null;
}

const BEATS: readonly (State & { ms: number })[] = [
  { value: [60, 260], active: null, ms: 1200 },
  { value: [80, 260], active: 0, ms: 200 },
  { value: [105, 260], active: 0, ms: 200 },
  { value: [120, 260], active: 0, ms: 600 },
  { value: [120, 260], active: null, ms: 1000 },
  { value: [120, 230], active: 1, ms: 200 },
  { value: [120, 200], active: 1, ms: 200 },
  { value: [120, 185], active: 1, ms: 600 },
  { value: [120, 185], active: null, ms: 2200 },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

export function RangeSliderDemo({ playing }: { playing?: boolean } = {}) {
  const { ref, state, takeOver } = useScene(BEATS, fromBeat, playing);
  return (
    <div ref={ref} className={FK_STAGE}>
      <RangeSlider
        value={state.value}
        onValueChange={(value) => takeOver((current) => ({ ...current, value }))}
        active={state.active}
        onActiveChange={(active) => takeOver((current) => ({ ...current, active }))}
      />
    </div>
  );
}
