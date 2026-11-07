"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Cancel01Icon,
  Search01Icon,
  CheckIcon,
} from "@hugeicons/core-free-icons";
import { Popover } from "@base-ui/react/popover";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { typing, useScene } from "./use-scene";
import "./label-picker.css";
import { usePortalContainer } from "./portal-container";

interface Label {
  name: string;
  color: string;
}

const LABELS: Label[] = [
  { name: "Bug", color: "#ef4444" },
  { name: "Billing", color: "#f59e0b" },
  { name: "Frontend", color: "#0ea5e9" },
  { name: "Backend", color: "#8b5cf6" },
  { name: "Design", color: "#ec4899" },
  { name: "Performance", color: "#f97316" },
];
/** New labels take the next of these colours. */
const PALETTE = ["#10b981", "#6366f1", "#14b8a6", "#e11d48", "#84cc16"];

interface State {
  labels: Label[];
  applied: string[];
  open: boolean;
  query: string;
  active: number;
}

const START: State = {
  labels: LABELS,
  applied: ["Bug"],
  open: false,
  query: "",
  active: 0,
};
const WITH_DARK = [...LABELS, { name: "Dark mode", color: PALETTE[0]! }];

const BEATS: readonly (State & { ms: number })[] = [
  { ...START, ms: 1300 },
  { ...START, open: true, ms: 700 },
  ...typing("bi", (query) => ({ ...START, open: true, query }), { every: 140, hold: 650 }),
  { ...START, open: true, applied: ["Bug", "Billing"], ms: 900 },
  ...typing("dark mode", (query) => ({ ...START, open: true, applied: ["Bug", "Billing"], query }), { every: 80, hold: 900 }),
  {
    ...START,
    labels: WITH_DARK,
    open: true,
    applied: ["Bug", "Billing", "Dark mode"],
    ms: 900,
  },
  {
    ...START,
    labels: WITH_DARK,
    applied: ["Bug", "Billing", "Dark mode"],
    ms: 2400,
  },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

const SPRING = { type: "spring" as const, duration: 0.4, bounce: 0.15 };
const POP = { type: "spring" as const, duration: 0.4, bounce: 0.22 };

const titleCase = (s: string) =>
  s.trim().replace(/^\w/, (c) => c.toUpperCase());

interface LabelPickerDemoProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function LabelPickerDemo({ playing }: LabelPickerDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const portal = usePortalContainer();

  const q = state.query.trim().toLowerCase();
  const found = state.labels.filter((l) => l.name.toLowerCase().includes(q));
  const exact = state.labels.some((l) => l.name.toLowerCase() === q);
  const canCreate = q.length > 0 && !exact;
  const nextColor =
    PALETTE[(state.labels.length - LABELS.length) % PALETTE.length]!;
  // Rows in the list: the matches, then "Create" when nothing matches exactly.
  const rows = found.length + (canCreate ? 1 : 0);
  const active = Math.min(state.active, Math.max(0, rows - 1));

  const toggle = (name: string) =>
    take((current) => ({
      ...current,
      applied: current.applied.includes(name)
        ? current.applied.filter((a) => a !== name)
        : [...current.applied, name],
    }));

  const create = () =>
    take((current) => {
      const name = titleCase(current.query);
      if (!name) return current;
      return {
        ...current,
        labels: [...current.labels, { name, color: nextColor }],
        applied: [...current.applied, name],
        query: "",
        active: 0,
      };
    });

  const choose = (index: number) =>
    index < found.length ? toggle(found[index]!.name) : create();

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      take((current) => ({
        ...current,
        active: rows ? (active + step + rows) % rows : 0,
      }));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (rows) choose(active);
    }
  };

  const chips = state.applied
    .map((name) => state.labels.find((l) => l.name === name))
    .filter((l): l is Label => !!l);

  return (
    <section
      ref={scene.ref}
      className="lp lp-layer not-prose"
      aria-label="Issue"
    >
      <span className="lp-key">ENG-218</span>
      <h4 className="lp-title">Checkout total rounds tax twice on mobile</h4>
      <p className="lp-desc">
        The tax line is rounded once per item and again on the subtotal, so
        totals drift by a cedi.
      </p>

      <div className="lp-labels">
        <span className="lp-caption">Labels</span>
        <ul className="lp-chips">
          <AnimatePresence initial={false} mode="popLayout">
            {chips.map((label) => (
              <motion.li
                key={label.name}
                layout="position"
                className="lp-chip"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{
                  opacity: 0,
                  scale: 0.6,
                  transition: { duration: 0.14 },
                }}
                transition={POP}
              >
                <i style={{ background: label.color }} aria-hidden="true" />
                {label.name}
                <button
                  type="button"
                  onClick={() => toggle(label.name)}
                  aria-label={`Remove ${label.name}`}
                >
                  <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
                </button>
              </motion.li>
            ))}
            <motion.li key="add" layout="position" transition={SPRING}>
              <Popover.Root
                open={state.open}
                onOpenChange={(open) =>
                  take((current) => ({
                    ...current,
                    open,
                    query: open ? current.query : "",
                    active: 0,
                  }))
                }
                modal={false}
              >
                <Popover.Trigger className="lp-add">
                  <HugeiconsIcon icon={Add01Icon} aria-hidden="true" />
                  Label
                </Popover.Trigger>
                <Popover.Portal container={portal}>
                  <Popover.Positioner
                    className="lp-layer"
                    side="bottom"
                    align="start"
                    sideOffset={8}
                  >
                    <Popover.Popup
                      className="lp-picker"
                      initialFocus={scene.live ? false : input}
                      finalFocus={!scene.live}
                    >
                      <label className="lp-search">
                        <HugeiconsIcon icon={Search01Icon} aria-hidden="true" />
                        <input
                          ref={input}
                          value={state.query}
                          onChange={(event) =>
                            take((current) => ({
                              ...current,
                              query: event.target.value,
                              active: 0,
                            }))
                          }
                          onKeyDown={onKeyDown}
                          placeholder="Find or create a label"
                          aria-label="Find or create a label"
                          role="combobox"
                          aria-expanded="true"
                          aria-controls={`${id}-list`}
                          aria-activedescendant={
                            rows ? `${id}-row-${active}` : undefined
                          }
                        />
                      </label>
                      <LayoutGroup id={id}>
                        <ul
                          id={`${id}-list`}
                          role="listbox"
                          aria-label="Labels"
                          className="lp-list"
                        >
                          <AnimatePresence initial={false} mode="popLayout">
                            {found.map((label, index) => {
                              const on = state.applied.includes(label.name);
                              return (
                                <motion.li
                                  key={label.name}
                                  id={`${id}-row-${index}`}
                                  role="option"
                                  aria-selected={on}
                                  layout="position"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{
                                    opacity: 0,
                                    transition: { duration: 0.1 },
                                  }}
                                  transition={{
                                    ...SPRING,
                                    delay: state.open ? index * 0.035 : 0,
                                  }}
                                  onPointerEnter={(event) => event.pointerType === "mouse" &&
                                    index !== active &&
                                    take((current) => ({
                                      ...current,
                                      active: index,
                                    }))
                                  }
                                  onClick={() => toggle(label.name)}
                                >
                                  {index === active && (
                                    <motion.span
                                      layoutId="hl"
                                      className="lp-hl"
                                      transition={SPRING}
                                    />
                                  )}
                                  <i
                                    style={{ background: label.color }}
                                    aria-hidden="true"
                                  />
                                  <span className="lp-name">{label.name}</span>
                                  <AnimatePresence initial={false}>
                                    {on && (
                                      <motion.span
                                        className="lp-check"
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        transition={POP}
                                      >
                                        <HugeiconsIcon
                                          icon={CheckIcon}
                                          aria-hidden="true"
                                        />
                                      </motion.span>
                                    )}
                                  </AnimatePresence>
                                </motion.li>
                              );
                            })}
                            {canCreate && (
                              <motion.li
                                key="create"
                                id={`${id}-row-${found.length}`}
                                role="option"
                                aria-selected={false}
                                layout="position"
                                className="lp-create"
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{
                                  opacity: 0,
                                  transition: { duration: 0.1 },
                                }}
                                transition={{
                                  ...SPRING,
                                  delay: state.open ? found.length * 0.035 : 0,
                                }}
                                onPointerEnter={(event) => event.pointerType === "mouse" &&
                                  active !== found.length &&
                                  take((current) => ({
                                    ...current,
                                    active: found.length,
                                  }))
                                }
                                onClick={create}
                              >
                                {active === found.length && (
                                  <motion.span
                                    layoutId="hl"
                                    className="lp-hl"
                                    transition={SPRING}
                                  />
                                )}
                                <motion.i
                                  style={{ background: nextColor }}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ ...POP, delay: 0.08 }}
                                  aria-hidden="true"
                                />
                                <span className="lp-name">
                                  Create <b>“{titleCase(state.query)}”</b>
                                </span>
                              </motion.li>
                            )}
                          </AnimatePresence>
                        </ul>
                      </LayoutGroup>
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </Popover.Root>
            </motion.li>
          </AnimatePresence>
        </ul>
      </div>
    </section>
  );
}
