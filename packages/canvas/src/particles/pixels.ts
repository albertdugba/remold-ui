import type { Pixels } from "@remold-ui/core";

const SIZE = 480;

type Source = string | Blob | HTMLImageElement | ImageBitmap;

const naturalSize = (image: HTMLImageElement | ImageBitmap) => ({
  width: "naturalWidth" in image ? image.naturalWidth : image.width,
  height: "naturalHeight" in image ? image.naturalHeight : image.height,
});

function readScaled(image: HTMLImageElement | ImageBitmap, width: number, height: number): Pixels {
  const canvas = document.createElement("canvas");

  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) throw new Error("loadPixels: this browser can't read images");

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);

  return { width: canvas.width, height: canvas.height, data };
}

/** An image's pixels, ready for `shapes.fromPixels`. */
export async function loadPixels(source: Source, { size = SIZE }: { size?: number } = {}): Promise<Pixels> {
  if (!(size > 0) || !Number.isFinite(size)) throw new RangeError(`loadPixels: size must be a positive number, got ${size}`);

  const image = await decode(source);
  const { width, height } = naturalSize(image);

  if (!width || !height) throw new Error("loadPixels: the image has no size");

  const scale = Math.min(1, size / Math.max(width, height));

  return readScaled(image, width * scale, height * scale);
}

async function decode(source: Source): Promise<HTMLImageElement | ImageBitmap> {
  if (typeof source !== "string" && !(source instanceof Blob)) {
    if ("decode" in source && !source.complete) await source.decode();

    return source;
  }

  const image = new Image();
  const url = typeof source === "string" ? source : URL.createObjectURL(source);

  image.crossOrigin = "anonymous";
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
