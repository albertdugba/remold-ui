"use client";
/**
 * Records one loop of the film as a video. Each frame copies the visible layers over the
 * background into a second canvas, whose stream `MediaRecorder` encodes in real time.
 */
import { useEffect, useRef, useState } from "react";

const FPS = 60;
const TICK_MS = 200;
const TYPES = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];

const supportedType = () => (typeof MediaRecorder === "undefined" ? undefined : TYPES.find((type) => MediaRecorder.isTypeSupported(type)));

/** Paints the background, then each layer at its current opacity. */
export function composeLayers(context: CanvasRenderingContext2D, layers: readonly HTMLCanvasElement[], background: string): void {
  const { width, height } = context.canvas;
  context.globalAlpha = 1;
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  for (const layer of layers) {
    const opacity = Number(getComputedStyle(layer).opacity);
    if (opacity <= 0 || layer.width === 0) continue;
    context.globalAlpha = opacity;
    context.drawImage(layer, 0, 0, width, height);
  }
  context.globalAlpha = 1;
}

export function useRecorder({
  layers,
  background,
  ms,
  name,
  onStart,
  onDone,
}: {
  /** The canvases to record, bottom first. */
  layers: () => HTMLCanvasElement[];
  background: string;
  ms: number;
  name: string;
  onStart: () => void;
  /** "saved", or why it couldn't record. */
  onDone: (result: string) => void;
}) {
  const [left, setLeft] = useState(0);
  const stop = useRef<(() => void) | null>(null);
  const latest = useRef({ background, onDone });
  latest.current = { background, onDone };

  useEffect(() => () => stop.current?.(), []);

  const start = () => {
    const source = layers()[0];
    const type = supportedType();
    if (!source || stop.current) return;

    const composed = document.createElement("canvas");
    if (!type || typeof composed.captureStream !== "function") return latest.current.onDone("This browser can't record video");

    composed.width = source.width;
    composed.height = source.height;
    const context = composed.getContext("2d");
    if (!context) return latest.current.onDone("This browser can't record video");

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(composed.captureStream(FPS), { mimeType: type });
    let frame = 0;
    const draw = () => {
      composeLayers(context, layers(), latest.current.background);
      frame = requestAnimationFrame(draw);
    };
    const began = performance.now();
    const ticker = setInterval(() => setLeft(Math.max(0, ms - (performance.now() - began))), TICK_MS);
    const timer = setTimeout(() => recorder.stop(), ms);

    const cleanUp = () => {
      cancelAnimationFrame(frame);
      clearInterval(ticker);
      clearTimeout(timer);
      stop.current = null;
      setLeft(0);
    };

    recorder.ondataavailable = (event) => event.data.size > 0 && chunks.push(event.data);
    recorder.onstop = () => {
      cleanUp();
      if (chunks.length === 0) return latest.current.onDone("The recording came out empty");
      const url = URL.createObjectURL(new Blob(chunks, { type }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "film"}.${type.startsWith("video/mp4") ? "mp4" : "webm"}`;
      link.click();
      URL.revokeObjectURL(url);
      latest.current.onDone("saved");
    };

    stop.current = () => {
      if (recorder.state !== "inactive") recorder.stop();
      cleanUp();
    };
    draw();
    recorder.start();
    setLeft(ms);
    onStart();
  };

  return { start, recording: left > 0, left };
}
