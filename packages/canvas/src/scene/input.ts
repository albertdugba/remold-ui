import { deceleration, project, velocityTracker, type AnimatedValue } from "@remold-ui/core";
import type { CanvasSize } from "../canvas-size";

interface Interact {
  hover: boolean;
  tap: boolean;
  drag: boolean;
  keyboard: boolean;
}

interface InputOptions {
  canvas: HTMLCanvasElement;
  interact: Interact;
  yaw: AnimatedValue;
  size: () => CanvasSize;
  reduced: () => boolean;
  hitTest: (point: { x: number; y: number }) => string | null;
  readingOrder: () => string[];
  focused: () => string | null;
  hovered: () => string | null;
  setFocus: (id: string | null, byUser: boolean) => void;
  setHovered: (id: string | null) => void;
  wake: () => void;
}

interface Drag {
  x: number;
  yaw: number;
  moved: boolean;
}

const DRAG_THRESHOLD = 10;
const DEGREES_PER_PIXEL = 0.35;
const NAVIGATION_KEYS = new Set(["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End", "Escape"]);

function nextInOrder(key: string, order: readonly string[], index: number): string | null | undefined {
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return order[(index + 1) % order.length];
    case "ArrowLeft":
    case "ArrowUp":
      return order[(index - 1 + order.length) % order.length];
    case "Home":
      return order[0];
    case "End":
      return order.at(-1);
    case "Escape":
      return null;
    default:
      return undefined;
  }
}

function localPoint(canvas: HTMLCanvasElement, size: CanvasSize, event: PointerEvent) {
  const bounds = canvas.getBoundingClientRect();
  const scaleX = bounds.width > 0 ? size.width / bounds.width : 1;
  const scaleY = bounds.height > 0 ? size.height / bounds.height : 1;

  return { x: (event.clientX - bounds.left) * scaleX, y: (event.clientY - bounds.top) * scaleY };
}

export function attachInput(options: InputOptions): { destroy: () => void } {
  const { canvas, interact, yaw, reduced, wake } = options;
  const tracker = velocityTracker();
  const local = (event: PointerEvent) => localPoint(canvas, options.size(), event);
  let drag: Drag | null = null;

  const hover = (id: string | null) => {
    if (id !== options.hovered()) options.setHovered(id);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!interact.drag && !interact.tap) return;

    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {}

    drag = { x: event.clientX, yaw: yaw.current, moved: false };
    tracker.reset();
    tracker.add(event.timeStamp, yaw.current);
  };

  const dragYaw = (current: Drag, event: PointerEvent) => {
    const dx = event.clientX - current.x;

    if (!current.moved && Math.abs(dx) > DRAG_THRESHOLD) {
      current.moved = true;
      yaw.hold();
    }

    if (!current.moved) return;

    yaw.set(current.yaw + dx * DEGREES_PER_PIXEL);
    tracker.add(event.timeStamp, yaw.current);
    wake();
  };

  const onPointerMove = (event: PointerEvent) => {
    if (drag && interact.drag) {
      dragYaw(drag, event);
      return;
    }

    if (!interact.hover) return;

    const id = options.hitTest(local(event));

    canvas.style.cursor = id ? "pointer" : "";
    hover(id);
  };

  const fling = (event: PointerEvent) => {
    const velocity = tracker.velocity(event.timeStamp);

    yaw.release({
      velocity: reduced() ? 0 : velocity,
      target: yaw.current + (reduced() ? 0 : project(velocity, deceleration.fast)),
    });
    wake();
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!drag) return;

    if (drag.moved) {
      fling(event);
    } else if (interact.tap) {
      const id = options.hitTest(local(event));

      options.setFocus(id && id !== options.focused() ? id : null, true);
    }

    drag = null;
  };

  const onPointerLeave = () => {
    if (options.hovered()) hover(null);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!interact.keyboard) return;

    const order = options.readingOrder();

    if (order.length === 0 || !NAVIGATION_KEYS.has(event.key)) return;

    const focused = options.focused();
    const next = nextInOrder(event.key, order, focused ? order.indexOf(focused) : -1);

    event.preventDefault();
    options.setFocus(next ?? null, true);
  };

  const listeners: [string, (event: never) => void][] = [
    ["pointerdown", onPointerDown],
    ["pointermove", onPointerMove],
    ["pointerup", onPointerUp],
    ["pointercancel", onPointerUp],
    ["pointerleave", onPointerLeave],
    ["keydown", onKeyDown],
  ];

  for (const [type, listener] of listeners) canvas.addEventListener(type, listener as EventListener);

  if (interact.drag) canvas.style.touchAction = "pan-y";

  return {
    destroy() {
      for (const [type, listener] of listeners) canvas.removeEventListener(type, listener as EventListener);
    },
  };
}
