"use client";
import { Combobox } from "@base-ui/react/combobox";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { AnimatePresence, motion } from "motion/react";
import { useId, useRef, useState, type CSSProperties } from "react";
import { Odometer } from "./odometer";
import { usePortalContainer } from "./portal-container";
import { FK_STAGE, FORM_KIT } from "./form-kit";
import { typing, useScene } from "./use-scene";

export interface TagInputProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  inputValue: string;
  onInputValueChange: (value: string) => void;
  label?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const HUE_COLOR = {
  rose: "#e5484d",
  amber: "#e08a00",
  lime: "#3e9b2f",
  teal: "#12a594",
  sky: "#0b8ad9",
  violet: "#7c5cdb",
} as const;
type Hue = keyof typeof HUE_COLOR;
const HUES = Object.keys(HUE_COLOR) as Hue[];

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

const hueStyle = (tag: string) => ({ "--tag-hue": HUE_COLOR[hueOf(tag)] }) as CSSProperties;

const MAX = 6;
const FORM = { type: "spring" as const, duration: 0.4, bounce: 0.18 };
const FLY = { type: "spring" as const, duration: 0.45, bounce: 0.15 };

const CHIP = [
  "group/chip inline-flex h-[30px] flex-none items-center gap-1.5 rounded-[9px] pr-[3px] pl-2 text-[13.5px] font-semibold whitespace-nowrap outline-none transition-colors duration-150",
  "[--chip-tint:color-mix(in_oklab,var(--tag-hue)_13%,var(--fk-surface))] dark:[--chip-tint:color-mix(in_oklab,var(--tag-hue)_32%,var(--fk-surface))]",
  "[--chip-ink:color-mix(in_oklab,var(--tag-hue)_62%,var(--fk-ink))] dark:[--chip-ink:color-mix(in_oklab,var(--tag-hue)_45%,white)]",
  "bg-[color-mix(in_oklab,var(--chip-tint)_calc(var(--tag-fill,1)*100%),transparent)] text-(--chip-ink)",
  "focus-within:bg-(--tag-hue) focus-within:text-white data-highlighted:bg-(--tag-hue) data-highlighted:text-white",
].join(" ");
const DOT =
  "h-[7px] w-[calc(var(--tag-fill,1)*7px)] flex-none rounded-full bg-(--tag-hue) [scale:var(--tag-fill,1)] group-focus-within/chip:bg-white group-data-highlighted/chip:bg-white";
const REMOVE =
  "grid h-[22px] w-[22px] max-w-[calc(var(--tag-fill,1)*22px)] cursor-pointer place-items-center overflow-hidden rounded-md border-0 bg-transparent p-0 text-inherit opacity-[calc(var(--tag-fill,1)*0.6)] transition-[opacity,background-color] duration-150 hover:bg-[color-mix(in_oklab,var(--tag-hue)_16%,transparent)] hover:opacity-100 group-data-flown/chip:animate-grow-in [&_svg]:size-3";
const POPUP = [
  "[--fk-surface:#ffffff] [--fk-well:#f5f5f1] [--fk-ink:#1f1f1d] [--fk-muted:#817f77]",
  "dark:[--fk-surface:#1c1c1f] dark:[--fk-well:#2a2a2f] dark:[--fk-ink:#fafafa] dark:[--fk-muted:#a1a1aa]",
  "flex max-h-[min(296px,var(--available-height,70dvh))] w-(--anchor-width) flex-col overflow-hidden rounded-[18px] border border-solid border-black/6 bg-(--fk-surface) font-sans text-[14px] text-(--fk-ink) antialiased outline-none",
  "shadow-[0_1px_2px_rgb(0_0_0/0.05),0_12px_28px_-20px_rgb(0_0_0/0.16)] dark:border-white/7 dark:shadow-[0_1px_2px_rgb(0_0_0/0.28),0_12px_28px_-20px_rgb(0_0_0/0.48)]",
  "[clip-path:inset(-60px_-60px_-60px_-60px_round_18px)] [transition:clip-path_0.42s_cubic-bezier(0.32,0.72,0,1),transform_0.42s_cubic-bezier(0.32,0.72,0,1),opacity_0.2s_ease-out]",
  "data-starting-style:[clip-path:inset(-60px_-60px_100%_-60px_round_18px)] data-starting-style:[transform:translateY(-6px)] data-starting-style:opacity-40",
  "data-ending-style:[clip-path:inset(-60px_-60px_100%_-60px_round_18px)] data-ending-style:[transform:translateY(-6px)] data-ending-style:opacity-0",
  "data-ending-style:[transition:clip-path_0.2s_cubic-bezier(0.4,0,1,1),transform_0.2s_cubic-bezier(0.4,0,1,1),opacity_0.2s_ease-in]",
  "motion-reduce:transition-none",
].join(" ");

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
    <div data-open={open || undefined} className={`group grid w-[min(100%,380px)] gap-2 ${FORM_KIT}`}>
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
        <Combobox.InputGroup
          ref={box}
          className="group/box relative flex min-h-14 cursor-text rounded-[14px] bg-(--fk-surface) px-2.5 pt-[11px] pb-2.5"
        >
          <fieldset
            className="pointer-events-none absolute inset-x-0 -top-1.5 bottom-0 m-0 min-w-0 rounded-[inherit] border-[1.8px] border-solid border-(--fk-line) py-0 pr-0 pl-2.5 transition-[border-color] duration-[180ms] group-focus-within/box:border-(--fk-ink)"
            aria-hidden="true"
          >
            <legend className="invisible block h-[11px] w-auto p-0 text-[12px] leading-[11px] font-[550] whitespace-nowrap">
              <span className="inline-block px-[5px]">{label}</span>
            </legend>
          </fieldset>
          <label
            htmlFor={id}
            className="absolute top-0 left-[15px] -translate-y-1/2 text-[12px] leading-none font-[550] text-(--fk-muted) transition-colors duration-[180ms] group-focus-within/box:text-(--fk-ink)"
          >
            {label}
          </label>
          <Combobox.Chips className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5" aria-label={value.length ? label : undefined}>
            <AnimatePresence initial={false} mode="popLayout">
              {value.map((tag) => (
                <Combobox.Chip
                  key={tag}
                  className={CHIP}
                  style={hueStyle(tag)}
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
                  <span className={DOT} aria-hidden="true" />
                  {tag}
                  <Combobox.ChipRemove className={REMOVE} aria-label={`Remove ${tag}`}>
                    <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2.4} />
                  </Combobox.ChipRemove>
                </Combobox.Chip>
              ))}
            </AnimatePresence>
            <Combobox.Input
              id={id}
              className="h-[30px] min-w-0 flex-[1_0_96px] border-0 bg-transparent p-0 pl-1 text-[14px] text-(--fk-ink) outline-none placeholder:text-(--fk-faint) read-only:basis-0"
              placeholder={full ? "" : value.length ? "Add another…" : "Add a tag…"}
              readOnly={full}
              aria-describedby={hint}
            />
          </Combobox.Chips>
        </Combobox.InputGroup>

        <Combobox.Portal container={portal}>
          <Combobox.Positioner
            anchor={box}
            side="bottom"
            sideOffset={8}
            align="start"
            collisionAvoidance={{ side: "none", fallbackAxisSide: "none" }}
          >
            <Combobox.Popup className={POPUP}>
              <Combobox.Empty className="text-[14px] text-(--fk-muted) not-empty:px-4 not-empty:py-3.5">No tags match</Combobox.Empty>
              <Combobox.List className="min-h-0 overflow-y-auto overscroll-contain p-[5px] [mask-image:linear-gradient(to_bottom,transparent,#000_6px,#000_calc(100%-10px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {(item: string) => {
                  const known = KNOWN.has(item);
                  return (
                    <Combobox.Item
                      key={item}
                      value={item}
                      className="relative flex h-[42px] cursor-pointer items-center rounded-xl px-1.5 outline-none select-none"
                      style={hueStyle(item)}
                    >
                      {highlighted === item && (
                        <motion.span
                          layoutId={`${id}-highlight`}
                          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-(--fk-well)"
                          transition={FLY}
                        />
                      )}
                      {known ? (
                        <motion.span
                          className="relative inline-flex h-[30px] flex-none items-center gap-2.5 rounded-[9px] pr-[3px] pl-2 text-[15px] font-medium tracking-[-0.01em] whitespace-nowrap text-(--fk-ink)"
                          layout="position"
                          layoutId={`${id}-${item}`}
                          transition={FLY}
                        >
                          <span className={DOT} aria-hidden="true" />
                          {item}
                        </motion.span>
                      ) : (
                        <span className="relative flex items-center gap-2.5 px-2 text-[15px] font-medium tracking-[-0.01em] text-(--fk-muted)">
                          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2.2} aria-hidden="true" className="size-3.5" />
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
      <p className="m-0 flex justify-between px-1 text-[12px] text-(--fk-muted) transition-opacity duration-150 group-data-open:opacity-0">
        <span id={hint}>Comma or Enter adds a tag</span>
        <span
          data-full={full || undefined}
          className="inline-flex items-baseline tabular-nums transition-colors duration-200 data-full:font-semibold data-full:text-(--fk-warn)"
          aria-hidden="true"
        >
          <Odometer value={String(value.length)} />/{MAX}
        </span>
        <span className="sr-only">
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

export function TagInputDemo({ playing, preview = false }: { playing?: boolean; preview?: boolean } = {}) {
  const { ref, state, takeOver } = useScene(BEATS, fromBeat, preview ? false : playing);
  return (
    <div ref={ref} className={`${FK_STAGE} pb-[250px]`}>
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
