"use client";

import { Remold } from "@remold-ui/react";
import { Check, Download, Heart, Menu, Pause, Play, Search, X, type LucideIcon } from "lucide-react";
import { useState } from "react";

interface IconOption {
  name: string;
  icon: LucideIcon;
}

const ICONS: readonly IconOption[] = [
  { name: "Play", icon: Play },
  { name: "Pause", icon: Pause },
  { name: "Menu", icon: Menu },
  { name: "Close", icon: X },
  { name: "Search", icon: Search },
  { name: "Download", icon: Download },
  { name: "Done", icon: Check },
  { name: "Like", icon: Heart },
];

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

/** A minimal icon picker: every selection is an ordinary imported icon component. */
export function MorphIconsDemo() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = ICONS[selectedIndex]!;
  const SelectedIcon = selected.icon;

  return (
    <div className="not-prose my-6 grid justify-items-center gap-5 rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-8 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
      <div className="grid size-32 place-items-center rounded-[32px] border border-zinc-200 bg-white shadow-[0_18px_40px_-24px_rgb(0_0_0/0.35)] dark:border-zinc-800 dark:bg-zinc-950">
        <Remold.Icon icon={SelectedIcon} className="size-[72px]" strokeWidth={1.5} aria-label={selected.name} />
      </div>

      <div role="group" aria-label="Choose an icon" className="flex max-w-[420px] flex-wrap justify-center gap-2">
        {ICONS.map(({ name, icon: Icon }, index) => (
          <button
            key={name}
            type="button"
            aria-label={name}
            aria-pressed={selectedIndex === index}
            onClick={() => setSelectedIndex(index)}
            className={`grid size-10 place-items-center rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 aria-pressed:bg-zinc-900 aria-pressed:text-white dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:aria-pressed:bg-zinc-100 dark:aria-pressed:text-zinc-900 ${focusRing}`}
          >
            <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
