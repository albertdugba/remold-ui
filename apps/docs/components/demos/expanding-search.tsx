"use client";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, ArrowRight01Icon, Cancel01Icon, Clock01Icon, Dish01Icon, Search01Icon, ShoppingBasket01Icon, Tick02Icon, UserCircleIcon } from "@hugeicons/core-free-icons";
import { announce } from "@remold-ui/dom";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useMeasuredHeight } from "./use-measured-height";
import { typing, useScene } from "./use-scene";

interface Product {
  name: string;
  place: string;
  price: string;
  photo: string;
}

interface Place {
  name: string;
  cuisine: string;
  rating: string;
  time: string;
  freeDelivery: boolean;
  photo: string;
}

const PRODUCTS: Product[] = [
  { name: "Jollof rice with chicken", place: "Auntie Muni's", price: "£9.50", photo: "photo-1665332195309-9d75071138f0" },
  { name: "Double smash burger", place: "Smash Club", price: "£11.00", photo: "photo-1568901346375-23c9450c58cd" },
  { name: "Salmon poke bowl", place: "Poke Theory", price: "£10.80", photo: "photo-1546069901-ba9599a7e63c" },
  { name: "Margherita pizza", place: "Forno", price: "£12.50", photo: "photo-1574071318508-1cdbab80d002" },
  { name: "Chicken ramen", place: "Ichiban Ramen", price: "£12.00", photo: "photo-1680593180878-e0cd1e99486e" },
  { name: "Chicken shawarma wrap", place: "Beirut Grill", price: "£8.90", photo: "photo-1626700051175-6818013e1d4f" },
  { name: "Crispy chicken strips", place: "Smash Club", price: "£7.50", photo: "photo-1562967916-eb82221dfb92" },
  { name: "Pad thai", place: "Thai Basil", price: "£10.20", photo: "photo-1637806930600-37fa8892069d" },
  { name: "Fish tacos", place: "Taqueria Sol", price: "£9.80", photo: "photo-1551504734-5ee1c4a1479b" },
];

const PLACES: Place[] = [
  { name: "Auntie Muni's", cuisine: "Ghanaian", rating: "4.9", time: "20–30 min", freeDelivery: true, photo: "photo-1665332195309-9d75071138f0" },
  { name: "Smash Club", cuisine: "Burgers", rating: "4.7", time: "15–25 min", freeDelivery: false, photo: "photo-1568901346375-23c9450c58cd" },
  { name: "Poke Theory", cuisine: "Hawaiian", rating: "4.8", time: "25–35 min", freeDelivery: false, photo: "photo-1546069901-ba9599a7e63c" },
  { name: "Forno", cuisine: "Pizza", rating: "4.6", time: "30–40 min", freeDelivery: true, photo: "photo-1574071318508-1cdbab80d002" },
];

const RECENT = ["Jollof", "Ramen", "Tacos"];
const priceOf = (product: Product) => Number(product.price.slice(1));
const BUDGET = PRODUCTS.filter((dish) => priceOf(dish) < 10).slice(0, 4);

const photo = (id: string, width: number) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=70`;
const pounds = (value: number) => `£${value.toFixed(2)}`;

const SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.18 };
const SETTLE = { type: "spring" as const, duration: 0.38, bounce: 0 };
const OPEN_WIDTH = 560;
const FIELD_HEIGHT = 40;
const NARROW_FRAME = 480;

const PALETTE = [
  "[--xs-surface:#ffffff] [--xs-raised:#ffffff] [--xs-ink:#0a0a0b] [--xs-soft:#3f3f46] [--xs-muted:#6c6c75] [--xs-well:#f4f4f5] [--xs-line:rgb(10_10_11/0.07)] [--xs-edge:rgb(0_0_0/0.06)] [--xs-shadow:0_0_0_0.5px_rgb(0_0_0/0.06),0_24px_48px_-20px_rgb(0_0_0/0.25)] [--xs-dim:rgb(10_10_11/0.06)] [--xs-offer-ink:#9a5b13]",
  "dark:[--xs-surface:#18181b] dark:[--xs-raised:#1f1f23] dark:[--xs-ink:#fafafa] dark:[--xs-soft:#d4d4d8] dark:[--xs-muted:#a1a1aa] dark:[--xs-well:#27272a] dark:[--xs-line:rgb(255_255_255/0.08)] dark:[--xs-edge:rgb(255_255_255/0.07)] dark:[--xs-shadow:0_0_0_0.5px_rgb(255_255_255/0.08),0_24px_48px_-20px_rgb(0_0_0/0.7)] dark:[--xs-dim:rgb(0_0_0/0.35)] dark:[--xs-offer-ink:#f0b968]",
].join(" ");

const FOCUS = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--xs-ink)";
const KEY = "inline-grid h-5 min-w-5 place-items-center rounded-[6px] bg-(--xs-well) px-1 font-sans text-[11px] font-medium text-(--xs-muted)";
const POP_IN = { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.8 }, transition: SETTLE };

interface PillRest {
  left: number;
  top: number;
  width: number;
  frameWidth: number;
}

function usePillRest(frame: RefObject<HTMLElement | null>, slot: RefObject<HTMLElement | null>) {
  const [rest, setRest] = useState<PillRest | null>(null);

  useLayoutEffect(() => {
    const outer = frame.current;
    const inner = slot.current;
    if (!outer || !inner) return;

    const measure = () => {
      const frameBox = outer.getBoundingClientRect();
      const slotBox = inner.getBoundingClientRect();
      const scale = frameBox.width / outer.offsetWidth || 1;
      setRest({ left: (slotBox.left - frameBox.left) / scale, top: (slotBox.top - frameBox.top) / scale, width: slotBox.width / scale, frameWidth: outer.offsetWidth });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);

    return () => observer.disconnect();
  }, [frame, slot]);

  return rest;
}

function useSlashToFocus(frame: RefObject<HTMLElement | null>, input: RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey) return;
      if ((event.target as HTMLElement).closest("input, textarea, [contenteditable]")) return;

      const box = frame.current?.getBoundingClientRect();
      if (!box || box.bottom < 0 || box.top > window.innerHeight) return;

      event.preventDefault();
      input.current?.focus();
    };

    document.addEventListener("keydown", onKey);

    return () => document.removeEventListener("keydown", onKey);
  }, [frame, input]);
}

function useBasket(initial: string[]) {
  const [names, setNames] = useState(initial);
  const total = PRODUCTS.filter((product) => names.includes(product.name)).reduce((sum, product) => sum + priceOf(product), 0);

  const toggle = (name: string) => {
    announce(names.includes(name) ? `${name} removed from basket` : `${name} added to basket`);
    setNames((current) => (current.includes(name) ? current.filter((other) => other !== name) : [...current, name]));
  };

  return { has: (name: string) => names.includes(name), count: names.length, total, toggle };
}

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

function AddButton({ name, added, reduced, onToggle }: { name: string; added: boolean; reduced: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      data-added={added || undefined}
      className="grid size-8 flex-none cursor-pointer place-items-center rounded-full border-0 bg-(--xs-well) p-0 text-(--xs-ink) outline-none transition-[background-color,color,scale] duration-200 ease-out group-data-highlighted/item:not-data-added:bg-(--xs-surface) focus-visible:shadow-[0_0_0_2px_var(--xs-surface),0_0_0_4px_var(--xs-ink)] active:scale-[0.97] data-added:bg-(--xs-ink) data-added:text-(--xs-surface) [&_svg]:size-[14px]"
      aria-label={`Add ${name} to basket`}
      aria-pressed={added}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={added ? "in" : "out"}
          className="grid"
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: -45 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: 45 }}
          transition={{ type: "spring", duration: 0.35, bounce: 0.3 }}
        >
          <HugeiconsIcon icon={added ? Tick02Icon : Add01Icon} strokeWidth={2.6} aria-hidden="true" />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

function ProductItem({ item, index, query, highlighted, highlightId, added, reduced, onToggle }: { item: Product; index: number; query: string; highlighted: boolean; highlightId: string; added: boolean; reduced: boolean; onToggle: () => void }) {
  return (
    <Autocomplete.Item value={item} className="group/item relative cursor-pointer rounded-[14px] outline-none" render={<motion.div layout="position" transition={SETTLE} />}>
      {highlighted && <motion.span layoutId={highlightId} className="absolute inset-0 rounded-[inherit] bg-(--xs-well)" transition={SETTLE} />}
      <motion.span
        className="relative flex min-h-[56px] items-center gap-3 px-2.5"
        initial={reduced ? false : { opacity: 0, y: 6, filter: "blur(3px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ ...SETTLE, delay: reduced ? 0 : 0.08 + Math.min(index, 6) * 0.03 }}
      >
        <img src={photo(item.photo, 120)} alt="" width={44} height={44} draggable={false} className="size-11 flex-none rounded-[11px] bg-(--xs-well) object-cover" />
        <span className="grid min-w-0 flex-1 gap-px">
          <span className="truncate text-[14px] font-medium text-(--xs-soft) [&_mark]:bg-transparent [&_mark]:font-[650] [&_mark]:text-(--xs-ink)">
            <Match text={item.name} query={query} />
          </span>
          <span className="truncate text-[12.5px] text-(--xs-muted)">{item.place}</span>
        </span>
        <span className="text-[13.5px] font-semibold tabular-nums">{item.price}</span>
        <AddButton name={item.name} added={added} reduced={reduced} onToggle={onToggle} />
      </motion.span>
    </Autocomplete.Item>
  );
}

function PlaceCard({ place }: { place: Place }) {
  return (
    <li className="grid min-w-0 gap-0.5">
      <span className="relative mb-2 block overflow-hidden rounded-[14px] bg-(--xs-well)">
        <img src={photo(place.photo, 480)} alt="" width={240} height={160} draggable={false} className="block aspect-[3/2] w-full object-cover" />
        {place.freeDelivery && <span className="absolute top-2 left-2 rounded-full bg-(--xs-surface) px-2 py-0.5 text-[11px] font-semibold text-(--xs-offer-ink)">Free delivery</span>}
      </span>

      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-[14px] font-semibold">{place.name}</span>
        <span className="flex-none rounded-full bg-(--xs-well) px-1.5 text-[11.5px] leading-5 font-semibold tabular-nums">{place.rating}</span>
      </span>

      <span className="truncate text-[12.5px] text-(--xs-muted)">
        {place.cuisine} · {place.time}
      </span>
    </li>
  );
}

function DishRow({ dish }: { dish: Product }) {
  return (
    <li className="flex min-w-0 items-center gap-3">
      <img src={photo(dish.photo, 120)} alt="" width={48} height={48} draggable={false} className="size-12 flex-none rounded-[12px] bg-(--xs-well) object-cover" />
      <span className="grid min-w-0 flex-1">
        <span className="truncate text-[13.5px] font-semibold">{dish.name}</span>
        <span className="truncate text-[12px] text-(--xs-muted)">{dish.place}</span>
      </span>
      <span className="text-[13px] font-semibold tabular-nums">{dish.price}</span>
    </li>
  );
}

function Storefront({ hidden }: { hidden: boolean }) {
  return (
    <div className="min-h-0 flex-1 px-6 pt-5" aria-hidden={hidden || undefined} inert={hidden}>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="m-0 text-[18px] font-[650] tracking-[-0.02em]">Popular near you</h3>
        <a href="#" className={`flex items-center gap-0.5 rounded-[6px] text-[12.5px] font-medium text-(--xs-muted) no-underline transition-[color] duration-150 hover:text-(--xs-ink) ${FOCUS}`} onClick={(event) => event.preventDefault()}>
          See all
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2} aria-hidden="true" />
        </a>
      </div>

      <ul className="m-0 grid list-none grid-cols-4 gap-4 p-0 @max-[620px]:grid-cols-2">
        {PLACES.map((place) => (
          <PlaceCard key={place.name} place={place} />
        ))}
      </ul>
      <h3 className="m-0 mt-6 mb-3 text-[15px] font-[650] tracking-[-0.015em]">Under £10</h3>
      <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-2 p-0 @max-[620px]:grid-cols-1">
        {BUDGET.map((dish) => (
          <DishRow key={dish.name} dish={dish} />
        ))}
      </ul>
    </div>
  );
}

function Header({ slot, basketCount, basketTotal }: { slot: RefObject<HTMLDivElement | null>; basketCount: number; basketTotal: number }) {
  return (
    <header className="flex h-16 flex-none items-center gap-3 border-0 border-b border-solid border-(--xs-line) px-5">
      <span className="flex items-center gap-2 text-[15px] font-[650] tracking-[-0.02em]">
        <span className="grid size-7 place-items-center rounded-[9px] bg-(--xs-ink) text-(--xs-surface)" aria-hidden="true">
          <HugeiconsIcon icon={Dish01Icon} size={16} strokeWidth={2} />
        </span>
        <span className="@max-[420px]:sr-only">Dishes</span>
      </span>
      <span className="flex-1" />
      <div ref={slot} className="h-10 w-[280px] min-w-[120px] shrink @max-[560px]:w-[160px]" />
      <button type="button" className={`grid size-10 flex-none cursor-pointer place-items-center rounded-[12px] border-0 bg-transparent text-(--xs-ink) transition-[background-color] duration-150 ease-out hover:bg-(--xs-well) @max-[480px]:hidden ${FOCUS}`} aria-label="Account">
        <HugeiconsIcon icon={UserCircleIcon} size={20} strokeWidth={1.7} aria-hidden="true" />
      </button>

      <button
        type="button"
        className={`flex h-10 flex-none cursor-pointer items-center gap-2 rounded-full border-0 bg-(--xs-ink) pr-3.5 pl-3 font-sans text-[13px] font-semibold text-(--xs-surface) tabular-nums transition-[opacity] duration-150 ease-out hover:opacity-90 active:scale-[0.97] ${FOCUS}`}
        aria-label={`Basket, ${basketCount} items, ${pounds(basketTotal)}`}
      >
        <HugeiconsIcon icon={ShoppingBasket01Icon} size={17} strokeWidth={1.9} aria-hidden="true" />
        <Remold.Text>{pounds(basketTotal)}</Remold.Text>
      </button>
    </header>
  );
}

function KeyHint({ keys, children }: { keys: string[]; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      {keys.map((key) => (
        <kbd key={key} className={KEY}>
          {key}
        </kbd>
      ))}
      {children}
    </span>
  );
}

function RecentSearches({ reduced, onPick }: { reduced: boolean; onPick: (term: string) => void }) {
  return (
    <div className="mb-2 px-2.5 pt-1.5">
      <span className="mb-2 block text-[12px] font-semibold text-(--xs-muted)">Recent</span>
      <div className="flex flex-wrap gap-1.5">
        {RECENT.map((term, index) => (
          <motion.button
            key={term}
            type="button"
            className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-(--xs-well) px-3 font-sans text-[13px] font-medium text-(--xs-soft) transition-[color,background-color] duration-150 ease-out hover:text-(--xs-ink) active:scale-[0.97] ${FOCUS}`}
            initial={reduced ? false : { opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ ...SETTLE, delay: 0.1 + index * 0.035 }}
            onClick={() => onPick(term)}
          >
            <HugeiconsIcon icon={Clock01Icon} size={14} strokeWidth={1.8} className="text-(--xs-muted)" aria-hidden="true" />
            {term}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export interface ExpandingSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (query: string) => void;
}

export function ExpandingSearch({ open, onOpenChange, query, onQueryChange }: ExpandingSearchProps) {
  const reduced = useReducedMotion() ?? false;
  const id = useId();
  const frame = useRef<HTMLElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const refocusing = useRef(false);
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const [measureResults, resultsHeight] = useMeasuredHeight();
  const [highlighted, setHighlighted] = useState<Product | undefined>();
  const basket = useBasket(["Jollof rice with chicken"]);
  const rest = usePillRest(frame, slot);
  useSlashToFocus(frame, input);

  const narrow = rest ? rest.frameWidth < NARROW_FRAME : false;

  const close = (keepFocus: boolean) => {
    onQueryChange("");
    onOpenChange(false);
    if (!keepFocus) input.current?.blur();
    else if (document.activeElement !== input.current) {
      refocusing.current = true;
      input.current?.focus();
    }
  };

  const shape = rest && (open ? cardShape(rest, resultsHeight ?? 0) : { left: rest.left, top: rest.top, width: rest.width, height: FIELD_HEIGHT, borderRadius: 12 });

  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <section
        ref={frame}
        data-open={open || undefined}
        className={`group @container relative flex h-[460px] w-[min(100%,820px)] flex-col overflow-clip rounded-[24px] border border-solid border-(--xs-edge) bg-(--xs-surface) text-[14px] tracking-[-0.006em] text-(--xs-ink) ${PALETTE}`}
        aria-label="Food delivery"
      >
        <Header slot={slot} basketCount={basket.count} basketTotal={basket.total} />
        <Storefront hidden={open} />
        <div
          aria-hidden="true"
          className={`absolute inset-0 z-10 bg-(--xs-dim) transition-opacity duration-300 ease-out motion-reduce:transition-none ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
          onPointerDown={() => close(false)}
        />

        <Autocomplete.Root
          items={PRODUCTS}
          value={query}
          onValueChange={onQueryChange}
          open={open}
          onOpenChange={(next) => {
            if (next) onOpenChange(true);
            else if (!query) onOpenChange(false);
          }}
          limit={query ? 5 : 3}
          autoHighlight
          onItemHighlighted={(item) => setHighlighted(item ?? undefined)}
          itemToStringValue={(item) => (item as Product).name}
        >
          {shape && (
            <motion.div className="absolute z-20 overflow-clip" initial={false} animate={shape} transition={reduced ? { duration: 0.12 } : { ...SPRING, delay: open ? 0 : 0.06 }}>
              <span aria-hidden="true" className={`absolute inset-0 bg-(--xs-well) transition-opacity duration-200 ease-out motion-reduce:transition-none ${open ? "opacity-0" : "opacity-100"}`} />
              <span aria-hidden="true" className={`absolute inset-0 rounded-[inherit] bg-(--xs-raised) shadow-(--xs-shadow) transition-opacity duration-100 ease-out motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`} />

              <motion.div className="relative" initial={false} animate={{ padding: open ? 6 : 0 }}>
                <Autocomplete.InputGroup
                  className="flex cursor-text items-center gap-2.5 pr-2.5 pl-3.5"
                  style={{ height: FIELD_HEIGHT }}
                  onPointerDown={(event) => {
                    if (event.target !== input.current) {
                      event.preventDefault();
                      input.current?.focus();
                    }

                    onOpenChange(true);
                  }}
                >
                  <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="size-[17px] flex-none text-(--xs-muted)" aria-hidden="true" />
                  <Autocomplete.Input
                    ref={input}
                    className="h-full w-0 min-w-0 flex-1 border-0 bg-transparent p-0 font-sans text-[14.5px] text-(--xs-ink) outline-none placeholder:text-(--xs-muted)"
                    aria-label="Search food"
                    placeholder={narrow && !open ? "Search" : "Search dishes or restaurants"}
                    onFocus={() => {
                      if (refocusing.current) refocusing.current = false;
                      else onOpenChange(true);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Escape") return;

                      event.preventDefault();
                      close(true);
                    }}
                  />

                  <AnimatePresence initial={false} mode="popLayout">
                    {query ? (
                      <Autocomplete.Clear
                        key="clear"
                        className="grid size-6 flex-none cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-(--xs-muted) transition-[color] duration-150 hover:text-(--xs-ink) [&_svg]:size-3.5"
                        aria-label="Clear search"
                        render={<motion.button {...POP_IN} />}
                      >
                        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2.4} aria-hidden="true" />
                      </Autocomplete.Clear>
                    ) : (
                      !narrow && (
                        <motion.kbd key={open ? "esc" : "slash"} className={KEY} {...POP_IN}>
                          {open ? "esc" : "/"}
                        </motion.kbd>
                      )
                    )}
                  </AnimatePresence>
                </Autocomplete.InputGroup>
              </motion.div>

              <div ref={measureResults} className="relative">
                <div ref={setPanel} />
              </div>
            </motion.div>
          )}

          <Autocomplete.Portal container={panel}>
            <Autocomplete.Positioner className="static! w-auto! transform-none! outline-none" positionMethod="absolute">
              <Autocomplete.Popup className="border-0 border-t border-solid border-(--xs-line) px-2 pt-2 pb-2 outline-none transition-[opacity,filter] delay-[90ms] duration-200 ease-out data-ending-style:opacity-0 data-ending-style:delay-0 data-ending-style:duration-100 data-ending-style:blur-[3px] data-starting-style:opacity-0 motion-reduce:transition-none">
                {!query && (
                  <RecentSearches
                    reduced={reduced}
                    onPick={(term) => {
                      onQueryChange(term);
                      input.current?.focus();
                    }}
                  />
                )}

                <span className="mb-1.5 block px-2.5 pt-1.5 text-[12px] font-semibold text-(--xs-muted)" id={`${id}-label`}>
                  {query ? "Dishes" : "Popular right now"}
                </span>
                <Autocomplete.Empty className="text-center text-[13.5px] text-(--xs-muted) not-empty:px-3 not-empty:py-6">Nothing matches “{query}”</Autocomplete.Empty>
                <Autocomplete.List className="grid" aria-labelledby={`${id}-label`}>
                  {(item: Product, index: number) => (
                    <ProductItem
                      key={item.name}
                      item={item}
                      index={index + (query ? 0 : 2)}
                      query={query}
                      highlighted={highlighted === item}
                      highlightId={`${id}-highlight`}
                      added={basket.has(item.name)}
                      reduced={reduced}
                      onToggle={() => basket.toggle(item.name)}
                    />
                  )}
                </Autocomplete.List>

                <div className="mt-1.5 flex items-center gap-4 border-0 border-t border-solid border-(--xs-line) px-2.5 pt-2.5 pb-1 text-[12px] text-(--xs-muted) max-[480px]:hidden">
                  <KeyHint keys={["↑", "↓"]}>to move</KeyHint>
                  <KeyHint keys={["↵"]}>to open</KeyHint>
                  <KeyHint keys={["esc"]}>to close</KeyHint>
                </div>
              </Autocomplete.Popup>
            </Autocomplete.Positioner>
          </Autocomplete.Portal>
        </Autocomplete.Root>
      </section>
    </MotionConfig>
  );
}

function cardShape(rest: PillRest, resultsHeight: number) {
  const width = Math.min(OPEN_WIDTH, rest.frameWidth - 32);

  return { left: (rest.frameWidth - width) / 2, top: rest.top - 6, width, height: FIELD_HEIGHT + 12 + resultsHeight, borderRadius: 20 };
}

interface SearchState {
  open: boolean;
  query: string;
}

const BEATS: readonly (SearchState & { ms: number })[] = [
  { open: false, query: "", ms: 1500 },
  { open: true, query: "", ms: 1700 },
  ...typing("chi", (query) => ({ open: true, query }), { every: 280, hold: 2000 }),
  { open: false, query: "", ms: 1200 },
];

const fromBeat = (step: number): SearchState => {
  const { ms: _ms, ...state } = BEATS[step]!;

  return state;
};

const STILL: SearchState = { open: true, query: "chi" };

export function ExpandingSearchDemo({ playing, preview }: { playing?: boolean; preview?: boolean } = {}) {
  const { ref, state, takeOver } = useScene(BEATS, fromBeat, playing, false, preview ? STILL : undefined);

  return (
    <div ref={ref} className="not-prose grid w-full grid-cols-[minmax(0,1fr)] place-items-center font-sans antialiased">
      <ExpandingSearch
        open={state.open}
        onOpenChange={(open) => takeOver((current) => ({ ...current, open }))}
        query={state.query}
        onQueryChange={(query) => takeOver((current) => ({ ...current, query }))}
      />
    </div>
  );
}
