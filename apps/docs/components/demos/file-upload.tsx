"use client";

import { Button } from "@base-ui/react/button";
import { Progress } from "@base-ui/react/progress";
import {
  Add01Icon,
  Cancel01Icon,
  File01Icon,
  Image01Icon,
  Pdf01Icon,
  RefreshIcon,
  Tick02Icon,
  Upload04Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { announce } from "@remold-ui/dom";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, MotionConfig, motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type DragEvent, type Ref } from "react";
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
  ref?: Ref<HTMLElement>;
}

type Glyph = typeof File01Icon;

const KIND: Record<UploadItem["kind"], Glyph> = { image: Image01Icon, pdf: Pdf01Icon, file: File01Icon };

const TINT: Record<UploadItem["kind"], string> = {
  pdf: "bg-[#fdecec] text-[#d93036] dark:bg-[#3b1f21] dark:text-[#ff6b6b]",
  image: "bg-[#e8f0fe] text-[#2563eb] dark:bg-[#1c2740] dark:text-[#60a5fa]",
  file: "bg-(--fup-well) text-(--fup-muted)",
};

export const accepts = (type: string, accept?: string) =>
  !accept ||
  accept.split(",").some((rule) => {
    const wanted = rule.trim();

    return wanted.endsWith("/*") ? type.startsWith(wanted.slice(0, -1)) : type === wanted;
  });

const SURFACE = { type: "spring" as const, duration: 0.5, bounce: 0.14 };
const SETTLE = { type: "spring" as const, duration: 0.35, bounce: 0 };
const POP = { type: "spring" as const, duration: 0.45, bounce: 0.4 };
const SHAKE = { duration: 0.34, ease: "easeOut" as const };
const ZONE_OPEN = 176;
const ZONE_FOLDED = 56;

const TOKENS =
  "[--fup-ink:#0a0a0b] [--fup-muted:#6c6c75] [--fup-surface:#ffffff] [--fup-well:#f4f4f5] [--fup-hover:#e9e9ec] [--fup-line:rgb(10_10_11/0.16)] [--fup-track:rgb(10_10_11/0.1)] [--fup-danger:#c8323a] [--fup-danger-tint:#fdeceb] [--fup-good:#16a34a] dark:[--fup-ink:#fafafa] dark:[--fup-muted:#a1a1aa] dark:[--fup-surface:#1f1f23] dark:[--fup-well:#2c2c31] dark:[--fup-hover:#37373d] dark:[--fup-line:rgb(255_255_255/0.2)] dark:[--fup-track:rgb(255_255_255/0.12)] dark:[--fup-danger:#f87171] dark:[--fup-danger-tint:#3b2023] dark:[--fup-good:#22c55e]";

const RING = "outline-none focus-visible:shadow-[0_0_0_2px_var(--fup-surface),0_0_0_4px_var(--fup-ink)]";
const EASE = "transition-[background-color,color,opacity,scale] duration-150 ease-out motion-reduce:transition-none";
const ICON_BUTTON = `grid size-8 flex-none cursor-pointer place-items-center rounded-full border-0 bg-transparent text-(--fup-muted) hover:bg-(--fup-well) hover:text-(--fup-ink) active:scale-[0.97] [&_svg]:size-4 ${EASE} ${RING}`;

export const sizeLabel = (bytes: number) =>
  bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;

const count = (amount: number, one: string, many: string) => `${amount} ${amount === 1 ? one : many}`;

function summary(files: readonly UploadItem[], hint: string) {
  if (!files.length) return hint;

  const done = files.filter((file) => file.status === "done").length;
  const failed = files.filter((file) => file.status === "failed").length;

  if (done + failed < files.length) return `Uploading ${done + 1} of ${files.length}`;
  if (failed) return done ? `${done} uploaded, ${failed} failed` : `${count(failed, "upload", "uploads")} failed`;

  return files.length === 1 ? "1 file uploaded" : `All ${files.length} uploaded`;
}

function Row({ file, onRemove, onRetry }: { file: UploadItem; onRemove: () => void; onRetry: () => void }) {
  const reduced = useReducedMotion();
  const [scope, shake] = useAnimate<HTMLDivElement>();
  const [broken, setBroken] = useState(false);
  const uploading = file.status === "uploading";
  const failed = file.status === "failed";
  const percent = Math.round(file.progress * 100);

  useEffect(() => {
    if (!failed || reduced || !scope.current) return;

    shake(scope.current, { x: [0, -7, 6, -4, 2, 0] }, SHAKE);
  }, [failed, reduced, scope, shake]);

  return (
    <div ref={scope} className="flex h-[60px] items-center gap-3 pr-1 pl-1.5">
      <span
        data-failed={failed || undefined}
        className={`grid size-10 flex-none place-items-center overflow-hidden rounded-[12px] transition-[background-color,color] duration-200 ease-out data-failed:bg-(--fup-danger-tint) data-failed:text-(--fup-danger) motion-reduce:transition-none [&_svg]:size-5 ${TINT[file.kind]}`}
      >
        {file.preview && !broken ? (
          <img src={file.preview} alt="" width={40} height={40} className="size-full object-cover" draggable={false} onError={() => setBroken(true)} />
        ) : (
          <HugeiconsIcon icon={KIND[file.kind]} strokeWidth={1.8} aria-hidden="true" />
        )}
      </span>

      <span className="grid min-w-0 flex-1 gap-[5px]">
        <span className="truncate text-[14px] leading-5 font-medium">{file.name}</span>
        <span className="relative block h-[18px]">
          <AnimatePresence initial={false}>
            {uploading ? (
              <motion.span
                key="bar"
                className="absolute inset-x-0 top-[7px] block origin-right"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scaleX: 0, transition: SETTLE }}
              >
                <Progress.Root value={percent} aria-label={`Uploading ${file.name}`} className="block">
                  <Progress.Track className="block h-1 overflow-hidden rounded-full bg-(--fup-track)">
                    <Progress.Indicator className="block h-full rounded-full bg-(--fup-ink) transition-[width] duration-200 ease-linear motion-reduce:transition-none" />
                  </Progress.Track>
                </Progress.Root>
              </motion.span>
            ) : (
              <motion.span
                key={file.status}
                data-failed={failed || undefined}
                className="absolute inset-0 truncate text-[12.5px] leading-[18px] text-(--fup-muted) data-failed:text-(--fup-danger)"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4, filter: "blur(3px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={{ ...SETTLE, delay: 0.1 }}
              >
                {failed ? (file.error ?? "Upload failed") : sizeLabel(file.size)}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </span>

      <span className="grid h-8 min-w-8 flex-none place-items-center">
        <AnimatePresence initial={false} mode="popLayout">
          {uploading ? (
            <motion.span
              key="percent"
              className="text-[12.5px] text-(--fup-muted) tabular-nums"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              aria-hidden="true"
            >
              {percent}%
            </motion.span>
          ) : failed ? (
            file.retryable !== false && (
              <motion.button
                key="retry"
                type="button"
                onClick={onRetry}
                aria-label={`Try ${file.name} again`}
                className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-(--fup-danger-tint) pr-3 pl-2.5 font-sans text-[13px] font-semibold text-(--fup-danger) active:scale-[0.97] [&_svg]:size-3.5 ${EASE} ${RING}`}
                initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={POP}
              >
                <HugeiconsIcon icon={RefreshIcon} strokeWidth={2.2} aria-hidden="true" />
                Retry
              </motion.button>
            )
          ) : (
            <motion.span
              key="done"
              className="grid size-6 place-items-center rounded-full bg-(--fup-good) text-white [&_svg]:size-3.5"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ ...POP, delay: 0.12 }}
            >
              <HugeiconsIcon icon={Tick02Icon} strokeWidth={3} aria-hidden="true" />
              <span className="sr-only">Uploaded</span>
            </motion.span>
          )}
        </AnimatePresence>
      </span>

      <button type="button" data-fup-remove={file.id} onClick={onRemove} aria-label={uploading ? `Cancel ${file.name}` : `Remove ${file.name}`} className={ICON_BUTTON}>
        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </div>
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
  dragging: forced,
  ref,
}: FileUploadProps) {
  const reduced = useReducedMotion();
  const [height, setHeight] = useState<number | null>(null);
  const [hovering, setHovering] = useState<number | null>(null);
  const [refusing, setRefusing] = useState(false);
  const root = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const zone = useRef<HTMLButtonElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const dragging = forced ?? hovering;
  const empty = files.length === 0;
  const settled = files.length > 0 && files.every((file) => file.status !== "uploading");
  const tall = empty ? ZONE_OPEN : ZONE_FOLDED;
  const sprung = useSpringHeight(height === null ? null : height + 12);

  useLayoutEffect(() => {
    const box = content.current;
    const drop = zone.current;

    if (!box || !drop) return;

    const measure = () => setHeight(box.offsetHeight - drop.offsetHeight + tall);
    const observer = new ResizeObserver(measure);

    measure();
    observer.observe(box);

    return () => observer.disconnect();
  }, [tall, files.length]);

  const remove = (id: string) => {
    const card = root.current;
    const removes = [...(card?.querySelectorAll<HTMLElement>("[data-fup-remove]") ?? [])];
    const at = removes.findIndex((button) => button.dataset.fupRemove === id);

    if (removes[at] === document.activeElement) {
      (removes[at + 1] ?? removes[at - 1] ?? card?.querySelector<HTMLElement>("[data-fup-zone]"))?.focus({ preventScroll: true });
    }

    onRemove(id);
  };

  const retry = (id: string) => {
    root.current?.querySelector<HTMLElement>(`[data-fup-remove="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
    onRetry(id);
  };

  const clear = () => {
    root.current?.querySelector<HTMLElement>("[data-fup-zone]")?.focus({ preventScroll: true });
    onClear();
  };

  const carriesFiles = (event: DragEvent) => event.dataTransfer.types.includes("Files");

  const onDragEnter = (event: DragEvent) => {
    if (!carriesFiles(event)) return;

    event.preventDefault();
    depth.current += 1;

    const carried = [...event.dataTransfer.items].filter((item) => item.kind === "file");
    const usable = carried.filter((item) => !item.type || accepts(item.type, accept)).length;

    setHovering(usable || null);
    setRefusing(carried.length > 0 && usable === 0);
  };

  const onDragLeave = (event: DragEvent) => {
    if (!carriesFiles(event)) return;

    depth.current = Math.max(0, depth.current - 1);

    if (depth.current) return;

    setHovering(null);
    setRefusing(false);
  };

  const onDrop = (event: DragEvent) => {
    if (!carriesFiles(event)) return;

    event.preventDefault();
    depth.current = 0;
    setHovering(null);
    setRefusing(false);
    onAdd([...event.dataTransfer.files]);
  };

  const onPaste = (event: ClipboardEvent) => {
    const pasted = [...event.clipboardData.files];

    if (!pasted.length) return;

    event.preventDefault();
    onAdd(pasted);
  };

  const title = refusing
    ? refusal
    : dragging
      ? `Let go to upload ${count(dragging, "file", "files")}`
      : empty
        ? "Drop files here"
        : "Add more files";

  return (
    <MotionConfig transition={SURFACE} reducedMotion="user">
      <section
        ref={(node) => {
          root.current = node;

          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        onDragEnter={onDragEnter}
        onDragOver={(event) => {
          if (!carriesFiles(event)) return;

          event.preventDefault();
          event.dataTransfer.dropEffect = refusing ? "none" : "copy";
        }}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onPaste={onPaste}
        className={`w-[min(100%,420px)] rounded-[28px] bg-(--fup-surface) p-4 font-sans text-(--fup-ink) ${TOKENS}`}
        aria-label="Upload files"
      >
        <motion.div className="-m-1.5 overflow-hidden p-1.5" style={{ height: sprung }}>
          <div ref={content} className="grid grid-cols-[minmax(0,1fr)]">
            <header className="mb-3 flex min-h-10 items-center gap-3 px-1.5">
              <span className="grid min-w-0 flex-1 leading-[1.3]">
                <h2 className="m-0 text-[15.5px] font-semibold tracking-[-0.01em]">Upload files</h2>
                <p className="m-0 truncate text-[13px] text-(--fup-muted)" role="status">
                  <Remold.Text className="inline-block whitespace-nowrap">{summary(files, hint)}</Remold.Text>
                </p>
              </span>
              <AnimatePresence initial={false}>
                {settled && (
                  <motion.button
                    key="clear"
                    type="button"
                    onClick={clear}
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

            <Button
              ref={zone}
              data-fup-zone=""
              data-dragging={dragging ? "" : undefined}
              data-refusing={refusing || undefined}
              onClick={() => picker.current?.click()}
              render={<motion.button initial={false} animate={{ height: tall }} />}
              data-empty={empty || undefined}
              className={`group/zone relative grid w-full cursor-pointer place-items-center overflow-hidden rounded-[18px] border-0 bg-transparent p-0 font-sans text-(--fup-ink) outline-[1.5px] -outline-offset-[1.5px] outline-(--fup-line) outline-dashed transition-[background-color,outline-color] duration-150 ease-out hover:bg-(--fup-well) focus-visible:outline-2 focus-visible:outline-(--fup-ink) focus-visible:outline-solid data-empty:bg-(--fup-well) data-empty:hover:bg-(--fup-hover) data-dragging:bg-(--fup-hover) data-dragging:outline-(--fup-ink) data-refusing:cursor-not-allowed data-refusing:bg-(--fup-danger-tint) data-refusing:text-(--fup-danger) data-refusing:outline-(--fup-danger) motion-reduce:transition-none`}
            >
              <motion.span
                layout
                className="flex w-full items-center gap-3 px-3 data-empty:w-auto data-empty:flex-col data-empty:gap-3 data-empty:px-0"
                data-empty={empty || undefined}
              >
                <motion.span
                  layout
                  data-empty={empty || undefined}
                  className="grid size-8 flex-none place-items-center bg-(--fup-well) text-(--fup-ink) transition-[background-color] duration-150 ease-out group-hover/zone:bg-(--fup-hover) data-empty:size-11 data-empty:bg-(--fup-surface) data-empty:group-hover/zone:bg-(--fup-surface) motion-reduce:transition-none [&_svg]:size-4 data-empty:[&_svg]:size-5"
                  style={{ borderRadius: empty ? 14 : 10 }}
                  animate={{ y: dragging ? -3 : 0, scale: dragging ? 1.08 : 1 }}
                  transition={POP}
                >
                  <Remold.Icon icon={<HugeiconsIcon icon={empty || dragging ? Upload04Icon : Add01Icon} />} strokeWidth={1.9} spring={{ duration: 0.4, bounce: 0.1 }} aria-hidden="true" />
                </motion.span>
                <motion.span layout="position" className="grid gap-0.5 text-left data-empty:justify-items-center data-empty:text-center" data-empty={empty || undefined}>
                  <span className="text-[14px] font-semibold data-empty:text-[15px]" data-empty={empty || undefined}>
                    <Remold.Text className="inline-block whitespace-nowrap">{title}</Remold.Text>
                  </span>
                  {empty && (
                    <motion.span className="text-[13px] text-(--fup-muted)" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      or <span className="font-medium text-(--fup-ink) underline decoration-(--fup-line) underline-offset-[3px]">browse</span> from your computer
                    </motion.span>
                  )}
                </motion.span>
                {!empty && (
                  <motion.span
                    layout="position"
                    className="ml-auto text-[12.5px] whitespace-nowrap text-(--fup-muted)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                  >
                    Drop or paste
                  </motion.span>
                )}
              </motion.span>
            </Button>

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
                    transition={{ ...SURFACE, delay: Math.min(index, 4) * 0.04 }}
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
const DROPS_AT = 0.62;

const MOODBOARD = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" fill="#d4d4d8"/><circle cx="38" cy="18" r="9" fill="#fafafa"/><path d="M0 44l16-16 12 10 10-8 18 14v12H0z" fill="#3f3f46"/><path d="M0 50l20-12 14 8 22-10v20H0z" fill="#18181b"/></svg>',
)}`;

const RECEIPT = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" fill="#e7e5e4"/><rect x="16" y="9" width="24" height="38" rx="2" fill="#fafaf9"/><path d="M21 17h14M21 22h10M21 27h14M21 32h8" stroke="#a8a29e" stroke-width="2" stroke-linecap="round"/><path d="M21 39h14" stroke="#44403c" stroke-width="2.5" stroke-linecap="round"/></svg>',
)}`;

const ACCEPT = "image/*,application/pdf";
const REFUSAL = "Only images and PDFs";

const SAMPLES: readonly UploadItem[] = [
  { id: "brief", name: "launch-brief.pdf", size: 240_000, kind: "pdf", status: "uploading", progress: 0 },
  { id: "moodboard", name: "moodboard.png", size: 1_200_000, kind: "image", status: "uploading", progress: 0, preview: MOODBOARD },
  { id: "survey", name: "site-survey.pdf", size: 18_400_000, kind: "pdf", status: "uploading", progress: 0 },
  { id: "receipt", name: "receipt.jpg", size: 86_000, kind: "image", status: "uploading", progress: 0, preview: RECEIPT },
  { id: "budget", name: "budget.xlsx", size: 86_000, kind: "file", status: "failed", progress: 0, error: REFUSAL, retryable: false },
];

interface State {
  files: readonly UploadItem[];
  flaky: readonly string[];
  dragging: number | null;
}

const duration = (file: UploadItem) => 1100 + Math.min(3200, file.size / 5500);

function advance(state: State, elapsed: number): State {
  let flaky = state.flaky;

  const files = state.files.map((file): UploadItem => {
    if (file.status !== "uploading") return file;

    const progress = Math.min(1, file.progress + elapsed / duration(file));

    if (flaky.includes(file.id) && progress >= DROPS_AT) {
      flaky = flaky.filter((id) => id !== file.id);

      return { ...file, status: "failed", progress: DROPS_AT, error: "The connection dropped", retryable: true };
    }

    return progress >= 1 ? { ...file, status: "done", progress: 1 } : { ...file, progress };
  });

  return { ...state, files, flaky };
}

const busy = (state: State) => state.files.some((file) => file.status === "uploading");

const EMPTY: State = { files: [], flaky: [], dragging: null };
const DROPPED: State = { files: SAMPLES.slice(0, 3), flaky: ["survey"], dragging: null };

const BEATS: (State & { ms: number })[] = [
  { ...EMPTY, ms: 1500 },
  { ...EMPTY, dragging: 3, ms: 1100 },
];

for (let state = DROPPED; ; state = advance(state, TICK)) {
  BEATS.push({ ...state, ms: busy(state) ? TICK : 1300 });

  if (!busy(state)) {
    let again: State = { ...state, files: state.files.map((file) => (file.status === "failed" ? { ...file, status: "uploading", progress: 0, error: undefined } : file)) };

    for (; busy(again); again = advance(again, TICK)) BEATS.push({ ...again, ms: TICK });

    BEATS.push({ ...again, ms: 2600 });
    break;
  }
}

const fromBeat = (step: number): State => {
  const { ms: _ms, ...state } = BEATS[step]!;

  return state;
};

const kindOf = (file: File): UploadItem["kind"] =>
  file.type.startsWith("image/") ? "image" : file.type === "application/pdf" ? "pdf" : "file";

interface FileUploadDemoProps {
  playing?: boolean;
  preview?: boolean;
}

export function FileUploadDemo({ playing, preview: previewing }: FileUploadDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing, false, previewing ? BEATS[Math.min(BEATS.length - 1, 8)]! : undefined);
  const preview = previewing && !scene.taken;
  const { ref, takeOver, live } = scene;
  const state = scene.state;
  const uploading = busy(state);
  const made = useRef(new Map<string, string>());
  const before = useRef(state.files);

  useEffect(() => {
    if (live || preview || !uploading) return;

    const timer = setInterval(() => takeOver((current) => advance(current, TICK)), TICK);

    return () => clearInterval(timer);
  }, [uploading, live, preview, takeOver]);

  useEffect(() => {
    if (live || preview) return;

    for (const file of state.files) {
      const was = before.current.find((earlier) => earlier.id === file.id);

      if (was?.status === "uploading" && file.status === "done") announce(`${file.name} uploaded`);
      if (was?.status === "uploading" && file.status === "failed") announce(`${file.name} failed. ${file.error ?? ""}`);
    }

    before.current = state.files;
  }, [state.files, live, preview]);

  useEffect(() => {
    const urls = made.current;

    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const release = (ids: readonly string[]) => {
    for (const id of ids) {
      const url = made.current.get(id);

      if (url) URL.revokeObjectURL(url);

      made.current.delete(id);
    }
  };

  const add = (picked: File[]) => {
    const fresh = picked.map((file): UploadItem => {
      const id = `${file.name}-${file.size}-${file.lastModified}`;
      const kind = kindOf(file);
      const allowed = accepts(file.type, ACCEPT);
      const tooLarge = file.size > LIMIT;
      const error = !allowed ? REFUSAL : tooLarge ? "Too large. The limit is 25 MB." : undefined;

      if (kind === "image" && !error && !made.current.has(id)) made.current.set(id, URL.createObjectURL(file));

      return {
        id,
        name: file.name,
        size: file.size,
        kind,
        preview: made.current.get(id),
        status: error ? "failed" : "uploading",
        progress: 0,
        error,
        retryable: !error,
      };
    });

    takeOver((current) => ({
      ...current,
      dragging: null,
      files: [...current.files, ...fresh.filter((file) => !current.files.some((existing) => existing.id === file.id))],
    }));
  };

  const sample = () =>
    takeOver((current) => {
      const fresh = SAMPLES.filter((file) => !current.files.some((existing) => existing.id === file.id));

      return { ...current, dragging: null, files: [...current.files, ...fresh], flaky: fresh.some((file) => file.id === "survey") ? [...current.flaky, "survey"] : current.flaky };
    });

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
          onRemove={(id) => {
            release([id]);
            takeOver((current) => ({ ...current, files: current.files.filter((file) => file.id !== id) }));
          }}
          onRetry={(id) =>
            takeOver((current) => ({
              ...current,
              files: current.files.map((file) => (file.id === id ? { ...file, status: "uploading", progress: 0, error: undefined } : file)),
            }))
          }
          onClear={() => {
            release(state.files.map((file) => file.id));
            takeOver((current) => ({ ...current, files: [], flaky: [] }));
          }}
        />
      </div>
      <button
        type="button"
        onClick={sample}
        className="h-9 cursor-pointer rounded-full border-0 bg-transparent px-4 font-sans text-[13.5px] font-semibold text-(--fup-muted) transition-[background-color,color,scale] duration-150 ease-out hover:bg-(--fup-hover) hover:text-(--fup-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--fup-ink) active:scale-[0.97] motion-reduce:transition-none"
      >
        Add sample files
      </button>
    </div>
  );
}
