"use client";
/**
 * A price range slider with the prices over it. While you drag a handle, its price lifts out of the
 * label and rides above the handle, so you read the number where your finger is; let go and it
 * flies back into the label. The bars behind the track show how many stays sit at each price,
 * darkening inside your range.
 *
 * Built on Base UI's Slider, with a thumb for each end of the range. Motion carries each price
 * between the label and its handle.
 */
import { Slider } from "@base-ui/react/slider";
import { LayoutGroup, motion } from "motion/react";
import { useScene } from "./use-scene";
import "./form-kit.css";
import "./range-slider.css";

const MIN = 0;
const MAX = 400;
const STEP = 5;
/** How many stays sit in each $20 band, for the bars behind the track. */
const SPREAD = [2, 5, 9, 16, 24, 31, 35, 33, 28, 24, 19, 15, 12, 9, 7, 5, 4, 3, 2, 2];

const FLY = { type: "spring" as const, duration: 0.42, bounce: 0.16 };

function Price({ index, value, bubble }: { index: number; value: number; bubble?: boolean }) {
  return (
    <motion.span layoutId={`rng-${index}`} className={bubble ? "rng-bubble" : "rng-price"} transition={FLY}>
      ${value}
      {!bubble && index === 1 && value === MAX ? "+" : ""}
    </motion.span>
  );
}

export interface RangeSliderProps {
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
  /** The handle being dragged, if any. */
  active: number | null;
  onActiveChange: (active: number | null) => void;
}

export function RangeSlider({ value, onValueChange, active, onActiveChange }: RangeSliderProps) {
  const [lo, hi] = value;
  const count = SPREAD.reduce((sum, n, i) => {
    const from = (i / SPREAD.length) * MAX;
    return from >= lo && from < hi ? sum + n : sum;
  }, 0);

  return (
    <LayoutGroup>
      <Slider.Root
        className="fk rng"
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
        <span className="rng-head">
          <Slider.Label className="fk-label">Price per night</Slider.Label>
          <span className="rng-values" aria-hidden="true">
            {active === 0 ? <span className="rng-price" data-ghost="">${lo}</span> : <Price index={0} value={lo} />}
            <span className="rng-dash">–</span>
            {active === 1 ? <span className="rng-price" data-ghost="">${hi}</span> : <Price index={1} value={hi} />}
          </span>
        </span>

        <span className="rng-bars" aria-hidden="true">
          {SPREAD.map((n, i) => {
            const from = (i / SPREAD.length) * MAX;
            return <i key={i} style={{ height: `${(n / 35) * 100}%` }} data-in={(from >= lo && from < hi) || undefined} />;
          })}
        </span>

        <Slider.Control className="rng-control">
          <Slider.Track className="rng-track">
            <Slider.Indicator className="rng-indicator" />
            {[0, 1].map((i) => (
              <Slider.Thumb key={i} index={i} className="rng-thumb" aria-label={i === 0 ? "Lowest price" : "Highest price"}>
                {active === i && <Price index={i} value={value[i]!} bubble />}
              </Slider.Thumb>
            ))}
          </Slider.Track>
        </Slider.Control>

        <span className="fk-description">{count} stays in this range</span>
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

interface RangeSliderDemoProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function RangeSliderDemo({ playing }: RangeSliderDemoProps = {}) {
  const { ref, state, take } = useScene(BEATS, fromBeat, playing);
  return (
    <div ref={ref} className="fk-stage not-prose">
      <RangeSlider
        value={state.value}
        onValueChange={(value) => take((s) => ({ ...s, value }))}
        active={state.active}
        onActiveChange={(active) => take((s) => ({ ...s, active }))}
      />
    </div>
  );
}
