"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";
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
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, type FocusEvent, type KeyboardEvent, type Ref } from "react";
import { useMeasuredSize } from "./use-measured-size";
import { Frame } from "./frame";
import { useControllableState, type ChangeDetails } from "./use-controllable-state";
import { typing, useScene } from "./use-scene";

type Scope = "projects" | "people";

interface Command {
  id: string;
  label: string;
  icon: IconSvgElement;
  shortcut?: string;
  scope?: Scope;
  outcome?: string;
}

interface CommandGroup {
  label: string;
  items: Command[];
}

const COMMANDS: CommandGroup[] = [
  {
    label: "Jump to",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: DashboardSquare01Icon,
        shortcut: "G D",
      },
      {
        id: "billing",
        label: "Billing",
        icon: CreditCardIcon,
        shortcut: "G B",
      },
      {
        id: "settings",
        label: "Settings",
        icon: Settings01Icon,
        shortcut: "G S",
      },
      { id: "team", label: "Team members", icon: UserGroupIcon },
    ],
  },
  {
    label: "Actions",
    items: [
      {
        id: "new-project",
        label: "Create project",
        icon: Add01Icon,
        shortcut: "⌘N",
        outcome: "Project created",
      },
      {
        id: "invite",
        label: "Invite teammate",
        icon: UserAdd01Icon,
        outcome: "Invite sent",
      },
      {
        id: "theme",
        label: "Switch theme",
        icon: Moon02Icon,
        outcome: "Theme switched",
      },
    ],
  },
  {
    label: "Search in",
    items: [
      {
        id: "in-projects",
        label: "Projects",
        icon: Folder01Icon,
        scope: "projects",
      },
      { id: "in-people", label: "People", icon: UserIcon, scope: "people" },
    ],
  },
];

const scopedGroup = (label: string, names: string[], icon: IconSvgElement, kind: string): CommandGroup[] => [
  {
    label,
    items: names.map((name) => ({
      id: `${kind}-${name}`,
      label: name,
      icon,
      shortcut: kind,
    })),
  },
];

const SCOPED: Record<Scope, CommandGroup[]> = {
  projects: scopedGroup("Projects", ["Apollo", "Borealis", "Cascade", "Driftwood"], Folder01Icon, "Project"),
  people: scopedGroup("People", ["Ada Obi", "Ben Hart", "Chloe Park", "Dev Rao"], UserIcon, "Member"),
};

const SCOPE_LABELS: Record<Scope, string> = {
  projects: "Projects",
  people: "People",
};
const SCOPE_ICONS: Record<Scope, IconSvgElement> = {
  projects: Folder01Icon,
  people: UserIcon,
};

export interface CommandPaletteValue {
  open: boolean;
  query: string;
  scope: Scope | null;
  outcome: string | null;
}

const CLOSED: CommandPaletteValue = { open: false, query: "", scope: null, outcome: null };
const OPEN: CommandPaletteValue = { ...CLOSED, open: true };

const OUTCOME_DURATION = 1800;
const SHELL_SPRING = { type: "spring" as const, duration: 0.46, bounce: 0.16 };
const SETTLE = { ...SHELL_SPRING, bounce: 0.1 };
const CONTENT_SPRING = {
  type: "spring" as const,
  duration: 0.34,
  bounce: 0.08,
};

const ROW_GAP = 0.015;
const ROWS_WITHIN = 0.08;
const LEAVE = { duration: 0.1 };
const FOLD_AFTER = 0.09;

const KEY_HINT =
  "flex-none rounded-[5px] bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] leading-[1.4] text-zinc-500 dark:bg-[#2c2c31] dark:text-zinc-400";
const SEARCH_ICON = "size-4 flex-none text-zinc-500 dark:text-zinc-400";

export interface CommandPaletteProps {
  value?: CommandPaletteValue;
  defaultValue?: CommandPaletteValue;
  onValueChange?: (value: CommandPaletteValue, details: ChangeDetails) => void;
  moveFocus?: boolean;
  ref?: Ref<HTMLDivElement>;
}

export function CommandPalette({
  value,
  defaultValue = CLOSED,
  onValueChange,
  moveFocus = true,
  ref,
}: CommandPaletteProps) {
  const [palette, setPalette] = useControllableState({ value, defaultValue, onValueChange });
  const trigger = useRef<HTMLButtonElement>(null);
  const clearOutcome = useRef<ReturnType<typeof setTimeout>>(undefined);
  const groups = palette.scope ? SCOPED[palette.scope] : COMMANDS;
  const reduceMotion = useReducedMotion();
  const order = new Map(groups.flatMap((group) => group.items).map((command, index) => [command.id, index]));

  const arrive = (command: Command) => {
    const index = order.get(command.id) ?? 0;
    return (
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(3px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{
          ...CONTENT_SPRING,
          delay: reduceMotion ? 0 : 0.04 + Math.min(index * ROW_GAP, ROWS_WITHIN),
        }}
      />
    );
  };

  const wasOpen = useRef(palette.open);
  useEffect(() => {
    if (moveFocus && wasOpen.current && !palette.open) trigger.current?.focus({ preventScroll: true });
    wasOpen.current = palette.open;
  }, [palette.open, moveFocus]);

  useEffect(() => () => clearTimeout(clearOutcome.current), []);

  const [content, contentSize] = useMeasuredSize<HTMLDivElement>();
  const contentHeight = contentSize?.height ?? null;

  const open = () => setPalette((current) => ({ ...OPEN, scope: current.scope }));
  const close = () => setPalette((current) => ({ ...current, open: false, query: "", scope: null }));

  const choose = (command: Command) => {
    if (command.scope) {
      setPalette((current) => ({ ...current, scope: command.scope!, query: "" }));
      return;
    }
    clearTimeout(clearOutcome.current);
    setPalette({ ...CLOSED, outcome: command.outcome ?? `Opened ${command.label}` });
    clearOutcome.current = setTimeout(
      () => setPalette((current) => (current.open ? current : { ...current, outcome: null }), "timer"),
      OUTCOME_DURATION,
    );
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Backspace" && palette.query === "" && palette.scope) {
      event.preventDefault();
      setPalette((current) => ({ ...current, scope: null }));
    }
  };

  const handleShortcut = (event: KeyboardEvent<HTMLElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      event.stopPropagation();
      if (palette.open) close();
      else open();
    }
  };

  const closeWhenFocusLeaves = (event: FocusEvent<HTMLDivElement>) => {
    if (palette.open && !event.currentTarget.contains(event.relatedTarget as Node | null)) close();
  };

  const foldDelay = palette.open || reduceMotion ? 0 : FOLD_AFTER;

  return (
    <section
      ref={ref}
      className="grid min-h-[380px] w-[440px] max-w-full content-start justify-items-center font-sans text-[13px] text-zinc-900 dark:text-zinc-50"
      onKeyDown={handleShortcut}
      aria-label="Command palette demo"
    >
      <div className="grid w-full justify-items-center">
        <motion.div
          initial={false}
          animate={{
            width: palette.open ? "100%" : 280,
            height: contentHeight === null ? "auto" : contentHeight + 2,
            borderRadius: palette.open ? 16 : 20,
          }}
          transition={{
            ...SHELL_SPRING,
            height: { ...SETTLE, delay: foldDelay },
            borderRadius: { ...SETTLE, delay: foldDelay },
            delay: foldDelay,
          }}
          className="relative max-w-full overflow-hidden bg-white has-[button[aria-haspopup]:focus-visible]:outline-2 has-[button[aria-haspopup]:focus-visible]:outline-offset-2 has-[button[aria-haspopup]:focus-visible]:outline-zinc-900 dark:has-[button[aria-haspopup]:focus-visible]:outline-zinc-50 border border-black/[0.06] shadow-[0_1px_2px_rgb(0_0_0/0.05),0_12px_28px_-20px_rgb(0_0_0/0.16)] dark:border-white/[0.07] dark:bg-[#1c1c1f] dark:shadow-[0_1px_2px_rgb(0_0_0/0.28),0_12px_28px_-20px_rgb(0_0_0/0.48)]"
          data-open={palette.open || undefined}
          onBlur={closeWhenFocusLeaves}
        >
          <div ref={content}>
            <AnimatePresence initial={false} mode="popLayout">
              {palette.open ? (
                <motion.div
                  key="palette"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={
                    reduceMotion
                      ? { opacity: 0, transition: LEAVE }
                      : { opacity: 0, filter: "blur(4px)", transition: LEAVE }
                  }
                  transition={CONTENT_SPRING}
                >
                  <Autocomplete.Root
                    open
                    inline
                    items={groups}
                    value={palette.query}
                    onValueChange={(query, details) => {
                      if (details.reason === "item-press" || details.reason === "list-navigation") return;
                      setPalette((current) => ({ ...current, query }));
                    }}
                    itemToStringValue={(command: Command) => command.label}
                    autoHighlight="always"
                    keepHighlight
                  >
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={CONTENT_SPRING}>
                      <Autocomplete.InputGroup className="flex h-12 items-center gap-2 pr-3 pl-4 shadow-[0_1px_0_rgb(24_24_27/0.08)] dark:shadow-[0_1px_0_rgb(255_255_255/0.08)]">
                        <HugeiconsIcon
                          className={SEARCH_ICON}
                          icon={Search01Icon}
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                        {palette.scope && (
                          <span className="inline-flex h-6 flex-none items-center gap-[5px] rounded-[7px] bg-zinc-100 pr-2 pl-1.5 font-medium dark:bg-[#2c2c31] [&_svg]:size-3.5 [&_svg]:text-zinc-500 dark:[&_svg]:text-zinc-400">
                            <Remold.Icon
                              icon={<HugeiconsIcon icon={SCOPE_ICONS[palette.scope]} />}
                              strokeWidth={1.8}
                              aria-hidden="true"
                            />
                            {SCOPE_LABELS[palette.scope]}
                          </span>
                        )}
                        <Autocomplete.Input
                          autoFocus={moveFocus}
                          className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                          aria-label={
                            palette.scope
                              ? `Search ${SCOPE_LABELS[palette.scope].toLowerCase()}`
                              : "Search or run a command"
                          }
                          placeholder={
                            palette.scope
                              ? `Search ${SCOPE_LABELS[palette.scope].toLowerCase()}…`
                              : "Search or jump to…"
                          }
                          onKeyDown={handleInputKeyDown}
                        />
                        <kbd className={KEY_HINT}>esc</kbd>
                      </Autocomplete.InputGroup>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{
                        ...CONTENT_SPRING,
                        delay: reduceMotion ? 0 : 0.045,
                      }}
                    >
                      <Autocomplete.Empty className="m-0 py-[22px] text-center text-zinc-500 empty:hidden dark:text-zinc-400">
                        No results for “{palette.query}”
                      </Autocomplete.Empty>
                      <Autocomplete.List className="grid max-h-[300px] gap-1 overflow-auto p-1.5 empty:hidden">
                        {(group: CommandGroup) => (
                          <Autocomplete.Group key={group.label} items={group.items} className="grid">
                            <Autocomplete.GroupLabel className="px-2.5 pt-2 pb-1 text-[11.5px] font-medium text-zinc-400 dark:text-zinc-500">
                              {group.label}
                            </Autocomplete.GroupLabel>
                            <Autocomplete.Collection>
                              {(command: Command) => (
                                <Autocomplete.Item
                                  key={command.id}
                                  value={command}
                                  render={arrive(command)}
                                  onClick={() => choose(command)}
                                  className="flex h-[38px] cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 data-highlighted:bg-zinc-900/5 dark:data-highlighted:bg-white/6 [&>svg]:size-[17px] [&>svg]:flex-none [&>svg]:text-zinc-500 dark:[&>svg]:text-zinc-400"
                                >
                                  <HugeiconsIcon icon={command.icon} strokeWidth={1.7} aria-hidden="true" />
                                  <span className="min-w-0 flex-1 truncate">{command.label}</span>
                                  {command.scope ? (
                                    <HugeiconsIcon
                                      icon={ArrowRight01Icon}
                                      strokeWidth={1.8}
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    command.shortcut && <kbd className={KEY_HINT}>{command.shortcut}</kbd>
                                  )}
                                </Autocomplete.Item>
                              )}
                            </Autocomplete.Collection>
                          </Autocomplete.Group>
                        )}
                      </Autocomplete.List>
                    </motion.div>
                  </Autocomplete.Root>
                </motion.div>
              ) : (
                <motion.button
                  key="pill"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: LEAVE }}
                  transition={{ ...CONTENT_SPRING, delay: reduceMotion ? 0 : FOLD_AFTER + 0.06 }}
                  ref={trigger}
                  type="button"
                  className="flex h-10 w-full cursor-pointer items-center gap-2.5 pr-2 pl-3.5 text-left text-zinc-500 outline-none dark:text-zinc-400"
                  aria-haspopup="dialog"
                  onClick={open}
                >
                  <HugeiconsIcon
                    className={SEARCH_ICON}
                    icon={Search01Icon}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  <Remold.Text className="min-w-0 flex-1 whitespace-nowrap">
                    {palette.outcome ?? "Search or jump to…"}
                  </Remold.Text>
                  <kbd className={KEY_HINT}>⌘K</kbd>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
      <p className="sr-only" role="status">
        {palette.outcome ?? ""}
      </p>
    </section>
  );
}

const BEATS: readonly (CommandPaletteValue & { ms: number })[] = [
  { ...CLOSED, ms: 1400 },
  { ...OPEN, ms: 1200 },
  ...typing("bil", (query) => ({ ...OPEN, query }), { every: 110, hold: 1400 }),
  { ...CLOSED, outcome: "Opened Billing", ms: 1700 },
  { ...OPEN, ms: 900 },
  ...typing("pro", (query) => ({ ...OPEN, query }), { every: 110, hold: 1300 }),
  { ...OPEN, scope: "projects", ms: 1500 },
  ...typing("dri", (query) => ({ ...OPEN, scope: "projects" as const, query }), { every: 110, hold: 1400 }),
  { ...CLOSED, outcome: "Opened Driftwood", ms: 1700 },
];

const fromBeat = (beat: number): CommandPaletteValue => {
  const { ms: _, ...state } = BEATS[beat]!;
  return state;
};

interface CommandPaletteDemoProps {
  framed?: boolean;
  playing?: boolean;
  preview?: boolean;
}

export function CommandPaletteDemo({ framed = true, playing, preview = false }: CommandPaletteDemoProps) {
  const scene = useScene(BEATS, fromBeat, preview ? false : playing);
  const element = preview ? (
    <CommandPalette defaultValue={OPEN} moveFocus={false} />
  ) : (
    <CommandPalette
      ref={scene.ref}
      value={scene.state}
      onValueChange={scene.onValueChange}
      moveFocus={!scene.live}
    />
  );
  return framed ? <Frame>{element}</Frame> : element;
}
