"use client";
/**
 * An upload in one frame that never changes size. An image is dragged over the empty well and let
 * go, a bar fills under the picture, a check arrives, and the caption under it changes at each step.
 * All of the movement is the library's: `Remold.Layout` for what appears, leaves and grows, and
 * `Remold.Text` for the byte count rolling up.
 *
 * It plays a short scene while it's on screen. Touch it and it's yours: drop an image on it or
 * choose one. Nothing leaves your browser; the upload is pretend, the picture is yours.
 */
import { Remold } from "@remold-ui/react";
import { Check, ImageUp } from "lucide-react";
import { useEffect, useRef, type CSSProperties, type DragEvent } from "react";
import { Frame } from "./frame";
import { useScene } from "./use-scene";
import "./upload-flow.css";

type Phase = "idle" | "over" | "uploading" | "done" | "ready";

interface Upload {
  name: string;
  mb: number;
  /** A picture to show. Without one, a drawn one stands in. */
  url?: string;
}

interface State {
  phase: Phase;
  /** Upload progress, 0 to 1. */
  sent: number;
  file?: Upload;
  copied?: boolean;
}

const SAMPLE: Upload = { name: "hero-image.png", mb: 12.4 };

/** Progress moves in uneven steps the way a real upload does. */
const STEPS = [0.08, 0.31, 0.52, 0.79, 1];
const STEP_MS = 520;

/**
 * The scene: rest, an image held over the well, the upload in steps, a breath for the check so the
 * finish registers, and the ready state rests longest.
 */
const BEATS: readonly (State & { ms: number })[] = [
  { phase: "idle", sent: 0, ms: 1600 },
  { phase: "over", sent: 0, ms: 1100 },
  ...STEPS.map((sent) => ({ phase: "uploading" as const, sent, file: SAMPLE, ms: sent === 1 ? 480 : STEP_MS })),
  { phase: "done", sent: 1, file: SAMPLE, ms: 1000 },
  { phase: "ready", sent: 1, file: SAMPLE, ms: 2600 },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

const SPRING = { duration: 0.5, bounce: 0.1 };

/** The picture being uploaded when there's no real one: drawn, so the demo needs no image file. */
function Art({ className }: { className: string }) {
  return (
    <span className={`uf-art ${className}`} aria-hidden="true">
      <span className="uf-sun" />
      <span className="uf-hills far" />
      <span className="uf-hills near" />
    </span>
  );
}

function Picture({ file, className }: { file?: Upload; className: string }) {
  if (file?.url) return <img src={file.url} alt="" draggable={false} className={`uf-art uf-img ${className}`} />;
  return <Art className={className} />;
}

function caption({ phase, file, copied }: State) {
  switch (phase) {
    case "idle":
      return { title: "Upload an image", meta: "PNG or JPG, up to 20 MB", action: "Browse" };
    case "over":
      return { title: "Release to upload", meta: "PNG or JPG, up to 20 MB", action: "Browse" };
    case "uploading":
    case "done":
      return { title: file!.name, meta: "", action: "Cancel" };
    case "ready":
      return { title: file!.name, meta: `${file!.mb} MB · Just now`, action: copied ? "Copied" : "Copy link" };
  }
}

interface UploadFlowDemoProps {
  framed?: boolean;
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function UploadFlowDemo({ framed = true, playing }: UploadFlowDemoProps) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const input = useRef<HTMLInputElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const url = useRef<string | undefined>(undefined);

  const stop = () => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
  };

  const start = (picked: File) => {
    stop();
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = URL.createObjectURL(picked);
    const file = { name: picked.name, mb: Math.max(0.1, Math.round((picked.size / 1e6) * 10) / 10), url: url.current };
    take({ phase: "uploading", sent: STEPS[0]!, file });
    STEPS.slice(1).forEach((sent, i) => {
      timers.current.push(setTimeout(() => take((s) => ({ ...s, sent })), STEP_MS * (i + 1)));
    });
    const landed = STEP_MS * STEPS.length;
    timers.current.push(setTimeout(() => take((s) => ({ ...s, phase: "done" })), landed));
    timers.current.push(setTimeout(() => take((s) => ({ ...s, phase: "ready" })), landed + 1000));
  };

  useEffect(
    () => () => {
      stop();
      if (url.current) URL.revokeObjectURL(url.current);
    },
    [],
  );

  const busy = state.phase === "uploading" || state.phase === "done";
  const text = caption(state);

  const onAction = () => {
    if (state.phase === "uploading") {
      stop();
      take({ phase: "idle", sent: 0 });
    } else if (state.phase === "ready") {
      take((s) => ({ ...s, copied: true }));
      timers.current.push(setTimeout(() => take((s) => ({ ...s, copied: false })), 1600));
    } else {
      input.current?.click();
    }
  };

  const drag = {
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      if (!busy && state.phase !== "over") take((s) => ({ ...s, phase: "over" }));
    },
    onDragLeave: () => {
      if (state.phase === "over") take((s) => ({ ...s, phase: s.file ? "ready" : "idle" }));
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      const picked = [...event.dataTransfer.files].find((f) => f.type.startsWith("image/"));
      if (picked) start(picked);
      else take((s) => ({ ...s, phase: s.file ? "ready" : "idle" }));
    },
  };

  const body = (
    <section ref={scene.ref} className="uf" data-phase={state.phase} aria-label="Upload an image">
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="uf-input"
        tabIndex={-1}
        onChange={(event) => {
          const picked = event.target.files?.[0];
          if (picked) start(picked);
          event.target.value = "";
        }}
      />
      <Remold.Layout trigger={[state.phase, state.sent, state.file?.url, text.action]} spring={SPRING} className="uf-card">
        <button
          type="button"
          className="uf-well"
          aria-label={state.file ? "Choose another image" : "Choose an image"}
          disabled={busy}
          onClick={() => input.current?.click()}
          {...drag}
        >
          {state.phase === "idle" && !state.file && (
            <span className="uf-empty">
              <ImageUp aria-hidden="true" />
            </span>
          )}
          {/* The scene shows the image it's carrying; a real drag has the browser's own. */}
          {state.phase === "over" && scene.live && <Art className="uf-carried" />}
          {state.file && state.phase !== "over" && <Picture file={state.file} className="uf-picture" />}
          {busy && (
            <span className="uf-bar" role="progressbar" aria-label="Upload progress" aria-valuenow={Math.round(state.sent * 100)}>
              <span className="uf-fill" style={{ width: `${state.sent * 100}%` } as CSSProperties} />
            </span>
          )}
        </button>
        <div className="uf-caption">
          <span className="uf-copy">
            <span key={text.title} className="uf-title">
              {text.title}
            </span>
            {busy ? (
              <Remold.Text className="uf-meta">{`${(state.file!.mb * state.sent).toFixed(1)} of ${state.file!.mb} MB`}</Remold.Text>
            ) : (
              <span key={text.meta} className="uf-meta">
                {text.meta}
              </span>
            )}
          </span>
          {state.phase === "done" ? (
            <span className="uf-check" role="img" aria-label="Uploaded">
              <Check aria-hidden="true" strokeWidth={2.75} />
            </span>
          ) : (
            <button type="button" key={text.action} className="uf-action" onClick={onAction}>
              {text.action}
            </button>
          )}
        </div>
      </Remold.Layout>
    </section>
  );

  return framed ? <Frame>{body}</Frame> : body;
}
