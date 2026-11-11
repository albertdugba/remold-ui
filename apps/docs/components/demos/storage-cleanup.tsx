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
import { useLayoutEffect, useRef, useState, type CSSProperties, type Ref, type RefObject } from "react";
import { Odometer } from "./odometer";
import { useControllableState } from "./use-controllable-state";
import { useMeasuredSize } from "./use-measured-size";
import { useScene } from "./use-scene";
import "./storage-cleanup.css";

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
  /** Gigabytes. */
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

const photoUrl = (id: number) => `https://picsum.photos/id/${id}/320/320`;
const gigabytes = (value: number) => value.toFixed(1);
const sizeOf = (ids: readonly string[]) =>
  ITEMS.filter((item) => ids.includes(item.id)).reduce((sum, item) => sum + item.size, 0);

export interface StorageCleanupValue {
  /** The ids of the items deleted. */
  deleted: string[];
  /** The ids of the ticked items. */
  selected: string[];
}

export interface StorageCleanupProps {
  value?: StorageCleanupValue;
  defaultValue?: StorageCleanupValue;
  onValueChange?: (value: StorageCleanupValue) => void;
  ref?: Ref<HTMLElement>;
}

/** A cloud storage clean-up: deleted photos break into dust that pours into the free space. */
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
    { name: "Photos", size: photos, tone: "photos" },
    { name: "Files", size: FILES, tone: "files" },
    { name: "Mail", size: MAIL, tone: "mail" },
  ];

  return (
    <div className="stg-storage">
      <p className="stg-used">
        <b>
          <Odometer value={gigabytes(used)} /> GB
        </b>
        <span>of {TOTAL} GB used</span>
      </p>
      <div
        className="stg-bar"
        role="meter"
        aria-label="Storage used"
        aria-valuemin={0}
        aria-valuemax={TOTAL}
        aria-valuenow={Number(gigabytes(used))}
      >
        {segments.map((segment) => (
          <motion.span
            key={segment.tone}
            className="stg-segment"
            data-tone={segment.tone}
            initial={false}
            animate={{ flexGrow: segment.size }}
            transition={FOLD}
          />
        ))}
        <motion.span
          ref={freeRef}
          className="stg-segment"
          data-tone="free"
          initial={false}
          animate={{ flexGrow: TOTAL - used }}
          transition={FOLD}
        />
      </div>
      <ul className="stg-legend">
        {segments.map((segment) => (
          <li key={segment.tone} data-tone={segment.tone}>
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
    <motion.li layout="position" transition={FOLD} className="stg-cell">
      <Checkbox.Root
        className="stg-tile"
        checked={selected}
        onCheckedChange={onSelect}
        aria-label={`${kind.label(item)}, ${gigabytes(item.size)} GB`}
        data-moving={moving || undefined}
        ref={(tile: HTMLElement | null) => {
          if (tile) tileRefs.current.set(item.id, tile);
        }}
      >
        <img src={photoUrl(item.photo)} crossOrigin="anonymous" alt="" draggable={false} />
        <span className="stg-check" aria-hidden="true">
          <Checkbox.Indicator className="stg-tick">
            <HugeiconsIcon icon={CheckIcon} size={12} strokeWidth={2.6} />
          </Checkbox.Indicator>
        </span>
        <span className="stg-tag">
          <HugeiconsIcon icon={kind.icon} size={11} strokeWidth={2.2} aria-hidden="true" />
          {kind.label(item)}
        </span>
        <span className="stg-size">{gigabytes(item.size)} GB</span>
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
        className="stg not-prose"
        aria-label="Free up space"
        style={{ height }}
      >
        <div ref={content} className="stg-content">
          <header className="stg-head">
            <b>Free up space</b>
            <span>{TOTAL} GB plan</span>
          </header>

          <StorageBar photos={photos} freeRef={free} />

          <div className="stg-review">
            <p className="stg-review-head">
              <b>Review large items</b>
              <span>{shown.length ? `${gigabytes(sizeOf(shown.map((item) => item.id)))} GB` : ""}</span>
            </p>

            {shown.length > 0 ? (
              <ul className="stg-grid">
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
              <div className="stg-done">
                <Remold.Particles
                  className="stg-done-art"
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

          <div className="stg-actions">
            <span>
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
            <Button className="stg-delete" disabled={!selected.length} onClick={remove}>
              Delete
            </Button>
          </div>
        </div>

        <Toast.Viewport className="stg-toasts">
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
      className="stg-toast"
      style={{ "--stg-undo": `${UNDO_MS}ms` } as CSSProperties}
    >
      <Toast.Content className="stg-toast-body">
        <Toast.Title className="stg-toast-title" render={<p />} />
        <Toast.Action className="stg-undo" />
      </Toast.Content>
      <span className="stg-countdown" aria-hidden="true" />
    </Toast.Root>
  ));
}

// The docs demo: a short scripted scene that plays the element above. Your app doesn't need it.

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
