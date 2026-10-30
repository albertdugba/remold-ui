"use client";
import { Remold } from "@remold-ui/react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Add01Icon, Cancel01Icon, Menu01Icon, PauseIcon, PlayIcon, CheckIcon, VolumeHighIcon, VolumeMuteIcon } from "@hugeicons/core-free-icons";
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
  { label: ["Add", "Added"], icons: [Add01Icon, CheckIcon] },
  { label: ["Sound on", "Sound off"], icons: [VolumeHighIcon, VolumeMuteIcon] },
];

function isPairOn(step: number, pairIndex: number) {
  if (step <= pairIndex) return false;

  const toggles = Math.floor((step - 1 - pairIndex) / PAIRS.length) + 1;

  return toggles % 2 === 1;
}

export function IconsDemo({
  framed = true,
  index,
}: {
  framed?: boolean;
  index?: number;
}) {
  const [own, setOn] = useState<boolean[]>(() => PAIRS.map(() => false));

  const on = index === undefined ? own : PAIRS.map((_, pairIndex) => isPairOn(index, pairIndex));

  const body = (
    <div className="rm-icons">
      {PAIRS.map((pair, pairIndex) => {
        const Tag = index === undefined ? "button" : "span";
        const active = on[pairIndex] ?? false;
        const Icon = pair.icons[active ? 1 : 0];

        return (
          <Tag
            key={pair.label[0]}
            {...(index === undefined
              ? {
                  type: "button" as const,
                  "aria-label": pair.label[active ? 1 : 0],
                  onClick: () =>
                    setOn((current) =>
                      current.map((isOn, indexInList) => (indexInList === pairIndex ? !isOn : isOn)),
                    ),
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
        onClick={() => setPlaying((current) => !current)}
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
