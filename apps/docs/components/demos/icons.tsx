"use client";
import { Remold } from "@remold-ui/react";
import { useState } from "react";
import { Frame } from "./frame";
import "./icons.css";

/** Pairs of outline icons on a 24 × 24 grid, one path each. */
const PAIRS = [
  { label: ["Play", "Pause"], d: ["M8 5v14l11-7z", "M7 5h3v14H7zM14 5h3v14h-3z"], filled: true },
  { label: ["Open menu", "Close menu"], d: ["M4 7h16M4 12h16M4 17h16", "M6 6l12 12M6 18L18 6M12 12h0"], filled: false },
  { label: ["Add", "Added"], d: ["M12 5v14M5 12h14", "M5 12.5l4.5 4.5L19 7"], filled: false },
  {
    label: ["Mute", "Unmute"],
    d: ["M4 9h4l5-4v14l-5-4H4zM16 9l5 6M21 9l-5 6", "M4 9h4l5-4v14l-5-4H4zM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14"],
    filled: false,
  },
] as const;

/** Icons that reshape from one state into the next. */
export function IconsDemo({ framed = true, index }: { framed?: boolean; index?: number }) {
  const [own, setOn] = useState<boolean[]>(PAIRS.map(() => false));
  // With a step number, step n flips icon n % 4: each icon has flipped once per pass so far.
  const on = index === undefined ? own : PAIRS.map((_, i) => (index > i ? Math.floor((index - 1 - i) / PAIRS.length) + 1 : 0) % 2 === 1);
  const body = (
    <div className="rm-icons">
      {PAIRS.map((pair, i) => {
        // Driven by a step number, the icons are pictures, not buttons: the card itself is the control.
        const Tag = index === undefined ? "button" : "span";
        return (
          <Tag
            key={pair.label[0]}
            {...(index === undefined
              ? {
                  type: "button" as const,
                  "aria-label": pair.label[on[i] ? 1 : 0],
                  onClick: () => setOn((s) => s.map((v, k) => (k === i ? !v : v))),
                }
              : { "aria-hidden": true })}
            className="rm-icon-button"
          >
            <Remold.Icon
              d={pair.d[on[i] ? 1 : 0]}
              viewBox="0 0 24 24"
              fill={pair.filled ? "currentColor" : "none"}
              stroke={pair.filled ? "none" : "currentColor"}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Tag>
        );
      })}
    </div>
  );
  return framed ? <Frame>{body}</Frame> : body;
}

/** Just the play and pause icon. */
export function PlayPauseDemo() {
  const [playing, setPlaying] = useState(false);
  return (
    <Frame>
      <button type="button" className="rm-icon-button large" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying((p) => !p)}>
        <Remold.Icon d={playing ? PAIRS[0].d[1] : PAIRS[0].d[0]} viewBox="0 0 24 24" fill="currentColor" />
      </button>
    </Frame>
  );
}
