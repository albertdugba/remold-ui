"use client";

import { Remold } from "@remold-ui/react/canvas";
import { useState } from "react";
import "./dot-grid.css";

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
    <div className="dgd">
      <div className="dgd-stage">
        <Remold.DotGrid
          className="dgd-grid"
          gap={10}
          size={1.1}
          reach={110}
          shape={SHAPES[shape].shape}
          ambient={ambient}
        />
      </div>
      <div className="dgd-controls">
        <div className="dgd-group" role="group" aria-label="Shape">
          {(Object.keys(SHAPES) as Shape[]).map((key) => (
            <button
              key={key}
              type="button"
              className="dgd-option"
              aria-pressed={shape === key}
              onClick={() => setShape(key)}
            >
              {SHAPES[key].label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="dgd-option dgd-toggle"
          aria-pressed={ambient}
          onClick={() => setAmbient((on) => !on)}
        >
          Shimmer
        </button>
      </div>
    </div>
  );
}
