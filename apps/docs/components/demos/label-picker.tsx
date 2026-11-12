"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Cancel01Icon, Search01Icon, CheckIcon } from "@hugeicons/core-free-icons";
import { Popover } from "@base-ui/react/popover";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useId, useRef, type KeyboardEvent, type Ref } from "react";
import { useControllableState, type ChangeDetails } from "./use-controllable-state";
import { typing, useScene } from "./use-scene";
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

const TOKENS = [
  "[--lp-surface:#ffffff] [--lp-raised:#ffffff] [--lp-field:#f4f4f5] [--lp-line:rgb(24_24_27/0.08)] [--lp-ink:#18181b] [--lp-muted:#71717a] [--lp-quiet:#a1a1aa] [--lp-accent:#4f46e5]",
  "[--lp-shadow:0_18px_40px_-12px_rgb(0_0_0/0.22),0_0_0_1px_rgb(24_24_27/0.06)]",
  "dark:[--lp-surface:#1f1f23] dark:[--lp-raised:#2a2a2f] dark:[--lp-field:#2e2e33] dark:[--lp-line:rgb(255_255_255/0.08)] dark:[--lp-ink:#fafafa] dark:[--lp-muted:#a1a1aa] dark:[--lp-quiet:#71717a] dark:[--lp-accent:#818cf8]",
  "dark:[--lp-shadow:0_18px_40px_-12px_rgb(0_0_0/0.6),0_0_0_1px_rgb(255_255_255/0.08)]",
  "font-sans",
].join(" ");

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--lp-accent)";
const DOT = "size-2 flex-none rounded-full";
const ROW = "relative flex h-8 cursor-pointer items-center gap-[9px] rounded-lg px-[9px] text-[13px] [&>*:not([data-hl])]:relative";
const NAME = "min-w-0 flex-1 truncate";

function Highlight() {
  return (
    <motion.span
      layoutId="hl"
      data-hl=""
      className="absolute inset-0 rounded-[inherit] bg-(--lp-field)"
      transition={SPRING}
    />
  );
}

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
      className="inline-flex h-7 items-center gap-1.5 rounded-full bg-(--lp-field) pr-1 pl-2.5 text-[12.5px] font-medium"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.14 } }}
      transition={POP}
    >
      <i className={DOT} style={{ background: label.color }} aria-hidden="true" />
      {label.name}
      <button
        type="button"
        className={`grid size-5 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-(--lp-quiet) hover:bg-(--lp-surface) hover:text-(--lp-ink) ${FOCUS}`}
        onClick={onRemove}
        aria-label={`Remove ${label.name}`}
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-3" aria-hidden="true" />
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
      className={ROW}
      onPointerEnter={(event) => event.pointerType === "mouse" && !highlighted && onHighlight()}
      onClick={onToggle}
    >
      {highlighted && <Highlight />}
      <i className={DOT} style={{ background: label.color }} aria-hidden="true" />
      <span className={NAME}>{label.name}</span>

      <AnimatePresence initial={false}>
        {applied && (
          <motion.span
            className="grid text-(--lp-accent)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={POP}
          >
            <HugeiconsIcon icon={CheckIcon} className="size-[15px]" aria-hidden="true" />
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
      className={ROW}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={ROW_EXIT}
      transition={{ ...SPRING, delay }}
      onPointerEnter={(event) => event.pointerType === "mouse" && !highlighted && onHighlight()}
      onClick={onCreate}
    >
      {highlighted && <Highlight />}
      <motion.i
        className={DOT}
        style={{ background: color }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...POP, delay: 0.08 }}
        aria-hidden="true"
      />
      <span className={`${NAME} text-(--lp-muted)`}>
        Create <b className="font-semibold text-(--lp-ink)">“{name}”</b>
      </span>
    </motion.li>
  );
}

export interface LabelPickerProps {
  value?: LabelPickerValue;
  defaultValue?: LabelPickerValue;
  onValueChange?: (value: LabelPickerValue, details: ChangeDetails) => void;
  focusOnOpen?: boolean;
  ref?: Ref<HTMLElement>;
}

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
    <section
      ref={ref}
      className={`not-prose grid w-[min(100%,400px)] rounded-[22px] bg-(--lp-surface) p-[18px] text-(--lp-ink) ${TOKENS}`}
      aria-label="Issue"
    >
      <span className="text-[12px] font-medium text-(--lp-muted)">ENG-218</span>
      <h4 className="m-0 mt-1.5 text-[16px] leading-[1.35] font-[650] tracking-[-0.01em]">
        Checkout total rounds tax twice on mobile
      </h4>
      <p className="m-0 mt-1.5 text-[13px] leading-normal text-(--lp-muted)">
        The tax line is rounded once per item and again on the subtotal, so totals drift by a cedi.
      </p>

      <div className="mt-4 grid gap-2 border-t border-solid border-(--lp-line) pt-3.5">
        <span className="text-[11.5px] font-semibold text-(--lp-quiet)">Labels</span>

        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          <AnimatePresence initial={false} mode="popLayout">
            {chips.map((label) => (
              <LabelChip key={label.name} label={label} onRemove={() => toggle(label.name)} />
            ))}

            <motion.li key="add" layout="position" transition={SPRING}>
              <Popover.Root open={picker.open} onOpenChange={onOpenChange} modal={false}>
                <Popover.Trigger
                  className={`inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border border-dashed border-[color-mix(in_oklab,var(--lp-ink)_22%,transparent)] bg-transparent pr-[11px] pl-2 text-[12.5px] font-medium text-(--lp-muted) hover:border-solid hover:text-(--lp-ink) data-popup-open:border-solid data-popup-open:text-(--lp-ink) ${FOCUS}`}
                >
                  <HugeiconsIcon icon={Add01Icon} className="size-3.5" aria-hidden="true" />
                  Label
                </Popover.Trigger>

                <Popover.Portal container={portal}>
                  <Popover.Positioner className={TOKENS} side="bottom" align="start" sideOffset={8}>
                    <Popover.Popup
                      className="w-[236px] origin-(--transform-origin) rounded-[14px] bg-(--lp-raised) p-[5px] text-(--lp-ink) shadow-(--lp-shadow) outline-none [transition:opacity_0.16s,transform_0.24s_cubic-bezier(0.2,0.9,0.3,1.2)] data-ending-style:opacity-0 data-ending-style:[transform:scale(0.94)_translateY(-4px)] data-starting-style:opacity-0 data-starting-style:[transform:scale(0.94)_translateY(-4px)]"
                      initialFocus={focusOnOpen ? inputRef : false}
                      finalFocus={focusOnOpen}
                    >
                      <label className="mb-1 flex h-[34px] items-center gap-[7px] border-b border-solid border-(--lp-line) px-[9px] text-(--lp-quiet)">
                        <HugeiconsIcon icon={Search01Icon} className="size-3.5 flex-none" aria-hidden="true" />
                        <input
                          className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-(--lp-ink) outline-none placeholder:text-(--lp-quiet)"
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
                        <ul id={`${id}-list`} role="listbox" aria-label="Labels" className="m-0 grid max-h-[230px] list-none overflow-auto p-0">
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
