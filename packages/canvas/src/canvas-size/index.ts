/**
 * Sharp canvases. A canvas has two sizes: how big it looks (CSS pixels) and how many pixels it
 * stores. On a 2× screen, a 300px-wide canvas needs 600 stored pixels or it looks blurry.
 */

export interface CanvasSize {
  /** Size on the page, in CSS pixels. Draw in these units. */
  width: number;
  height: number;
  /** Stored pixels per CSS pixel. Multiply transforms by this. */
  pixelRatio: number;
}

/**
 * The stored size for a canvas that looks `width × height`. The pixel ratio is capped (default 2):
 * 3× screens gain little visible sharpness for 2.25× the pixels to fill every frame.
 */
export function backingSize(width: number, height: number, devicePixelRatio: number, maxPixelRatio = 2) {
  const pixelRatio = Math.max(1, Math.min(maxPixelRatio, devicePixelRatio || 1));

  return {
    pixelRatio,
    width: Math.max(1, Math.round(width * pixelRatio)),
    height: Math.max(1, Math.round(height * pixelRatio)),
  };
}

/**
 * Size `canvas`'s stored pixels to match how big it looks on this screen. Only touches the
 * canvas when the size actually changed, because resizing clears it.
 */
export function fitCanvas(canvas: HTMLCanvasElement, { maxPixelRatio = 2 }: { maxPixelRatio?: number } = {}): CanvasSize {
  const rect = canvas.getBoundingClientRect();
  // Draw in the canvas's own CSS pixels. Inside a scaled container (a thumbnail, a zoomed
  // editor) that differs from its size on screen, so store pixels for the size it's shown at.
  const width = canvas.clientWidth || rect.width;
  const height = canvas.clientHeight || rect.height;
  const shown = width > 0 ? rect.width / width : 1;
  const ratio = (typeof devicePixelRatio === "number" ? devicePixelRatio : 1) * (shown > 0 ? shown : 1);
  const size = backingSize(width, height, ratio, maxPixelRatio);

  if (canvas.width !== size.width) canvas.width = size.width;
  if (canvas.height !== size.height) canvas.height = size.height;

  return { width, height, pixelRatio: size.pixelRatio };
}
