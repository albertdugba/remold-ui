"use client";

import { ArrowLeft01Icon, ArrowLeftDoubleIcon, ArrowRight01Icon, ArrowRightDoubleIcon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { announce } from "@remold-ui/dom";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useRef, useState } from "react";
import { useControllableState, type ChangeDetails } from "./use-controllable-state";
import { useScript } from "./use-script";

const SPRING = { type: "spring" as const, duration: 0.4, bounce: 0.2 };
const ENTER = { opacity: 0, scale: 0.8, filter: "blur(4px)" };
const SHOWN = { opacity: 1, scale: 1, filter: "blur(0px)" };
const LEAVE = { opacity: 0, scale: 0.8, filter: "blur(4px)", transition: { duration: 0.15, ease: "easeOut" as const } };
const JUMP = 5;

type Item = { kind: "page"; page: number } | { kind: "gap"; side: "start" | "end" };

const pages = (from: number, to: number): Item[] => Array.from({ length: to - from + 1 }, (_, index) => ({ kind: "page", page: from + index }));

export function pageItems(page: number, total: number, siblings = 1): Item[] {
  const slots = siblings * 2 + 5;
  if (total <= slots) return pages(1, total);

  const from = Math.max(page - siblings, 1);
  const to = Math.min(page + siblings, total);
  const ends = siblings * 2 + 3;

  if (from <= 3) return [...pages(1, ends), { kind: "gap", side: "end" }, ...pages(total, total)];
  if (to >= total - 2) return [...pages(1, 1), { kind: "gap", side: "start" }, ...pages(total - ends + 1, total)];

  return [...pages(1, 1), { kind: "gap", side: "start" }, ...pages(from, to), { kind: "gap", side: "end" }, ...pages(total, total)];
}

const keyOf = (item: Item) => (item.kind === "page" ? `page-${item.page}` : `gap-${item.side}`);

const THEME =
  "[--pg-surface:#ffffff] [--pg-edge:rgb(0_0_0/0.06)] [--pg-ink:#141414] [--pg-text:#52525b] [--pg-muted:#8a8a93] [--pg-well:#f4f4f5] [--pg-hover:rgb(0_0_0/0.045)] [--pg-chip:#ffffff] [--pg-chip-shadow:0_0_0_0.5px_rgb(0_0_0/0.08),0_1px_2px_rgb(0_0_0/0.08),0_2px_6px_-2px_rgb(0_0_0/0.08)] " +
  "dark:[--pg-surface:#18181b] dark:[--pg-edge:rgb(255_255_255/0.07)] dark:[--pg-ink:#fafafa] dark:[--pg-text:#c4c4cc] dark:[--pg-muted:#8a8a93] dark:[--pg-well:#232327] dark:[--pg-hover:rgb(255_255_255/0.05)] dark:[--pg-chip:#3a3a40] dark:[--pg-chip-shadow:0_0_0_0.5px_rgb(255_255_255/0.08),0_1px_2px_rgb(0_0_0/0.4)]";

const FOCUS = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--pg-ink)";
const CELL = `relative grid h-8 min-w-8 cursor-pointer place-items-center rounded-[9px] border-0 bg-transparent px-1.5 font-sans text-[13.5px] font-medium tabular-nums text-(--pg-text) transition-[background-color,color] duration-150 ease-out hover:bg-(--pg-hover) hover:text-(--pg-ink) ${FOCUS}`;
const STEP = `${CELL} disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-(--pg-text)`;
const SWAP = "grid place-items-center [grid-area:1/1] transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none";

function StepButton({ icon, label, disabled, onClick }: { icon: IconSvgElement; label: string; disabled: boolean; onClick: () => void }) {
  return (
    <motion.button type="button" className={STEP} aria-label={label} disabled={disabled} whileTap={disabled ? undefined : { scale: 0.97 }} onClick={onClick}>
      <HugeiconsIcon icon={icon} size={16} strokeWidth={2.2} aria-hidden="true" />
    </motion.button>
  );
}

function GapButton({ forward, onClick }: { forward: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`group/gap ${CELL} text-(--pg-muted)`} aria-label={`${forward ? "Forward" : "Back"} ${JUMP} pages`} onClick={onClick}>
      <span className={`${SWAP} group-hover/gap:scale-75 group-hover/gap:opacity-0 group-focus-visible/gap:scale-75 group-focus-visible/gap:opacity-0`}>
        <HugeiconsIcon icon={MoreHorizontalIcon} size={17} strokeWidth={2} aria-hidden="true" />
      </span>

      <span className={`${SWAP} scale-75 text-(--pg-ink) opacity-0 group-hover/gap:scale-100 group-hover/gap:opacity-100 group-focus-visible/gap:scale-100 group-focus-visible/gap:opacity-100`}>
        <HugeiconsIcon icon={forward ? ArrowRightDoubleIcon : ArrowLeftDoubleIcon} size={17} strokeWidth={2} aria-hidden="true" />
      </span>
    </button>
  );
}

function PageButton({ page, current, onClick }: { page: number; current: boolean; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      className={`${CELL} ${current ? "text-(--pg-ink) hover:bg-transparent" : ""}`}
      aria-label={`Page ${page}`}
      aria-current={current ? "page" : undefined}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
    >
      {current && <motion.span layoutId="pg-current" aria-hidden="true" className="absolute inset-0 bg-(--pg-chip) shadow-(--pg-chip-shadow)" style={{ borderRadius: 9 }} />}
      <span className={`relative ${current ? "font-semibold" : ""}`}>{page}</span>
    </motion.button>
  );
}

export interface PaginationProps {
  total: number;
  page?: number;
  defaultPage?: number;
  onPageChange?: (page: number, details: ChangeDetails) => void;
  siblings?: number;
  label?: string;
}

export function Pagination({ total, page: controlled, defaultPage = 1, onPageChange, siblings = 1, label = "Pages" }: PaginationProps) {
  const [page, setPage] = useControllableState<number>({ value: controlled, defaultValue: defaultPage, onValueChange: onPageChange });

  const goTo = (next: number) => {
    const clamped = Math.min(total, Math.max(1, next));
    if (clamped === page) return;

    announce(`Page ${clamped} of ${total}`);
    setPage(clamped);
  };

  return (
    <nav aria-label={label}>
      <ul className="m-0 flex list-none items-center gap-0.5 rounded-[12px] bg-(--pg-well) p-1">
        <li className="mr-0.5 border-0 border-r border-solid border-(--pg-edge) pr-0.5">
          <StepButton icon={ArrowLeft01Icon} label="Previous page" disabled={page === 1} onClick={() => goTo(page - 1)} />
        </li>

        <AnimatePresence mode="popLayout" initial={false}>
          {pageItems(page, total, siblings).map((item) => (
            <motion.li key={keyOf(item)} layout="position" initial={ENTER} animate={SHOWN} exit={LEAVE}>
              {item.kind === "gap" ? (
                <GapButton forward={item.side === "end"} onClick={() => goTo(page + (item.side === "end" ? JUMP : -JUMP))} />
              ) : (
                <PageButton page={item.page} current={item.page === page} onClick={() => goTo(item.page)} />
              )}
            </motion.li>
          ))}
        </AnimatePresence>

        <motion.li layout="position" className="ml-0.5 border-0 border-l border-solid border-(--pg-edge) pl-0.5">
          <StepButton icon={ArrowRight01Icon} label="Next page" disabled={page === total} onClick={() => goTo(page + 1)} />
        </motion.li>
      </ul>
    </nav>
  );
}

const ORDERS = 196;
const PER_PAGE = 10;
const TOTAL = Math.ceil(ORDERS / PER_PAGE);
const SCRIPT = [2, 3, 4, 9, 10, 11, 20, 19, 15, 1];

export function PaginationDemo({ playing }: { playing?: boolean } = {}) {
  const shell = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const first = (page - 1) * PER_PAGE + 1;
  const last = Math.min(page * PER_PAGE, ORDERS);

  useScript(
    shell,
    playing,
    SCRIPT.map((step) => [1300, () => setPage(step)] as const),
  );

  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <div ref={shell} className={`${THEME} not-prose grid w-fit max-w-full justify-items-center gap-3 rounded-[20px] border border-solid border-(--pg-edge) bg-(--pg-surface) p-3 font-sans`}>
        <Pagination total={TOTAL} page={page} onPageChange={setPage} label="Orders pages" />
        <p className="m-0 w-full border-0 border-t border-solid border-(--pg-edge) px-2 pt-3 pb-0.5 text-center text-[12.5px] text-(--pg-muted) tabular-nums">
          Showing <Remold.Text className="inline-block font-medium whitespace-nowrap text-(--pg-ink)">{`${first}–${last}`}</Remold.Text> of {ORDERS} orders
        </p>
      </div>
    </MotionConfig>
  );
}
