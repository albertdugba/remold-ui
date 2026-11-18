"use client";
/**
 * A demo's files in one row of tabs, with one copy button for whichever file is showing.
 * The highlighted panels are rendered on the server and passed in.
 */
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";

export interface SourceTab {
  label: string;
  /** The raw text, for the copy button. */
  code: string;
  panel: ReactNode;
  /** Draw a divider after this tab, to set it apart from the ones that follow. */
  apart?: boolean;
}

const TAB =
  "flex-none rounded-md px-2.5 py-1 text-[12.5px] whitespace-nowrap text-fd-muted-foreground transition-[background-color,color] duration-150 ease-out hover:text-fd-foreground focus-visible:outline-2 focus-visible:outline-fd-ring aria-selected:bg-fd-accent aria-selected:font-medium aria-selected:text-fd-foreground motion-reduce:transition-none";

export function SourceTabs({ tabs }: { tabs: readonly SourceTab[] }) {
  const id = useId();
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const reset = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(reset.current), []);

  const select = (index: number) => {
    setActive(index);
    setCopied(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    const next =
      event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : step === undefined ? null : (active + step + tabs.length) % tabs.length;

    if (next === null) return;

    event.preventDefault();
    select(next);
    list.current?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(tabs[active]!.code);
      setCopied(true);
      clearTimeout(reset.current);
      reset.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: the code can still be selected by hand.
    }
  };

  return (
    <div className="rm-source">
      <div className="flex h-10 items-center gap-2 border-b border-fd-border pr-1.5 pl-2">
        <div
          ref={list}
          role="tablist"
          aria-label="Files"
          className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none]"
          onKeyDown={onKeyDown}
        >
          {tabs.map((tab, index) => (
            <span key={tab.label} className="flex flex-none items-center gap-0.5">
              <button
                type="button"
                role="tab"
                id={`${id}-tab-${index}`}
                aria-selected={index === active}
                aria-controls={`${id}-panel`}
                tabIndex={index === active ? 0 : -1}
                onClick={() => select(index)}
                className={TAB}
              >
                {tab.label}
              </button>
              {tab.apart && index < tabs.length - 1 && <span className="mx-1.5 h-3.5 w-px bg-fd-border" aria-hidden="true" />}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-7 flex-none items-center gap-1.5 rounded-md px-2 text-[12.5px] text-fd-muted-foreground transition-[background-color,color] duration-150 ease-out hover:bg-fd-accent hover:text-fd-foreground focus-visible:outline-2 focus-visible:outline-fd-ring active:scale-[0.97] motion-reduce:transition-none"
        >
          <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} className="size-3.5" strokeWidth={copied ? 2.4 : 1.8} aria-hidden="true" />
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${active}`}>
        {tabs[active]!.panel}
      </div>
    </div>
  );
}
