"use client";

import { Remold } from "@remold-ui/react/canvas";
import { useState } from "react";

const SHAPES = {
  none: { label: "None", shape: null },
  word: { label: "Wordmark", shape: { text: "ship it", scale: 0.8 } },
  logo: {
    label: "Logo",
    shape: {
      path: "M12 2 3 7v10l9 5 9-5V7zm0 2.3 6.6 3.7L12 11.7 5.4 8zM5 9.7l6 3.4v6.6l-6-3.3zm8 10V13.1l6-3.4v6.7z",
      scale: 0.8,
    },
  },
} as const;

type Shape = keyof typeof SHAPES;

export function DotGridDemo() {
  const [shape, setShape] = useState<Shape>("word");
  const [ambient, setAmbient] = useState(true);

  return (
    <div className="grid w-[min(100%,560px)] gap-3.5 font-sans [--dgd-accent:#6366f1] [--dgd-dots:rgb(24_24_27/0.18)] [--dgd-ink:#18181b] [--dgd-muted:#71717a] [--dgd-soft:#f4f4f5] [--dgd-surface:#ffffff] dark:[--dgd-accent:#a5b4fc] dark:[--dgd-dots:rgb(255_255_255/0.16)] dark:[--dgd-ink:#fafafa] dark:[--dgd-muted:#a1a1aa] dark:[--dgd-soft:#27272a] dark:[--dgd-surface:#111113]">
      <div className="relative h-[280px] overflow-hidden rounded-[20px] bg-(--dgd-surface)">
        <Remold.DotGrid
          className="absolute inset-0 size-full text-(--dgd-dots) accent-(--dgd-accent)"
          gap={10}
          size={1.1}
          reach={110}
          shape={SHAPES[shape].shape}
          ambient={ambient}
        />
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <div className="flex gap-0.5 rounded-full bg-(--dgd-soft) p-[3px]" role="group" aria-label="Shape">
          {(Object.keys(SHAPES) as Shape[]).map((key) => (
            <button
              key={key}
              type="button"
              className="cursor-pointer rounded-full border-0 px-3.5 py-1.5 text-[13px] font-semibold text-(--dgd-muted) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--dgd-accent) bg-transparent aria-pressed:bg-(--dgd-surface) aria-pressed:text-(--dgd-ink)"
              aria-pressed={shape === key}
              onClick={() => setShape(key)}
            >
              {SHAPES[key].label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="cursor-pointer rounded-full border-0 px-3.5 py-1.5 text-[13px] font-semibold text-(--dgd-muted) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--dgd-accent) bg-(--dgd-soft) aria-pressed:bg-(--dgd-surface) aria-pressed:text-(--dgd-accent)"
          aria-pressed={ambient}
          onClick={() => setAmbient((on) => !on)}
        >
          Shimmer
        </button>
      </div>
    </div>
  );
}
