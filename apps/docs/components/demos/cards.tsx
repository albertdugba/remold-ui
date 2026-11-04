"use client";

import {
  Add01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Notification01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Remold } from "@remold-ui/react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";
import { useState } from "react";

const STRUCTURAL = { duration: 0.5, bounce: 0.15 };
const FOLLOW_THROUGH = { duration: 0.36, bounce: 0.08 };
const shell =
  "w-full max-w-md rounded-2xl border border-[var(--color-fd-border)] bg-[var(--color-fd-card)] p-4 text-[var(--color-fd-foreground)] shadow-[0_1px_2px_rgb(0_0_0/0.03)]";

const plans = [
  ["solo", "Just me", "One workspace member", "$0"],
  ["team", "Small team", "Up to five workspace members", "$18"],
] as const;

export function SelectableOptionCardDemo() {
  const [selected, setSelected] = useState<(typeof plans)[number][0]>("team");
  const reduceMotion = useReducedMotion();

  return (
    <LayoutGroup id="selectable-option-card">
      <Remold.Layout
        trigger={selected}
        spring={STRUCTURAL}
        className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {plans.map(([id, title, copy, price], index) => {
          const active = selected === id;

          return (
            <motion.button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              aria-pressed={active}
              whileTap={{ scale: 0.985 }}
              className="relative isolate overflow-hidden rounded-2xl border border-[var(--color-fd-border)] bg-[var(--color-fd-card)] p-4 text-left outline-none transition-colors duration-200 hover:border-[var(--color-fd-ring)] focus-visible:ring-2 focus-visible:ring-[var(--color-fd-ring)]"
            >
              {active && (
                <motion.span
                  layoutId="selected-plan-surface"
                  className="absolute inset-0 -z-10 bg-[var(--color-fd-accent)]"
                  transition={STRUCTURAL}
                />
              )}
              <span className="flex items-start justify-between gap-3">
                <span>
                  <b className="text-[15px] tracking-[-0.01em]">{title}</b>
                  <span className="mt-1 block text-sm text-[var(--color-fd-muted-foreground)]">
                    {copy}
                  </span>
                </span>
                <span className="text-lg font-semibold tracking-[-0.02em]">
                  {price}
                </span>
              </span>
              <motion.span
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...FOLLOW_THROUGH, delay: index * 0.035 }}
                className="mt-4 flex items-center gap-2 text-sm font-medium"
              >
                <Remold.Icon
                  icon={
                    <HugeiconsIcon icon={active ? Tick02Icon : Add01Icon} />
                  }
                  className={
                    active
                      ? "size-4 text-emerald-600 dark:text-emerald-400"
                      : "size-4 text-[var(--color-fd-muted-foreground)]"
                  }
                  strokeWidth={2.2}
                  spring={STRUCTURAL}
                  aria-hidden="true"
                />
                <Remold.Text>{active ? "Selected" : "Select plan"}</Remold.Text>
              </motion.span>
            </motion.button>
          );
        })}
      </Remold.Layout>
    </LayoutGroup>
  );
}

const initial = [
  {
    id: "review",
    title: "Review requested",
    copy: "Maya asked for feedback on the project brief.",
    tone: "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300",
  },
  {
    id: "mention",
    title: "You were mentioned",
    copy: "Sam tagged you in the launch checklist.",
    tone: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300",
  },
  {
    id: "payment",
    title: "Payment received",
    copy: "Invoice #2048 was paid in full.",
    tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  },
] as const;

export function NotificationStackCardDemo() {
  const [items, setItems] = useState([...initial]);
  const reduceMotion = useReducedMotion();
  const reset = () => setItems([...initial]);

  return (
    <section className={shell} aria-label="Notifications">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Remold.Icon
            icon={<HugeiconsIcon icon={Notification01Icon} />}
            className="size-[17px]"
            strokeWidth={2.1}
            aria-hidden="true"
          />
          <b className="text-[15px] tracking-[-0.01em]">Notifications</b>
          <span className="rounded-full bg-[var(--color-fd-accent)] px-2 py-0.5 text-xs text-[var(--color-fd-muted-foreground)]">
            <Remold.Text>{String(items.length)}</Remold.Text>
          </span>
        </span>
        <button
          type="button"
          onClick={reset}
          className="rounded-md px-1.5 py-1 text-sm text-[var(--color-fd-muted-foreground)] transition-colors hover:bg-[var(--color-fd-accent)] hover:text-[var(--color-fd-foreground)]"
        >
          Reset
        </button>
      </div>
      <Remold.Layout
        trigger={items.map((item) => item.id).join(":")}
        spring={STRUCTURAL}
        className="grid gap-2"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((item, index) => (
            <motion.article
              key={item.id}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 10 }}
              transition={{ ...FOLLOW_THROUGH, delay: index * 0.04 }}
              className="flex items-start gap-3 rounded-xl border border-[var(--color-fd-border)] bg-[var(--color-fd-background)] p-3"
            >
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-lg ${item.tone}`}
              >
                <Remold.Icon
                  icon={<HugeiconsIcon icon={CheckmarkCircle02Icon} />}
                  className="size-4"
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
              </span>
              <span className="min-w-0 flex-1">
                <b className="text-sm">{item.title}</b>
                <span className="mt-0.5 block text-sm leading-5 text-[var(--color-fd-muted-foreground)]">
                  {item.copy}
                </span>
              </span>
              <button
                type="button"
                onClick={() =>
                  setItems((current) =>
                    current.filter((entry) => entry.id !== item.id),
                  )
                }
                aria-label={`Dismiss ${item.title}`}
                className="grid size-7 place-items-center rounded-md text-[var(--color-fd-muted-foreground)] transition-colors hover:bg-[var(--color-fd-accent)] hover:text-[var(--color-fd-foreground)]"
              >
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  className="size-4"
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
              </button>
            </motion.article>
          ))}
          {items.length === 0 && (
            <motion.button
              type="button"
              onClick={reset}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={FOLLOW_THROUGH}
              className="rounded-xl border border-dashed border-[var(--color-fd-border)] p-5 text-sm text-[var(--color-fd-muted-foreground)] transition-colors hover:bg-[var(--color-fd-accent)]"
            >
              All caught up · Restore notifications
            </motion.button>
          )}
        </AnimatePresence>
      </Remold.Layout>
    </section>
  );
}

const descriptions = {
  viewer: "Can view and comment",
  editor: "Can edit and publish",
  admin: "Can manage people and billing",
} as const;

export function PermissionCardDemo() {
  const [role, setRole] = useState<keyof typeof descriptions>("editor");

  return (
    <section className={shell} aria-label="Member permission">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-orange-100 font-semibold text-orange-700 dark:bg-orange-400/15 dark:text-orange-300">
          MO
        </span>
        <span className="min-w-0 flex-1">
          <b className="block text-[15px] tracking-[-0.01em]">Maria Owusu</b>
          <span className="block text-sm text-[var(--color-fd-muted-foreground)]">
            maria@example.com
          </span>
        </span>
      </div>
      <Remold.Layout trigger={role} spring={STRUCTURAL} className="mt-4">
        <LayoutGroup id="permission-card">
          <div className="grid grid-cols-3 rounded-xl bg-[var(--color-fd-muted)] p-1">
            {(Object.keys(descriptions) as (keyof typeof descriptions)[]).map(
              (item) => {
                const selected = role === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setRole(item)}
                    aria-pressed={selected}
                    className="relative z-0 rounded-lg px-2 py-2 text-sm capitalize text-[var(--color-fd-muted-foreground)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-fd-ring)]"
                  >
                    {selected && (
                      <motion.span
                        layoutId="permission-selection"
                        className="absolute inset-0 -z-10 rounded-lg bg-[var(--color-fd-background)] shadow-sm"
                        transition={STRUCTURAL}
                      />
                    )}
                    {item}
                  </button>
                );
              },
            )}
          </div>
          <div className="mt-3 rounded-xl border border-[var(--color-fd-border)] bg-[var(--color-fd-background)] p-3">
            <b className="text-sm capitalize">
              <Remold.Text>{role}</Remold.Text>
            </b>
            <span className="mt-1 block text-sm text-[var(--color-fd-muted-foreground)]">
              <Remold.Text>{descriptions[role]}</Remold.Text>
            </span>
            {role === "admin" && (
              <span className="mt-3 block border-t border-[var(--color-fd-border)] pt-3 text-sm text-amber-700 dark:text-amber-400">
                Includes billing access and member management.
              </span>
            )}
          </div>
        </LayoutGroup>
      </Remold.Layout>
    </section>
  );
}
