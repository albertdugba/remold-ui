"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { CodeIcon, Copy01Icon, RotateLeft01Icon, CheckIcon, ViewIcon } from "@hugeicons/core-free-icons";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

export interface StageProps {
  children: ReactNode;
  /** The demo's source, shown in the Code view (usually `<Source demo="…" />`). */
  code?: ReactNode;
  /** The registry name: shown in the toolbar, and its install command is what the copy button copies. */
  name?: string;
  /** The widest the demo gets, in pixels. Default 900 (the article is about 980 wide). */
  width?: number;
  /** The stage's minimum height, in pixels. Default 480. */
  minHeight?: number;
  /** Let the demo use the stage's full width (galleries, wide canvases). */
  wide?: boolean;
}

const tab =
  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12.5px] text-fd-muted-foreground transition-colors hover:text-fd-foreground aria-selected:bg-fd-background aria-selected:text-fd-foreground aria-selected:shadow-[0_1px_2px_rgb(0_0_0/0.08)]";
const iconButton =
  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-foreground focus-visible:outline-2 focus-visible:outline-fd-ring";

export function Stage({ children, code, name, width = 900, minHeight = 480, wide = false }: StageProps) {
  const [view, setView] = useState<"preview" | "code">("preview");
  const [run, setRun] = useState(0);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const install = name ? `npx shadcn@latest add ${origin}/r/${name}.json` : null;

  return (
    <div className="rm-stage not-prose my-6 overflow-hidden rounded-2xl border border-fd-border bg-fd-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fd-border px-2 py-1.5">
        <div className="flex items-center gap-2">
          <div role="tablist" aria-label="View" className="flex gap-0.5 rounded-lg bg-fd-muted p-0.5">
            <button type="button" role="tab" aria-selected={view === "preview"} onClick={() => setView("preview")} className={tab}>
              <HugeiconsIcon icon={ViewIcon} className="size-3.5" aria-hidden="true" />
              Preview
            </button>
            {code && (
              <button type="button" role="tab" aria-selected={view === "code"} onClick={() => setView("code")} className={tab}>
                <HugeiconsIcon icon={CodeIcon} className="size-3.5" aria-hidden="true" />
                Code
              </button>
            )}
          </div>
          {name && install && (
            <button
              type="button"
              title={install}
              className={`${iconButton} font-mono`}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(install);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  // Clipboard blocked: the command is on the page under Install.
                }
              }}
            >
              {name}
              {copied ? (
                <HugeiconsIcon icon={CheckIcon} className="size-3.5" aria-label="Install command copied" />
              ) : (
                <HugeiconsIcon icon={Copy01Icon} className="size-3.5" aria-label="Copy install command" />
              )}
            </button>
          )}
        </div>
        {view === "preview" && (
          <button type="button" onClick={() => setRun((r) => r + 1)} className={iconButton} aria-label="Replay the demo">
            <HugeiconsIcon icon={RotateLeft01Icon} className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Replay</span>
          </button>
        )}
      </div>

      {view === "preview" ? (
        <div
          className="rm-stage-preview relative grid place-items-center px-4 py-10 sm:px-8 sm:py-16"
          style={{ minHeight } as CSSProperties}
        >
          <div key={run} className="rm-stage-demo relative grid w-full place-items-center [&>*]:!my-0" style={wide ? undefined : { maxWidth: width }}>
            {children}
          </div>
        </div>
      ) : (
        <div className="rm-stage-code max-h-[640px] overflow-auto">{code}</div>
      )}
    </div>
  );
}
