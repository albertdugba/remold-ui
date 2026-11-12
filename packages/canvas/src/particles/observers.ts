import type { CloudPoint, PointCloud } from "@remold-ui/core";
import { fitCanvas, type CanvasSize } from "../canvas-size";
import { matchByIndex } from "./matching";

interface ResizeOptions {
  canvas: HTMLCanvasElement;
  cloud: PointCloud;
  getFittedPoints: () => readonly CloudPoint[];
  getSize: () => CanvasSize;
  setSize: (size: CanvasSize) => void;
  getFittedSize: () => { width: number; height: number };
  setFittedSize: (size: { width: number; height: number }) => void;
  maxPixelRatio: number | undefined;
  resetFill: () => void;
  render: () => void;
  refit: boolean;
}

interface VisibilityOptions {
  canvas: HTMLCanvasElement;
  needsFrames: () => boolean;
  wake: () => void;
  setVisible: (visible: boolean) => void;
}

export const dimensions = (size: CanvasSize) => ({ width: size.width, height: size.height });

export function setCanvasLabel(canvas: HTMLCanvasElement, label: string | undefined): void {
  if (label === undefined) return;

  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", label);
}

export function createResizeObserver(options: ResizeOptions): ResizeObserver | null {
  if (typeof ResizeObserver !== "function") return null;

  const { canvas, cloud, getSize, getFittedSize, refit } = options;

  const refitPoints = () => {
    const size = getSize();
    const previous = getFittedSize();

    if (!refit || (size.width === previous.width && size.height === previous.height)) return;

    options.setFittedSize(dimensions(size));

    const fitted = options.getFittedPoints();

    if (fitted.length === cloud.live) cloud.to(fitted, { instant: true, matches: matchByIndex(cloud.live) });
  };

  const observer = new ResizeObserver(() => {
    options.setSize(fitCanvas(canvas, { maxPixelRatio: options.maxPixelRatio }));
    options.resetFill();
    refitPoints();
    options.render();
  });

  observer.observe(canvas);

  return observer;
}

export function createVisibilityObserver({ canvas, needsFrames, wake, setVisible }: VisibilityOptions): IntersectionObserver | null {
  if (typeof IntersectionObserver !== "function") return null;

  const observer = new IntersectionObserver(([entry]) => {
    const visible = entry?.isIntersecting ?? true;

    setVisible(visible);

    if (visible && needsFrames()) wake();
  });

  observer.observe(canvas);

  return observer;
}
