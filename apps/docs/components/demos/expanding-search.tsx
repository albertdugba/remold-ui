"use client";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowUpLeft01Icon,
  Cancel01Icon,
  Clock01Icon,
  Location01Icon,
  Search01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useRef, useState } from "react";
import { typing, useScene } from "./use-scene";

interface Product {
  name: string;
  size: string;
  price: string;
  emoji: string;
  tint: string;
}

const PRODUCTS: Product[] = [
  { name: "Oat milk", size: "1 L", price: "£1.85", emoji: "🥛", tint: "#eef2ff" },
  { name: "Avocados", size: "Pack of 2", price: "£2.20", emoji: "🥑", tint: "#ecfccb" },
  { name: "Sourdough loaf", size: "800 g", price: "£3.10", emoji: "🍞", tint: "#fef3c7" },
  { name: "Free-range eggs", size: "Box of 6", price: "£2.45", emoji: "🥚", tint: "#fff7ed" },
  { name: "Plantain", size: "Each", price: "£0.90", emoji: "🍌", tint: "#fefce8" },
  { name: "Oranges", size: "Pack of 5", price: "£1.75", emoji: "🍊", tint: "#ffedd5" },
  { name: "Rolled oats", size: "1 kg", price: "£1.40", emoji: "🌾", tint: "#fef9c3" },
  { name: "Ground coffee", size: "227 g", price: "£4.50", emoji: "☕", tint: "#f5f5f4" },
];

const RECENT = ["Plantain", "Free-range eggs", "Coffee"];

const AISLES = [
  { name: "Fruit", emoji: "🍓", tint: "#ffe4e6" },
  { name: "Bakery", emoji: "🥐", tint: "#fef3c7" },
  { name: "Dairy", emoji: "🧀", tint: "#fef9c3" },
  { name: "Drinks", emoji: "🧃", tint: "#dcfce7" },
];

const PICKS = [PRODUCTS[1]!, PRODUCTS[2]!];

const SETTLE = { type: "spring" as const, duration: 0.38, bounce: 0 };

const PALETTE = [
  "[--xs-surface:#ffffff] [--xs-ink:#0a0a0b] [--xs-soft:#3f3f46] [--xs-muted:#71717a] [--xs-well:#f4f4f5] [--xs-line:rgb(10_10_11/0.07)] [--xs-edge:rgb(0_0_0/0.06)]",
  "dark:[--xs-surface:#18181b] dark:[--xs-ink:#fafafa] dark:[--xs-soft:#d4d4d8] dark:[--xs-muted:#a1a1aa] dark:[--xs-well:#27272a] dark:[--xs-line:rgb(255_255_255/0.08)] dark:[--xs-edge:rgb(255_255_255/0.07)]",
].join(" ");

const LABEL = "mb-2.5 block text-[12.5px] font-semibold text-(--xs-muted)";
const RECENT_ICON = "size-[17px] flex-none text-(--xs-muted)";

function Match({ text, query }: { text: string; query: string }) {
  const typed = query.trim();
  const at = typed ? text.toLowerCase().indexOf(typed.toLowerCase()) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + typed.length)}</mark>
      {text.slice(at + typed.length)}
    </>
  );
}

export interface ExpandingSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (query: string) => void;
}

function Greeting({ hidden }: { hidden: boolean }) {
  return (
    <div
      className="grid grid-rows-[1fr] [transition:grid-template-rows_0.5s_cubic-bezier(0.32,0.72,0,1),opacity_0.25s_ease,filter_0.25s_ease] group-data-open:grid-rows-[0fr] group-data-open:opacity-0 group-data-open:blur-[4px] motion-reduce:duration-10"
      aria-hidden={hidden || undefined}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="mb-[18px] flex items-center justify-between">
          <span className="inline-flex h-[30px] items-center gap-[5px] rounded-full bg-(--xs-well) pr-[11px] pl-[9px] text-[12.5px] font-semibold [&_svg]:size-3.5">
            <HugeiconsIcon icon={Location01Icon} strokeWidth={2} />
            Osu, Accra
          </span>
          <img
            src="https://api.dicebear.com/9.x/notionists/svg?seed=Ama%20Mensah&backgroundColor=fde68a"
            alt=""
            width={32}
            height={32}
            className="rounded-full"
            draggable={false}
          />
        </div>
        <h3 className="m-0 mb-4 grid gap-0.5 text-[24px] leading-[1.15] font-[650] tracking-[-0.03em] [&_span]:font-medium [&_span]:text-(--xs-muted)">
          Good evening, Ama.
          <span>What are we picking up?</span>
        </h3>
      </div>
    </div>
  );
}

function RecentSearches({ reduced, onPick }: { reduced: boolean; onPick: (term: string) => void }) {
  return (
    <div className="mb-[22px] grid">
      <span className={LABEL}>Recent</span>
      {RECENT.map((term, index) => (
        <motion.button
          key={term}
          type="button"
          className="flex h-11 cursor-pointer items-center gap-3 border-0 border-b border-solid border-(--xs-line) bg-transparent pr-1 pl-0.5 text-left text-(--xs-ink) outline-none focus-visible:[&_[data-term]]:underline focus-visible:[&_[data-term]]:underline-offset-[3px]"
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SETTLE, delay: 0.06 + index * 0.035 }}
          onClick={() => onPick(term)}
        >
          <HugeiconsIcon icon={Clock01Icon} strokeWidth={1.8} className={RECENT_ICON} />
          <span data-term="" className="flex-1 text-[15px]">
            {term}
          </span>
          <HugeiconsIcon icon={ArrowUpLeft01Icon} strokeWidth={1.8} className={RECENT_ICON} />
        </motion.button>
      ))}
    </div>
  );
}

function ShopHome() {
  return (
    <>
      <span className={LABEL}>Shop by aisle</span>
      <div className="mb-6 grid grid-cols-4 gap-2.5">
        {AISLES.map((aisle) => (
          <span key={aisle.name} className="grid justify-items-center gap-[7px] text-[12.5px] font-medium text-(--xs-soft)">
            <span
              className="grid aspect-square w-full place-items-center rounded-[20px] text-[30px] leading-none"
              style={{ background: aisle.tint }}
              aria-hidden="true"
            >
              {aisle.emoji}
            </span>
            {aisle.name}
          </span>
        ))}
      </div>

      <span className={LABEL}>Picked for you</span>
      <div className="grid grid-cols-2 gap-2.5">
        {PICKS.map((item) => (
          <span key={item.name} className="grid gap-0.5">
            <span
              className="mb-2 grid h-28 place-items-center rounded-[22px] text-[44px] leading-none"
              style={{ background: item.tint }}
              aria-hidden="true"
            >
              {item.emoji}
            </span>
            <span className="font-semibold">{item.name}</span>
            <span className="flex items-baseline gap-1.5">
              <span className="font-semibold">{item.price}</span>
              <span className="text-[12.5px] text-(--xs-muted)">{item.size}</span>
            </span>
          </span>
        ))}
      </div>
    </>
  );
}

function BasketButton({
  item,
  inBasket,
  reduced,
  onToggle,
}: {
  item: Product;
  inBasket: boolean;
  reduced: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      data-added={inBasket || undefined}
      className="grid size-[34px] flex-none cursor-pointer place-items-center rounded-full border-0 bg-(--xs-well) p-0 text-(--xs-ink) outline-none transition-[background-color,color,scale] duration-200 group-data-highlighted/item:not-data-added:bg-(--xs-surface) focus-visible:shadow-[0_0_0_2px_var(--xs-surface),0_0_0_4px_var(--xs-ink)] active:scale-90 data-added:bg-[#16a34a] data-added:text-white [&_svg]:size-[15px]"
      aria-label={inBasket ? `Remove ${item.name} from basket` : `Add ${item.name} to basket`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={inBasket ? "in" : "out"}
          className="grid"
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: -45 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: 45 }}
          transition={{ type: "spring", duration: 0.35, bounce: 0.3 }}
        >
          <HugeiconsIcon icon={inBasket ? Tick02Icon : Add01Icon} strokeWidth={2.6} />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

function ProductItem({
  item,
  index,
  query,
  highlighted,
  highlightId,
  inBasket,
  reduced,
  onToggleBasket,
}: {
  item: Product;
  index: number;
  query: string;
  highlighted: boolean;
  highlightId: string;
  inBasket: boolean;
  reduced: boolean;
  onToggleBasket: () => void;
}) {
  return (
    <Autocomplete.Item
      value={item}
      className="group/item relative cursor-pointer rounded-[18px] outline-none"
      render={<motion.div layout="position" transition={SETTLE} />}
    >
      {highlighted && (
        <motion.span
          layoutId={highlightId}
          className="absolute inset-0 rounded-[inherit] bg-(--xs-well)"
          transition={SETTLE}
        />
      )}

      <motion.span
        className="relative flex min-h-16 items-center gap-[13px] pr-2.5 pl-2"
        initial={reduced ? false : { opacity: 0, y: 8, filter: "blur(3px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ ...SETTLE, delay: reduced ? 0 : 0.1 + Math.min(index, 6) * 0.03 }}
      >
        <span
          className="grid size-[46px] flex-none place-items-center rounded-[14px] text-[24px] leading-none"
          style={{ background: item.tint }}
          aria-hidden="true"
        >
          {item.emoji}
        </span>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="truncate text-[15px] font-medium text-(--xs-soft) [&_mark]:bg-transparent [&_mark]:font-[650] [&_mark]:text-(--xs-ink)">
            <Match text={item.name} query={query} />
          </span>
          <span className="text-[13px] text-(--xs-muted)">
            {item.size} · {item.price}
          </span>
        </span>
        <BasketButton item={item} inBasket={inBasket} reduced={reduced} onToggle={onToggleBasket} />
      </motion.span>
    </Autocomplete.Item>
  );
}

export function ExpandingSearch({ open, onOpenChange, query, onQueryChange }: ExpandingSearchProps) {
  const reduced = useReducedMotion() ?? false;
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<HTMLDivElement | null>(null);
  const [highlighted, setHighlighted] = useState<Product | undefined>();
  const [added, setAdded] = useState<string[]>([]);

  const close = () => {
    onQueryChange("");
    onOpenChange(false);
    input.current?.blur();
  };

  const toggleBasket = (name: string) =>
    setAdded((list) => (list.includes(name) ? list.filter((other) => other !== name) : [...list, name]));

  const swap = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 10, filter: "blur(6px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -6, filter: "blur(4px)", transition: { duration: 0.14 } },
      };

  return (
    <section
      data-open={open || undefined}
      className={`group flex h-[580px] w-[min(100%,380px)] flex-col overflow-hidden rounded-[36px] border border-solid border-(--xs-edge) bg-(--xs-surface) px-[18px] pt-[18px] text-[14px] tracking-[-0.006em] text-(--xs-ink) shadow-[0_1px_2px_rgb(0_0_0/0.05),0_12px_28px_-20px_rgb(0_0_0/0.16)] dark:shadow-[0_1px_2px_rgb(0_0_0/0.28),0_12px_28px_-20px_rgb(0_0_0/0.48)] ${PALETTE}`}
      aria-label="Groceries"
    >
      <Greeting hidden={open} />

      <Autocomplete.Root
        items={PRODUCTS}
        value={query}
        onValueChange={(next) => onQueryChange(next)}
        open={open}
        onOpenChange={(next) => {
          if (next) onOpenChange(true);
          else if (!query) onOpenChange(false);
        }}
        autoHighlight
        onItemHighlighted={(item) => setHighlighted(item ?? undefined)}
        itemToStringValue={(item) => (item as Product).name}
      >
        <div className="flex flex-none items-center">
          <Autocomplete.InputGroup
            className="flex h-12 min-w-0 flex-1 cursor-text items-center gap-[9px] rounded-2xl bg-(--xs-well) pr-3 pl-[15px] transition-[background-color,box-shadow] duration-200 group-data-open:bg-(--xs-surface) group-data-open:shadow-[inset_0_0_0_1.8px_var(--xs-ink)] motion-reduce:duration-10"
            onPointerDown={(event) => {
              if (event.target !== input.current) {
                event.preventDefault();
                input.current?.focus();
              }
              onOpenChange(true);
            }}
          >
            <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="size-[18px] flex-none text-(--xs-muted)" />
            <Autocomplete.Input
              ref={input}
              className="h-full w-0 min-w-0 flex-1 border-0 bg-transparent p-0 text-[16px] text-(--xs-ink) outline-none placeholder:text-(--xs-muted)"
              aria-label="Search groceries"
              placeholder="Search 2,400 groceries"
              onFocus={() => onOpenChange(true)}
              onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                event.preventDefault();
                close();
              }}
            />
            <AnimatePresence initial={false}>
              {query && (
                <Autocomplete.Clear
                  className="grid size-5 flex-none cursor-pointer place-items-center rounded-full border-0 bg-(--xs-muted) p-0 text-(--xs-surface) [&_svg]:size-2.5"
                  aria-label="Clear search"
                  render={
                    <motion.button
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={SETTLE}
                    />
                  }
                >
                  <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2.6} />
                </Autocomplete.Clear>
              )}
            </AnimatePresence>
          </Autocomplete.InputGroup>

          <AnimatePresence initial={false}>
            {open && (
              <motion.button
                type="button"
                className="h-12 flex-none cursor-pointer overflow-hidden border-0 bg-transparent p-0 text-[15px] font-semibold whitespace-nowrap text-(--xs-ink) outline-none focus-visible:[&>span]:underline focus-visible:[&>span]:underline-offset-[3px]"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0, transition: { duration: 0.2 } }}
                transition={
                  reduced ? { duration: 0 } : { ...SETTLE, opacity: { duration: 0.2, delay: 0.08 } }
                }
                onClick={close}
              >
                <span className="block pl-3.5">Cancel</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="relative -mx-[18px] min-h-0 flex-1 overflow-y-auto overscroll-contain px-[18px] pt-[22px] pb-[18px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <AnimatePresence initial={false} mode="popLayout">
            {open ? (
              <motion.div key="results" ref={setResults} className="grid content-start" {...swap} transition={SETTLE}>
                {!query && (
                  <RecentSearches
                    reduced={reduced}
                    onPick={(term) => {
                      onQueryChange(term);
                      input.current?.focus();
                    }}
                  />
                )}
              </motion.div>
            ) : (
              <motion.div key="shop" className="grid" {...swap} transition={SETTLE}>
                <ShopHome />
              </motion.div>
            )}
          </AnimatePresence>

          <Autocomplete.Portal container={results}>
            <Autocomplete.Positioner className="static! w-auto! transform-none! outline-none" positionMethod="absolute">
              <Autocomplete.Popup
                className="outline-none transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0"
                aria-label="Products"
              >
                <span className={LABEL} id={`${id}-label`}>
                  {query ? "Products" : "Popular this week"}
                </span>
                <Autocomplete.Empty className="text-center text-[14px] text-(--xs-muted) not-empty:px-3 not-empty:py-8">No groceries match “{query}”</Autocomplete.Empty>
                <Autocomplete.List className="-mx-2 grid" aria-labelledby={`${id}-label`}>
                  {(item: Product, index: number) => (
                    <ProductItem
                      key={item.name}
                      item={item}
                      index={index}
                      query={query}
                      highlighted={highlighted === item}
                      highlightId={`${id}-highlight`}
                      inBasket={added.includes(item.name)}
                      reduced={reduced}
                      onToggleBasket={() => toggleBasket(item.name)}
                    />
                  )}
                </Autocomplete.List>
              </Autocomplete.Popup>
            </Autocomplete.Positioner>
          </Autocomplete.Portal>
        </div>
      </Autocomplete.Root>
    </section>
  );
}

interface State {
  open: boolean;
  query: string;
}

const BEATS: readonly (State & { ms: number })[] = [
  { open: false, query: "", ms: 1500 },
  { open: true, query: "", ms: 1500 },
  ...typing("oa", (query) => ({ open: true, query }), { every: 280, hold: 2000 }),
  { open: false, query: "", ms: 1000 },
];

const fromBeat = (step: number): State => {
  const { ms: _ms, ...state } = BEATS[step]!;
  return state;
};

const STILL: State = { open: true, query: "oa" };

interface ExpandingSearchDemoProps {
  playing?: boolean;
  preview?: boolean;
}

export function ExpandingSearchDemo({ playing, preview }: ExpandingSearchDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { ref, takeOver } = scene;
  const state = preview && !playing ? STILL : scene.state;
  return (
    <div ref={ref} className="not-prose grid w-full place-items-center font-sans antialiased">
      <ExpandingSearch
        open={state.open}
        onOpenChange={(open) => takeOver((current) => ({ ...current, open }))}
        query={state.query}
        onQueryChange={(query) => takeOver((current) => ({ ...current, query }))}
      />
    </div>
  );
}
