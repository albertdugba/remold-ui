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

const TOKENS = [
  "[--flt-surface:#ffffff] [--flt-raised:#ffffff] [--flt-field:#f4f4f5] [--flt-line:rgb(24_24_27/0.08)] [--flt-ink:#18181b] [--flt-muted:#71717a] [--flt-quiet:#a1a1aa] [--flt-accent:#4f46e5]",
  "[--flt-shadow:0_18px_40px_-12px_rgb(0_0_0/0.22),0_0_0_1px_rgb(24_24_27/0.06)] [--flt-hover:color-mix(in_oklab,var(--flt-ink)_6%,var(--flt-field))]",
  "dark:[--flt-surface:#1f1f23] dark:[--flt-raised:#2a2a2f] dark:[--flt-field:#2e2e33] dark:[--flt-line:rgb(255_255_255/0.08)] dark:[--flt-ink:#fafafa] dark:[--flt-muted:#a1a1aa] dark:[--flt-quiet:#71717a] dark:[--flt-accent:#818cf8]",
  "dark:[--flt-shadow:0_18px_40px_-12px_rgb(0_0_0/0.6),0_0_0_1px_rgb(255_255_255/0.08)]",
  "font-sans",
].join(" ");

const FOCUS = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--flt-accent)";
const SEG = "inline-flex h-full items-center gap-[5px] border-0 bg-transparent px-2 text-[12.5px] whitespace-nowrap";
const MENU =
  "min-w-[156px] origin-(--transform-origin) rounded-xl bg-(--flt-raised) p-1 text-(--flt-ink) shadow-(--flt-shadow) outline-none [transition:opacity_0.14s,transform_0.2s_cubic-bezier(0.2,0.9,0.3,1.2)] data-ending-style:[transform:scale(0.95)] data-ending-style:opacity-0 data-starting-style:[transform:scale(0.95)] data-starting-style:opacity-0";
const ITEM =
  "flex h-[30px] cursor-default items-center gap-2 rounded-lg px-[9px] text-[13px] outline-none select-none data-highlighted:bg-(--flt-field) data-popup-open:bg-(--flt-field) [&_svg]:size-3.5 [&_svg]:text-(--flt-muted)";
const DOT = "size-[9px] flex-none rounded-full";

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
    <section
      ref={ref}
      className={`not-prose grid w-[min(100%,460px)] rounded-[20px] bg-(--flt-surface) p-3.5 text-(--flt-ink) ${TOKENS}`}
      aria-label="Transactions"
    >
      <div className="flex min-h-[30px] items-start gap-2">
        <ul className="m-0 flex flex-1 list-none flex-wrap gap-1.5 p-0" aria-label="Filters">
          <AnimatePresence initial={false} mode="popLayout">
            {active.map((field) => {
              const { label, icon: Icon, values } = FIELDS[field];
              const chosen = filters[field]!;
              return (
                <motion.li
                  key={field}
                  layout="position"
                  className="inline-flex h-7 flex-none overflow-hidden rounded-lg bg-(--flt-field) [&>*+*]:shadow-[inset_1px_0_0_var(--flt-line)]"
                  initial={{ opacity: 0, scale: 0.85, x: -6 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.14 } }}
                  transition={POP}
                >
                  <span className={`${SEG} text-(--flt-muted)`}>
                    <HugeiconsIcon icon={Icon} className="size-[13px]" aria-hidden="true" />
                    {label}
                  </span>
                  <Menu.Root modal={false}>
                    <Menu.Trigger
                      className={`${SEG} cursor-pointer font-semibold text-(--flt-ink) hover:bg-(--flt-hover) data-popup-open:bg-(--flt-hover) ${FOCUS}`}
                      aria-label={`${label}: ${chosen}. Change`}>
                      <span className="inline-grid overflow-hidden whitespace-nowrap">
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
                      <Menu.Positioner className={TOKENS} sideOffset={6} align="start">
                        <Menu.Popup className={MENU}>
                          <Menu.RadioGroup
                            value={chosen}
                            onValueChange={(picked) => set(field, picked as string)}
                          >
                            {values.map((option) => (
                              <Menu.RadioItem key={option} value={option} className={ITEM}>
                                {field === "category" && (
                                  <i className={DOT} style={{ background: CATEGORY_COLOR[option] }} />
                                )}
                                {option}
                                <Menu.RadioItemIndicator className="ml-auto inline-flex text-(--flt-accent)">
                                  <HugeiconsIcon icon={CheckIcon} className="size-3.5" aria-hidden="true" />
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
                    className={`${SEG} cursor-pointer px-1.5! text-(--flt-quiet) hover:bg-(--flt-hover) [&_svg]:size-[13px] ${FOCUS}`}
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
                  <Menu.Trigger
                    className={`inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-(--flt-field) px-[9px] text-[12.5px] font-medium text-(--flt-muted) hover:text-(--flt-ink) data-popup-open:text-(--flt-ink) ${FOCUS}`}
                  >
                    <HugeiconsIcon icon={FilterIcon} className="size-3.5" aria-hidden="true" />
                    {active.length ? "" : "Filter"}
                  </Menu.Trigger>
                  <Menu.Portal container={portal}>
                    <Menu.Positioner className={TOKENS} sideOffset={6} align="start">
                      <Menu.Popup className={MENU}>
                        {unused.map((field) => {
                          const { label, icon: Icon, values } = FIELDS[field];
                          return (
                            <Menu.SubmenuRoot key={field}>
                              <Menu.SubmenuTrigger className={ITEM}>
                                <HugeiconsIcon icon={Icon} aria-hidden="true" />
                                {label}
                                <HugeiconsIcon
                                  icon={ArrowRight01Icon}
                                  className="ml-auto"
                                  aria-hidden="true"
                                />
                              </Menu.SubmenuTrigger>
                              <Menu.Portal container={portal}>
                                <Menu.Positioner className={TOKENS} sideOffset={4} alignOffset={-4}>
                                  <Menu.Popup className={MENU}>
                                    {values.map((option) => (
                                      <Menu.Item
                                        key={option}
                                        className={ITEM}
                                        onClick={() => set(field, option)}
                                      >
                                        {field === "category" && (
                                          <i
                                            className={DOT}
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

      <div className="mt-3 flex min-h-7 items-center justify-between border-b border-solid border-(--flt-line) px-1 pb-2">
        <p className="m-0 flex items-baseline gap-1 text-[12px] font-medium text-(--flt-muted)" aria-live="polite">
          <Odometer value={String(results.length)} /> {results.length === 1 ? "payment" : "payments"}
          <span className="text-(--flt-quiet)">·</span>
          <Odometer className="tabular-nums" value={dollars(spent)} />
          <HugeiconsIcon icon={ArrowDown01Icon} className="size-3 self-center" aria-hidden="true" />
        </p>
        <AnimatePresence initial={false}>
          {active.length > 0 && (
            <motion.button
              type="button"
              className={`h-6 flex-none cursor-pointer border-0 bg-transparent px-1 text-[12.5px] text-(--flt-muted) hover:text-(--flt-ink) ${FOCUS}`}
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

      <ul className="m-0 mt-1 grid min-h-[276px] list-none content-start p-0">
        <AnimatePresence initial={false} mode="popLayout">
          {results.slice(0, 6).map((payment) => {
            const brand = BRANDS[payment.brand];
            return (
              <motion.li
                key={payment.id}
                layout="position"
                className="flex h-[46px] items-center gap-[11px] px-1"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={SPRING}
              >
                <span
                  className="grid size-[30px] flex-none place-items-center rounded-lg"
                  style={{ background: brand.color }}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" className="size-[15px] fill-white">
                    <path d={brand.path} />
                  </svg>
                </span>
                <span className="grid min-w-0 flex-1 leading-[1.3]">
                  <span className="truncate text-[13.5px] font-[550]">{brand.name}</span>
                  <span className="truncate text-[11.5px] text-(--flt-quiet)">
                    {payment.date} · {payment.card}
                  </span>
                </span>
                <span className="flex-none text-[13.5px] tabular-nums">−{dollars(payment.amount)}</span>
              </motion.li>
            );
          })}
        </AnimatePresence>
        {results.length === 0 && <li className="py-[30px] text-center text-[13px] text-(--flt-muted)">No payments match these filters.</li>}
      </ul>
    </section>
  );
}

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
