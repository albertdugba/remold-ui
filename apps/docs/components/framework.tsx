"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

export const FRAMEWORKS = [
  { id: "react", label: "React" },
  { id: "js", label: "JavaScript" },
  { id: "vue", label: "Vue" },
  { id: "svelte", label: "Svelte" },
  { id: "angular", label: "Angular" },
  { id: "solid", label: "Solid" },
] as const;
export type Framework = (typeof FRAMEWORKS)[number]["id"];

const KEY = "rm-framework";
const listeners = new Set<() => void>();
let chosen: Framework | null = null;

function read(): Framework {
  if (chosen) return chosen;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && FRAMEWORKS.some((f) => f.id === saved)) chosen = saved as Framework;
  } catch {
    // Storage blocked: React for this visit.
  }
  return chosen ?? "react";
}

function choose(framework: Framework) {
  chosen = framework;
  try {
    localStorage.setItem(KEY, framework);
  } catch {
    // Storage blocked: the choice still holds until the page is closed.
  }
  for (const l of listeners) l();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The framework to show in a block that has `available`: the chosen one, or its first. */
export function useFramework(available: readonly Framework[]): Framework {
  const framework = useSyncExternalStore(subscribe, read, () => "react" as Framework);
  return available.includes(framework) ? framework : available[0]!;
}

/** A small menu to pick the framework. Frameworks a block doesn't have yet are listed as "Soon". */
export function FrameworkMenu({ available }: { available: readonly Framework[] }) {
  const current = useFramework(available);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const label = FRAMEWORKS.find((f) => f.id === current)!.label;
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Framework: ${label}`}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-foreground focus-visible:outline-2 focus-visible:outline-fd-ring"
      >
        {label}
        <HugeiconsIcon icon={ArrowDown01Icon} className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Framework"
          className="absolute right-0 z-20 mt-1 min-w-[168px] rounded-xl border border-fd-border bg-fd-popover p-1 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.25)]"
        >
          {FRAMEWORKS.map((f) => {
            const ready = available.includes(f.id);
            return (
              <li key={f.id} role="option" aria-selected={f.id === current} aria-disabled={!ready}>
                <button
                  type="button"
                  disabled={!ready}
                  onClick={() => {
                    choose(f.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-fd-foreground enabled:hover:bg-fd-accent disabled:cursor-default disabled:text-fd-muted-foreground"
                >
                  <span className="flex-1">{f.label}</span>
                  {!ready && (
                    <span className="rounded-full border border-fd-border px-1.5 py-px text-[10.5px] font-medium text-fd-muted-foreground">
                      Soon
                    </span>
                  )}
                  {f.id === current && <HugeiconsIcon icon={Tick01Icon} className="size-3.5" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
