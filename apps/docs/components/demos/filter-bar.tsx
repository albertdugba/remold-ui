"use client";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  CheckIcon,
  CreditCardIcon,
  Dollar01Icon,
  FilterIcon,
  Tag01Icon,
} from "@hugeicons/core-free-icons";
import { Menu } from "@base-ui/react/menu";
import { AnimatePresence, motion } from "motion/react";
import { BRANDS, type BrandId } from "./merchant-logos";
import { Odometer } from "./odometer";
import type { Ref } from "react";
import { useControllableState } from "./use-controllable-state";
import { useScene } from "./use-scene";
import { usePortalContainer } from "./portal-container";
import "./filter-bar.css";

type Field = "category" | "card" | "amount";

const FIELDS: Record<Field, { label: string; icon: IconSvgElement; values: string[] }> = {
  category: {
    label: "Category",
    icon: Tag01Icon,
    values: ["Travel", "Shopping", "Subscriptions", "Food & drink", "Transport"],
  },
  card: { label: "Card", icon: CreditCardIcon, values: ["Visa ·4242", "Mastercard ·5100", "Amex ·1009"] },
  amount: { label: "Amount", icon: Dollar01Icon, values: ["Under $25", "$25 – $200", "Over $200"] },
};
const ORDER = Object.keys(FIELDS) as Field[];

interface Payment {
  id: string;
  brand: BrandId;
  date: string;
  category: string;
  card: string;
  amount: number;
}

const PAYMENTS: Payment[] = [
  { id: "t1", brand: "apple", date: "Oct 28", category: "Shopping", card: "Visa ·4242", amount: 129 },
  {
    id: "t2",
    brand: "spotify",
    date: "Oct 28",
    category: "Subscriptions",
    card: "Mastercard ·5100",
    amount: 10.99,
  },
  { id: "t3", brand: "uber", date: "Oct 27", category: "Transport", card: "Visa ·4242", amount: 18.4 },
  { id: "t4", brand: "amazon", date: "Oct 27", category: "Shopping", card: "Mastercard ·5100", amount: 64.2 },
  {
    id: "t5",
    brand: "starbucks",
    date: "Oct 26",
    category: "Food & drink",
    card: "Amex ·1009",
    amount: 6.75,
  },
  {
    id: "t6",
    brand: "netflix",
    date: "Oct 24",
    category: "Subscriptions",
    card: "Visa ·4242",
    amount: 15.49,
  },
  { id: "t7", brand: "airbnb", date: "Oct 22", category: "Travel", card: "Mastercard ·5100", amount: 412 },
  { id: "t8", brand: "emirates", date: "Oct 21", category: "Travel", card: "Amex ·1009", amount: 684 },
  { id: "t9", brand: "ikea", date: "Oct 19", category: "Shopping", card: "Amex ·1009", amount: 238.4 },
];

const CATEGORY_COLOR: Record<string, string> = {
  Travel: "#0ea5e9",
  Shopping: "#f59e0b",
  Subscriptions: "#8b5cf6",
  "Food & drink": "#10b981",
  Transport: "var(--flt-quiet)",
};

function passes(payment: Payment, field: Field, value: string): boolean {
  if (field === "amount") {
    if (value === "Under $25") return payment.amount < 25;
    if (value === "Over $200") return payment.amount > 200;
    return payment.amount >= 25 && payment.amount <= 200;
  }
  return payment[field] === value;
}

const dollars = (amount: number) =>
  `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The value picked for each filter that's on. */
export type PaymentFilters = Partial<Record<Field, string>>;
type Filters = PaymentFilters;

const SPRING = { type: "spring" as const, duration: 0.45, bounce: 0.15 };
const POP = { type: "spring" as const, duration: 0.35, bounce: 0.25 };

export interface FilterBarProps {
  value?: PaymentFilters;
  defaultValue?: PaymentFilters;
  onValueChange?: (filters: PaymentFilters) => void;
  ref?: Ref<HTMLElement>;
}

/** A filter bar over a list of payments: add a filter, change its value in place, or clear them all. */
export function FilterBar({ value, defaultValue = {}, onValueChange, ref }: FilterBarProps) {
  const [filters, setFilters] = useControllableState({ value, defaultValue, onValueChange });
  const portal = usePortalContainer();

  const set = (field: Field, choice: string | null) =>
    setFilters((current) => {
      const next = { ...current };
      if (choice === null) delete next[field];
      else next[field] = choice;
      return next;
    });

  const active = ORDER.filter((field) => filters[field] !== undefined);
  const results = PAYMENTS.filter((payment) =>
    active.every((field) => passes(payment, field, filters[field]!)),
  );
  const spent = results.reduce((sum, payment) => sum + payment.amount, 0);
  const unused = ORDER.filter((field) => filters[field] === undefined);

  return (
    <section ref={ref} className="flt flt-layer not-prose" aria-label="Transactions">
      <div className="flt-bar">
        <ul className="flt-tokens" aria-label="Filters">
          <AnimatePresence initial={false} mode="popLayout">
            {active.map((field) => {
              const { label, icon: Icon, values } = FIELDS[field];
              const chosen = filters[field]!;
              return (
                <motion.li
                  key={field}
                  layout="position"
                  className="flt-token"
                  initial={{ opacity: 0, scale: 0.85, x: -6 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.14 } }}
                  transition={POP}
                >
                  <span className="flt-seg flt-field">
                    <HugeiconsIcon icon={Icon} aria-hidden="true" />
                    {label}
                  </span>
                  <Menu.Root modal={false}>
                    <Menu.Trigger className="flt-seg flt-value" aria-label={`${label}: ${chosen}. Change`}>
                      <span className="flt-roll">
                        <AnimatePresence initial={false} mode="popLayout">
                          <motion.span
                            key={chosen}
                            initial={{ y: "90%", opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "-90%", opacity: 0 }}
                            transition={SPRING}
                          >
                            {chosen}
                          </motion.span>
                        </AnimatePresence>
                      </span>
                    </Menu.Trigger>
                    <Menu.Portal container={portal}>
                      <Menu.Positioner className="flt-layer" sideOffset={6} align="start">
                        <Menu.Popup className="flt-menu">
                          <Menu.RadioGroup
                            value={chosen}
                            onValueChange={(picked) => set(field, picked as string)}
                          >
                            {values.map((option) => (
                              <Menu.RadioItem key={option} value={option} className="flt-item">
                                {field === "category" && (
                                  <i className="flt-dot" style={{ background: CATEGORY_COLOR[option] }} />
                                )}
                                {option}
                                <Menu.RadioItemIndicator className="flt-tick">
                                  <HugeiconsIcon icon={CheckIcon} aria-hidden="true" />
                                </Menu.RadioItemIndicator>
                              </Menu.RadioItem>
                            ))}
                          </Menu.RadioGroup>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.Root>
                  <button
                    type="button"
                    className="flt-seg flt-remove"
                    onClick={() => set(field, null)}
                    aria-label={`Remove ${label} filter`}
                  >
                    <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
                  </button>
                </motion.li>
              );
            })}
            {unused.length > 0 && (
              <motion.li key="add" layout="position" transition={SPRING}>
                <Menu.Root modal={false}>
                  <Menu.Trigger className="flt-add">
                    <HugeiconsIcon icon={FilterIcon} aria-hidden="true" />
                    {active.length ? "" : "Filter"}
                  </Menu.Trigger>
                  <Menu.Portal container={portal}>
                    <Menu.Positioner className="flt-layer" sideOffset={6} align="start">
                      <Menu.Popup className="flt-menu">
                        {unused.map((field) => {
                          const { label, icon: Icon, values } = FIELDS[field];
                          return (
                            <Menu.SubmenuRoot key={field}>
                              <Menu.SubmenuTrigger className="flt-item">
                                <HugeiconsIcon icon={Icon} aria-hidden="true" />
                                {label}
                                <HugeiconsIcon
                                  icon={ArrowRight01Icon}
                                  className="flt-more"
                                  aria-hidden="true"
                                />
                              </Menu.SubmenuTrigger>
                              <Menu.Portal container={portal}>
                                <Menu.Positioner className="flt-layer" sideOffset={4} alignOffset={-4}>
                                  <Menu.Popup className="flt-menu">
                                    {values.map((option) => (
                                      <Menu.Item
                                        key={option}
                                        className="flt-item"
                                        onClick={() => set(field, option)}
                                      >
                                        {field === "category" && (
                                          <i
                                            className="flt-dot"
                                            style={{ background: CATEGORY_COLOR[option] }}
                                          />
                                        )}
                                        {option}
                                      </Menu.Item>
                                    ))}
                                  </Menu.Popup>
                                </Menu.Positioner>
                              </Menu.Portal>
                            </Menu.SubmenuRoot>
                          );
                        })}
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
              </motion.li>
            )}
          </AnimatePresence>
        </ul>
      </div>

      <div className="flt-count">
        <p aria-live="polite">
          <Odometer value={String(results.length)} /> {results.length === 1 ? "payment" : "payments"}
          <span className="flt-sep">·</span>
          <Odometer className="flt-total" value={dollars(spent)} />
          <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden="true" />
        </p>
        <AnimatePresence initial={false}>
          {active.length > 0 && (
            <motion.button
              type="button"
              className="flt-clear"
              onClick={() => setFilters({})}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Clear
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <ul className="flt-list">
        <AnimatePresence initial={false} mode="popLayout">
          {results.slice(0, 6).map((payment) => {
            const brand = BRANDS[payment.brand];
            return (
              <motion.li
                key={payment.id}
                layout="position"
                className="flt-row"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={SPRING}
              >
                <span className="flt-logo" style={{ background: brand.color }} aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d={brand.path} />
                  </svg>
                </span>
                <span className="flt-row-copy">
                  <span className="flt-row-title">{brand.name}</span>
                  <span className="flt-row-meta">
                    {payment.date} · {payment.card}
                  </span>
                </span>
                <span className="flt-amount">−{dollars(payment.amount)}</span>
              </motion.li>
            );
          })}
        </AnimatePresence>
        {results.length === 0 && <li className="flt-empty">No payments match these filters.</li>}
      </ul>
    </section>
  );
}

// The docs demo: a short scripted scene that plays the element above. Your app doesn't need it.

const BEATS: readonly { filters: Filters; ms: number }[] = [
  { filters: {}, ms: 1300 },
  { filters: { category: "Shopping" }, ms: 1500 },
  { filters: { category: "Shopping", card: "Amex ·1009" }, ms: 1500 },
  { filters: { category: "Travel", card: "Amex ·1009" }, ms: 1600 },
  { filters: { category: "Travel" }, ms: 1400 },
  { filters: {}, ms: 1100 },
];

const fromBeat = (step: number): Filters => BEATS[step]!.filters;

interface FilterBarDemoProps {
  playing?: boolean;
}

export function FilterBarDemo({ playing }: FilterBarDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  return <FilterBar ref={scene.ref} value={scene.state} onValueChange={scene.onValueChange} />;
}
