"use client";

import { Button } from "@base-ui/react/button";
import { Checkbox } from "@base-ui/react/checkbox";
import { Toast } from "@base-ui/react/toast";
import { CheckIcon, Copy01Icon, Delete02Icon, Image01Icon, Layers01Icon, PlayIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { announce } from "@remold-ui/dom";
import { Remold, useDust } from "@remold-ui/react/canvas";
import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { useId, useLayoutEffect, useRef, useState, type Ref, type RefObject } from "react";
import { Odometer } from "./odometer";
import { useControllableState } from "./use-controllable-state";
import { useMeasuredSize } from "./use-measured-size";
import { useScene } from "./use-scene";

type Kind = "video" | "burst" | "duplicate" | "screenshot";

const KIND: Record<Kind, { icon: IconSvgElement; label: (item: Item) => string }> = {
  video: { icon: PlayIcon, label: (item) => item.length ?? "Video" },
  burst: { icon: Layers01Icon, label: () => "Burst" },
  duplicate: { icon: Copy01Icon, label: () => "Duplicate" },
  screenshot: { icon: Image01Icon, label: () => "Screenshot" },
};

interface Item {
  id: string;
  name: string;
  kind: Kind;
  size: number;
  length?: string;
}

const ITEMS: Item[] = [
  { id: "canyon", name: "Canyon", kind: "video", size: 2.4, length: "6:42" },
  { id: "valley", name: "Valley", kind: "burst", size: 0.9 },
  { id: "city", name: "City", kind: "video", size: 1.6, length: "4:18" },
  { id: "berries", name: "Berries", kind: "duplicate", size: 0.4 },
  { id: "snow", name: "Snow", kind: "duplicate", size: 0.5 },
  { id: "octopus", name: "Octopus", kind: "video", size: 1.2, length: "2:51" },
];

const TOTAL = 100;
const FILES = 24.6;
const MAIL = 6.8;
const PHOTOS_KEPT = 25.9;

const COLORS = [
  "#1f2a37",
  "#3d5a80",
  "#8fb3d9",
  "#e9a46a",
  "#c2553a",
  "#f1d6a6",
  "#5f7d4f",
  "var(--stg-surface)",
];
const UNDO_MS = 10000;
const FOLD = { type: "spring" as const, duration: 0.45, bounce: 0.1 };
const RISE = { type: "spring" as const, duration: 0.45, bounce: 0.3 };
const SNAP = { type: "spring" as const, duration: 0.4, bounce: 0.5 };
const OPENING_MS = 280;
const SHUT_MS = 420;

type BinState = "hidden" | "open" | "shut";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const SEGMENT = "min-w-0 basis-0";
const TONE = { photos: "bg-(--stg-photos)", files: "bg-(--stg-files)", mail: "bg-(--stg-mail)" };
const DOT = {
  photos: "before:bg-(--stg-photos)",
  files: "before:bg-(--stg-files)",
  mail: "before:bg-(--stg-mail)",
};

const TILE =
  "group/tile relative block size-full cursor-pointer overflow-hidden rounded-[14px] border-0 bg-(--stg-well) p-0 transition-[background-color] duration-350 ease-[ease] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--stg-files) data-moving:bg-transparent " +
  "[&>*]:[transition:opacity_0.35s_ease,filter_0.35s_ease,scale_0.25s_cubic-bezier(0.32,0.72,0,1)] data-moving:[&>*]:opacity-0 data-moving:[&>*]:blur-[4px] data-moving:[&>*]:[transition-duration:0.2s] motion-reduce:[&>*]:transition-none " +
  "before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:border-3 before:border-solid before:border-(--stg-files) before:opacity-0 before:transition-opacity before:duration-180 before:ease-[ease] before:content-[''] data-checked:before:opacity-100 data-moving:before:opacity-0! data-moving:before:blur-[4px] data-moving:before:duration-200 motion-reduce:before:transition-none " +
  "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-[linear-gradient(to_top,rgb(0_0_0/0.5),transparent_40%)] after:[transition:opacity_0.35s_ease,filter_0.35s_ease,scale_0.25s_cubic-bezier(0.32,0.72,0,1)] after:content-[''] data-moving:after:opacity-0 data-moving:after:blur-[4px] data-moving:after:[transition-duration:0.2s] motion-reduce:after:transition-none";

const CHECK =
  "absolute top-[7px] right-[7px] z-2 grid size-[22px] place-items-center rounded-full border-[1.5px] border-solid border-white/90 bg-black/25 text-white backdrop-blur-[2px] [transition:background-color_0.15s,border-color_0.15s,opacity_0.35s_ease,filter_0.35s_ease] group-data-checked/tile:border-white group-data-checked/tile:bg-(--stg-files)";

const LABEL = "absolute left-2 z-1 text-[11px] font-semibold text-white";

const photoUrl = (id: string) => `/storage/${id}.jpg`;
const gigabytes = (value: number) => value.toFixed(1);
const sizeOf = (ids: readonly string[]) =>
  ITEMS.filter((item) => ids.includes(item.id)).reduce((sum, item) => sum + item.size, 0);

export interface StorageCleanupValue {
  deleted: string[];
  selected: string[];
}

export interface StorageCleanupProps {
  value?: StorageCleanupValue;
  defaultValue?: StorageCleanupValue;
  onValueChange?: (value: StorageCleanupValue) => void;
  ref?: Ref<HTMLElement>;
}

export function StorageCleanup(props: StorageCleanupProps) {
  return (
    <Toast.Provider limit={1} timeout={UNDO_MS}>
      <Cleanup {...props} />
    </Toast.Provider>
  );
}

function StorageBar({ photos }: { photos: number }) {
  const used = FILES + MAIL + photos;
  const segments = [
    { name: "Photos", size: photos, tone: "photos" as const },
    { name: "Files", size: FILES, tone: "files" as const },
    { name: "Mail", size: MAIL, tone: "mail" as const },
  ];

  return (
    <div className="grid gap-2">
      <p className="m-0 flex items-baseline gap-1.5">
        <b className="inline-flex items-baseline gap-1 text-[22px] font-[650] tracking-[-0.02em] tabular-nums">
          <Odometer value={gigabytes(used)} /> GB
        </b>
        <span className="text-(--stg-muted)">of {TOTAL} GB used</span>
      </p>
      <div
        className="flex h-3 gap-[3px] overflow-hidden rounded-full"
        role="meter"
        aria-label="Storage used"
        aria-valuemin={0}
        aria-valuemax={TOTAL}
        aria-valuenow={Number(gigabytes(used))}
        aria-valuetext={`${gigabytes(used)} GB of ${TOTAL} GB`}
      >
        {segments.map((segment) => (
          <motion.span
            key={segment.tone}
            className={`${SEGMENT} rounded-[3px] first:rounded-l-full ${TONE[segment.tone]}`}
            initial={false}
            animate={{ flexGrow: segment.size }}
            transition={FOLD}
          />
        ))}
        <motion.span
          className={`${SEGMENT} rounded-r-full rounded-l-[3px] bg-(--stg-free)`}
          initial={false}
          animate={{ flexGrow: TOTAL - used }}
          transition={FOLD}
        />
      </div>
      <ul className="m-0 flex list-none gap-4 p-0 text-[12px] text-(--stg-muted)">
        {segments.map((segment) => (
          <li
            key={segment.tone}
            className={`inline-flex items-center gap-1.5 before:size-[7px] before:rounded-full before:content-[''] ${DOT[segment.tone]}`}
          >
            {segment.name}
            <span className="text-(--stg-ink) tabular-nums">
              <Odometer value={gigabytes(segment.size)} /> GB
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tile({
  item,
  selected,
  moving,
  tileRefs,
  onSelect,
}: {
  item: Item;
  selected: boolean;
  moving: boolean;
  tileRefs: RefObject<Map<string, HTMLElement>>;
  onSelect: (on: boolean) => void;
}) {
  const kind = KIND[item.kind];
  return (
    <motion.li layout="position" transition={FOLD} className="aspect-square">
      <Checkbox.Root
        className={TILE}
        checked={selected}
        onCheckedChange={onSelect}
        aria-label={`${item.name}, ${item.kind === "video" ? "video " : ""}${kind.label(item)}, ${gigabytes(item.size)} GB`}
        data-moving={moving || undefined}
        ref={(tile: HTMLElement | null) => {
          if (tile) tileRefs.current.set(item.id, tile);
        }}
      >
        <img
          src={photoUrl(item.id)}
          alt=""
          draggable={false}
          className="block size-full object-cover select-none group-data-checked/tile:scale-[0.88] group-data-checked/tile:rounded-[10px] group-data-checked/tile:brightness-90 motion-reduce:transition-none!"
        />
        <span className={CHECK} aria-hidden="true">
          <Checkbox.Indicator className="grid size-full place-items-center [&_svg]:size-3 [&_svg]:flex-none">
            <HugeiconsIcon icon={CheckIcon} size={12} strokeWidth={2.6} />
          </Checkbox.Indicator>
        </span>
        <span className={`${LABEL} bottom-[7px] inline-flex items-center gap-1`}>
          <HugeiconsIcon icon={kind.icon} size={11} strokeWidth={2.2} aria-hidden="true" />
          {kind.label(item)}
        </span>
        <span className={`${LABEL} top-2 rounded-full bg-black/35 px-1.5 py-0.5 tabular-nums`}>{gigabytes(item.size)} GB</span>
      </Checkbox.Root>
    </motion.li>
  );
}

function useDustDeletes(
  root: RefObject<HTMLElement | null>,
  deleted: string[],
  onUndo: (deleted: string[]) => void,
) {
  const toasts = Toast.useToastManager();
  const trail = useDust(root, { palette: COLORS, count: 900 });
  const reduced = useReducedMotion();
  const tiles = useRef(new Map<string, HTMLElement>());
  const mouth = useRef<HTMLSpanElement>(null);
  const toast = useRef<string | null>(null);
  const run = useRef(0);
  const [placed, setPlaced] = useState(deleted);
  const [moving, setMoving] = useState<string[]>([]);
  const [bin, setBin] = useState<BinState>("hidden");
  const latest = useRef(deleted);
  latest.current = deleted;

  useLayoutEffect(() => {
    const was = placed;
    const leaving = deleted.filter((id) => !was.includes(id));
    const arriving = was.filter((id) => !deleted.includes(id));
    const tilesOf = (ids: string[]) => ids.map((id) => tiles.current.get(id)!).filter(Boolean);
    const pause = (ms: number) => (reduced ? Promise.resolve() : wait(ms));
    const token = ++run.current;
    const current = () => token === run.current;

    if (toast.current) toasts.close(toast.current);
    if (leaving.length + arriving.length === 0) return;

    if (leaving.length) {
      const what = leaving.length === 1 ? "1 item" : `${leaving.length} items`;

      void (async () => {
        setBin("open");
        await pause(OPENING_MS);
        if (!current()) return;
        setMoving(leaving);
        await trail.away(tilesOf(leaving), mouth.current!);
        if (!current()) return;
        setPlaced(latest.current);
        setMoving([]);
        setBin("shut");
        await pause(SHUT_MS);
        if (!current()) return;
        setBin("hidden");
        toast.current = toasts.add({
          title: `Deleted ${what} · ${gigabytes(sizeOf(leaving))} GB freed`,
          actionProps: { children: "Undo", onClick: () => onUndo(was) },
        });
      })();
      return;
    }

    setPlaced(deleted);
    setMoving(arriving);
    void (async () => {
      setBin("open");
      await pause(OPENING_MS);
      if (!current()) return;
      await trail.back(tilesOf(arriving), mouth.current!);
      if (!current()) return;
      setMoving([]);
      setBin("shut");
      await pause(SHUT_MS);
      if (current()) setBin("hidden");
    })();
  }, [deleted]);

  return { placed, moving, tiles, mouth, bin };
}

const BIN_LAYER = "pointer-events-none absolute bottom-[58px] left-1/2 -ml-10 h-24 w-20";
const BIN_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.8 },
  open: { opacity: 1, y: 0, scale: 1 },
  shut: { opacity: 1, y: 0, scale: [1, 0.95, 1], transition: { scale: { duration: 0.35, ease: "easeOut" } } },
};
const BIN_MOTION = { initial: false, variants: BIN_VARIANTS, transition: RISE };
const OPENING = "M10 26a30 7 0 1 0 60 0a30 7 0 1 0 -60 0Z";
const FRONT = "M10 26a30 7 0 0 0 60 0L64.4 85.6Q63.9 90 59.5 90H20.5Q16.1 90 15.6 85.6Z";

function Bin({ state, mouth }: { state: BinState; mouth: RefObject<HTMLSpanElement | null> }) {
  const id = useId().replace(/:/g, "");

  return (
    <>
      <motion.div className={`${BIN_LAYER} z-0`} animate={state} {...BIN_MOTION} aria-hidden="true">
        <svg viewBox="0 0 80 96" className="size-full overflow-visible">
          <defs>
            <filter id={`${id}-soft`} x="-50%" y="-200%" width="200%" height="500%">
              <feGaussianBlur stdDeviation="2.5" />
            </filter>
            <radialGradient id={`${id}-inside`} cx="50%" cy="20%" r="80%">
              <stop offset="0" stopColor="#2a2a2e" />
              <stop offset="1" stopColor="#020203" />
            </radialGradient>
            <linearGradient id={`${id}-lid`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5a5a60" />
              <stop offset="0.45" stopColor="#1f1f23" />
              <stop offset="1" stopColor="#0a0a0b" />
            </linearGradient>
          </defs>
          <ellipse cx={40} cy={91} rx={27} ry={3.5} fill="black" opacity={0.28} filter={`url(#${id}-soft)`} />
          <path d={OPENING} fill={`url(#${id}-inside)`} />
          <motion.g
            style={{ transformBox: "fill-box", transformOrigin: "4% 60%" }}
            animate={{ rotate: state === "open" ? -38 : 0, y: state === "open" ? -3 : 0 }}
            transition={SNAP}
          >
            <path d="M9 20v3a31 7 0 0 0 62 0v-3" fill="#0b0b0c" />
            <ellipse cx={40} cy={20} rx={31} ry={7} fill={`url(#${id}-lid)`} />
            <ellipse cx={40} cy={19} rx={24} ry={4.4} fill="none" stroke="white" strokeOpacity={0.1} strokeWidth={1} />
            <path d="M33 16q7 -8 14 0" fill="none" stroke="#0b0b0c" strokeWidth={3.2} strokeLinecap="round" />
            <path d="M33.6 15.2q6.4 -6.6 12.8 0" fill="none" stroke="white" strokeOpacity={0.22} strokeWidth={1} strokeLinecap="round" />
          </motion.g>
        </svg>
      </motion.div>
      <motion.div className={`${BIN_LAYER} z-3`} animate={state} {...BIN_MOTION} aria-hidden="true">
        <svg viewBox="0 0 80 96" className="size-full overflow-visible">
          <defs>
            <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#0c0c0e" />
              <stop offset="0.16" stopColor="#3b3b41" />
              <stop offset="0.3" stopColor="#18181b" />
              <stop offset="0.62" stopColor="#101012" />
              <stop offset="0.86" stopColor="#26262b" />
              <stop offset="1" stopColor="#050506" />
            </linearGradient>
            <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="black" stopOpacity={0} />
              <stop offset="1" stopColor="black" stopOpacity={0.45} />
            </linearGradient>
            <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#2a2a2f" />
              <stop offset="0.2" stopColor="#8a8a92" />
              <stop offset="0.5" stopColor="#3a3a40" />
              <stop offset="0.85" stopColor="#6a6a72" />
              <stop offset="1" stopColor="#1a1a1d" />
            </linearGradient>
          </defs>
          <path d={FRONT} fill={`url(#${id}-metal)`} />
          <path d={FRONT} fill={`url(#${id}-shade)`} />
          {[26, 40, 54].map((x) => (
            <g key={x}>
              <path d={`M${x} ${x === 40 ? 38 : 37}L${x + (40 - x) * 0.1} 82`} stroke="black" strokeOpacity={0.55} strokeWidth={2.2} strokeLinecap="round" />
              <path d={`M${x + 1.2} ${x === 40 ? 38 : 37}L${x + 1.2 + (40 - x) * 0.1} 82`} stroke="white" strokeOpacity={0.09} strokeWidth={1} strokeLinecap="round" />
            </g>
          ))}
          <path d="M14.5 30Q16 60 19.5 84" fill="none" stroke="white" strokeOpacity={0.14} strokeWidth={2.5} strokeLinecap="round" />
          <path d="M10 26a30 7 0 0 0 60 0" fill="none" stroke={`url(#${id}-rim)`} strokeWidth={3} strokeLinecap="round" />
          <path d="M18 88.6H62" stroke="white" strokeOpacity={0.06} strokeWidth={1} />
        </svg>
        <span ref={mouth} className="absolute top-[40%] left-1/2 size-px" />
      </motion.div>
    </>
  );
}

function Cleanup({
  value,
  defaultValue = { deleted: [], selected: [] },
  onValueChange,
  ref,
}: StorageCleanupProps) {
  const [cleanup, setCleanup] = useControllableState({ value, defaultValue, onValueChange });
  const root = useRef<HTMLElement>(null);
  const [content, size] = useMeasuredSize<HTMLDivElement>();
  const height = useMotionValue<number | "auto">("auto");
  const sized = useRef(false);
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    if (!size) return;
    if (!sized.current || reduced) height.set(size.height);
    else void animate(height, size.height, FOLD);
    sized.current = true;
  }, [size, height, reduced]);
  const { placed, moving, tiles, mouth, bin } = useDustDeletes(root, cleanup.deleted, (deleted) =>
    setCleanup({ deleted, selected: [] }),
  );

  const shown = ITEMS.filter((item) => !placed.includes(item.id));
  const selected = cleanup.selected.filter((id) => shown.some((item) => item.id === id));
  const photos = PHOTOS_KEPT + sizeOf(shown.map((item) => item.id));

  const select = (id: string, on: boolean) => {
    const next = on ? [...selected, id] : selected.filter((other) => other !== id);
    announce(next.length ? `${next.length} selected, ${gigabytes(sizeOf(next))} GB` : "Nothing selected");
    setCleanup((current) => ({
      ...current,
      selected: on ? [...current.selected, id] : current.selected.filter((picked) => picked !== id),
    }));
  };

  const remove = () =>
    setCleanup((current) => ({ deleted: [...current.deleted, ...selected], selected: [] }));

  return (
    <MotionConfig reducedMotion="user">
      <motion.section
        ref={(element: HTMLElement | null) => {
          root.current = element;
          if (typeof ref === "function") ref(element);
          else if (ref) ref.current = element;
        }}
        className="not-prose relative block w-[min(100%,420px)] overflow-hidden rounded-3xl bg-(--stg-surface) font-sans text-[13px] text-(--stg-ink) antialiased [--stg-bad:#c8323a] [--stg-files:#6366f1] [--stg-free:#ececee] [--stg-good:#15803d] [--stg-ink:#18181b] [--stg-line:rgb(24_24_27/0.07)] [--stg-mail:#a1a1aa] [--stg-muted:#6c6c75] [--stg-photos:#f59e0b] [--stg-quiet:#a1a1aa] [--stg-surface:#ffffff] [--stg-well:#f4f4f5] dark:[--stg-bad:#ff6369] dark:[--stg-files:#818cf8] dark:[--stg-free:#2c2c31] dark:[--stg-good:#4ade80] dark:[--stg-ink:#fafafa] dark:[--stg-line:rgb(255_255_255/0.07)] dark:[--stg-mail:#71717a] dark:[--stg-muted:#a1a1aa] dark:[--stg-photos:#fbbf24] dark:[--stg-quiet:#71717a] dark:[--stg-surface:#1c1c1f] dark:[--stg-well:#26262b]"
        aria-label="Free up space"
        style={{ height }}
      >
        <div ref={content} className="grid gap-[18px] p-[18px]">
          <header className="flex items-baseline justify-between">
            <b className="text-[17px] font-[650] tracking-[-0.02em]">Free up space</b>
            <span className="text-[12.5px] text-(--stg-muted)">{TOTAL} GB plan</span>
          </header>

          <StorageBar photos={photos} />

          <div className="grid gap-2.5">
            <p className="m-0 flex justify-between text-[13px]">
              <b className="font-semibold">Review large items</b>
              <span className="text-(--stg-muted) tabular-nums">{shown.length ? `${gigabytes(sizeOf(shown.map((item) => item.id)))} GB` : ""}</span>
            </p>

            {shown.length > 0 ? (
              <ul className="m-0 grid list-none grid-cols-3 gap-1.5 p-0">
                <AnimatePresence initial={false}>
                  {shown.map((item) => (
                    <Tile
                      key={item.id}
                      item={item}
                      selected={selected.includes(item.id)}
                      moving={moving.includes(item.id)}
                      tileRefs={tiles}
                      onSelect={(on) => select(item.id, on)}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            ) : (
              <div className="grid justify-items-center gap-3 px-6 py-10 text-[14px] text-(--stg-muted)">
                <Remold.Particles
                  className="block size-[88px]"
                  shape={{
                    path: "M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0 -20Z M10.6 15.6l-4 -4l1.4 -1.4l2.6 2.6l5.4 -5.4l1.4 1.4Z",
                    fillRule: "evenodd",
                  }}
                  count={360}
                  palette={["var(--stg-good)", "var(--stg-surface)"]}
                  radius={1.3}
                  padding={4}
                  transition="scatter"
                  aria-hidden="true"
                />
                <span>Nothing left to review</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 text-(--stg-muted) tabular-nums">
            <span className="grid">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={selected.length ? "picked" : "hint"}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                >
                  {selected.length
                    ? `${selected.length} selected`
                    : "Tap items to select them"}
                </motion.span>
              </AnimatePresence>
            </span>
            <Button
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-(--stg-bad) pr-4 pl-3.5 font-[inherit] font-semibold text-white transition-[background-color,color,scale] duration-200 ease-out not-data-disabled:active:scale-[0.97] data-disabled:cursor-default data-disabled:bg-(--stg-well) data-disabled:text-(--stg-quiet) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--stg-files) motion-reduce:transition-none [&_svg]:size-4"
              disabled={!selected.length}
              focusableWhenDisabled
              onClick={remove}
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} aria-hidden="true" />
              Delete
              {selected.length > 0 && (
                <span className="tabular-nums opacity-80">
                  <Odometer value={gigabytes(sizeOf(selected))} /> GB
                </span>
              )}
            </Button>
          </div>
        </div>

        <Bin state={bin} mouth={mouth} />

        <Toast.Viewport className="group/toasts absolute inset-x-4 bottom-4">
          <Toasts />
        </Toast.Viewport>
      </motion.section>
    </MotionConfig>
  );
}

function Toasts() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className="absolute inset-x-0 bottom-0 overflow-hidden rounded-xl bg-(--stg-ink) text-(--stg-surface) shadow-[0_8px_24px_rgb(0_0_0/0.18)] [transform:translateY(var(--toast-swipe-movement-y,0))] [transition:transform_0.4s_cubic-bezier(0.22,1,0.36,1),opacity_0.3s] data-ending-style:[transform:translateY(120%)] data-ending-style:opacity-0 data-starting-style:[transform:translateY(120%)] data-starting-style:opacity-0 motion-reduce:transition-none"
    >
      <Toast.Content className="flex items-center justify-between gap-3 py-2.5 pr-2.5 pl-3.5">
        <Toast.Title
          className="m-0 overflow-hidden text-[13px] font-medium text-ellipsis whitespace-nowrap"
          render={<p />}
        />
        <Toast.Action className="h-7 flex-none cursor-pointer rounded-lg border-0 bg-[color-mix(in_srgb,var(--stg-surface)_16%,transparent)] px-3 font-[inherit] font-semibold text-(--stg-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--stg-files)" />
      </Toast.Content>
      <span
        className="absolute bottom-0 left-0 h-0.5 w-full origin-left animate-countdown bg-(--stg-photos) pointer-fine:group-hover/toasts:[animation-play-state:paused] motion-reduce:animate-none"
        style={{ animationDuration: `${UNDO_MS}ms` }}
        aria-hidden="true"
      />
    </Toast.Root>
  ));
}

const BEATS: (StorageCleanupValue & { ms: number })[] = [
  { deleted: [], selected: [], ms: 1600 },
  { deleted: [], selected: ["canyon"], ms: 700 },
  { deleted: [], selected: ["canyon", "city"], ms: 1200 },
  { deleted: ["canyon", "city"], selected: [], ms: 3400 },
  { deleted: [], selected: [], ms: 2600 },
];

const fromBeat = (step: number): StorageCleanupValue => BEATS[step]!;

export function StorageCleanupDemo({ playing }: { playing?: boolean } = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  return <StorageCleanup ref={scene.ref} value={scene.state} onValueChange={scene.onValueChange} />;
}
