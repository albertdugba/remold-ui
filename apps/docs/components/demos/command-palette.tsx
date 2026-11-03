"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowRight01Icon,
  CreditCardIcon,
  DashboardSquare01Icon,
  Folder01Icon,
  Moon02Icon,
  Search01Icon,
  Settings01Icon,
  UserAdd01Icon,
  UserGroupIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { Frame } from "./frame";
import { useScene } from "./use-scene";
import "./command-palette.css";

/*
 * A command palette. The search pill grows into the palette instead of a dialog popping up,
 * results slide as you type rather than re-rendering, and choosing "Projects" turns that row into
 * a chip in the field. When you pick something the palette folds back into the pill, which says
 * what you did.
 */

type Scope = "projects" | "people";

interface Item {
  id: string;
  label: string;
  icon: IconSvgElement;
  group: "Jump to" | "Actions" | "Search in" | "Projects" | "People";
  /** A shortcut or a note on the right. */
  hint?: string;
  /** For "Search in" rows: the scope they narrow to. */
  scope?: Scope;
  /** What the pill says once it's done. */
  done?: string;
}

const ITEMS: Item[] = [
  { id: "dashboard", label: "Dashboard", icon: DashboardSquare01Icon, group: "Jump to", hint: "G D" },
  { id: "billing", label: "Billing", icon: CreditCardIcon, group: "Jump to", hint: "G B" },
  { id: "settings", label: "Settings", icon: Settings01Icon, group: "Jump to", hint: "G S" },
  { id: "team", label: "Team members", icon: UserGroupIcon, group: "Jump to" },
  { id: "new-project", label: "Create project", icon: Add01Icon, group: "Actions", hint: "⌘N", done: "Project created" },
  { id: "invite", label: "Invite teammate", icon: UserAdd01Icon, group: "Actions", done: "Invite sent" },
  { id: "theme", label: "Switch theme", icon: Moon02Icon, group: "Actions", done: "Theme switched" },
  { id: "in-projects", label: "Projects", icon: Folder01Icon, group: "Search in", scope: "projects" },
  { id: "in-people", label: "People", icon: UserIcon, group: "Search in", scope: "people" },
];
const SCOPED: Record<Scope, Item[]> = {
  projects: ["Apollo", "Borealis", "Cascade", "Driftwood"].map((name) => ({ id: `p-${name}`, label: name, icon: Folder01Icon, group: "Projects", hint: "Project" })),
  people: ["Ada Obi", "Ben Hart", "Chloe Park", "Dev Rao"].map((name) => ({ id: `u-${name}`, label: name, icon: UserIcon, group: "People", hint: "Member" })),
};
const SCOPE_LABEL: Record<Scope, string> = { projects: "Projects", people: "People" };

interface State {
  open: boolean;
  query: string;
  scope: Scope | null;
  /** The highlighted result, by index in the results. */
  active: number;
  /** What the last pick did, shown in the pill for a moment. */
  last: string | null;
}

const CLOSED: State = { open: false, query: "", scope: null, active: 0, last: null };
const OPEN: State = { ...CLOSED, open: true };

const BEATS: readonly (State & { ms: number })[] = [
  { ...CLOSED, ms: 1400 },
  { ...OPEN, ms: 1200 },
  { ...OPEN, query: "bil", ms: 1400 },
  { ...CLOSED, last: "Opened Billing", ms: 1700 },
  { ...OPEN, ms: 900 },
  { ...OPEN, query: "pro", ms: 1300 },
  { ...OPEN, scope: "projects", ms: 1500 },
  { ...OPEN, scope: "projects", query: "dri", ms: 1400 },
  { ...CLOSED, last: "Opened Driftwood", ms: 1700 },
];

const fromBeat = (step: number): State => {
  const { ms: _ms, ...state } = BEATS[step]!;
  return state;
};

/** How long the pill says what you did before it goes back to asking. */
const DONE_FOR = 1800;
const SPRING = { duration: 0.42, bounce: 0.08 };

function results({ query, scope }: Pick<State, "query" | "scope">): Item[] {
  const q = query.trim().toLowerCase();
  const pool = scope ? SCOPED[scope] : ITEMS;
  return q ? pool.filter((item) => item.label.toLowerCase().includes(q)) : pool;
}

interface CommandPaletteDemoProps {
  framed?: boolean;

  playing?: boolean;
}

export function CommandPaletteDemo({ framed = true, playing }: CommandPaletteDemoProps) {
  const { ref, state, take, live } = useScene(BEATS, fromBeat, playing);
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const clearLast = useRef<ReturnType<typeof setTimeout>>(undefined);

  const list = results(state);
  const active = Math.min(state.active, Math.max(0, list.length - 1));
  const optionId = (item: Item) => `${id}-${item.id}`;

  // Focus follows the palette: into the field when it opens, back to the pill when it closes.
  const wasOpen = useRef(state.open);
  useEffect(() => {
    if (live || wasOpen.current === state.open) return;
    wasOpen.current = state.open;
    (state.open ? input.current : trigger.current)?.focus({ preventScroll: true });
  }, [state.open, live]);

  useEffect(() => () => clearTimeout(clearLast.current), []);

  // A click outside the palette closes it.
  useEffect(() => {
    if (!state.open || live) return;
    const away = (e: PointerEvent) => {
      if (!shell.current?.contains(e.target as Node)) take((s) => ({ ...s, open: false }));
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [state.open, live, take]);

  const open = () => take((s) => ({ ...OPEN, last: null, scope: s.scope }));
  const close = () => take((s) => ({ ...s, open: false, query: "", scope: null, active: 0 }));

  const pick = (item: Item) => {
    if (item.scope) {
      // Narrow to the scope: the row's label becomes a chip in the field.
      take((s) => ({ ...s, scope: item.scope!, query: "", active: 0 }));
      input.current?.focus({ preventScroll: true });
      return;
    }
    clearTimeout(clearLast.current);
    take({ ...CLOSED, last: item.done ?? `Opened ${item.label}` });
    clearLast.current = setTimeout(() => take((s) => (s.open ? s : { ...s, last: null })), DONE_FOR);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (list.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      take((s) => ({ ...s, active: (active + step + list.length) % list.length }));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = list[active];
      if (item) pick(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Backspace" && state.query === "" && state.scope) {
      e.preventDefault();
      take((s) => ({ ...s, scope: null, active: 0 }));
    }
  };

  // ⌘K or Ctrl+K opens it while focus is anywhere inside the demo.
  const onShortcut = (e: KeyboardEvent<HTMLElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      e.stopPropagation();
      if (state.open) close();
      else open();
    }
  };

  const groups = [...new Set(list.map((item) => item.group))];

  const body = (
    <section ref={ref} className="kp" onKeyDown={onShortcut} aria-label="Command palette demo">
      <Remold.Layout
        trigger={[state.open, state.scope, list.map((item) => item.id).join()]}
        spring={SPRING}
        className="kp-stage"
      >
        <div ref={shell} className="kp-shell" data-open={state.open || undefined}>
          {state.open ? (
            <div className="kp-panel" role="dialog" aria-label="Search or run a command">
              <div className="kp-field">
                <HugeiconsIcon className="kp-search" icon={Search01Icon} strokeWidth={1.8} aria-hidden="true" />
                {state.scope && (
                  <span className="kp-chip">
                    <HugeiconsIcon icon={ITEMS.find((item) => item.scope === state.scope)!.icon} strokeWidth={1.8} aria-hidden="true" />
                    {SCOPE_LABEL[state.scope]}
                  </span>
                )}
                <input
                  ref={input}
                  role="combobox"
                  aria-expanded="true"
                  aria-controls={`${id}-list`}
                  aria-activedescendant={list[active] ? optionId(list[active]!) : undefined}
                  aria-autocomplete="list"
                  aria-label={state.scope ? `Search ${SCOPE_LABEL[state.scope].toLowerCase()}` : "Search or run a command"}
                  placeholder={state.scope ? `Search ${SCOPE_LABEL[state.scope].toLowerCase()}…` : "Search or jump to…"}
                  value={state.query}
                  onChange={(e) => {
                    const query = e.target.value;
                    take((s) => ({ ...s, query, active: 0 }));
                  }}
                  onKeyDown={onKeyDown}
                />
                <kbd className="kp-key">esc</kbd>
              </div>

              <div id={`${id}-list`} className="kp-list" role="listbox" aria-label="Results">
                {groups.map((group) => (
                  <div key={group} role="group" aria-label={group} className="kp-group">
                    <span className="kp-group-name" aria-hidden="true">
                      {group}
                    </span>
                    {list
                      .filter((item) => item.group === group)
                      .map((item) => {
                        const selected = list[active] === item;
                        return (
                          <div
                            key={item.id}
                            id={optionId(item)}
                            role="option"
                            aria-selected={selected}
                            className="kp-option"
                            onPointerMove={() => !selected && take((s) => ({ ...s, active: list.indexOf(item) }))}
                            onClick={() => pick(item)}
                          >
                            <HugeiconsIcon icon={item.icon} strokeWidth={1.7} aria-hidden="true" />
                            <span className="kp-label">{item.label}</span>
                            {item.scope ? (
                              <HugeiconsIcon className="kp-more" icon={ArrowRight01Icon} strokeWidth={1.8} aria-hidden="true" />
                            ) : (
                              item.hint && <kbd className="kp-key">{item.hint}</kbd>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ))}
                {list.length === 0 && (
                  <p className="kp-empty" role="status">
                    No results for “{state.query}”
                  </p>
                )}
              </div>
            </div>
          ) : (
            <button ref={trigger} type="button" className="kp-trigger" aria-haspopup="dialog" onClick={open}>
              <HugeiconsIcon className="kp-search" icon={Search01Icon} strokeWidth={1.8} aria-hidden="true" />
              <Remold.Text className="kp-prompt">{state.last ?? "Search or jump to…"}</Remold.Text>
              <kbd className="kp-key">⌘K</kbd>
            </button>
          )}
        </div>
      </Remold.Layout>
      <p className="kp-status" role="status">
        {state.last ?? ""}
      </p>
    </section>
  );

  return framed ? <Frame>{body}</Frame> : body;
}
