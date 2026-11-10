"use client";
import { Button } from "@base-ui/react/button";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Cancel01Icon, Restaurant01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { useEffect, useId, useRef, useState, type CSSProperties, type Ref } from "react";
import { Odometer } from "./odometer";
import { useControllableState, type ChangeDetails } from "./use-controllable-state";
import { useScene } from "./use-scene";
import "./form-kit.css";
import "./split-amount.css";

export interface Diner {
  id: string;
  name: string;
  /** The colour of their slice of the bar. */
  color: string;
}

export interface SplitAmountValue {
  /** Who's paying, by id. */
  people: string[];
  /** The tip, as a percentage of the bill. */
  tip: number;
}

const DINERS: Diner[] = [
  { id: "you", name: "You", color: "var(--fk-ink)" },
  { id: "ama", name: "Ama Owusu", color: "#f59e0b" },
  { id: "kofi", name: "Kofi Mensah", color: "#0ea5e9" },
  { id: "efua", name: "Efua Asante", color: "#ec4899" },
  { id: "yaw", name: "Yaw Boateng", color: "#10b981" },
];

const TIPS = [0, 10, 15, 20];
const SUBTOTAL = 11_000;
const SENT_FOR = 1800;

const SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.14 };

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const face = (name: string) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=e4e4e7`;

function shares(total: number, count: number): number[] {
  if (!count) return [];
  const base = Math.floor(total / count);
  const extra = total - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < extra ? 1 : 0));
}

export interface SplitAmountProps {
  value?: SplitAmountValue;
  defaultValue?: SplitAmountValue;
  onValueChange?: (value: SplitAmountValue, details: ChangeDetails) => void;
  /** Everyone at the table. The one with id "you" is always paying. */
  diners?: Diner[];
  /** Called with each person's share, in cents, when you request the money. */
  onRequest?: (shares: { id: string; amount: number }[]) => void;
  ref?: Ref<HTMLDivElement>;
}

/** A bill split equally between the people you pick, with a tip and a request for what you're owed. */
export function SplitAmount({
  value,
  defaultValue = { people: ["you"], tip: 15 },
  onValueChange,
  diners = DINERS,
  onRequest,
  ref,
}: SplitAmountProps) {
  const [split, setSplit] = useControllableState({ value, defaultValue, onValueChange });
  const [sent, setSent] = useState(false);
  const sentTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const id = useId();

  useEffect(() => () => clearTimeout(sentTimer.current), []);

  const paying = diners.filter((diner) => diner.id === "you" || split.people.includes(diner.id));
  const waiting = diners.filter((diner) => !paying.includes(diner));
  const total = Math.round(SUBTOTAL * (1 + split.tip / 100));
  const each = shares(total, paying.length);
  const owed = each.reduce((sum, amount, index) => (paying[index]!.id === "you" ? sum : sum + amount), 0);
  const others = paying.length - 1;

  const include = (person: string, on: boolean) => {
    setSent(false);
    setSplit((current) => ({
      ...current,
      people: on ? [...current.people, person] : current.people.filter((other) => other !== person),
    }));
  };

  const request = () => {
    onRequest?.(
      paying
        .map((diner, index) => ({ id: diner.id, amount: each[index]! }))
        .filter((share) => share.id !== "you"),
    );
    setSent(true);
    clearTimeout(sentTimer.current);
    sentTimer.current = setTimeout(() => setSent(false), SENT_FOR);
  };

  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <div ref={ref} className="fk spl">
        <header className="spl-head">
          <span className="spl-venue" aria-hidden="true">
            <HugeiconsIcon icon={Restaurant01Icon} strokeWidth={1.8} />
          </span>
          <span className="spl-place">
            <b>Dinner at Buka</b>
            <span>Fri 14 Nov · {diners.length} at the table</span>
          </span>
          <span className="spl-total">
            <Odometer value={money(total)} />
            <span>{split.tip ? `incl. ${split.tip}% tip` : "no tip"}</span>
          </span>
        </header>

        <div className="spl-bar" aria-hidden="true">
          <AnimatePresence initial={false}>
            {paying.map((diner) => (
              <motion.span
                key={diner.id}
                layout
                className="spl-slice"
                style={{ "--spl-color": diner.color } as CSSProperties}
                initial={{ opacity: 0, flexGrow: 0.001 }}
                animate={{ opacity: 1, flexGrow: 1 }}
                exit={{ opacity: 0, flexGrow: 0.001 }}
              />
            ))}
          </AnimatePresence>
        </div>

        <div className="spl-tip">
          <span>Tip</span>
          <ToggleGroup
            className="spl-tips"
            aria-label="Tip"
            value={[String(split.tip)]}
            onValueChange={(values) =>
              values[0] && setSplit((current) => ({ ...current, tip: Number(values[0]) }))
            }
          >
            {TIPS.map((tip) => (
              <Toggle key={tip} value={String(tip)} className="spl-tip-option">
                {split.tip === tip && <motion.span layoutId={`${id}-tip`} className="spl-tip-pill" />}
                <span>{tip ? `${tip}%` : "None"}</span>
              </Toggle>
            ))}
          </ToggleGroup>
        </div>

        <LayoutGroup id={id}>
          <ul className="spl-list" aria-label="Splitting equally">
            <AnimatePresence initial={false} mode="popLayout">
              {paying.map((diner, index) => (
                <motion.li
                  key={diner.id}
                  layout="position"
                  className="spl-row"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                >
                  <motion.img
                    layoutId={`${id}-face-${diner.id}`}
                    className="spl-face"
                    src={face(diner.name)}
                    alt=""
                    width={36}
                    height={36}
                    draggable={false}
                  />
                  <span className="spl-name">
                    <i style={{ "--spl-color": diner.color } as CSSProperties} aria-hidden="true" />
                    {diner.name}
                  </span>
                  <b className="spl-share">
                    <Odometer value={money(each[index]!)} />
                  </b>
                  {diner.id === "you" ? (
                    <span className="spl-gap" aria-hidden="true" />
                  ) : (
                    <Button
                      className="spl-remove"
                      aria-label={`Leave ${diner.name} out`}
                      onClick={() => include(diner.id, false)}
                    >
                      <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} aria-hidden="true" />
                    </Button>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <div className="spl-tray">
            <span className="spl-tray-label">{waiting.length ? "Also at the table" : "Everyone's in"}</span>
            <ul className="spl-waiting" aria-label="Also at the table">
              <AnimatePresence initial={false} mode="popLayout">
                {waiting.map((diner) => (
                  <motion.li
                    key={diner.id}
                    layout="position"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  >
                    <Button
                      className="spl-add"
                      aria-label={`Split with ${diner.name}`}
                      onClick={() => include(diner.id, true)}
                    >
                      <motion.img
                        layoutId={`${id}-face-${diner.id}`}
                        className="spl-face"
                        src={face(diner.name)}
                        alt=""
                        width={28}
                        height={28}
                        draggable={false}
                      />
                      <span>{diner.name.split(" ")[0]}</span>
                      <HugeiconsIcon icon={Add01Icon} strokeWidth={2.2} aria-hidden="true" />
                    </Button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        </LayoutGroup>

        <Button
          className="spl-request"
          data-sent={sent || undefined}
          disabled={others === 0}
          onClick={request}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={sent ? "sent" : "ask"}
              className="spl-request-label"
              initial={{ opacity: 0, y: 6, filter: "blur(3px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(3px)", transition: { duration: 0.12 } }}
            >
              {sent ? (
                <>
                  <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.2} aria-hidden="true" />
                  Requests sent
                </>
              ) : others === 0 ? (
                "Pick who's splitting"
              ) : (
                <>
                  Request <Odometer value={money(owed)} /> from{" "}
                  {others === 1 ? "1 person" : `${others} people`}
                </>
              )}
            </motion.span>
          </AnimatePresence>
        </Button>
        <p className="fk-sr" aria-live="polite">
          {`${paying.length === 1 ? "Just you" : `${paying.length} people`}, ${money(each[0] ?? 0)} each.`}
        </p>
      </div>
    </MotionConfig>
  );
}

// The docs demo: a short scripted scene that plays the element above. Your app doesn't need it.

const BEATS: readonly (SplitAmountValue & { ms: number })[] = [
  { people: ["you", "ama"], tip: 15, ms: 1400 },
  { people: ["you", "ama", "kofi"], tip: 15, ms: 1400 },
  { people: ["you", "ama", "kofi", "efua"], tip: 15, ms: 1500 },
  { people: ["you", "ama", "kofi", "efua"], tip: 20, ms: 1500 },
  { people: ["you", "ama", "efua"], tip: 20, ms: 2400 },
];

const fromBeat = (step: number): SplitAmountValue => ({ people: BEATS[step]!.people, tip: BEATS[step]!.tip });

interface SplitAmountDemoProps {
  playing?: boolean;
}

export function SplitAmountDemo({ playing }: SplitAmountDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  return (
    <div className="fk-stage not-prose">
      <SplitAmount ref={scene.ref} value={scene.state} onValueChange={scene.onValueChange} />
    </div>
  );
}
