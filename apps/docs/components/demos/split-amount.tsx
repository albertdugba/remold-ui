"use client";
import { Button } from "@base-ui/react/button";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useId, useRef, useState, type Ref } from "react";
import { Odometer } from "./odometer";
import { useControllableState, type ChangeDetails } from "./use-controllable-state";
import { FK_STAGE, FORM_KIT } from "./form-kit";
import { useScene } from "./use-scene";

export interface Diner {
  id: string;
  name: string;
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
  { id: "you", name: "You" },
  { id: "ama", name: "Ama Owusu" },
  { id: "kofi", name: "Kofi Mensah" },
  { id: "efua", name: "Efua Asante" },
  { id: "yaw", name: "Yaw Boateng" },
];

const TIPS = [0, 10, 15, 20];
const SUBTOTAL = 11_000;
const SENT_FOR = 1800;

const SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.14 };

const money = (cents: number) => `£${(cents / 100).toFixed(2)}`;
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
  const total = Math.round(SUBTOTAL * (1 + split.tip / 100));
  const each = shares(total, paying.length);
  const owed = each.reduce((sum, amount, index) => (paying[index]!.id === "you" ? sum : sum + amount), 0);
  const others = paying.length - 1;

  const choose = (people: string[]) => {
    setSent(false);
    setSplit((current) => ({ ...current, people: ["you", ...people.filter((person) => person !== "you")] }));
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
      <div ref={ref} className={`grid w-[min(100%,360px)] gap-6 rounded-[32px] bg-(--fk-surface) p-6 ${FORM_KIT}`}>
        <header className="grid gap-2">
          <span className="flex items-baseline justify-between gap-3 text-[13px] text-(--fk-muted)">
            <span>Dinner at Buka</span>
            <span className="inline-flex items-baseline gap-1">
              <Odometer value={money(total)} /> total
            </span>
          </span>
          <Odometer value={money(each[0] ?? 0)} className="text-[44px] font-semibold tracking-[-0.04em]" />
          <span className="text-[13px] text-(--fk-muted)">
            {others === 0 ? "Your share. Nobody else is in yet." : `Your share, split ${paying.length} ways`}
          </span>
        </header>

        <div className="flex h-1.5 gap-1" aria-hidden="true">
          <AnimatePresence initial={false}>
            {paying.map((diner) => (
              <motion.span
                key={diner.id}
                layout
                data-you={diner.id === "you" || undefined}
                className="min-w-0 basis-0 rounded-full bg-(--fk-well-strong) data-you:bg-(--fk-ink)"
                initial={{ opacity: 0, flexGrow: 0.001 }}
                animate={{ opacity: 1, flexGrow: 1 }}
                exit={{ opacity: 0, flexGrow: 0.001 }}
              />
            ))}
          </AnimatePresence>
        </div>

        <ToggleGroup
          multiple
          className="flex justify-between"
          aria-label="Who's splitting"
          value={paying.map((diner) => diner.id)}
          onValueChange={(people) => choose(people as string[])}
        >
          {diners.map((diner) => {
            const included = paying.includes(diner);
            const firstName = diner.name.split(" ")[0];

            return (
              <Toggle
                key={diner.id}
                value={diner.id}
                disabled={diner.id === "you"}
                aria-label={diner.id === "you" ? "You" : `Split with ${diner.name}`}
                className="group/diner grid cursor-pointer justify-items-center gap-2 rounded-[14px] border-0 bg-transparent p-0 outline-none focus-visible:shadow-[0_0_0_2px_var(--fk-surface),0_0_0_4px_var(--fk-ink)] data-disabled:cursor-default"
              >
                <span className="relative transition-[scale] duration-150 ease-out group-active/diner:scale-[0.95] group-data-disabled/diner:scale-100 motion-reduce:transition-none">
                  <img
                    className="block rounded-full bg-(--fk-well) opacity-35 transition-opacity duration-200 ease-out group-data-pressed/diner:opacity-100 motion-reduce:transition-none"
                    src={face(diner.name)}
                    alt=""
                    width={48}
                    height={48}
                    draggable={false}
                  />
                  {diner.id !== "you" && (
                    <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-(--fk-surface)">
                      <span className="grid size-4 place-items-center rounded-full bg-(--fk-well-strong) text-(--fk-muted) transition-colors duration-200 ease-out group-data-pressed/diner:bg-(--fk-ink) group-data-pressed/diner:text-(--fk-surface) motion-reduce:transition-none">
                        <Remold.Icon
                          icon={<HugeiconsIcon icon={included ? Tick02Icon : Add01Icon} />}
                          strokeWidth={2.6}
                          className="size-2.5"
                        />
                      </span>
                    </span>
                  )}
                </span>
                <span className="text-[12.5px] font-medium text-(--fk-faint) transition-colors duration-200 ease-out group-data-pressed/diner:text-(--fk-ink) motion-reduce:transition-none">
                  {firstName}
                </span>
              </Toggle>
            );
          })}
        </ToggleGroup>

        <div className="flex items-center justify-between gap-3">
          <span className="text-[13.5px] font-medium">Tip</span>
          <ToggleGroup
            className="flex h-9 rounded-full bg-(--fk-well) p-[3px]"
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
                className="relative min-w-[52px] cursor-pointer rounded-full border-0 bg-transparent px-2.5 text-[13px] font-medium text-(--fk-muted) outline-none transition-colors duration-200 ease-out focus-visible:shadow-[0_0_0_2px_var(--fk-ink)] data-pressed:text-(--fk-ink)"
              >
                {split.tip === tip && (
                  <motion.span
                    layoutId={`${id}-tip`}
                    className="absolute inset-0 rounded-full bg-(--fk-surface) dark:bg-(--fk-well-strong)"
                  />
                )}
                <span className="relative">{tip ? `${tip}%` : "None"}</span>
              </Toggle>
            ))}
          </ToggleGroup>
        </div>

        <Button
          className="grid h-12 cursor-pointer place-items-center overflow-hidden rounded-full border-0 bg-(--fk-ink) text-[14.5px] font-semibold text-(--fk-surface) outline-none transition-[opacity,scale] duration-150 ease-out focus-visible:shadow-[0_0_0_2px_var(--fk-surface),0_0_0_4px_var(--fk-ink)] enabled:active:scale-[0.98] disabled:cursor-default disabled:opacity-35 motion-reduce:transition-none"
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
