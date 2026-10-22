import { value, type AnimatedValue } from "@remold-ui/core";

export interface ParticlePointer {
  x: AnimatedValue;
  y: AnimatedValue;
  presence: AnimatedValue;
}

export function createPointerController({
  canvas,
  enabled,
  getSize,
  wake,
}: {
  canvas: HTMLCanvasElement;
  enabled: boolean;
  getSize: () => { width: number; height: number };
  wake: () => void;
}): { pointer: ParticlePointer; destroy: () => void } {
  const pointer = { x: value(0, { precision: 0.5 }), y: value(0, { precision: 0.5 }), presence: value(0, { precision: 0.005 }) };
  if (!enabled) return { pointer, destroy: () => {} };

  const move = (event: PointerEvent) => {
    const position = pointerPosition({ event, canvas, size: getSize() });
    if (pointer.presence.target === 0) {
      pointer.x.set(position.x);
      pointer.y.set(position.y);
    } else {
      pointer.x.to(position.x);
      pointer.y.to(position.y);
    }
    pointer.presence.to(1);
    wake();
  };
  const leave = () => {
    pointer.presence.to(0);
    wake();
  };
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerleave", leave);
  return {
    pointer,
    destroy: () => {
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
    },
  };
}

function pointerPosition({
  event,
  canvas,
  size,
}: {
  event: PointerEvent;
  canvas: HTMLCanvasElement;
  size: { width: number; height: number };
}) {
  const bounds = canvas.getBoundingClientRect();
  const scaleX = bounds.width > 0 ? size.width / bounds.width : 1;
  const scaleY = bounds.height > 0 ? size.height / bounds.height : 1;
  return { x: (event.clientX - bounds.left) * scaleX, y: (event.clientY - bounds.top) * scaleY };
}
