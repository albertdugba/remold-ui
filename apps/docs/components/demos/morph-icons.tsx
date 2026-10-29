"use client";

import { Remold } from "@remold-ui/react";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Cancel01Icon, Download01Icon, FavouriteIcon, Menu01Icon, PauseIcon, PlayIcon, Search01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";

interface IconOption {
  name: string;
  icon: IconSvgElement;
}

const ICONS: readonly IconOption[] = [
  { name: "Play", icon: PlayIcon },
  { name: "Pause", icon: PauseIcon },
  { name: "Menu", icon: Menu01Icon },
  { name: "Close", icon: Cancel01Icon },
  { name: "Search", icon: Search01Icon },
  { name: "Download", icon: Download01Icon },
  { name: "Done", icon: Tick01Icon },
  { name: "Like", icon: FavouriteIcon },
];

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

export function MorphIconsDemo() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = ICONS[selectedIndex]!;
  const SelectedIcon = selected.icon;

  return (
    <div className="not-prose my-6 grid justify-items-center gap-5 rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-8 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
      <div className="grid size-32 place-items-center rounded-[32px] border border-zinc-200 bg-white shadow-[0_18px_40px_-24px_rgb(0_0_0/0.35)] dark:border-zinc-800 dark:bg-zinc-950">
        <Remold.Icon
          icon={<HugeiconsIcon icon={SelectedIcon} />}
          className="size-[72px]"
          strokeWidth={1.5}
          aria-label={selected.name}
        />
      </div>

      <ToggleGroup
        aria-label="Choose an icon"
        value={[selected.name]}
        onValueChange={(values) => {
          const selected = values[0];
          if (selected) setSelectedIndex(ICONS.findIndex((icon) => icon.name === selected));
        }}
        className="flex max-w-[420px] flex-wrap justify-center gap-2"
      >
        {ICONS.map(({ name, icon: Icon }, index) => (
          <Toggle
            key={name}
            value={name}
            aria-label={name}
            className={`grid size-10 place-items-center rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 aria-pressed:bg-zinc-900 aria-pressed:text-white dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:aria-pressed:bg-zinc-100 dark:aria-pressed:text-zinc-900 ${focusRing}`}
          >
            <HugeiconsIcon icon={Icon} className="size-5" strokeWidth={1.75} aria-hidden="true" />
          </Toggle>
        ))}
      </ToggleGroup>
    </div>
  );
}
