/**
 * Drag to dismiss: a sheet, card or panel that follows the finger along one axis and goes away
 * when it's pulled far enough or flicked, otherwise springs back with the speed it was let go at.
 * Pulling the other way stretches with resistance instead of moving freely.
 *
 * It moves the element with `transform` (not `translate`, which transitions use), and leaves the
 * offset in place on dismiss, so a transition that follows flies the element home from where the
 * finger left it.
 */
import { rubberband, value, velocityTracker, type SpringConfig } from "@remold-ui/core";
import { resolveReducedMotion, type ReducedMotion } from "./accessibility";
import { frames as sharedFrames, type FrameLoop } from "./frames";

export interface DragToDismissOptions {
  /** Called once when the drag ends far enough or fast enough. */
  onDismiss: () => void;
  /** The axis it moves along. Default `"y"`. */
  axis?: "x" | "y";
  /** Which way dismisses: `1` is down or right, `-1` up or left. Default `1`. */
  direction?: 1 | -1;
  /** Pixels past which letting go dismisses. Default 110. */
  distance?: number;
  /** A flick faster than this (pixels per second) dismisses, once it has moved 24 px. Default 700. */
  velocity?: number;
  /** How far the wrong way can stretch before it stiffens, in pixels. Default 200. */
  resistance?: number;
  /** The spring back. Default `{ duration: 0.45, bounce: 0.2 }`. */
  spring?: SpringConfig;
  /** Movement before a press becomes a drag, so taps and clicks inside still work. Default 4 px. */
  slop?: number;
  /** Called with the offset on every move, for dimming a backdrop as it goes. */
  onDrag?: (offset: number) => void;
  reducedMotion?: ReducedMotion;
  loop?: FrameLoop;
}

export interface DragToDismiss {
  /** Put the element back where it started, at once. */
  reset(): void;
  /** Stop listening and clear what it set on the element. */
  destroy(): void;
}

/** Fields where a press means typing or choosing, not dragging. */
const FIELDS = "input, textarea, select, [contenteditable], [data-rm-no-drag]";

export function dragToDismiss(element: HTMLElement, options: DragToDismissOptions): DragToDismiss {
  const axis = options.axis ?? "y";
  const direction = options.direction ?? 1;
  const distance = options.distance ?? 110;
  const flick = options.velocity ?? 700;
  const resistance = options.resistance ?? 200;
  const spring = options.spring ?? { duration: 0.45, bounce: 0.2 };
  const slop = options.slop ?? 4;
  const add = options.loop ? options.loop.add.bind(options.loop) : sharedFrames;
  const saved = { transform: element.style.transform, touchAction: element.style.touchAction };

  element.style.touchAction = axis === "y" ? "pan-x" : "pan-y";

  let press: { id: number; start: number; offset: number; dragging: boolean; tracker: ReturnType<typeof velocityTracker> } | null = null;
  let settling: (() => void) | null = null;
  let dismissed = false;

  const coordinate = (e: PointerEvent) => (axis === "y" ? e.clientY : e.clientX);
  const place = (offset: number) => {
    element.style.transform = offset === 0 ? saved.transform : `translate${axis.toUpperCase()}(${offset}px)`;
    options.onDrag?.(offset);
  };

  const down = (e: PointerEvent) => {
    if (dismissed || e.button !== 0 || (e.target instanceof Element && e.target.closest(FIELDS))) return;

    settling?.();
    settling = null;

    const tracker = velocityTracker();

    tracker.add(e.timeStamp, coordinate(e));

    const current = Number.parseFloat(/-?\d+(\.\d+)?/.exec(element.style.transform)?.[0] ?? "0") || 0;

    press = { id: e.pointerId, start: coordinate(e) - current, offset: current, dragging: false, tracker };
  };

  const move = (e: PointerEvent) => {
    if (!press || e.pointerId !== press.id) return;

    const raw = coordinate(e) - press.start;

    if (!press.dragging) {
      if (Math.abs(raw - press.offset) < slop) return;

      press.dragging = true;

      try {
        element.setPointerCapture(e.pointerId);
      } catch {}
    }

    press.tracker.add(e.timeStamp, coordinate(e));
    press.offset = raw * direction > 0 ? raw : rubberband(raw, resistance);
    place(press.offset);
  };

  const up = (e: PointerEvent) => {
    if (!press || e.pointerId !== press.id) return;

    const { offset, dragging, tracker } = press;

    press = null;

    if (!dragging) return;

    const speed = tracker.velocity(e.timeStamp);
    const along = offset * direction;

    if (along > distance || (along > 24 && speed * direction > flick)) {
      dismissed = true;
      options.onDismiss();
      return;
    }

    if (resolveReducedMotion(options.reducedMotion) || Math.abs(offset) < 0.5) {
      place(0);
      return;
    }

    const back = value(offset, { spring });

    back.release({ target: 0, velocity: speed });
    settling = add((dt) => {
      back.step(dt);
      place(back.settled ? 0 : back.current);
      return !back.settled;
    });
  };

  const click = (e: MouseEvent) => {
    if (swallow) {
      e.stopPropagation();
      e.preventDefault();
      swallow = false;
    }
  };
  let swallow = false;
  const upCapture = (e: PointerEvent) => {
    swallow = Boolean(press?.dragging) && e.pointerId === press?.id;
    up(e);
  };

  element.addEventListener("pointerdown", down);
  element.addEventListener("pointermove", move);
  element.addEventListener("pointerup", upCapture);
  element.addEventListener("pointercancel", up);
  element.addEventListener("click", click, true);

  return {
    reset() {
      settling?.();
      settling = null;
      press = null;
      dismissed = false;
      place(0);
    },
    destroy() {
      settling?.();
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", upCapture);
      element.removeEventListener("pointercancel", up);
      element.removeEventListener("click", click, true);
      element.style.touchAction = saved.touchAction;
      if (!dismissed) element.style.transform = saved.transform;
    },
  };
}
