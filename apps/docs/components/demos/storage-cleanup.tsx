"use client";

import { Button } from "@base-ui/react/button";
import { Checkbox } from "@base-ui/react/checkbox";
import { Toast } from "@base-ui/react/toast";
import { CheckIcon, Copy01Icon, Image01Icon, Layers01Icon, PlayIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Remold, useDust } from "@remold-ui/react/canvas";
import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { useLayoutEffect, useRef, useState, type Ref, type RefObject } from "react";
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
  kind: Kind;
  size: number;
  photo: number;
  length?: string;
}

const ITEMS: Item[] = [
  { id: "canyon", kind: "video", size: 2.4, photo: 1016, length: "6:42" },
  { id: "valley", kind: "burst", size: 0.9, photo: 1015 },
  { id: "city", kind: "video", size: 1.6, photo: 1043, length: "4:18" },
  { id: "berries", kind: "duplicate", size: 0.4, photo: 1080 },
  { id: "snow", kind: "duplicate", size: 0.5, photo: 1036 },
  { id: "jelly", kind: "video", size: 1.2, photo: 1069, length: "2:51" },
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
const UNDO_MS = 5000;
const FOLD = { type: "spring" as const, duration: 0.45, bounce: 0.1 };

const SEGMENT = "min-w-0 basis-0";
const TONE = { photos: "bg-(--stg-photos)", files: "bg-(--stg-files)", mail: "bg-(--stg-mail)" };
const DOT = {
  photos: "before:bg-(--stg-photos)",
  files: "before:bg-(--stg-files)",
  mail: "before:bg-(--stg-mail)",
};

const TILE =
  "group/tile relative block size-full cursor-pointer overflow-hidden rounded-[10px] border-0 bg-(--stg-well) p-0 transition-[background-color] duration-350 ease-[ease] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--stg-files) data-moving:bg-transparent " +
  "[&>*]:[transition:opacity_0.35s_ease,filter_0.35s_ease,scale_0.25s_cubic-bezier(0.32,0.72,0,1)] data-moving:[&>*]:opacity-0 data-moving:[&>*]:blur-[4px] data-moving:[&>*]:[transition-duration:0.2s] " +
  "before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:border-3 before:border-solid before:border-(--stg-files) before:opacity-0 before:transition-opacity before:duration-180 before:ease-[ease] before:content-[''] data-checked:before:opacity-100 data-moving:before:opacity-0! data-moving:before:blur-[4px] data-moving:before:duration-200 " +
  "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-[linear-gradient(to_top,rgb(0_0_0/0.5),transparent_40%)] after:[transition:opacity_0.35s_ease,filter_0.35s_ease,scale_0.25s_cubic-bezier(0.32,0.72,0,1)] after:content-[''] data-moving:after:opacity-0 data-moving:after:blur-[4px] data-moving:after:[transition-duration:0.2s]";

const CHECK =
  "absolute top-[7px] right-[7px] z-2 grid size-5 place-items-center rounded-full border-[1.5px] border-solid border-white/90 bg-black/20 text-white [transition:background-color_0.15s,border-color_0.15s,opacity_0.35s_ease,filter_0.35s_ease] group-data-checked/tile:border-white group-data-checked/tile:bg-(--stg-files)";

const LABEL = "absolute left-2 z-1 text-[11px] font-semibold text-white";

const photoUrl = (id: number) => `https://picsum.photos/id/${id}/320/320`;
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

function StorageBar({ photos, freeRef }: { photos: number; freeRef: RefObject<HTMLSpanElement | null> }) {
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
        className="flex h-2.5 gap-0.5 overflow-hidden rounded-full"
        role="meter"
        aria-label="Storage used"
        aria-valuemin={0}
        aria-valuemax={TOTAL}
        aria-valuenow={Number(gigabytes(used))}
      >
        {segments.map((segment) => (
          <motion.span
            key={segment.tone}
            className={`${SEGMENT} ${TONE[segment.tone]}`}
            initial={false}
            animate={{ flexGrow: segment.size }}
            transition={FOLD}
          />
        ))}
        <motion.span
          ref={freeRef}
          className={`${SEGMENT} bg-(--stg-free)`}
          initial={false}
          animate={{ flexGrow: TOTAL - used }}
          transition={FOLD}
        />
      </div>
      <ul className="m-0 flex list-none gap-3.5 p-0 text-[12px] text-(--stg-muted)">
        {segments.map((segment) => (
          <li
            key={segment.tone}
            className={`inline-flex items-center gap-1.5 before:size-[7px] before:rounded-full before:content-[''] ${DOT[segment.tone]}`}
          >
            {segment.name}
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
        aria-label={`${kind.label(item)}, ${gigabytes(item.size)} GB`}
        data-moving={moving || undefined}
        ref={(tile: HTMLElement | null) => {
          if (tile) tileRefs.current.set(item.id, tile);
        }}
      >
        <img
          src={photoUrl(item.photo)}
          crossOrigin="anonymous"
          alt=""
          draggable={false}
          className="block size-full object-cover select-none group-data-checked/tile:brightness-88 motion-reduce:transition-none!"
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
  const tiles = useRef(new Map<string, HTMLElement>());
  const free = useRef<HTMLSpanElement>(null);
  const toast = useRef<string | null>(null);
  const [placed, setPlaced] = useState(deleted);
  const [moving, setMoving] = useState<string[]>([]);
  const latest = useRef(deleted);
  latest.current = deleted;

  useLayoutEffect(() => {
    const was = placed;
    const leaving = deleted.filter((id) => !was.includes(id));
    const arriving = was.filter((id) => !deleted.includes(id));
    const tilesOf = (ids: string[]) => ids.map((id) => tiles.current.get(id)!).filter(Boolean);

    if (toast.current) toasts.close(toast.current);
    if (leaving.length + arriving.length === 0) return;

    setMoving([...leaving, ...arriving]);

    if (leaving.length) {
      const what = leaving.length === 1 ? "1 item" : `${leaving.length} items`;
      toast.current = toasts.add({
        title: `Deleted ${what} · ${gigabytes(sizeOf(leaving))} GB freed`,
        actionProps: { children: "Undo", onClick: () => onUndo(was) },
      });
      void trail.away(tilesOf(leaving), free.current!).then(() => {
        setPlaced(latest.current);
        setMoving([]);
      });
      return;
    }

    setPlaced(deleted);
    requestAnimationFrame(() => {
      void trail.back(tilesOf(arriving), free.current!).then(() => setMoving([]));
    });
  }, [deleted]);

  return { placed, moving, tiles, free };
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
  const { placed, moving, tiles, free } = useDustDeletes(root, cleanup.deleted, (deleted) =>
    setCleanup({ deleted, selected: [] }),
  );

  const shown = ITEMS.filter((item) => !placed.includes(item.id));
  const selected = cleanup.selected.filter((id) => shown.some((item) => item.id === id));
  const photos = PHOTOS_KEPT + sizeOf(shown.map((item) => item.id));

  const select = (id: string, on: boolean) =>
    setCleanup((current) => ({
      ...current,
      selected: on ? [...current.selected, id] : current.selected.filter((picked) => picked !== id),
    }));

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
        className="not-prose relative block w-[min(100%,420px)] overflow-hidden rounded-3xl bg-(--stg-surface) font-sans text-[13px] text-(--stg-ink) antialiased [--stg-bad:#e5484d] [--stg-files:#6366f1] [--stg-free:#ececee] [--stg-good:#16a34a] [--stg-ink:#18181b] [--stg-line:rgb(24_24_27/0.07)] [--stg-mail:#a1a1aa] [--stg-muted:#71717a] [--stg-photos:#f59e0b] [--stg-quiet:#a1a1aa] [--stg-surface:#ffffff] [--stg-well:#f4f4f5] dark:[--stg-bad:#ff6369] dark:[--stg-files:#818cf8] dark:[--stg-free:#2c2c31] dark:[--stg-good:#4ade80] dark:[--stg-ink:#fafafa] dark:[--stg-line:rgb(255_255_255/0.07)] dark:[--stg-mail:#71717a] dark:[--stg-muted:#a1a1aa] dark:[--stg-photos:#fbbf24] dark:[--stg-quiet:#71717a] dark:[--stg-surface:#1c1c1f] dark:[--stg-well:#26262b]"
        aria-label="Free up space"
        style={{ height }}
      >
        <div ref={content} className="grid gap-[18px] p-[18px]">
          <header className="flex items-baseline justify-between">
            <b className="text-[17px] font-[650] tracking-[-0.02em]">Free up space</b>
            <span className="text-[12.5px] text-(--stg-muted)">{TOTAL} GB plan</span>
          </header>

          <StorageBar photos={photos} freeRef={free} />

          <div className="grid gap-2.5">
            <p className="m-0 flex justify-between text-[13px]">
              <b className="font-semibold">Review large items</b>
              <span className="text-(--stg-muted) tabular-nums">{shown.length ? `${gigabytes(sizeOf(shown.map((item) => item.id)))} GB` : ""}</span>
            </p>

            {shown.length > 0 ? (
              <ul className="m-0 grid list-none grid-cols-3 gap-1 p-0">
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
                    ? `${selected.length} selected · ${gigabytes(sizeOf(selected))} GB`
                    : "Tap items to select them"}
                </motion.span>
              </AnimatePresence>
            </span>
            <Button
              className="h-9 cursor-pointer rounded-[10px] border-0 bg-(--stg-bad) px-[18px] font-[inherit] font-semibold text-white transition-colors duration-200 disabled:cursor-default disabled:bg-(--stg-well) disabled:text-(--stg-quiet) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--stg-files)"
              disabled={!selected.length} onClick={remove}>
              Delete
            </Button>
          </div>
        </div>

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
      className="absolute inset-x-0 bottom-0 overflow-hidden rounded-xl bg-(--stg-ink) text-(--stg-surface) shadow-[0_8px_24px_rgb(0_0_0/0.18)] [transform:translateY(var(--toast-swipe-movement-y,0))] [transition:transform_0.4s_cubic-bezier(0.22,1,0.36,1),opacity_0.3s] data-ending-style:[transform:translateY(120%)] data-ending-style:opacity-0 data-starting-style:[transform:translateY(120%)] data-starting-style:opacity-0"
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
