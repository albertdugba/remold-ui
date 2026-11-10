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
import "./expanding-search.css";

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
    <div className="xs-top" aria-hidden={hidden || undefined}>
      <div className="xs-top-inner">
        <div className="xs-bar">
          <span className="xs-place">
            <HugeiconsIcon icon={Location01Icon} strokeWidth={2} />
            Osu, Accra
          </span>
          <img
            src="https://api.dicebear.com/9.x/notionists/svg?seed=Ama%20Mensah&backgroundColor=fde68a"
            alt=""
            width={32}
            height={32}
            className="xs-me"
            draggable={false}
          />
        </div>
        <h3 className="xs-greeting">
          Good evening, Ama.
          <span>What are we picking up?</span>
        </h3>
      </div>
    </div>
  );
}

function RecentSearches({ reduced, onPick }: { reduced: boolean; onPick: (term: string) => void }) {
  return (
    <div className="xs-recent">
      <span className="xs-label">Recent</span>
      {RECENT.map((term, index) => (
        <motion.button
          key={term}
          type="button"
          className="xs-recent-row"
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SETTLE, delay: 0.06 + index * 0.035 }}
          onClick={() => onPick(term)}
        >
          <HugeiconsIcon icon={Clock01Icon} strokeWidth={1.8} className="xs-recent-icon" />
          <span className="xs-recent-text">{term}</span>
          <HugeiconsIcon icon={ArrowUpLeft01Icon} strokeWidth={1.8} className="xs-recent-fill" />
        </motion.button>
      ))}
    </div>
  );
}

function ShopHome() {
  return (
    <>
      <span className="xs-label">Shop by aisle</span>
      <div className="xs-aisles">
        {AISLES.map((aisle) => (
          <span key={aisle.name} className="xs-aisle">
            <span className="xs-aisle-tile" style={{ background: aisle.tint }} aria-hidden="true">
              {aisle.emoji}
            </span>
            {aisle.name}
          </span>
        ))}
      </div>

      <span className="xs-label">Picked for you</span>
      <div className="xs-picks">
        {PICKS.map((item) => (
          <span key={item.name} className="xs-pick">
            <span className="xs-pick-art" style={{ background: item.tint }} aria-hidden="true">
              {item.emoji}
            </span>
            <span className="xs-pick-name">{item.name}</span>
            <span className="xs-pick-foot">
              <span className="xs-pick-price">{item.price}</span>
              <span className="xs-pick-size">{item.size}</span>
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
      className="xs-add"
      data-added={inBasket || undefined}
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
          className="xs-add-icon"
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
      className="xs-item"
      render={<motion.div layout="position" transition={SETTLE} />}
    >
      {highlighted && <motion.span layoutId={highlightId} className="xs-highlight" transition={SETTLE} />}

      <motion.span
        className="xs-item-body"
        initial={reduced ? false : { opacity: 0, y: 8, filter: "blur(3px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ ...SETTLE, delay: reduced ? 0 : 0.1 + Math.min(index, 6) * 0.03 }}
      >
        <span className="xs-tile" style={{ background: item.tint }} aria-hidden="true">
          {item.emoji}
        </span>
        <span className="xs-copy">
          <span className="xs-name">
            <Match text={item.name} query={query} />
          </span>
          <span className="xs-size">
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
    <section className="xs" data-open={open || undefined} aria-label="Groceries">
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
        <div className="xs-row">
          <Autocomplete.InputGroup
            className="xs-field"
            onPointerDown={(event) => {
              if (event.target !== input.current) {
                event.preventDefault();
                input.current?.focus();
              }
              onOpenChange(true);
            }}
          >
            <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="xs-field-icon" />
            <Autocomplete.Input
              ref={input}
              className="xs-input"
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
                  className="xs-clear"
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
                className="xs-cancel"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0, transition: { duration: 0.2 } }}
                transition={
                  reduced ? { duration: 0 } : { ...SETTLE, opacity: { duration: 0.2, delay: 0.08 } }
                }
                onClick={close}
              >
                <span>Cancel</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="xs-stage">
          <AnimatePresence initial={false} mode="popLayout">
            {open ? (
              <motion.div key="results" ref={setResults} className="xs-results" {...swap} transition={SETTLE}>
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
              <motion.div key="shop" className="xs-shop" {...swap} transition={SETTLE}>
                <ShopHome />
              </motion.div>
            )}
          </AnimatePresence>

          <Autocomplete.Portal container={results}>
            <Autocomplete.Positioner className="xs-positioner" positionMethod="absolute">
              <Autocomplete.Popup className="xs-popup" aria-label="Products">
                <span className="xs-label" id={`${id}-label`}>
                  {query ? "Products" : "Popular this week"}
                </span>
                <Autocomplete.Empty className="xs-empty">No groceries match “{query}”</Autocomplete.Empty>
                <Autocomplete.List className="xs-list" aria-labelledby={`${id}-label`}>
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
    <div ref={ref} className="xs-demo not-prose">
      <ExpandingSearch
        open={state.open}
        onOpenChange={(open) => takeOver((current) => ({ ...current, open }))}
        query={state.query}
        onQueryChange={(query) => takeOver((current) => ({ ...current, query }))}
      />
    </div>
  );
}
