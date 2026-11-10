"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Cancel01Icon, Search01Icon, CheckIcon } from "@hugeicons/core-free-icons";
import { Popover } from "@base-ui/react/popover";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useId, useRef, type KeyboardEvent, type Ref } from "react";
import { useControllableState, type ChangeDetails } from "./use-controllable-state";
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
const PALETTE = ["#10b981", "#6366f1", "#14b8a6", "#e11d48", "#84cc16"];

export interface LabelPickerValue {
  labels: Label[];
  applied: string[];
  open: boolean;
  query: string;
  active: number;
}

const START: LabelPickerValue = {
  labels: LABELS,
  applied: ["Bug"],
  open: false,
  query: "",
  active: 0,
};
const WITH_DARK = [...LABELS, { name: "Dark mode", color: PALETTE[0]! }];

const SPRING = { type: "spring" as const, duration: 0.4, bounce: 0.15 };
const POP = { type: "spring" as const, duration: 0.4, bounce: 0.22 };

const titleCase = (text: string) => text.trim().replace(/^\w/, (first) => first.toUpperCase());

const ROW_EXIT = { opacity: 0, transition: { duration: 0.1 } };

function LabelChip({
  label,
  onRemove,
  ref,
}: {
  label: Label;
  onRemove: () => void;
  ref?: Ref<HTMLLIElement>;
}) {
  return (
    <motion.li
      ref={ref}
      layout="position"
      className="lp-chip"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.14 } }}
      transition={POP}
    >
      <i style={{ background: label.color }} aria-hidden="true" />
      {label.name}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label.name}`}>
        <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
      </button>
    </motion.li>
  );
}

function LabelOption({
  label,
  rowId,
  applied,
  highlighted,
  delay,
  onHighlight,
  onToggle,
  ref,
}: {
  label: Label;
  rowId: string;
  applied: boolean;
  highlighted: boolean;
  delay: number;
  onHighlight: () => void;
  onToggle: () => void;
  ref?: Ref<HTMLLIElement>;
}) {
  return (
    <motion.li
      ref={ref}
      id={rowId}
      role="option"
      aria-selected={applied}
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={ROW_EXIT}
      transition={{ ...SPRING, delay }}
      onPointerEnter={(event) => event.pointerType === "mouse" && !highlighted && onHighlight()}
      onClick={onToggle}
    >
      {highlighted && <motion.span layoutId="hl" className="lp-hl" transition={SPRING} />}
      <i style={{ background: label.color }} aria-hidden="true" />
      <span className="lp-name">{label.name}</span>

      <AnimatePresence initial={false}>
        {applied && (
          <motion.span
            className="lp-check"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={POP}
          >
            <HugeiconsIcon icon={CheckIcon} aria-hidden="true" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

function CreateOption({
  name,
  color,
  rowId,
  highlighted,
  delay,
  onHighlight,
  onCreate,
  ref,
}: {
  name: string;
  color: string;
  rowId: string;
  highlighted: boolean;
  delay: number;
  onHighlight: () => void;
  onCreate: () => void;
  ref?: Ref<HTMLLIElement>;
}) {
  return (
    <motion.li
      ref={ref}
      id={rowId}
      role="option"
      aria-selected={false}
      layout="position"
      className="lp-create"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={ROW_EXIT}
      transition={{ ...SPRING, delay }}
      onPointerEnter={(event) => event.pointerType === "mouse" && !highlighted && onHighlight()}
      onClick={onCreate}
    >
      {highlighted && <motion.span layoutId="hl" className="lp-hl" transition={SPRING} />}
      <motion.i
        style={{ background: color }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...POP, delay: 0.08 }}
        aria-hidden="true"
      />
      <span className="lp-name">
        Create <b>“{name}”</b>
      </span>
    </motion.li>
  );
}

export interface LabelPickerProps {
  /** The labels there are, the ones applied, whether the menu is open, what's typed, and the highlighted row. */
  value?: LabelPickerValue;
  defaultValue?: LabelPickerValue;
  onValueChange?: (value: LabelPickerValue, details: ChangeDetails) => void;
  /** Moves focus into the search when the menu opens, and back to the trigger when it closes. */
  focusOnOpen?: boolean;
  ref?: Ref<HTMLElement>;
}

/** A label picker: search, toggle labels on and off, or create a new one in the next colour. */
export function LabelPicker({
  value,
  defaultValue = START,
  onValueChange,
  focusOnOpen = true,
  ref,
}: LabelPickerProps) {
  const [picker, setPicker] = useControllableState({ value, defaultValue, onValueChange });
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const portal = usePortalContainer();

  const search = picker.query.trim().toLowerCase();
  const found = picker.labels.filter((label) => label.name.toLowerCase().includes(search));
  const exact = picker.labels.some((label) => label.name.toLowerCase() === search);
  const canCreate = search.length > 0 && !exact;
  const nextColor = PALETTE[(picker.labels.length - LABELS.length) % PALETTE.length]!;
  const rows = found.length + (canCreate ? 1 : 0);
  const active = Math.min(picker.active, Math.max(0, rows - 1));
  const rowId = (index: number) => `${id}-row-${index}`;
  const rowDelay = (index: number) => (picker.open ? index * 0.035 : 0);

  const chips = picker.applied
    .map((name) => picker.labels.find((label) => label.name === name))
    .filter((label): label is Label => !!label);

  const highlight = (index: number) => setPicker((current) => ({ ...current, active: index }));

  const toggle = (name: string) =>
    setPicker((current) => ({
      ...current,
      applied: current.applied.includes(name)
        ? current.applied.filter((applied) => applied !== name)
        : [...current.applied, name],
    }));

  const create = () =>
    setPicker((current) => {
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

  const onOpenChange = (open: boolean) =>
    setPicker((current) => ({ ...current, open, query: open ? current.query : "", active: 0 }));

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      highlight(rows ? (active + step + rows) % rows : 0);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (!rows) return;
      if (active < found.length) toggle(found[active]!.name);
      else create();
    }
  };

  return (
    <section ref={ref} className="lp lp-layer not-prose" aria-label="Issue">
      <span className="lp-key">ENG-218</span>
      <h4 className="lp-title">Checkout total rounds tax twice on mobile</h4>
      <p className="lp-desc">
        The tax line is rounded once per item and again on the subtotal, so totals drift by a cedi.
      </p>

      <div className="lp-labels">
        <span className="lp-caption">Labels</span>

        <ul className="lp-chips">
          <AnimatePresence initial={false} mode="popLayout">
            {chips.map((label) => (
              <LabelChip key={label.name} label={label} onRemove={() => toggle(label.name)} />
            ))}

            <motion.li key="add" layout="position" transition={SPRING}>
              <Popover.Root open={picker.open} onOpenChange={onOpenChange} modal={false}>
                <Popover.Trigger className="lp-add">
                  <HugeiconsIcon icon={Add01Icon} aria-hidden="true" />
                  Label
                </Popover.Trigger>

                <Popover.Portal container={portal}>
                  <Popover.Positioner className="lp-layer" side="bottom" align="start" sideOffset={8}>
                    <Popover.Popup
                      className="lp-picker"
                      initialFocus={focusOnOpen ? inputRef : false}
                      finalFocus={focusOnOpen}
                    >
                      <label className="lp-search">
                        <HugeiconsIcon icon={Search01Icon} aria-hidden="true" />
                        <input
                          ref={inputRef}
                          value={picker.query}
                          onChange={(event) =>
                            setPicker((current) => ({ ...current, query: event.target.value, active: 0 }))
                          }
                          onKeyDown={onKeyDown}
                          placeholder="Find or create a label"
                          aria-label="Find or create a label"
                          role="combobox"
                          aria-expanded="true"
                          aria-controls={`${id}-list`}
                          aria-activedescendant={rows ? rowId(active) : undefined}
                        />
                      </label>

                      <LayoutGroup id={id}>
                        <ul id={`${id}-list`} role="listbox" aria-label="Labels" className="lp-list">
                          <AnimatePresence initial={false} mode="popLayout">
                            {found.map((label, index) => (
                              <LabelOption
                                key={label.name}
                                label={label}
                                rowId={rowId(index)}
                                applied={picker.applied.includes(label.name)}
                                highlighted={index === active}
                                delay={rowDelay(index)}
                                onHighlight={() => highlight(index)}
                                onToggle={() => toggle(label.name)}
                              />
                            ))}

                            {canCreate && (
                              <CreateOption
                                key="create"
                                name={titleCase(picker.query)}
                                color={nextColor}
                                rowId={rowId(found.length)}
                                highlighted={active === found.length}
                                delay={rowDelay(found.length)}
                                onHighlight={() => highlight(found.length)}
                                onCreate={create}
                              />
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

// The docs demo: a short scripted scene that plays the element above. Your app doesn't need it.

const BEATS: readonly (LabelPickerValue & { ms: number })[] = [
  { ...START, ms: 1300 },
  { ...START, open: true, ms: 700 },
  ...typing("bi", (query) => ({ ...START, open: true, query }), { every: 140, hold: 650 }),
  { ...START, open: true, applied: ["Bug", "Billing"], ms: 900 },
  ...typing("dark mode", (query) => ({ ...START, open: true, applied: ["Bug", "Billing"], query }), {
    every: 80,
    hold: 900,
  }),
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

const fromBeat = (step: number): LabelPickerValue => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

interface LabelPickerDemoProps {
  playing?: boolean;
}

export function LabelPickerDemo({ playing }: LabelPickerDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  return (
    <LabelPicker
      ref={scene.ref}
      value={scene.state}
      onValueChange={scene.onValueChange}
      focusOnOpen={!scene.live}
    />
  );
}
