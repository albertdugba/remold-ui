"use client";
import { Remold } from "@remold-ui/react";
import { Check, Menu, Pause, Play, Plus, Volume2, VolumeX, X, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Frame } from "./frame";
import "./icons.css";

interface IconPair {
  label: readonly [string, string];
  icons: readonly [LucideIcon, LucideIcon];
}

const PAIRS: readonly IconPair[] = [
  { label: ["Play", "Pause"], icons: [Play, Pause] },
  { label: ["Open menu", "Close menu"], icons: [Menu, X] },
  { label: ["Add", "Added"], icons: [Plus, Check] },
  { label: ["Sound on", "Sound off"], icons: [Volume2, VolumeX] },
];

/** Icons that reshape from one state into the next. */
export function IconsDemo({ framed = true, index }: { framed?: boolean; index?: number }) {
  const [own, setOn] = useState<boolean[]>(PAIRS.map(() => false));
  // With a step number, step n flips icon n % 4: each icon has flipped once per pass so far.
  const on = index === undefined ? own : PAIRS.map((_, i) => (index > i ? Math.floor((index - 1 - i) / PAIRS.length) + 1 : 0) % 2 === 1);
  const body = (
    <div className="rm-icons">
      {PAIRS.map((pair, i) => {
        const Tag = index === undefined ? "button" : "span";
        const Icon = pair.icons[on[i] ? 1 : 0];

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
            <Remold.Icon icon={Icon} strokeWidth={1.75} aria-hidden="true" />
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
        <Remold.Icon icon={playing ? Pause : Play} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </Frame>
  );
}
