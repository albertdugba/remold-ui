"use client";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Cancel01Icon, Delete02Icon, FileAttachmentIcon, FileSpreadsheetIcon, FolderInputIcon, Image01Icon, MinusSignIcon, Share02Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { Checkbox } from "@base-ui/react/checkbox";
import { Tooltip } from "@base-ui/react/tooltip";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { useScene } from "./use-scene";
import { usePortalContainer } from "./portal-container";
import "./bulk-select.css";

interface File {
  id: string;
  name: string;
  size: string;
  edited: string;
  icon: IconSvgElement;
  color: string;
}

const FILES: File[] = [
  { id: "a", name: "Q3 board deck.pdf", size: "4.2 MB", edited: "Oct 24", icon: FileAttachmentIcon, color: "#ef4444" },
  { id: "b", name: "Hero shot final.png", size: "2.8 MB", edited: "Oct 22", icon: Image01Icon, color: "#8b5cf6" },
  { id: "c", name: "Pricing model.xlsx", size: "640 KB", edited: "Oct 21", icon: FileSpreadsheetIcon, color: "#10b981" },
  { id: "d", name: "Launch plan.pdf", size: "1.1 MB", edited: "Oct 18", icon: FileAttachmentIcon, color: "#ef4444" },
  { id: "e", name: "Team photo.png", size: "5.6 MB", edited: "Oct 12", icon: Image01Icon, color: "#8b5cf6" },
  { id: "f", name: "Invoices 2026.xlsx", size: "320 KB", edited: "Oct 3", icon: FileSpreadsheetIcon, color: "#10b981" },
];

interface State {
  gone: string[];
  selected: string[];
  /** The last row ticked on its own, where a shift-click range starts. */
  anchor: string | null;
  /** What the last delete took, while it can still be undone. */
  undo: string[] | null;
}

const REST: State = { gone: [], selected: [], anchor: null, undo: null };

const BEATS: readonly (State & { ms: number })[] = [
  { ...REST, ms: 1300 },
  { ...REST, selected: ["a"], anchor: "a", ms: 700 },
  { ...REST, selected: ["a", "b", "c"], anchor: "a", ms: 900 },
  { ...REST, selected: ["a", "b", "c", "e"], anchor: "e", ms: 1400 },
  { ...REST, gone: ["a", "b", "c", "e"], undo: ["a", "b", "c", "e"], ms: 2000 },
  { ...REST, ms: 1300 },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

const SPRING = { type: "spring" as const, duration: 0.45, bounce: 0.18 };

interface BulkSelectDemoProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function BulkSelectDemo({ playing }: BulkSelectDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const portal = usePortalContainer();
  const shift = useRef(false);

  // Undo stays a few seconds, then the bar leaves.
  useEffect(() => {
    if (scene.live || !state.undo) return;
    const t = setTimeout(() => take((s) => ({ ...s, undo: null })), 4500);
    return () => clearTimeout(t);
  }, [scene.live, state.undo, take]);

  const rows = FILES.filter((f) => !state.gone.includes(f.id));
  const count = state.selected.length;
  const all = count > 0 && count === rows.length;

  const tick = (id: string, on: boolean) =>
    take((s) => {
      const visible = FILES.filter((f) => !s.gone.includes(f.id)).map((f) => f.id);
      // Shift-click selects everything between the last row ticked and this one.
      if (shift.current && s.anchor && on) {
        const [from, to] = [visible.indexOf(s.anchor), visible.indexOf(id)].sort((x, y) => x - y);
        const range = visible.slice(from, to + 1);
        return { ...s, selected: [...new Set([...s.selected, ...range])], undo: null };
      }
      return {
        ...s,
        selected: on ? [...s.selected, id] : s.selected.filter((x) => x !== id),
        anchor: id,
        undo: null,
      };
    });

  const remove = () =>
    take((s) => ({ gone: [...s.gone, ...s.selected], selected: [], anchor: null, undo: s.selected }));
  const restore = () => take((s) => ({ ...s, gone: s.gone.filter((g) => !s.undo?.includes(g)), undo: null }));

  const bar = count > 0 ? "select" : state.undo ? "undo" : null;
  const picked = (id: string | undefined) => id !== undefined && state.selected.includes(id);

  return (
    <Tooltip.Provider delay={300}>
      <section ref={scene.ref} className="bk bk-layer not-prose" aria-label="Files">
        <div className="bk-head">
          <Checkbox.Root
            className="bk-check"
            checked={all}
            indeterminate={count > 0 && !all}
            onCheckedChange={(on) => take((s) => ({ ...s, selected: on ? rows.map((r) => r.id) : [], undo: null }))}
            aria-label="Select all files"
          >
            <Checkbox.Indicator className="bk-tick" render={(props, st) => (
              <span {...props}>{st.indeterminate ? <HugeiconsIcon icon={MinusSignIcon} aria-hidden="true" /> : <HugeiconsIcon icon={Tick01Icon} aria-hidden="true" />}</span>
            )} />
          </Checkbox.Root>
          <span className="bk-title">
            Files <span>{rows.length}</span>
          </span>
          <span className="bk-col-size">Size</span>
          <span className="bk-col-date">Edited</span>
        </div>

        <ul className="bk-rows">
          <AnimatePresence initial={false}>
            {rows.map((file, i) => {
              const on = state.selected.includes(file.id);
              const order = state.undo?.indexOf(file.id) ?? -1;
              const Icon = file.icon;
              return (
                <motion.li
                  key={file.id}
                  layout="position"
                  className="bk-row"
                  data-selected={on || undefined}
                  // Selected neighbours join into one band: only its outer corners round.
                  data-joins-up={(on && picked(rows[i - 1]?.id)) || undefined}
                  data-joins-down={(on && picked(rows[i + 1]?.id)) || undefined}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  // Deleted rows fold away one after another, in the order they sit.
                  exit={{ opacity: 0, height: 0, transition: { duration: 0.28, delay: Math.max(0, order) * 0.06, ease: [0.4, 0, 0.2, 1] } }}
                  transition={SPRING}
                  onClickCapture={(e: MouseEvent) => {
                    shift.current = e.shiftKey;
                  }}
                >
                  <label className="bk-row-inner">
                    <Checkbox.Root
                      className="bk-check"
                      checked={on}
                      onCheckedChange={(next) => tick(file.id, next)}
                      aria-label={`Select ${file.name}`}
                    >
                      <Checkbox.Indicator className="bk-tick">
                        <HugeiconsIcon icon={Tick01Icon} aria-hidden="true" />
                      </Checkbox.Indicator>
                    </Checkbox.Root>
                    <span className="bk-name">
                      <span className="bk-icon" style={{ "--tint": file.color } as CSSProperties}>
                        <HugeiconsIcon icon={Icon} aria-hidden="true" />
                      </span>
                      <span className="bk-file">{file.name}</span>
                    </span>
                    <span className="bk-size">{file.size}</span>
                    <span className="bk-date">{file.edited}</span>
                  </label>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
        <div className="bk-dock" aria-live="polite">
          <AnimatePresence initial={false}>
            {!bar && (
              <motion.p
                key="hint"
                className="bk-hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.15 } }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
              >
                <kbd>⇧</kbd> Shift-click to select a range
              </motion.p>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {bar && (
              <motion.div
                key="bar"
                className="bk-bar"
                initial={{ y: 14, opacity: 0, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 10, opacity: 0, scale: 0.98, transition: { duration: 0.16 } }}
                transition={SPRING}
              >
                <AnimatePresence initial={false} mode="popLayout">
                  {bar === "select" ? (
                    <motion.div
                      key="select"
                      className="bk-bar-row"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                    >
                      <button type="button" className="bk-clear" onClick={() => take((s) => ({ ...s, selected: [] }))} aria-label="Clear selection">
                        <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
                      </button>
                      <span className="bk-count">
                        {/* The count rolls: the old number lifts out as the new one comes up. */}
                        <span className="bk-roll">
                          <AnimatePresence initial={false} mode="popLayout">
                            <motion.span
                              key={count}
                              initial={{ y: "100%", opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              exit={{ y: "-100%", opacity: 0 }}
                              transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
                            >
                              {count}
                            </motion.span>
                          </AnimatePresence>
                        </span>
                        selected
                      </span>
                      <span className="bk-bar-gap" />
                      {[
                        { label: "Move", icon: FolderInputIcon },
                        { label: "Share", icon: Share02Icon },
                      ].map(({ label, icon: I }) => (
                        <Tooltip.Root key={label}>
                          <Tooltip.Trigger className="bk-action" aria-label={label}>
                            <HugeiconsIcon icon={I} aria-hidden="true" />
                          </Tooltip.Trigger>
                          <Tooltip.Portal container={portal}>
                            <Tooltip.Positioner className="bk-layer" sideOffset={8}>
                              <Tooltip.Popup className="bk-tip">{label}</Tooltip.Popup>
                            </Tooltip.Positioner>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                      ))}
                      <button type="button" className="bk-delete" onClick={remove}>
                        <HugeiconsIcon icon={Delete02Icon} aria-hidden="true" />
                        Delete
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="undo"
                      className="bk-bar-row"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                    >
                      <span className="bk-count">
                        {state.undo!.length} {state.undo!.length === 1 ? "file" : "files"} deleted
                      </span>
                      <span className="bk-bar-gap" />
                      <button type="button" className="bk-undo" onClick={restore}>
                        Undo
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </Tooltip.Provider>
  );
}
