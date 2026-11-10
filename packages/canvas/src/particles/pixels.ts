import type { Pixels } from "@remold-ui/core";

/** The longest side images are read at by default: plenty for a few thousand dots, and quick. */
const SIZE = 480;

/**
 * An image's pixels, ready for `shapes.fromPixels`: from a URL, a file the person picked, or an
 * image already on the page. It's scaled down so its longest side is at most `size`. An image from
 * another site needs to allow it (CORS), or the browser won't let its pixels be read.
 */
export async function loadPixels(
  source: string | Blob | HTMLImageElement | ImageBitmap,
  { size = SIZE }: { size?: number } = {},
): Promise<Pixels> {
  if (!(size > 0) || !Number.isFinite(size)) throw new RangeError(`loadPixels: size must be a positive number, got ${size}`);
  const image = await decode(source);
  const width = "naturalWidth" in image ? image.naturalWidth : image.width;
  const height = "naturalHeight" in image ? image.naturalHeight : image.height;
  if (!width || !height) throw new Error("loadPixels: the image has no size");
  const scale = Math.min(1, size / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("loadPixels: this browser can't read images");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, data };
}

async function decode(source: string | Blob | HTMLImageElement | ImageBitmap): Promise<HTMLImageElement | ImageBitmap> {
  if (typeof source !== "string" && !(source instanceof Blob)) {
    if ("decode" in source && !source.complete) await source.decode();
    return source;
  }
  const image = new Image();
  image.crossOrigin = "anonymous";
  const url = typeof source === "string" ? source : URL.createObjectURL(source);
  image.src = url;
  try {
    await image.decode();
  } catch {
    throw new Error(`loadPixels: couldn't load the image${typeof source === "string" ? ` ${source}` : ""}`);
  } finally {
    if (typeof source !== "string") URL.revokeObjectURL(url);
  }
  return image;
}
