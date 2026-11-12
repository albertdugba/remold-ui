"use client";

import { Button } from "@base-ui/react/button";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Tooltip } from "@base-ui/react/tooltip";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, ArrowLeft01Icon, ArrowRight01Icon, Restaurant01Icon } from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { useRef, useState } from "react";
import { useMeasuredSize } from "./use-measured-size";
import { useScript } from "./use-script";

type Face = "notice" | "booking" | "guests";

interface Option {
  id: string;
  time: string;
  title: string;
  table: string;
}

const OPTIONS: Option[] = [
  { id: "early", time: "7:00 PM", title: "Same table, a little earlier", table: "Table 12 · by the bar" },
  { id: "late", time: "8:15 PM", title: "Window seat, a little later", table: "Table 3 · by the window" },
];

const RESTAURANT = { name: "Bosphorus", date: "Fri 14 Nov", code: "BOSP-4182" };
const SIZES = [1, 2, 3, 4, 5, 6, 7, 8];

const SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.2 };
const QUICK = { duration: 0.14 };
const CARD_PADDING = 14;

const part = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.94, filter: "blur(6px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { ...SPRING, delay } },
  exit: { opacity: 0, scale: 0.94, filter: "blur(6px)", transition: QUICK },
});

const STAY = { initial: false as const, exit: { opacity: 0, transition: QUICK } };

const box = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.94 },
  animate: { opacity: 1, scale: 1, transition: { ...SPRING, delay } },
  exit: { opacity: 0, scale: 0.94, transition: QUICK },
});

const guestsLabel = (count: number) => `${count} ${count === 1 ? "guest" : "guests"}`;

const PALETTE = [
  "[--tbk-surface:#ffffff] [--tbk-well:#f4f4f5] [--tbk-line:rgb(24_24_27/0.08)] [--tbk-ink:#18181b] [--tbk-muted:#71717a]",
  "[--tbk-warn:#ea580c] [--tbk-warn-well:#fff4ec] [--tbk-warn-ink:#7c2d12] [--tbk-warn-muted:#9a5a3c]",
  "dark:[--tbk-surface:#1f1f23] dark:[--tbk-well:#2a2a2f] dark:[--tbk-line:rgb(255_255_255/0.08)] dark:[--tbk-ink:#fafafa] dark:[--tbk-muted:#a1a1aa]",
  "dark:[--tbk-warn:#fb923c] dark:[--tbk-warn-well:rgb(251_146_60/0.12)] dark:[--tbk-warn-ink:#fed7aa] dark:[--tbk-warn-muted:#d6a184]",
].join(" ");

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--tbk-ink)";
const FACE = "grid gap-2.5";
const BAR = "flex items-center gap-2 text-[14.5px] [&_b]:font-[650]";
const BACK = `grid size-8 cursor-pointer place-items-center rounded-full border-0 bg-(--tbk-well) p-0 text-(--tbk-ink) [&_svg]:size-4 ${FOCUS}`;
const PLACE = "grid flex-none";
const PLACE_NAME = "text-[14px] font-[650]";
const SUBTLE = "text-[12.5px] text-(--tbk-muted)";

function Surface({ option, radius }: { option: Option; radius: number }) {
  return (
    <motion.span
      layoutId={`tbk-surface-${option.id}`}
      data-surface=""
      className="absolute inset-0 bg-(--tbk-well) transition-[background-color] duration-150 group-hover/option:bg-[color-mix(in_oklab,var(--tbk-ink)_7%,var(--tbk-well))]"
      layoutCrossfade={false}
      exit={{ opacity: 0, transition: { duration: 0 } }}
      style={{ borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

function TimeChip({ option }: { option: Option }) {
  return (
    <motion.span
      layoutId={`tbk-time-${option.id}`}
      className="inline-grid h-[34px] flex-none place-items-center rounded-[11px] bg-(--tbk-ink) px-[11px] text-[14px] font-[650] whitespace-nowrap text-(--tbk-surface) tabular-nums"
    >
      {option.time}
    </motion.span>
  );
}

export function TableBookingDemo({ playing }: { playing?: boolean } = {}) {
  const [face, setFace] = useState<Face>("notice");
  const [picked, setPicked] = useState<Option>(OPTIONS[0]!);
  const [guests, setGuests] = useState(4);
  const card = useRef<HTMLDivElement>(null);
  const [content, contentSize] = useMeasuredSize<HTMLDivElement>();
  const height = contentSize?.height ?? null;

  const choose = (option: Option) => {
    setPicked(option);
    setFace("booking");
  };

  useScript(card, playing, [
    [1500, () => choose(OPTIONS[0]!)],
    [1700, () => setFace("guests")],
    [800, () => setGuests(5)],
    [900, () => setFace("booking")],
    [2200, () => setFace("notice")],
    [1200, () => setGuests(4)],
    [1500, () => choose(OPTIONS[1]!)],
    [2400, () => setFace("notice")],
  ]);

  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <Tooltip.Provider delay={250}>
        <div className={`not-prose grid min-h-[460px] w-full place-items-center font-sans text-(--tbk-ink) ${PALETTE}`}>
          <motion.section
            ref={card}
            className="relative box-border block w-[min(100%,360px)] overflow-clip rounded-[26px] bg-(--tbk-surface) p-3.5"
            aria-label={`Your booking at ${RESTAURANT.name}`}
            initial={false}
            animate={{ height: height === null ? "auto" : height + CARD_PADDING * 2 }}
          >
            <div ref={content} className="relative">
              <LayoutGroup>
                <AnimatePresence mode="popLayout" initial={false}>
                  {face === "notice" && (
                    <motion.div key="notice" className={FACE}>
                      <motion.header className="flex items-center gap-2.5 px-0.5 pt-0.5" {...part(0.02)}>
                        <span
                          className="grid size-[38px] flex-none place-items-center rounded-xl bg-(--tbk-ink) text-(--tbk-surface) [&_svg]:size-[19px]"
                          aria-hidden="true"
                        >
                          <HugeiconsIcon icon={Restaurant01Icon} strokeWidth={1.8} />
                        </span>
                        <span className={PLACE}>
                          <b className={PLACE_NAME}>{RESTAURANT.name}</b>
                          <span className={SUBTLE}>
                            {RESTAURANT.date} · {guestsLabel(guests)}
                          </span>
                        </span>
                      </motion.header>
                      <motion.div
                        className="flex gap-2.5 rounded-2xl bg-(--tbk-warn-well) py-3 pr-3.5 pl-3 text-[13px] leading-[1.45]"
                        role="status"
                        {...box(0.05)}
                      >
                        <HugeiconsIcon
                          icon={Alert02Icon}
                          strokeWidth={2}
                          className="mt-px size-[18px] flex-none text-(--tbk-warn)"
                          aria-hidden="true"
                        />
                        <span className="grid gap-0.5">
                          <b className="font-[650] text-(--tbk-warn-ink)">Your 7:30 table is no longer free</b>
                          <span className="text-(--tbk-warn-muted)">
                            The kitchen closes early for a private event. Pick one of these instead.
                          </span>
                        </span>
                      </motion.div>
                      <div className="grid gap-1.5">
                        {OPTIONS.map((option, index) => {
                          const landing = option.id === picked.id;
                          return (
                            <Button
                              key={option.id}
                              className={`group/option relative flex w-full cursor-pointer items-center gap-3 rounded-2xl border-0 bg-transparent py-2.5 pr-3 pl-2.5 text-left text-inherit transition-[background-color] duration-150 [&>*:not([data-surface])]:relative ${FOCUS}`}
                              onClick={() => choose(option)}
                              render={<motion.button {...(landing ? STAY : box(0.08 + index * 0.04))} />}
                            >
                              <Surface option={option} radius={16} />
                              <TimeChip option={option} />
                              <motion.span className="grid min-w-0 flex-1 leading-[1.3]" {...(landing ? part(0.1) : {})}>
                                <b className="text-[13.5px] font-semibold">{option.title}</b>
                                <span className={SUBTLE}>{option.table}</span>
                              </motion.span>
                              <motion.span className="grid flex-none" {...(landing ? part(0.14) : {})}>
                                <HugeiconsIcon
                                  icon={ArrowRight01Icon}
                                  className="size-4 flex-none text-(--tbk-muted)"
                                  strokeWidth={2}
                                  aria-hidden="true"
                                />
                              </motion.span>
                            </Button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {face === "booking" && (
                    <motion.div key="booking" className={FACE}>
                      <motion.header className={BAR} {...part(0.02)}>
                        <Button
                          className={BACK}
                          aria-label="Back to the options"
                          onClick={() => setFace("notice")}
                        >
                          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} aria-hidden="true" />
                        </Button>
                        <b>Booking changed</b>
                      </motion.header>
                      <div className="relative grid gap-1 p-3 [&>*:not([data-surface])]:relative">
                        <Surface option={picked} radius={18} />
                        <div className="flex items-center gap-3 pb-2">
                          <TimeChip option={picked} />
                          <motion.span className={PLACE} {...part(0.08)}>
                            <b className={PLACE_NAME}>{RESTAURANT.name}</b>
                            <span className={SUBTLE}>{RESTAURANT.date}</span>
                          </motion.span>
                        </div>
                        <motion.dl
                          className="m-0 grid text-[13px] [&_dd]:m-0 [&_dd]:font-[550] [&_dt]:text-(--tbk-muted) [&>div]:flex [&>div]:min-h-[38px] [&>div]:items-center [&>div]:justify-between [&>div]:gap-3 [&>div]:border-t [&>div]:border-solid [&>div]:border-(--tbk-line)"
                          {...part(0.12)}
                        >
                          <div>
                            <dt>Table</dt>
                            <dd>{picked.table}</dd>
                          </div>
                          <div>
                            <dt>Party</dt>
                            <dd>
                              <Button
                                className={`inline-flex cursor-pointer items-center gap-2 rounded-full border-0 bg-(--tbk-surface) py-1 pr-1 pl-2.5 font-semibold text-inherit ${FOCUS}`}
                                onClick={() => setFace("guests")}
                              >
                                <Remold.Text>{guestsLabel(guests)}</Remold.Text>
                                <span className="rounded-full bg-(--tbk-well) px-2 py-[3px] text-[11.5px] font-semibold text-(--tbk-muted)">
                                  Change
                                </span>
                              </Button>
                            </dd>
                          </div>
                          <div>
                            <dt>Confirmation</dt>
                            <dd>
                              <Tooltip.Root>
                                <Tooltip.Trigger
                                  className={`cursor-help font-[ui-monospace,'SF_Mono',Menlo,monospace] text-[12.5px] tracking-[0.04em] ${FOCUS}`}
                                  render={<span tabIndex={0} />}
                                >
                                  {RESTAURANT.code}
                                </Tooltip.Trigger>
                                <Tooltip.Portal>
                                  <Tooltip.Positioner sideOffset={6}>
                                    <Tooltip.Popup className="rounded-lg bg-[#18181b] px-[9px] py-1.5 font-sans text-[12px] font-medium text-white transition-[opacity,scale] duration-150 data-ending-style:scale-[0.96] data-ending-style:opacity-0 data-starting-style:scale-[0.96] data-starting-style:opacity-0">
                                      Show this at the door
                                    </Tooltip.Popup>
                                  </Tooltip.Positioner>
                                </Tooltip.Portal>
                              </Tooltip.Root>
                            </dd>
                          </div>
                        </motion.dl>
                      </div>
                    </motion.div>
                  )}

                  {face === "guests" && (
                    <motion.div key="guests" className={FACE}>
                      <motion.header className={BAR} {...part(0.02)}>
                        <Button
                          className={BACK}
                          aria-label="Back to the booking"
                          onClick={() => setFace("booking")}
                        >
                          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} aria-hidden="true" />
                        </Button>
                        <b>How many of you?</b>
                      </motion.header>
                      <ToggleGroup
                        className="grid grid-cols-4 gap-2"
                        aria-label="Party size"
                        value={[String(guests)]}
                        onValueChange={(value) => {
                          if (!value[0]) return;
                          setGuests(Number(value[0]));
                          setFace("booking");
                        }}
                      >
                        {SIZES.map((size, index) => (
                          <Toggle
                            key={size}
                            value={String(size)}
                            className={`relative grid h-[52px] cursor-pointer place-items-center rounded-2xl border-0 bg-(--tbk-well) p-0 text-[16px] font-[650] text-(--tbk-ink) transition-colors duration-200 data-pressed:text-(--tbk-surface) ${FOCUS}`}
                            render={<motion.button {...box(0.05 + index * 0.025)} />}
                          >
                            {guests === size && (
                              <motion.span layoutId="tbk-size-pick" className="absolute inset-0 rounded-2xl bg-(--tbk-ink)" />
                            )}
                            <span className="relative">{size}</span>
                          </Toggle>
                        ))}
                      </ToggleGroup>
                      <motion.p className="mx-0.5 mt-0.5 mb-0 text-[12.5px] text-(--tbk-muted)" {...part(0.18)}>
                        Tables for 7 or more are held for 15 minutes.
                      </motion.p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </LayoutGroup>
            </div>
          </motion.section>
        </div>
      </Tooltip.Provider>
    </MotionConfig>
  );
}
