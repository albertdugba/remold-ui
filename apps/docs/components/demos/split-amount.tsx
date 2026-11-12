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
import { FK_STAGE, FORM_KIT } from "./form-kit";
import { useScene } from "./use-scene";

export interface Diner {
  id: string;
  name: string;
  color: string;
}

export interface SplitAmountValue {
  people: string[];
  tip: number;
}

export interface SplitAmountProps {
  value?: SplitAmountValue;
  defaultValue?: SplitAmountValue;
  onValueChange?: (value: SplitAmountValue, details: ChangeDetails) => void;
  diners?: Diner[];
  onRequest?: (shares: { id: string; amount: number }[]) => void;
  ref?: Ref<HTMLDivElement>;
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

const FACE = "flex-none rounded-full bg-(--fk-well)";
const colorOf = (diner: Diner) => ({ "--spl-color": diner.color }) as CSSProperties;

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const face = (name: string) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=e4e4e7`;

function shares(total: number, count: number): number[] {
  if (!count) return [];
  const base = Math.floor(total / count);
  const extra = total - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < extra ? 1 : 0));
}

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
      <div
        ref={ref}
        className={`grid w-[min(100%,372px)] gap-4 rounded-[26px] bg-(--fk-surface) p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_16px_40px_-20px_rgb(0_0_0/0.22),0_0_0_1px_var(--fk-line)] ${FORM_KIT}`}
      >
        <header className="flex items-center gap-3">
          <span
            className="grid size-[42px] flex-none place-items-center rounded-[13px] bg-[#fff1e6] text-[#ea580c] dark:bg-[rgb(234_88_12/0.16)] dark:text-[#fb923c]"
            aria-hidden="true"
          >
            <HugeiconsIcon icon={Restaurant01Icon} strokeWidth={1.8} className="size-5" />
          </span>
          <span className="grid min-w-0 flex-1 leading-[1.3]">
            <b className="text-[15px] font-[650]">Dinner at Buka</b>
            <span className="text-[12px] text-(--fk-muted)">Fri 14 Nov · {diners.length} at the table</span>
          </span>
          <span className="grid justify-items-end leading-[1.25]">
            <Odometer value={money(total)} className="text-[22px] font-bold tracking-[-0.03em]" />
            <span className="text-[12px] text-(--fk-muted)">{split.tip ? `incl. ${split.tip}% tip` : "no tip"}</span>
          </span>
        </header>

        <div className="flex h-3 gap-1" aria-hidden="true">
          <AnimatePresence initial={false}>
            {paying.map((diner) => (
              <motion.span
                key={diner.id}
                layout
                className="min-w-0 basis-0 rounded-full bg-(--spl-color)"
                style={colorOf(diner)}
                initial={{ opacity: 0, flexGrow: 0.001 }}
                animate={{ opacity: 1, flexGrow: 1 }}
                exit={{ opacity: 0, flexGrow: 0.001 }}
              />
            ))}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between gap-3 text-[13px] text-(--fk-muted)">
          <span>Tip</span>
          <ToggleGroup
            className="flex h-[34px] rounded-[11px] bg-(--fk-well) p-[3px]"
            aria-label="Tip"
            value={[String(split.tip)]}
            onValueChange={(values) =>
              values[0] && setSplit((current) => ({ ...current, tip: Number(values[0]) }))
            }
          >
            {TIPS.map((tip) => (
              <Toggle
                key={tip}
                value={String(tip)}
                className="relative min-w-[52px] cursor-pointer rounded-lg border-0 bg-transparent px-2.5 text-[12.5px] font-[550] text-(--fk-muted) transition-colors duration-200 data-pressed:text-(--fk-ink)"
              >
                {split.tip === tip && (
                  <motion.span
                    layoutId={`${id}-tip`}
                    className="absolute inset-0 rounded-lg bg-(--fk-surface) shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_0.5px_var(--fk-line)] dark:bg-(--fk-well-strong)"
                  />
                )}
                <span className="relative">{tip ? `${tip}%` : "None"}</span>
              </Toggle>
            ))}
          </ToggleGroup>
        </div>

        <LayoutGroup id={id}>
          <ul className="-mx-5 grid border-y border-solid border-(--fk-line) px-5 py-1" aria-label="Splitting equally">
            <AnimatePresence initial={false} mode="popLayout">
              {paying.map((diner, index) => (
                <motion.li
                  key={diner.id}
                  layout="position"
                  className="flex h-[52px] items-center gap-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                >
                  <motion.img
                    layoutId={`${id}-face-${diner.id}`}
                    className={FACE}
                    src={face(diner.name)}
                    alt=""
                    width={36}
                    height={36}
                    draggable={false}
                  />
                  <span className="flex min-w-0 flex-1 items-center gap-2 truncate text-[14px] font-[550]">
                    <i className="size-2 flex-none rounded-full bg-(--spl-color)" style={colorOf(diner)} aria-hidden="true" />
                    {diner.name}
                  </span>
                  <b className="text-[15px] font-[650]">
                    <Odometer value={money(each[index]!)} />
                  </b>
                  {diner.id === "you" ? (
                    <span className="size-7 flex-none" aria-hidden="true" />
                  ) : (
                    <Button
                      className="grid size-7 flex-none cursor-pointer place-items-center rounded-[9px] border-0 bg-transparent p-0 text-(--fk-faint) transition-colors duration-150 hover:bg-(--fk-well) hover:text-(--fk-ink) [&_svg]:size-3.5"
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

          <div className="grid gap-2.5">
            <span className="text-[12px] font-[550] text-(--fk-muted)">{waiting.length ? "Also at the table" : "Everyone's in"}</span>
            <ul className="flex min-h-9 flex-wrap gap-2" aria-label="Also at the table">
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
                      className="flex h-9 cursor-pointer items-center gap-[7px] rounded-full border-0 bg-(--fk-well) pr-[11px] pl-1 text-[13px] font-[550] text-(--fk-ink) transition-colors duration-150 hover:bg-(--fk-well-strong)"
                      aria-label={`Split with ${diner.name}`}
                      onClick={() => include(diner.id, true)}
                    >
                      <motion.img
                        layoutId={`${id}-face-${diner.id}`}
                        className={FACE}
                        src={face(diner.name)}
                        alt=""
                        width={28}
                        height={28}
                        draggable={false}
                      />
                      <span>{diner.name.split(" ")[0]}</span>
                      <HugeiconsIcon icon={Add01Icon} strokeWidth={2.2} aria-hidden="true" className="size-3.5 text-(--fk-muted)" />
                    </Button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        </LayoutGroup>

        <Button
          data-sent={sent || undefined}
          className="grid h-12 cursor-pointer place-items-center overflow-hidden rounded-[14px] border-0 bg-(--fk-ink) text-[14.5px] font-semibold text-(--fk-surface) transition-[background-color,opacity] duration-250 enabled:hover:opacity-90 disabled:cursor-default disabled:opacity-40 data-sent:bg-(--fk-good) data-sent:text-white"
          disabled={others === 0}
          onClick={request}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={sent ? "sent" : "ask"}
              className="inline-flex items-center gap-1.5 whitespace-nowrap [&_svg]:size-4"
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
        <p className="sr-only" aria-live="polite">
          {`${paying.length === 1 ? "Just you" : `${paying.length} people`}, ${money(each[0] ?? 0)} each.`}
        </p>
      </div>
    </MotionConfig>
  );
}

const BEATS: readonly (SplitAmountValue & { ms: number })[] = [
  { people: ["you", "ama"], tip: 15, ms: 1400 },
  { people: ["you", "ama", "kofi"], tip: 15, ms: 1400 },
  { people: ["you", "ama", "kofi", "efua"], tip: 15, ms: 1500 },
  { people: ["you", "ama", "kofi", "efua"], tip: 20, ms: 1500 },
  { people: ["you", "ama", "efua"], tip: 20, ms: 2400 },
];

const fromBeat = (step: number): SplitAmountValue => ({ people: BEATS[step]!.people, tip: BEATS[step]!.tip });

export function SplitAmountDemo({ playing }: { playing?: boolean } = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  return (
    <div className={FK_STAGE}>
      <SplitAmount ref={scene.ref} value={scene.state} onValueChange={scene.onValueChange} />
    </div>
  );
}
