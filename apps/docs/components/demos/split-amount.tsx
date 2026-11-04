"use client";
/**
 * Splitting a bill. Tap the people at the table to include them; each one added takes an equal
 * slice of the bar and everyone's share rolls down to the new amount, cents and all, so you watch
 * the bill re-divide instead of reading a new number.
 *
 * Built on Base UI's ToggleGroup (multiple), one toggle per person. Motion re-divides the bar; the
 * shares roll with the Odometer. The cents left over after an even split go to the first people, so
 * the shares always add up to the bill.
 */
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Odometer } from "./odometer";
import { useScene } from "./use-scene";
import "./form-kit.css";
import "./split-amount.css";

const PEOPLE = [
  { id: "you", name: "You", initials: "You", face: "var(--fk-ink)" },
  { id: "ama", name: "Ama", initials: "AO", face: "#f59e0b" },
  { id: "kofi", name: "Kofi", initials: "KM", face: "#0ea5e9" },
  { id: "efua", name: "Efua", initials: "EA", face: "#ec4899" },
  { id: "yaw", name: "Yaw", initials: "YB", face: "#10b981" },
];

/** In cents. */
const BILL = 12_650;

const SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.12 };
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** Even shares in cents, the remainder spread one cent at a time from the front. */
function shares(count: number): number[] {
  if (!count) return [];
  const base = Math.floor(BILL / count);
  const extra = BILL - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < extra ? 1 : 0));
}

export interface SplitAmountProps {
  value: string[];
  onValueChange: (value: string[]) => void;
}

export function SplitAmount({ value, onValueChange }: SplitAmountProps) {
  const included = PEOPLE.filter((p) => value.includes(p.id));
  const each = shares(included.length);

  return (
    <div className="fk spl">
      <span className="spl-head">
        <span className="spl-title">
          <span className="fk-description">Dinner at Buka</span>
          <b>{money(BILL)}</b>
        </span>
        <span className="fk-description">Split equally</span>
      </span>

      <ToggleGroup multiple value={value} onValueChange={(next) => onValueChange(next as string[])} className="spl-people" aria-label="Who’s paying">
        {PEOPLE.map((p) => (
          <Toggle key={p.id} value={p.id} className="spl-person" data-you={p.id === "you" || undefined} aria-label={p.name} style={{ ["--spl-face" as string]: p.face }}>
            <span className="spl-face">{p.initials}</span>
            <span className="spl-name">{p.name}</span>
          </Toggle>
        ))}
      </ToggleGroup>

      <LayoutGroup>
        <div className="spl-bar" aria-hidden="true">
          <AnimatePresence initial={false}>
            {included.map((p) => (
              <motion.span
                key={p.id}
                layout
                className="spl-slice"
                style={{ ["--spl-face" as string]: p.face }}
                initial={{ opacity: 0, flexGrow: 0.001 }}
                animate={{ opacity: 1, flexGrow: 1 }}
                exit={{ opacity: 0, flexGrow: 0.001 }}
                transition={SPRING}
              />
            ))}
          </AnimatePresence>
        </div>

        <ul className="spl-shares">
          <AnimatePresence initial={false}>
            {included.map((p, index) => (
              <motion.li
                key={p.id}
                layout="position"
                className="spl-share"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={SPRING}
              >
                <i style={{ ["--spl-face" as string]: p.face }} />
                <span>{p.name === "You" ? "You pay" : `${p.name} pays`}</span>
                <b>
                  <Odometer value={money(each[index]!)} />
                </b>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </LayoutGroup>
      {included.length === 0 && <p className="fk-description">Tap the people at the table.</p>}
    </div>
  );
}

interface State {
  people: string[];
}

const BEATS: readonly (State & { ms: number })[] = [
  { people: ["you", "ama"], ms: 1300 },
  { people: ["you", "ama", "kofi"], ms: 1300 },
  { people: ["you", "ama", "kofi", "efua"], ms: 1500 },
  { people: ["you", "ama", "efua"], ms: 2200 },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

interface SplitAmountDemoProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function SplitAmountDemo({ playing }: SplitAmountDemoProps = {}) {
  const { ref, state, take } = useScene(BEATS, fromBeat, playing);
  return (
    <div ref={ref} className="fk-stage not-prose">
      <SplitAmount value={state.people} onValueChange={(people) => take({ people })} />
    </div>
  );
}
