"use client";
import { Combobox } from "@base-ui/react/combobox";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { AnimatePresence, motion } from "motion/react";
import { useId, useRef, useState } from "react";
import { Odometer } from "./odometer";
import { usePortalContainer } from "./portal-container";
import { typing, useScene } from "./use-scene";
import "./form-kit.css";
import "./tag-input.css";

const HUES = ["rose", "amber", "lime", "teal", "sky", "violet"] as const;
type Hue = (typeof HUES)[number];

const SUGGESTIONS: { tag: string; hue: Hue }[] = [
  { tag: "dinner", hue: "amber" },
  { tag: "vegetarian", hue: "lime" },
  { tag: "quick", hue: "sky" },
  { tag: "spicy", hue: "rose" },
  { tag: "baking", hue: "violet" },
  { tag: "family", hue: "teal" },
  { tag: "weekend", hue: "amber" },
  { tag: "budget", hue: "teal" },
];
const KNOWN = new Map(SUGGESTIONS.map((suggestion) => [suggestion.tag, suggestion]));

const hueOf = (tag: string): Hue => {
  const known = KNOWN.get(tag);
  if (known) return known.hue;
  let sum = 0;
  for (const letter of tag) sum = (sum * 31 + letter.charCodeAt(0)) % 997;
  return HUES[sum % HUES.length]!;
};

const MAX = 6;
const FORM = { type: "spring" as const, duration: 0.4, bounce: 0.18 };
const FLY = { type: "spring" as const, duration: 0.45, bounce: 0.15 };

export interface TagInputProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  inputValue: string;
  onInputValueChange: (value: string) => void;
  label?: string;
  /** Holds the suggestions open or shut. Leave it out to let the field open and close them itself. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TagInput({
  value,
  onValueChange,
  inputValue,
  onInputValueChange,
  label = "Tags",
  open: held,
  onOpenChange,
}: TagInputProps) {
  const id = useId();
  const hint = useId();
  const portal = usePortalContainer();
  const box = useRef<HTMLDivElement>(null);
  const [opened, setOpen] = useState(false);
  const open = held ?? opened;
  const [highlighted, setHighlighted] = useState<string | undefined>();
  const seen = useRef<ReadonlySet<string>>(new Set(value));
  const flown = useRef(new Set<string>()).current;
  for (const tag of value) if (!seen.current.has(tag) && open && KNOWN.has(tag)) flown.add(tag);
  for (const tag of flown) if (!value.includes(tag)) flown.delete(tag);
  seen.current = new Set(value);
  const typed = inputValue.trim().toLowerCase();
  const full = value.length >= MAX;
  const items = [
    ...(typed && !KNOWN.has(typed) && !value.includes(typed) ? [typed] : []),
    ...SUGGESTIONS.map((suggestion) => suggestion.tag).filter((tag) => !value.includes(tag)),
  ];

  const type = (next: string) => {
    if (!next.includes(",")) return onInputValueChange(next);
    const parts = next.split(",");
    const rest = parts.pop() ?? "";
    const added = parts
      .map((part) => part.trim().toLowerCase())
      .filter((part) => part && !value.includes(part));
    if (added.length) onValueChange([...value, ...new Set(added)].slice(0, MAX));
    onInputValueChange(rest.trimStart());
  };

  return (
    <div className="fk tag" data-open={open || undefined}>
      <Combobox.Root
        items={items}
        multiple
        autoHighlight
        value={value}
        onValueChange={(next) => {
          onValueChange((next as string[]).slice(0, MAX));
        }}
        open={held}
        onOpenChange={(next) => {
          setOpen(next);
          onOpenChange?.(next);
        }}
        onItemHighlighted={(item) => setHighlighted((item as string | undefined) ?? undefined)}
        inputValue={inputValue}
        onInputValueChange={type}
      >
        <Combobox.InputGroup ref={box} className="tag-box">
          <fieldset className="tag-outline" aria-hidden="true">
            <legend>
              <span>{label}</span>
            </legend>
          </fieldset>
          <label htmlFor={id} className="tag-label">
            {label}
          </label>
          <Combobox.Chips className="tag-chips" aria-label={value.length ? label : undefined}>
            <AnimatePresence initial={false} mode="popLayout">
              {value.map((tag) => (
                <Combobox.Chip
                  key={tag}
                  className="tag-chip"
                  data-hue={hueOf(tag)}
                  data-flown={flown.has(tag) || undefined}
                  aria-label={tag}
                  aria-description="Press Backspace or Delete to remove"
                  render={
                    <motion.span
                      layout="position"
                      layoutId={KNOWN.has(tag) ? `${id}-${tag}` : undefined}
                      initial={flown.has(tag) ? false : { paddingLeft: 0, ["--tag-fill" as string]: 0 }}
                      animate={{ paddingLeft: 8, ["--tag-fill" as string]: 1 }}
                      exit={{ opacity: 0, scale: 0.8, filter: "blur(3px)", transition: { duration: 0.15 } }}
                      transition={{ ...FORM, layout: FLY }}
                    />
                  }
                >
                  <span className="tag-dot" aria-hidden="true" />
                  {tag}
                  <Combobox.ChipRemove aria-label={`Remove ${tag}`}>
                    <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2.4} />
                  </Combobox.ChipRemove>
                </Combobox.Chip>
              ))}
            </AnimatePresence>
            <Combobox.Input
              id={id}
              className="fk-input tag-input"
              placeholder={full ? "" : value.length ? "Add another…" : "Add a tag…"}
              readOnly={full}
              aria-describedby={hint}
            />
          </Combobox.Chips>
        </Combobox.InputGroup>

        <Combobox.Portal container={portal}>
          <Combobox.Positioner anchor={box} sideOffset={8} align="start">
            <Combobox.Popup className="tag-popup">
              <Combobox.Empty className="tag-empty">No tags match</Combobox.Empty>
              <Combobox.List className="tag-list">
                {(item: string) => {
                  const known = KNOWN.has(item);
                  return (
                    <Combobox.Item key={item} value={item} className="tag-row" data-hue={hueOf(item)}>
                      {highlighted === item && (
                        <motion.span
                          layoutId={`${id}-highlight`}
                          className="tag-row-highlight"
                          transition={FLY}
                        />
                      )}
                      {known ? (
                        <motion.span
                          className="tag-chip tag-word"
                          layout="position"
                          layoutId={`${id}-${item}`}
                          transition={FLY}
                        >
                          <span className="tag-dot" aria-hidden="true" />
                          {item}
                        </motion.span>
                      ) : (
                        <span className="tag-create">
                          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2.2} aria-hidden="true" />
                          Create “{item}”
                        </span>
                      )}
                    </Combobox.Item>
                  );
                }}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      <p className="tag-foot">
        <span id={hint}>Comma or Enter adds a tag</span>
        <span className="tag-counter" data-full={full || undefined} aria-hidden="true">
          <Odometer value={String(value.length)} />/{MAX}
        </span>
        <span className="fk-sr">
          {value.length} of {MAX} tags
        </span>
      </p>
    </div>
  );
}

interface State {
  tags: string[];
  draft: string;
  open: boolean;
}

const FULL = ["dinner", "vegetarian", "spicy", "family"];

const BEATS: readonly (State & { ms: number })[] = [
  { tags: FULL, draft: "", open: true, ms: 2400 },
  { tags: FULL, draft: "", open: false, ms: 800 },
  { tags: ["dinner"], draft: "", open: false, ms: 900 },
  ...typing("vegetarian", (draft) => ({ tags: ["dinner"], draft, open: false }), { every: 75 }),
  { tags: ["dinner", "vegetarian"], draft: "", open: false, ms: 700 },
  { tags: ["dinner", "vegetarian"], draft: "", open: true, ms: 1000 },
  { tags: ["dinner", "vegetarian", "spicy"], draft: "", open: true, ms: 900 },
  { tags: FULL, draft: "", open: true, ms: 300 },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

interface TagInputDemoProps {
  playing?: boolean;
  preview?: boolean;
}

export function TagInputDemo({ playing, preview = false }: TagInputDemoProps = {}) {
  const { ref, state, takeOver } = useScene(BEATS, fromBeat, preview ? false : playing);
  return (
    <div ref={ref} className="fk-stage tag-stage not-prose">
      <TagInput
        label="Recipe tags"
        value={state.tags}
        onValueChange={(tags) => takeOver((current) => ({ ...current, tags }))}
        inputValue={state.draft}
        onInputValueChange={(draft) => takeOver((current) => ({ ...current, draft }))}
        open={state.open}
        onOpenChange={(open) => takeOver((current) => ({ ...current, open }))}
      />
    </div>
  );
}
