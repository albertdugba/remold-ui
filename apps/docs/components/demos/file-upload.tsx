"use client";

import { Button } from "@base-ui/react/button";
import { Progress } from "@base-ui/react/progress";
import {
  Add01Icon,
  ArrowShrink01Icon,
  Cancel01Icon,
  File01Icon,
  FilePlusIcon,
  Image01Icon,
  Pdf01Icon,
  RefreshIcon,
  Tick02Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { announce } from "@remold-ui/dom";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type ClipboardEvent, type DragEvent, type Ref, type RefObject } from "react";
import { useScene } from "./use-scene";
import { useSpringHeight } from "./use-spring-height";

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  kind: "image" | "pdf" | "file";
  status: "uploading" | "done" | "failed";
  progress: number;
  preview?: string;
  error?: string;
  retryable?: boolean;
  compressTo?: number;
}

export interface FileUploadProps {
  files: readonly UploadItem[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onClear: () => void;
  hint?: string;
  accept?: string;
  refusal?: string;
  dragging?: number | null;
  onSample?: () => void;
  ref?: Ref<HTMLElement>;
}

const KIND_ICON: Record<UploadItem["kind"], typeof File01Icon> = { image: Image01Icon, pdf: Pdf01Icon, file: File01Icon };

const KIND_TINT: Record<UploadItem["kind"], string> = {
  pdf: "bg-[#fdecec] text-[#d93036] dark:bg-[#3b1f21] dark:text-[#ff6b6b]",
  image: "bg-[#e8f0fe] text-[#2563eb] dark:bg-[#1c2740] dark:text-[#60a5fa]",
  file: "bg-(--fup-well) text-(--fup-muted)",
};

const SURFACE = { type: "spring" as const, duration: 0.5, bounce: 0.14 };
const MORPH = { duration: SURFACE.duration, bounce: SURFACE.bounce };
const SETTLE = { type: "spring" as const, duration: 0.35, bounce: 0 };
const POP = { type: "spring" as const, duration: 0.45, bounce: 0.4 };
const SHAKE = { duration: 0.34, ease: "easeOut" as const };
const FOLD_FIRST = 0.18;
const ZONE_OPEN = 200;
const ZONE_FOLDED = 44;

const TOKENS =
  "[--fup-ink:#0a0a0b] [--fup-muted:#6c6c75] [--fup-surface:#ffffff] [--fup-well:#f4f4f5] [--fup-hover:#e9e9ec] [--fup-line:rgb(10_10_11/0.16)] [--fup-track:rgb(10_10_11/0.1)] [--fup-danger:#c8323a] [--fup-danger-tint:#fdeceb] [--fup-good:#16a34a] [--fup-fill:rgb(91_103_241/0.1)] [--fup-accent:#5b67f1] [--fup-accent-ink:#ffffff] [--fup-accent-soft:#eef0fe] [--fup-accent-line:rgb(91_103_241/0.35)] dark:[--fup-ink:#fafafa] dark:[--fup-muted:#a1a1aa] dark:[--fup-surface:#1f1f23] dark:[--fup-well:#2c2c31] dark:[--fup-hover:#37373d] dark:[--fup-line:rgb(255_255_255/0.2)] dark:[--fup-track:rgb(255_255_255/0.12)] dark:[--fup-danger:#f87171] dark:[--fup-danger-tint:#3b2023] dark:[--fup-good:#22c55e] dark:[--fup-fill:rgb(129_140_248/0.16)] dark:[--fup-accent:#818cf8] dark:[--fup-accent-ink:#0f1029] dark:[--fup-accent-soft:#25274a] dark:[--fup-accent-line:rgb(129_140_248/0.45)]";

const RING = "outline-none focus-visible:shadow-[0_0_0_2px_var(--fup-surface),0_0_0_4px_var(--fup-ink)]";
const EASE = "transition-[background-color,color,opacity,scale] duration-150 ease-out motion-reduce:transition-none";
const ICON_BUTTON = `grid size-8 flex-none cursor-pointer place-items-center rounded-full border-0 bg-transparent text-(--fup-muted) hover:bg-(--fup-well) hover:text-(--fup-ink) active:scale-[0.97] [&_svg]:size-4 ${EASE} ${RING}`;

export const accepts = (type: string, accept?: string) =>
  !accept ||
  accept.split(",").some((rule) => {
    const wanted = rule.trim();
    return wanted.endsWith("/*") ? type.startsWith(wanted.slice(0, -1)) : type === wanted;
  });

export const sizeLabel = (bytes: number) =>
  bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;

const plural = (amount: number, one: string, many: string) => `${amount} ${amount === 1 ? one : many}`;

function summary(files: readonly UploadItem[]) {
  if (!files.length) return "No files yet";

  const uploading = files.filter((file) => file.status === "uploading").length;
  const done = files.filter((file) => file.status === "done").length;
  const failed = files.filter((file) => file.status === "failed").length;

  if (uploading) return `Uploading ${plural(uploading, "file", "files")}`;
  if (failed) return done ? `${done} uploaded, ${failed} failed` : `${plural(failed, "upload", "uploads")} failed`;
  return `${plural(files.length, "file", "files")} uploaded`;
}

const bytesLeft = (files: readonly UploadItem[]) =>
  files.reduce((sum, file) => (file.status === "uploading" ? sum + file.size * (1 - file.progress) : sum), 0);

const carriesFiles = (event: DragEvent) => event.dataTransfer.types.includes("Files");

interface DragOver {
  usable: number;
  refused: boolean;
}

function useFileDrag(accept: string | undefined, onAdd: (files: File[]) => void) {
  const [over, setOver] = useState<DragOver | null>(null);
  const depth = useRef(0);

  const leave = () => {
    depth.current = 0;
    setOver(null);
  };

  const handlers = {
    onDragEnter: (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      depth.current += 1;
      const carried = [...event.dataTransfer.items].filter((item) => item.kind === "file");
      const usable = carried.filter((item) => !item.type || accepts(item.type, accept)).length;
      setOver({ usable, refused: carried.length > 0 && usable === 0 });
    },
    onDragOver: (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = over?.refused ? "none" : "copy";
    },
    onDragLeave: (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (!depth.current) leave();
    },
    onDrop: (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      leave();
      onAdd([...event.dataTransfer.files]);
    },
    onPaste: (event: ClipboardEvent) => {
      const pasted = [...event.clipboardData.files];
      if (!pasted.length) return;
      event.preventDefault();
      onAdd(pasted);
    },
  };

  return { usable: over?.usable || null, refusing: over?.refused ?? false, handlers };
}

function useFoldedHeight(content: RefObject<HTMLElement | null>, zone: RefObject<HTMLElement | null>, zoneHeight: number, rows: number) {
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const box = content.current;
    const drop = zone.current;
    if (!box || !drop) return;

    const measure = () => setHeight(box.offsetHeight - drop.offsetHeight + zoneHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [content, zone, zoneHeight, rows]);

  return height;
}

function useWasEmpty(empty: boolean) {
  const previous = useRef(empty);
  useEffect(() => {
    previous.current = empty;
  }, [empty]);
  return previous.current;
}

function Thumbnail({ file, failed }: { file: UploadItem; failed: boolean }) {
  const [broken, setBroken] = useState(false);

  return (
    <span
      data-failed={failed || undefined}
      className={`relative grid size-10 flex-none place-items-center overflow-hidden rounded-[11px] transition-[background-color,color] duration-200 ease-out data-failed:bg-(--fup-danger-tint) data-failed:text-(--fup-danger) motion-reduce:transition-none [&_svg]:size-5 ${KIND_TINT[file.kind]}`}
    >
      {file.preview && !broken ? (
        <img src={file.preview} alt="" width={40} height={40} className="size-full object-cover" draggable={false} onError={() => setBroken(true)} />
      ) : (
        <HugeiconsIcon icon={KIND_ICON[file.kind]} strokeWidth={1.8} aria-hidden="true" />
      )}
    </span>
  );
}

function RetryButton({ file, reduced, onRetry }: { file: UploadItem; reduced: boolean; onRetry: () => void }) {
  const compressing = Boolean(file.compressTo);

  return (
    <motion.button
      type="button"
      onClick={onRetry}
      aria-label={file.compressTo ? `Compress ${file.name} to ${sizeLabel(file.compressTo)}` : `Try ${file.name} again`}
      className={`relative flex h-8 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-(--fup-danger-tint) pr-3 pl-2.5 font-sans text-[13px] font-semibold text-(--fup-danger) active:scale-[0.97] [&_svg]:size-3.5 ${EASE} ${RING}`}
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.8, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      transition={POP}
    >
      <HugeiconsIcon icon={compressing ? ArrowShrink01Icon : RefreshIcon} strokeWidth={2.2} aria-hidden="true" />
      {compressing ? "Compress" : "Retry"}
    </motion.button>
  );
}

function DoneTick({ reduced }: { reduced: boolean }) {
  return (
    <motion.span
      className="pointer-events-none absolute grid size-5 place-items-center rounded-full bg-(--fup-good) text-white transition-opacity duration-150 group-focus-within/row:opacity-0 group-hover/row:opacity-0 [&_svg]:size-3"
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.12 } }}
      transition={{ ...POP, delay: 0.15 }}
    >
      <HugeiconsIcon icon={Tick02Icon} strokeWidth={3} aria-hidden="true" />
      <span className="sr-only">Uploaded</span>
    </motion.span>
  );
}

function Row({ file, onRemove, onRetry }: { file: UploadItem; onRemove: () => void; onRetry: () => void }) {
  const reduced = useReducedMotion() ?? false;
  const uploading = file.status === "uploading";
  const failed = file.status === "failed";
  const done = file.status === "done";
  const percent = Math.round(file.progress * 100);

  return (
    <motion.div
      className="group/row relative flex h-[60px] items-center gap-3 rounded-[14px] pr-1.5 pl-2"
      animate={{ x: failed && !reduced ? [0, -7, 6, -4, 2, 0] : 0 }}
      transition={SHAKE}
    >
      <Progress.Root
        value={percent}
        aria-label={`Uploading ${file.name}`}
        className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] transition-opacity duration-300 ease-out motion-reduce:transition-none ${uploading ? "opacity-100" : "opacity-0"}`}
      >
        <Progress.Track className="block size-full">
          <Progress.Indicator className="block h-full bg-(--fup-fill) transition-[width] duration-200 ease-linear motion-reduce:transition-none" />
        </Progress.Track>
      </Progress.Root>

      <Thumbnail file={file} failed={failed} />

      <span className="relative grid min-w-0 flex-1 gap-0.5">
        <span className="truncate text-[14px] leading-5 font-medium">{file.name}</span>
        <span data-failed={failed || undefined} className="truncate text-[12.5px] leading-[18px] text-(--fup-muted) tabular-nums data-failed:text-(--fup-danger)">
          {uploading ? (
            `${percent}% · ${sizeLabel(file.size * file.progress)} of ${sizeLabel(file.size)}`
          ) : (
            <Remold.Text className="inline-block whitespace-nowrap">{failed ? (file.error ?? "Upload failed") : sizeLabel(file.size)}</Remold.Text>
          )}
        </span>
      </span>

      <AnimatePresence initial={false}>{failed && file.retryable !== false && <RetryButton key="retry" file={file} reduced={reduced} onRetry={onRetry} />}</AnimatePresence>

      <span className="relative grid size-8 flex-none place-items-center">
        <AnimatePresence initial={false}>{done && <DoneTick key="done" reduced={reduced} />}</AnimatePresence>
        <button
          type="button"
          data-fup-remove={file.id}
          onClick={onRemove}
          aria-label={uploading ? `Cancel ${file.name}` : `Remove ${file.name}`}
          className={`${ICON_BUTTON} ${done ? "opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100" : ""}`}
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </span>
    </motion.div>
  );
}

function Header({ files, reduced, onClear }: { files: readonly UploadItem[]; reduced: boolean; onClear: () => void }) {
  const left = bytesLeft(files);
  const settled = files.length > 0 && files.every((file) => file.status !== "uploading");

  return (
    <header className="mb-3 flex min-h-10 items-center gap-3 px-1.5">
      <span className="grid min-w-0 flex-1 leading-[1.3]">
        <h2 className="m-0 text-[15.5px] font-semibold tracking-[-0.01em]">Upload files</h2>
        <p className="m-0 truncate text-[13px] text-(--fup-muted)" role="status">
          <Remold.Text className="inline-block whitespace-nowrap">{summary(files)}</Remold.Text>
          {left > 0 && <span className="tabular-nums">{` · ${sizeLabel(left)} left`}</span>}
        </p>
      </span>
      <AnimatePresence initial={false}>
        {settled && (
          <motion.button
            key="clear"
            type="button"
            onClick={onClear}
            className={`h-8 flex-none cursor-pointer rounded-full border-0 bg-(--fup-well) px-3 font-sans text-[13px] font-semibold text-(--fup-ink) hover:bg-(--fup-hover) active:scale-[0.97] ${EASE} ${RING}`}
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)", transition: SETTLE }}
            transition={SETTLE}
          >
            Clear all
          </motion.button>
        )}
      </AnimatePresence>
    </header>
  );
}

interface ZoneState {
  empty: boolean;
  dragging: number | null;
  refusing: boolean;
}

function zoneTitle({ empty, dragging, refusing }: ZoneState, refusal: string) {
  if (refusing) return refusal;
  if (dragging) return `Let go to upload ${plural(dragging, "file", "files")}`;
  return empty ? "Drop or paste files here" : "Add more files";
}

function zoneLook({ empty, dragging, refusing }: ZoneState) {
  if (refusing) return "cursor-not-allowed bg-(--fup-danger-tint) text-(--fup-danger) outline-(--fup-danger)";
  if (dragging) return "bg-(--fup-accent-soft) text-(--fup-accent) outline-(--fup-accent)";
  if (empty) return "bg-transparent text-(--fup-ink) outline-(--fup-accent-line)";
  return "bg-transparent text-(--fup-accent) outline-(--fup-accent-line) hover:bg-(--fup-accent-soft)";
}

interface DropZoneProps extends ZoneState {
  zone: RefObject<HTMLButtonElement | null>;
  hint: string;
  refusal: string;
  onPick: () => void;
}

function DropZone({ zone, hint, refusal, onPick, ...state }: DropZoneProps) {
  const { empty, dragging, refusing } = state;
  const quiet = empty && !dragging && !refusing;
  const folded = !empty && !dragging && !refusing;

  return (
    <Remold.Morph trigger={[empty, Boolean(dragging), refusing]} spring={MORPH}>
      <Button
        ref={zone}
        data-fup-zone=""
        data-dragging={dragging ? "" : undefined}
        data-refusing={refusing || undefined}
        data-empty={empty || undefined}
        onClick={onPick}
        style={{ height: empty ? ZONE_OPEN : ZONE_FOLDED }}
        className={`group/zone relative grid w-full cursor-pointer place-items-center overflow-hidden rounded-[16px] border-0 p-0 font-sans outline-[1.5px] -outline-offset-[1.5px] outline-dashed transition-[background-color,color,outline-color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-(--fup-ink) focus-visible:outline-solid motion-reduce:transition-none ${zoneLook(state)}`}
      >
        <span className={empty ? "grid justify-items-center gap-2.5 px-6" : "flex w-full items-center justify-center gap-2 px-3"}>
          <span
            className={`grid size-10 flex-none place-items-center rounded-[12px] shadow-[0_0_0_1px_transparent,0_1px_2px_transparent] transition-[background-color,box-shadow,color] duration-200 ease-out motion-reduce:transition-none ${
              empty ? "bg-(--fup-accent-soft) text-(--fup-accent) [&_svg]:size-6" : "size-5 bg-transparent [&_svg]:size-4"
            }`}
          >
            <span className={`grid transition-[translate,scale] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${dragging ? "-translate-y-[3px] scale-[1.08]" : ""}`}>
              <Remold.Icon
                icon={<HugeiconsIcon icon={dragging ? Upload01Icon : empty ? FilePlusIcon : Add01Icon} />}
                strokeWidth={empty ? 1.6 : 1.9}
                spring={{ duration: 0.4, bounce: 0.1 }}
                aria-hidden="true"
              />
            </span>
          </span>
          <span className={`grid gap-0.5 ${empty ? "justify-items-center text-center" : "text-left"}`}>
            <span className={`text-[13.5px] transition-[color] duration-150 ease-out motion-reduce:transition-none ${empty ? "" : "font-medium"} ${quiet ? "text-(--fup-muted)" : ""}`}>
              <Remold.Text key={empty ? "open" : "folded"} className="inline-block whitespace-nowrap">
                {zoneTitle(state, refusal)}
              </Remold.Text>
            </span>
            {quiet && <span className="text-[13.5px] text-(--fup-muted)">{hint}</span>}
          </span>
          {quiet && (
            <span className="mt-1.5 inline-flex h-8 items-center gap-1.5 rounded-[10px] bg-(--fup-accent) pr-3 pl-2.5 text-[13px] font-semibold text-(--fup-accent-ink) shadow-[0_1px_2px_rgb(0_0_0/0.12)] transition-[background-color,scale] duration-150 ease-out group-hover/zone:bg-(--fup-accent)/88 group-active/zone:scale-[0.97] motion-reduce:transition-none [&_svg]:size-3.5">
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2.4} aria-hidden="true" />
              <span>Add files</span>
            </span>
          )}
          {folded && <span className="text-[13px] whitespace-nowrap opacity-70">or drop them here</span>}
        </span>
      </Button>
    </Remold.Morph>
  );
}

function SampleOffer({ onSample }: { onSample: () => void }) {
  return (
    <motion.p className="m-0 pt-3 text-center text-[12.5px] text-(--fup-muted)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
      No files handy?{" "}
      <button
        type="button"
        onClick={onSample}
        className={`cursor-pointer rounded-[6px] border-0 bg-transparent p-0 font-sans text-[12.5px] font-semibold text-(--fup-accent) underline decoration-(--fup-accent-line) underline-offset-[3px] transition-[text-decoration-color] duration-150 hover:decoration-(--fup-accent) ${RING}`}
      >
        Try sample files
      </button>
    </motion.p>
  );
}

export function FileUpload({
  files,
  onAdd,
  onRemove,
  onRetry,
  onClear,
  hint = "Up to 25 MB each",
  accept,
  refusal = "That file type isn’t supported",
  dragging: forcedDragging,
  onSample,
  ref,
}: FileUploadProps) {
  const reduced = useReducedMotion() ?? false;
  const root = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const zone = useRef<HTMLButtonElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const drag = useFileDrag(accept, onAdd);

  const empty = files.length === 0;
  const dragging = forcedDragging ?? drag.usable;
  const landing = useWasEmpty(empty) && !empty ? FOLD_FIRST : 0;
  const height = useFoldedHeight(content, zone, empty ? ZONE_OPEN : ZONE_FOLDED, files.length);
  const sprung = useSpringHeight(height === null ? null : height + 12);

  const focusWithin = (selector: string) => root.current?.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });

  const remove = (id: string) => {
    const removes = [...(root.current?.querySelectorAll<HTMLElement>("[data-fup-remove]") ?? [])];
    const at = removes.findIndex((button) => button.dataset.fupRemove === id);
    if (removes[at] === document.activeElement) {
      const neighbour = removes[at + 1] ?? removes[at - 1];
      if (neighbour) neighbour.focus({ preventScroll: true });
      else focusWithin("[data-fup-zone]");
    }
    onRemove(id);
  };

  const retry = (id: string) => {
    focusWithin(`[data-fup-remove="${CSS.escape(id)}"]`);
    onRetry(id);
  };

  const clear = () => {
    focusWithin("[data-fup-zone]");
    onClear();
  };

  const attach = (node: HTMLElement | null) => {
    root.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  return (
    <MotionConfig transition={SURFACE} reducedMotion="user">
      <section ref={attach} {...drag.handlers} className={`w-[min(100%,420px)] rounded-[24px] bg-(--fup-surface) p-4 font-sans text-(--fup-ink) ${TOKENS}`} aria-label="Upload files">
        <motion.div className="-m-1.5 overflow-hidden p-1.5" style={{ height: sprung }}>
          <div ref={content} className="grid grid-cols-[minmax(0,1fr)]">
            <Header files={files} reduced={reduced} onClear={clear} />

            <input
              ref={picker}
              type="file"
              multiple
              accept={accept}
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
              onChange={(event) => {
                onAdd([...(event.target.files ?? [])]);
                event.target.value = "";
              }}
            />

            <DropZone zone={zone} empty={empty} dragging={dragging} refusing={drag.refusing} hint={hint} refusal={refusal} onPick={() => picker.current?.click()} />

            <AnimatePresence initial={false}>{empty && onSample && <SampleOffer key="sample" onSample={onSample} />}</AnimatePresence>

            <ul data-empty={empty || undefined} className="m-0 grid list-none grid-cols-[minmax(0,1fr)] p-0 pt-3 data-empty:pt-0" aria-label="Files">
              <AnimatePresence initial={false} mode="popLayout">
                {files.map((file, index) => (
                  <motion.li
                    key={file.id}
                    layout="position"
                    className="grid grid-cols-[minmax(0,1fr)]"
                    initial={reduced ? { opacity: 0 } : { opacity: 0, y: -14, scale: 0.97, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, filter: "blur(4px)", transition: SETTLE }}
                    transition={{ ...SURFACE, delay: landing + Math.min(index, 4) * 0.04 }}
                  >
                    <Row file={file} onRemove={() => remove(file.id)} onRetry={() => retry(file.id)} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        </motion.div>
      </section>
    </MotionConfig>
  );
}

const LIMIT = 25_000_000;
const TICK = 160;
const ACCEPT = "image/*,application/pdf";
const REFUSAL = "Only images and PDFs";

const svgData = (markup: string) => `data:image/svg+xml,${encodeURIComponent(markup)}`;

const MOODBOARD = svgData(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" fill="#d4d4d8"/><circle cx="38" cy="18" r="9" fill="#fafafa"/><path d="M0 44l16-16 12 10 10-8 18 14v12H0z" fill="#3f3f46"/><path d="M0 50l20-12 14 8 22-10v20H0z" fill="#18181b"/></svg>',
);

const RECEIPT = svgData(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" fill="#e7e5e4"/><rect x="16" y="9" width="24" height="38" rx="2" fill="#fafaf9"/><path d="M21 17h14M21 22h10M21 27h14M21 32h8" stroke="#a8a29e" stroke-width="2" stroke-linecap="round"/><path d="M21 39h14" stroke="#44403c" stroke-width="2.5" stroke-linecap="round"/></svg>',
);

const SAMPLES: readonly UploadItem[] = [
  { id: "brief", name: "launch-brief.pdf", size: 240_000, kind: "pdf", status: "uploading", progress: 0 },
  { id: "moodboard", name: "moodboard.png", size: 1_200_000, kind: "image", status: "uploading", progress: 0, preview: MOODBOARD },
  { id: "survey", name: "site-survey.pdf", size: 32_400_000, kind: "pdf", status: "failed", progress: 0, error: "Too large · 32.4 MB", retryable: true, compressTo: 14_200_000 },
  { id: "receipt", name: "receipt.jpg", size: 86_000, kind: "image", status: "uploading", progress: 0, preview: RECEIPT },
  { id: "budget", name: "budget.xlsx", size: 86_000, kind: "file", status: "failed", progress: 0, error: REFUSAL, retryable: false },
];

interface State {
  files: readonly UploadItem[];
  dragging: number | null;
}

type Beat = State & { ms: number };

const uploadTime = (file: UploadItem) => 1100 + Math.min(3200, file.size / 5500);

function advance(state: State, elapsed: number): State {
  const files = state.files.map((file): UploadItem => {
    if (file.status !== "uploading") return file;
    const progress = Math.min(1, file.progress + elapsed / uploadTime(file));
    return progress >= 1 ? { ...file, status: "done", progress: 1 } : { ...file, progress };
  });
  return { ...state, files };
}

const resend = (file: UploadItem): UploadItem => ({
  ...file,
  size: file.compressTo ?? file.size,
  compressTo: undefined,
  status: "uploading",
  progress: 0,
  error: undefined,
});

const busy = (state: State) => state.files.some((file) => file.status === "uploading");

const isNew = (current: readonly UploadItem[]) => (file: UploadItem) => !current.some((existing) => existing.id === file.id);

function playUntilSettled(state: State, beats: Beat[]) {
  let next = state;
  for (; busy(next); next = advance(next, TICK)) beats.push({ ...next, ms: TICK });
  return next;
}

function buildBeats() {
  const empty: State = { files: [], dragging: null };
  const beats: Beat[] = [
    { ...empty, ms: 1500 },
    { ...empty, dragging: 3, ms: 1100 },
  ];

  const dropped = playUntilSettled({ files: SAMPLES.slice(0, 3), dragging: null }, beats);
  beats.push({ ...dropped, ms: 1300 });

  const retried = { ...dropped, files: dropped.files.map((file) => (file.status === "failed" && file.retryable !== false ? resend(file) : file)) };
  const settled = playUntilSettled(retried, beats);
  beats.push({ ...settled, ms: 2600 });

  return beats;
}

const BEATS = buildBeats();
const PREVIEW_BEAT = BEATS[Math.min(BEATS.length - 1, 8)]!;

const fromBeat = (step: number): State => {
  const { ms: _ms, ...state } = BEATS[step]!;
  return state;
};

const kindOf = (file: File): UploadItem["kind"] => (file.type.startsWith("image/") ? "image" : file.type === "application/pdf" ? "pdf" : "file");

function refusalFor(file: File) {
  if (!accepts(file.type, ACCEPT)) return REFUSAL;
  if (file.size > LIMIT) return "Too large. The limit is 25 MB.";
  return undefined;
}

function usePreviewUrls() {
  const urls = useRef(new Map<string, string>());

  useEffect(() => {
    const made = urls.current;
    return () => made.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  return {
    create: (id: string, file: File) => {
      if (!urls.current.has(id)) urls.current.set(id, URL.createObjectURL(file));
      return urls.current.get(id);
    },
    release: (ids: readonly string[]) => {
      for (const id of ids) {
        const url = urls.current.get(id);
        if (url) URL.revokeObjectURL(url);
        urls.current.delete(id);
      }
    },
  };
}

export function FileUploadDemo({ playing, preview }: { playing?: boolean; preview?: boolean } = {}) {
  const { ref, state, takeOver, live, taken } = useScene(BEATS, fromBeat, playing, false, preview ? PREVIEW_BEAT : undefined);
  const previewUrls = usePreviewUrls();
  const ticking = !live && !(preview && !taken) && busy(state);

  const tick = useEffectEvent(() => {
    const next = advance(state, TICK);
    for (const file of next.files) {
      const before = state.files.find((earlier) => earlier.id === file.id);
      if (before?.status === "uploading" && file.status === "done") announce(`${file.name} uploaded`);
    }
    takeOver(next);
  });

  useEffect(() => {
    if (!ticking) return;
    const timer = setInterval(tick, TICK);
    return () => clearInterval(timer);
  }, [ticking]);

  const add = (picked: File[]) => {
    const fresh = picked.map((file): UploadItem => {
      const id = `${file.name}-${file.size}-${file.lastModified}`;
      const error = refusalFor(file);
      const kind = kindOf(file);
      return {
        id,
        name: file.name,
        size: file.size,
        kind,
        preview: kind === "image" && !error ? previewUrls.create(id, file) : undefined,
        status: error ? "failed" : "uploading",
        progress: 0,
        error,
        retryable: !error,
      };
    });
    takeOver((current) => ({ dragging: null, files: [...current.files, ...fresh.filter(isNew(current.files))] }));
  };

  const addSamples = () => takeOver((current) => ({ dragging: null, files: [...current.files, ...SAMPLES.filter(isNew(current.files))] }));

  const remove = (id: string) => {
    previewUrls.release([id]);
    takeOver((current) => ({ ...current, files: current.files.filter((file) => file.id !== id) }));
  };

  const retry = (id: string) => takeOver((current) => ({ ...current, files: current.files.map((file) => (file.id === id ? resend(file) : file)) }));

  const clear = () => {
    previewUrls.release(state.files.map((file) => file.id));
    takeOver((current) => ({ ...current, files: [] }));
  };

  return (
    <div ref={ref} className={`not-prose grid w-full justify-items-center gap-4 font-sans antialiased ${TOKENS}`}>
      <div className="grid min-h-[452px] w-full content-start justify-items-center">
        <FileUpload
          files={state.files}
          dragging={state.dragging}
          accept={ACCEPT}
          refusal={REFUSAL}
          hint="Images and PDFs, up to 25 MB each"
          onAdd={add}
          onSample={addSamples}
          onRemove={remove}
          onRetry={retry}
          onClear={clear}
        />
      </div>
    </div>
  );
}
