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
import "./table-booking.css";

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

function Surface({ option, radius }: { option: Option; radius: number }) {
  return (
    <motion.span
      layoutId={`tbk-surface-${option.id}`}
      className="tbk-surface"
      layoutCrossfade={false}
      exit={{ opacity: 0, transition: { duration: 0 } }}
      style={{ borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

function TimeChip({ option }: { option: Option }) {
  return (
    <motion.span layoutId={`tbk-time-${option.id}`} className="tbk-time">
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
        <div className="tbk-stage not-prose">
          <motion.section
            ref={card}
            className="tbk"
            aria-label={`Your booking at ${RESTAURANT.name}`}
            initial={false}
            animate={{ height: height === null ? "auto" : height + CARD_PADDING * 2 }}
          >
            <div ref={content} className="tbk-content">
              <LayoutGroup>
                <AnimatePresence mode="popLayout" initial={false}>
                  {face === "notice" && (
                    <motion.div key="notice" className="tbk-face">
                      <motion.header className="tbk-head" {...part(0.02)}>
                        <span className="tbk-logo" aria-hidden="true">
                          <HugeiconsIcon icon={Restaurant01Icon} strokeWidth={1.8} />
                        </span>
                        <span className="tbk-head-copy">
                          <b>{RESTAURANT.name}</b>
                          <span>
                            {RESTAURANT.date} · {guestsLabel(guests)}
                          </span>
                        </span>
                      </motion.header>
                      <motion.div className="tbk-alert" role="status" {...box(0.05)}>
                        <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} aria-hidden="true" />
                        <span className="tbk-alert-copy">
                          <b>Your 7:30 table is no longer free</b>
                          <span>
                            The kitchen closes early for a private event. Pick one of these instead.
                          </span>
                        </span>
                      </motion.div>
                      <div className="tbk-options">
                        {OPTIONS.map((option, index) => {
                          const landing = option.id === picked.id;
                          return (
                            <Button
                              key={option.id}
                              className="tbk-option"
                              onClick={() => choose(option)}
                              render={<motion.button {...(landing ? STAY : box(0.08 + index * 0.04))} />}
                            >
                              <Surface option={option} radius={16} />
                              <TimeChip option={option} />
                              <motion.span className="tbk-option-copy" {...(landing ? part(0.1) : {})}>
                                <b>{option.title}</b>
                                <span>{option.table}</span>
                              </motion.span>
                              <motion.span className="tbk-chevron-slot" {...(landing ? part(0.14) : {})}>
                                <HugeiconsIcon
                                  icon={ArrowRight01Icon}
                                  className="tbk-chevron"
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
                    <motion.div key="booking" className="tbk-face">
                      <motion.header className="tbk-bar" {...part(0.02)}>
                        <Button
                          className="tbk-back"
                          aria-label="Back to the options"
                          onClick={() => setFace("notice")}
                        >
                          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} aria-hidden="true" />
                        </Button>
                        <b>Booking changed</b>
                      </motion.header>
                      <div className="tbk-ticket">
                        <Surface option={picked} radius={18} />
                        <div className="tbk-ticket-top">
                          <TimeChip option={picked} />
                          <motion.span className="tbk-ticket-place" {...part(0.08)}>
                            <b>{RESTAURANT.name}</b>
                            <span>{RESTAURANT.date}</span>
                          </motion.span>
                        </div>
                        <motion.dl className="tbk-lines" {...part(0.12)}>
                          <div>
                            <dt>Table</dt>
                            <dd>{picked.table}</dd>
                          </div>
                          <div>
                            <dt>Party</dt>
                            <dd>
                              <Button className="tbk-change" onClick={() => setFace("guests")}>
                                <Remold.Text>{guestsLabel(guests)}</Remold.Text>
                                <span className="tbk-change-hint">Change</span>
                              </Button>
                            </dd>
                          </div>
                          <div>
                            <dt>Confirmation</dt>
                            <dd>
                              <Tooltip.Root>
                                <Tooltip.Trigger className="tbk-code" render={<span tabIndex={0} />}>
                                  {RESTAURANT.code}
                                </Tooltip.Trigger>
                                <Tooltip.Portal>
                                  <Tooltip.Positioner sideOffset={6}>
                                    <Tooltip.Popup className="tbk-tooltip">
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
                    <motion.div key="guests" className="tbk-face">
                      <motion.header className="tbk-bar" {...part(0.02)}>
                        <Button
                          className="tbk-back"
                          aria-label="Back to the booking"
                          onClick={() => setFace("booking")}
                        >
                          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} aria-hidden="true" />
                        </Button>
                        <b>How many of you?</b>
                      </motion.header>
                      <ToggleGroup
                        className="tbk-sizes"
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
                            className="tbk-size"
                            render={<motion.button {...box(0.05 + index * 0.025)} />}
                          >
                            {guests === size && (
                              <motion.span layoutId="tbk-size-pick" className="tbk-size-pick" />
                            )}
                            <span>{size}</span>
                          </Toggle>
                        ))}
                      </ToggleGroup>
                      <motion.p className="tbk-note" {...part(0.18)}>
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
