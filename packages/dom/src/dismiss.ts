import { rubberband, value, velocityTracker, type SpringConfig } from "@remold-ui/core";
import { resolveReducedMotion, type ReducedMotion } from "./accessibility";
import { frames as sharedFrames, type FrameLoop } from "./frames";

export interface DragToDismissOptions {
  onDismiss: () => void;
  axis?: "x" | "y";
  direction?: 1 | -1;
  distance?: number;
  velocity?: number;
  resistance?: number;
  spring?: SpringConfig;
  slop?: number;
  onDrag?: (offset: number) => void;
  reducedMotion?: ReducedMotion;
  loop?: FrameLoop;
}

export interface DragToDismiss {
  reset(): void;
  destroy(): void;
}

const FIELDS = "input, textarea, select, [contenteditable], [data-rm-no-drag]";

const DEFAULTS = { distance: 110, velocity: 700, resistance: 200, slop: 4 };
const DEFAULT_SPRING: SpringConfig = { duration: 0.45, bounce: 0.2 };
const FLICK_MIN_DISTANCE = 24;
const TRANSFORM_NUMBER = /-?\d+(\.\d+)?/;

interface Press {
  id: number;
  start: number;
  offset: number;
  dragging: boolean;
  tracker: ReturnType<typeof velocityTracker>;
}

function settingsOf(options: DragToDismissOptions) {
  return {
    axis: options.axis ?? "y",
    direction: options.direction ?? 1,
    distance: options.distance ?? DEFAULTS.distance,
    flick: options.velocity ?? DEFAULTS.velocity,
    resistance: options.resistance ?? DEFAULTS.resistance,
    spring: options.spring ?? DEFAULT_SPRING,
    slop: options.slop ?? DEFAULTS.slop,
    add: options.loop ? options.loop.add.bind(options.loop) : sharedFrames,
  };
}

const currentOffset = (element: HTMLElement) => Number.parseFloat(TRANSFORM_NUMBER.exec(element.style.transform)?.[0] ?? "0") || 0;

const startsOnField = (event: PointerEvent) => event.target instanceof Element && Boolean(event.target.closest(FIELDS));

export function dragToDismiss(element: HTMLElement, options: DragToDismissOptions): DragToDismiss {
  const { axis, direction, distance, flick, resistance, spring, slop, add } = settingsOf(options);
  const saved = { transform: element.style.transform, touchAction: element.style.touchAction };

  element.style.touchAction = axis === "y" ? "pan-x" : "pan-y";

  let press: Press | null = null;
  let settling: (() => void) | null = null;
  let dismissed = false;
  let swallow = false;

  const coordinate = (event: PointerEvent) => (axis === "y" ? event.clientY : event.clientX);

  const place = (offset: number) => {
    element.style.transform = offset === 0 ? saved.transform : `translate${axis.toUpperCase()}(${offset}px)`;
    options.onDrag?.(offset);
  };

  const stopSettling = () => {
    settling?.();
    settling = null;
  };

  const shouldDismiss = (offset: number, speed: number) => {
    const along = offset * direction;

    return along > distance || (along > FLICK_MIN_DISTANCE && speed * direction > flick);
  };

  const springBack = (offset: number, speed: number) => {
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

  const down = (event: PointerEvent) => {
    if (dismissed || event.button !== 0 || startsOnField(event)) return;

    stopSettling();

    const tracker = velocityTracker();
    const offset = currentOffset(element);

    tracker.add(event.timeStamp, coordinate(event));
    press = { id: event.pointerId, start: coordinate(event) - offset, offset, dragging: false, tracker };
  };

  const startDragging = (current: Press, event: PointerEvent, raw: number) => {
    if (Math.abs(raw - current.offset) < slop) return false;

    current.dragging = true;

    try {
      element.setPointerCapture(event.pointerId);
    } catch {}

    return true;
  };

  const move = (event: PointerEvent) => {
    if (!press || event.pointerId !== press.id) return;

    const raw = coordinate(event) - press.start;

    if (!press.dragging && !startDragging(press, event, raw)) return;

    press.tracker.add(event.timeStamp, coordinate(event));
    press.offset = raw * direction > 0 ? raw : rubberband(raw, resistance);
    place(press.offset);
  };

  const up = (event: PointerEvent) => {
    if (!press || event.pointerId !== press.id) return;

    const { offset, dragging, tracker } = press;

    press = null;

    if (!dragging) return;

    const speed = tracker.velocity(event.timeStamp);

    if (shouldDismiss(offset, speed)) {
      dismissed = true;
      options.onDismiss();
      return;
    }

    springBack(offset, speed);
  };

  const click = (event: MouseEvent) => {
    if (!swallow) return;

    event.stopPropagation();
    event.preventDefault();
    swallow = false;
  };

  const upCapture = (event: PointerEvent) => {
    swallow = Boolean(press?.dragging) && event.pointerId === press?.id;
    up(event);
  };

  element.addEventListener("pointerdown", down);
  element.addEventListener("pointermove", move);
  element.addEventListener("pointerup", upCapture);
  element.addEventListener("pointercancel", up);
  element.addEventListener("click", click, true);

  return {
    reset() {
      stopSettling();
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
