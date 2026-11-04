"use client";
/**
 * An attachment field that stays one box from start to finish. Empty, it's a quiet drop area that
 * wakes up when a file is dragged over it. Choose or drop a file and the same box becomes its row:
 * the file's name, a status line and a hairline of progress along the bottom. When it's done the
 * arrow in the icon reshapes into a check, "Uploading" morphs into "2.4 MB · Uploaded" while the
 * percentage beside it rolls away, and the progress line fades out. Nothing is swapped out; the box just changes.
 *
 * Built on Base UI's Field and Progress, with a real file input for choosing and drag and drop for
 * dropping. Remold reshapes the icon and morphs the status word; the percentage rolls with the
 * Odometer; Motion springs the box.
 */
import { Field } from "@base-ui/react/field";
import { Progress } from "@base-ui/react/progress";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUp02Icon, Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Odometer } from "./odometer";
import { useScene } from "./use-scene";
import "./form-kit.css";
import "./upload-row.css";

export interface UploadFile {
  name: string;
  size: number;
}

/** Two strokes each, so one reshapes into the other: an upward arrow, then a check. */

const BOX = { type: "spring" as const, duration: 0.45, bounce: 0.1 };
const SWAP = { duration: 0.18 };

const megabytes = (bytes: number) => `${(bytes / 1_048_576).toFixed(1)} MB`;
const kind = (name: string) => (name.split(".").pop() ?? "file").toUpperCase().slice(0, 4);

export interface UploadRowProps {
  file: UploadFile | null;
  /** 0 to 100 while uploading; 100 once done. */
  progress: number;
  onChoose: (file: UploadFile) => void;
  onRemove: () => void;
}

export function UploadRow({ file, progress, onChoose, onRemove }: UploadRowProps) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const done = file !== null && progress >= 100;
  const state = !file ? "empty" : done ? "done" : "uploading";

  const take = (picked: File | undefined) => {
    if (picked) onChoose({ name: picked.name, size: picked.size });
  };

  // "Uploading" morphs into "Uploaded" (they share most of their letters); the percentage rolls.
  const status = done && file ? `${megabytes(file.size)} · Uploaded` : "Uploading";

  return (
    <Field.Root className="fk upl">
      <Field.Label className="fk-label">Attachment</Field.Label>
      <motion.div
        layout
        className="upl-box"
        data-state={state}
        data-dragging={dragging || undefined}
        transition={BOX}
        // Empty, the whole box is the button that opens the file picker.
        role={file ? undefined : "button"}
        tabIndex={file ? undefined : 0}
        aria-label={file ? undefined : "Choose a file to upload"}
        onClick={(event) => {
          // The input's own click bubbles back up here: don't open the picker twice.
          if (!file && event.target !== input.current) input.current?.click();
        }}
        onKeyDown={(event) => {
          if (!file && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            input.current?.click();
          }
        }}
        onDragOver={(event) => {
          if (file) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          if (file) return;
          event.preventDefault();
          setDragging(false);
          take(event.dataTransfer.files[0]);
        }}
      >
        <span className="upl-icon" data-state={state}>
          <Remold.Icon icon={<HugeiconsIcon icon={done ? Tick02Icon : ArrowUp02Icon} />} strokeWidth={2} />
          <AnimatePresence initial={false}>
            {file && !done && (
              <motion.span key="kind" className="upl-kind" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={SWAP}>
                {kind(file.name)}
              </motion.span>
            )}
          </AnimatePresence>
        </span>

        <AnimatePresence initial={false} mode="popLayout">
          {file ? (
            <motion.span key="file" className="upl-copy" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={SWAP}>
              <b>{file.name}</b>
              <span className="upl-status">
                <Remold.Text>{status}</Remold.Text>
                {!done && (
                  <span className="upl-percent">
                    {" · "}
                    <Odometer value={`${progress}%`} />
                  </span>
                )}
              </span>
            </motion.span>
          ) : (
            <motion.span key="empty" className="upl-copy" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={SWAP}>
              <b>
                {dragging ? "Drop to upload" : (
                  <>
                    Drop a file or <span className="upl-browse">browse</span>
                  </>
                )}
              </b>
              <span className="upl-status">PDF, PNG or JPG, up to 10 MB</span>
            </motion.span>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false} mode="popLayout">
          {file && (
            <motion.button
              key={done ? "remove" : "cancel"}
              type="button"
              className="upl-action"
              data-kind={done ? "remove" : "cancel"}
              aria-label={done ? `Remove ${file.name}` : `Cancel uploading ${file.name}`}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={SWAP}
              onClick={(event) => {
                event.stopPropagation();
                onRemove();
              }}
            >
              {done ? "Remove" : <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />}
            </motion.button>
          )}
        </AnimatePresence>

        <Progress.Root value={file ? progress : null} className="upl-progress" data-visible={(file && !done) || undefined} aria-label="Upload progress">
          <Progress.Track className="upl-track">
            <Progress.Indicator className="upl-fill" />
          </Progress.Track>
        </Progress.Root>

        <Field.Control
          ref={input}
          render={<input type="file" />}
          className="upl-input"
          accept=".pdf,.png,.jpg,.jpeg"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            take((event.target as HTMLInputElement).files?.[0]);
            (event.target as HTMLInputElement).value = "";
          }}
        />
      </motion.div>
    </Field.Root>
  );
}

interface State {
  file: UploadFile | null;
  progress: number;
}

const FILE: UploadFile = { name: "site-plan-v3.pdf", size: 2_516_582 };

const BEATS: readonly (State & { ms: number })[] = [
  { file: null, progress: 0, ms: 1400 },
  { file: FILE, progress: 6, ms: 300 },
  { file: FILE, progress: 28, ms: 300 },
  { file: FILE, progress: 51, ms: 300 },
  { file: FILE, progress: 74, ms: 300 },
  { file: FILE, progress: 92, ms: 350 },
  { file: FILE, progress: 100, ms: 2800 },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

interface UploadRowDemoProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function UploadRowDemo({ playing }: UploadRowDemoProps = {}) {
  const { ref, state, take, live } = useScene(BEATS, fromBeat, playing);

  // Once it's yours, a chosen file uploads at a believable pace.
  useEffect(() => {
    if (live || !state.file || state.progress >= 100) return;
    const t = setTimeout(() => take((current) => ({ ...current, progress: Math.min(100, current.progress + 8 + Math.random() * 12) })), 200);
    return () => clearTimeout(t);
  }, [live, state.file, state.progress, take]);

  return (
    <div ref={ref} className="fk-stage not-prose">
      <UploadRow
        file={state.file}
        progress={Math.round(state.progress)}
        onChoose={(file) => take({ file, progress: 0 })}
        onRemove={() => take({ file: null, progress: 0 })}
      />
    </div>
  );
}
