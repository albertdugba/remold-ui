
export interface CanvasSize {
  width: number;
  height: number;
  pixelRatio: number;
}

export function backingSize(width: number, height: number, devicePixelRatio: number, maxPixelRatio = 2) {
  const pixelRatio = Math.max(1, Math.min(maxPixelRatio, devicePixelRatio || 1));

  return {
    pixelRatio,
    width: Math.max(1, Math.round(width * pixelRatio)),
    height: Math.max(1, Math.round(height * pixelRatio)),
  };
}

export function fitCanvas(canvas: HTMLCanvasElement, { maxPixelRatio = 2 }: { maxPixelRatio?: number } = {}): CanvasSize {
  const rect = canvas.getBoundingClientRect();
  const width = canvas.clientWidth || rect.width;
  const height = canvas.clientHeight || rect.height;
  const shown = width > 0 ? rect.width / width : 1;
  const screenRatio = typeof devicePixelRatio === "number" ? devicePixelRatio : 1;
  const size = backingSize(width, height, screenRatio * (shown > 0 ? shown : 1), maxPixelRatio);

  if (canvas.width !== size.width) canvas.width = size.width;
  if (canvas.height !== size.height) canvas.height = size.height;

  return { width, height, pixelRatio: size.pixelRatio };
}
