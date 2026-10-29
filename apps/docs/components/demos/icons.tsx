"use client";
import { Remold } from "@remold-ui/react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Add01Icon, Cancel01Icon, Menu01Icon, PauseIcon, PlayIcon, Tick01Icon, VolumeHighIcon, VolumeMuteIcon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { Frame } from "./frame";
import "./icons.css";

interface IconPair {
  label: readonly [string, string];
  icons: readonly [IconSvgElement, IconSvgElement];
}

const PAIRS: readonly IconPair[] = [
  { label: ["Play", "Pause"], icons: [PlayIcon, PauseIcon] },
  { label: ["Open menu", "Close menu"], icons: [Menu01Icon, Cancel01Icon] },
  { label: ["Add", "Added"], icons: [Add01Icon, Tick01Icon] },
  { label: ["Sound on", "Sound off"], icons: [VolumeHighIcon, VolumeMuteIcon] },
];

export function IconsDemo({
  framed = true,
  index,
}: {
  framed?: boolean;
  index?: number;
}) {
  const [own, setOn] = useState<boolean[]>(PAIRS.map(() => false));

  const on =
    index === undefined
      ? own
      : PAIRS.map(
          (_, i) =>
            (index > i ? Math.floor((index - 1 - i) / PAIRS.length) + 1 : 0) %
              2 ===
            1,
        );
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
                  onClick: () =>
                    setOn((s) => s.map((v, k) => (k === i ? !v : v))),
                }
              : { "aria-hidden": true })}
            className="rm-icon-button"
          >
            <Remold.Icon icon={<HugeiconsIcon icon={Icon} />} strokeWidth={1.75} aria-hidden="true" />
          </Tag>
        );
      })}
    </div>
  );
  return framed ? <Frame>{body}</Frame> : body;
}

export function PlayPauseDemo() {
  const [playing, setPlaying] = useState(false);
  return (
    <Frame>
      <button
        type="button"
        className="rm-icon-button large"
        aria-label={playing ? "Pause" : "Play"}
        onClick={() => setPlaying((p) => !p)}
      >
        <Remold.Icon
          icon={<HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} />}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </button>
    </Frame>
  );
}
