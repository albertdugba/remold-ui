"use client";

import { ContextMenu } from "@base-ui/react/context-menu";
import {
  ArrowRight01Icon,
  Briefcase01Icon,
  Calendar03Icon,
  Copy01Icon,
  Delete02Icon,
  FolderTransferIcon,
  LayoutTemplateIcon,
  Link01Icon,
  NoteAddIcon,
  PlusSignSquareIcon,
  SmileIcon,
  UndoIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { announce } from "@remold-ui/dom";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "motion/react";
import {
  createContext,
  useContext,
  useId,
  useRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { RemoldLogo } from "./demo-icons";
import { usePortalContainer } from "./portal-container";
import { useScene } from "./use-scene";

export interface Page {
  id: string;
  title: string;
  emoji: string;
  parent: string | null;
}

export interface WorkspaceValue {
  pages: Page[];
  /** Pages whose sub-pages are showing. */
  expanded: string[];
  /** The pages before the last change, for Undo. */
  previous: Page[] | null;
  open: boolean;
  target: string | null;
  note: string;
}

const WORKSPACE = "Remold";

const EMOJIS = ["📝", "🚀", "📚", "✅", "🗓️", "💡", "🎯", "📊", "🎨", "🔥", "🌱", "⭐"] as const;

const TEMPLATES: readonly { group: string; icon: IconSvgElement; pages: readonly { title: string; emoji: string }[] }[] = [
  {
    group: "Meetings",
    icon: Calendar03Icon,
    pages: [
      { title: "Weekly sync", emoji: "🗓️" },
      { title: "1:1", emoji: "☕" },
      { title: "Retro", emoji: "🔁" },
    ],
  },
  {
    group: "Projects",
    icon: Briefcase01Icon,
    pages: [
      { title: "Brief", emoji: "📝" },
      { title: "Roadmap", emoji: "🗺️" },
      { title: "Launch plan", emoji: "🚀" },
    ],
  },
];

const OPEN = { type: "spring" as const, duration: 0.36, bounce: 0.26 };
const ROW = { type: "spring" as const, duration: 0.3, bounce: 0.12 };
const HOVER = { type: "spring" as const, stiffness: 520, damping: 36, mass: 0.5 };
const SLIDE = { type: "spring" as const, duration: 0.42, bounce: 0.16 };
const POP = { type: "spring" as const, duration: 0.4, bounce: 0.38 };

const TOKENS = [
  "[--ws-ink:#18181b] [--ws-muted:#71717a] [--ws-faint:#a1a1aa] [--ws-surface:#ffffff] [--ws-hover:#f4f4f5] [--ws-line:rgb(24_24_27/0.08)] [--ws-select:rgb(59_130_246/0.12)] [--ws-select-ink:#2563eb]",
  "dark:[--ws-ink:#fafafa] dark:[--ws-muted:#a1a1aa] dark:[--ws-faint:#71717a] dark:[--ws-surface:#1c1c1f] dark:[--ws-hover:#27272b] dark:[--ws-line:rgb(255_255_255/0.08)] dark:[--ws-select:rgb(96_165_250/0.16)] dark:[--ws-select-ink:#93c5fd]",
].join(" ");

const PANEL =
  "relative min-w-[248px] origin-(--transform-origin) overflow-hidden rounded-[22px] p-2 font-sans text-[14.5px] font-medium text-white antialiased outline-none [background:linear-gradient(160deg,rgb(255_255_255/0.06),rgb(255_255_255/0)_45%),rgb(46_46_49/0.9)] shadow-[inset_0_0_0_0.5px_rgb(255_255_255/0.08),0_0_0_0.5px_rgb(0_0_0/0.25),0_12px_24px_-10px_rgb(0_0_0/0.25),0_32px_64px_-20px_rgb(0_0_0/0.35)] backdrop-blur-2xl backdrop-saturate-150";
const POPUP =
  "outline-none transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-[0.97] data-ending-style:opacity-0 motion-reduce:transition-opacity";
const ROW_CLASS =
  "group/row relative flex h-10 cursor-default items-center gap-3 rounded-[13px] px-3 outline-none select-none data-disabled:opacity-40";
const KEY = "grid h-[22px] min-w-[22px] place-items-center rounded-[7px] bg-white/[0.09] px-1.5 text-[11.5px] font-medium text-white/60";
const LINE = "-mx-2 my-2 h-px bg-white/[0.08]";
const CAPTION = "truncate px-3 pt-2 pb-1.5 text-[12.5px] font-medium text-white/45";
const DANGER = "text-[#ff8080]";

const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* Menu building blocks */

const HighlightContext = createContext("");
const ReducedContext = createContext(false);

function Highlight({ on }: { on: boolean }) {
  const layoutId = useContext(HighlightContext);

  if (!on) return null;

  return (
    <motion.span
      layoutId={layoutId}
      className="pointer-events-none absolute inset-0 rounded-[inherit] bg-white/[0.09] in-data-[tone=bad]:bg-[rgb(255_107_107/0.16)]"
      transition={HOVER}
    />
  );
}

// biome-ignore lint/suspicious/noExplicitAny: matches Base UI's render callback props.
const withHighlight = (props: HTMLAttributes<any> & { ref?: Ref<any> }, state: { highlighted: boolean }): ReactElement => (
  <div {...props}>
    <Highlight on={state.highlighted} />
    {props.children}
  </div>
);

function Panel({ children, width = "", from = 0.88 }: { children: ReactNode; width?: string; from?: number }) {
  const reduced = useContext(ReducedContext);
  const highlight = useId();

  return (
    <motion.div
      className={`${PANEL} ${width}`}
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: from, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={OPEN}
    >
      <HighlightContext.Provider value={highlight}>
        <LayoutGroup id={highlight}>{children}</LayoutGroup>
      </HighlightContext.Provider>
    </motion.div>
  );
}

function Glyph({ icon }: { icon: IconSvgElement }) {
  return <HugeiconsIcon icon={icon} strokeWidth={1.9} className="size-[18px] flex-none text-white/70 in-data-[tone=bad]:text-current" aria-hidden="true" />;
}

function Emoji({ children }: { children: ReactNode }) {
  return <span className="grid w-[18px] flex-none place-items-center text-[15px] leading-none">{children}</span>;
}

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="ml-auto flex gap-0.5">
      {keys.map((key) => (
        <kbd key={key} className={KEY}>
          {key}
        </kbd>
      ))}
    </span>
  );
}

/** A row's content: rises in a moment after the panel, a little later the further down it sits. */
function Line({ index, children }: { index: number; children: ReactNode }) {
  const reduced = useContext(ReducedContext);

  return (
    <motion.span
      className="relative flex min-w-0 flex-1 items-center gap-3"
      initial={reduced ? false : { opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...ROW, delay: 0.03 + index * 0.02 }}
    >
      {children}
    </motion.span>
  );
}

function Item({
  index,
  icon,
  label,
  keys,
  danger = false,
  onSelect,
}: {
  index: number;
  icon: IconSvgElement | string;
  label: string;
  keys?: string[];
  danger?: boolean;
  onSelect: () => void;
}) {
  return (
    <ContextMenu.Item className={`${ROW_CLASS} ${danger ? DANGER : ""}`} data-tone={danger ? "bad" : undefined} render={withHighlight} onClick={onSelect}>
      <Line index={index}>
        {typeof icon === "string" ? <Emoji>{icon}</Emoji> : <Glyph icon={icon} />}
        <span className="truncate">{label}</span>
        {keys && <Keys keys={keys} />}
      </Line>
    </ContextMenu.Item>
  );
}

function Submenu({
  index,
  icon,
  label,
  summary,
  width,
  children,
}: {
  index: number;
  icon: IconSvgElement;
  label: string;
  summary?: ReactNode;
  width?: string;
  children: ReactNode;
}) {
  const portal = usePortalContainer();

  return (
    <ContextMenu.SubmenuRoot>
      <ContextMenu.SubmenuTrigger className={ROW_CLASS} render={withHighlight}>
        <Line index={index}>
          <Glyph icon={icon} />
          {label}
          <span className="ml-auto flex items-center gap-2">
            {summary}
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2.2} className="size-3.5 text-white/45" aria-hidden="true" />
          </span>
        </Line>
      </ContextMenu.SubmenuTrigger>
      <ContextMenu.Portal container={portal}>
        <ContextMenu.Positioner className="z-50 outline-none" sideOffset={8} alignOffset={-8}>
          <ContextMenu.Popup className={POPUP}>
            <Panel width={width ?? "min-w-[216px]"} from={0.92}>
              {children}
            </Panel>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.SubmenuRoot>
  );
}

/* What the menu does */

function useWorkspace(value: WorkspaceValue, onValueChange: (value: WorkspaceValue) => void) {
  const latest = useRef(value);
  latest.current = value;

  const change = (next: Partial<WorkspaceValue>) => {
    latest.current = { ...latest.current, ...next };
    onValueChange(latest.current);
  };

  const pages = () => latest.current.pages;
  const target = () => pages().find((page) => page.id === latest.current.target);
  const within = (page: Page, ancestor: string): boolean =>
    page.id === ancestor || (page.parent !== null && within(pages().find((one) => one.id === page.parent)!, ancestor));

  const commit = (next: Page[], note: string, expand: string | null = null) => {
    announce(note);
    const { expanded } = latest.current;
    change({ previous: pages(), pages: next, note, expanded: expand && !expanded.includes(expand) ? [...expanded, expand] : expanded });
  };

  const unique = (parent: string | null, wanted: string) => {
    const taken = new Set(pages().filter((page) => page.parent === parent).map((page) => page.title));
    let title = wanted;
    for (let count = 2; taken.has(title); count += 1) title = `${wanted} ${count}`;
    return title;
  };

  const add = (parent: string | null, wanted: string, emoji: string) => {
    const title = unique(parent, wanted);
    const id = `${slug(title)}-${Date.now().toString(36)}`;
    const where = parent ? pages().find((page) => page.id === parent)?.title : WORKSPACE;
    commit([...pages(), { id, title, emoji, parent }], `Added ${title} to ${where}`, parent);
  };

  return {
    change,

    addPage() {
      const page = target();
      add(page?.parent ?? null, "Untitled", "📄");
    },

    addSubpage(wanted = "Untitled", emoji = "📄") {
      const page = target();
      if (page) add(page.id, wanted, emoji);
    },

    setEmoji(emoji: string) {
      const page = target();
      if (!page) return;
      commit(pages().map((one) => (one.id === page.id ? { ...one, emoji } : one)), `Icon changed to ${emoji}`);
    },

    moveTo(parent: string | null) {
      const page = target();
      if (!page) return;
      const where = parent ? pages().find((one) => one.id === parent)?.title : "the top level";
      commit(pages().map((one) => (one.id === page.id ? { ...one, parent } : one)), `Moved ${page.title} to ${where}`, parent);
    },

    destinations() {
      const page = target();
      return pages().filter((one) => one.parent === null && page && !within(one, page.id) && one.id !== page.parent);
    },

    duplicate() {
      const page = target();
      if (!page) return;
      const title = unique(page.parent, `${page.title} copy`);
      commit([...pages(), { ...page, id: `${slug(title)}-${Date.now().toString(36)}`, title }], `Duplicated ${page.title}`);
    },

    copyLink() {
      const page = target();
      if (!page) return;
      const link = `remold.app/${slug(page.title)}`;
      announce(`Copied ${link}`);
      change({ note: `Copied ${link}` });
    },

    remove() {
      const page = target();
      if (!page) return;
      change({ open: false });
      commit(pages().filter((one) => !within(one, page.id)), `Deleted ${page.title}`);
    },

    toggle(id: string) {
      const { expanded } = latest.current;
      change({ expanded: expanded.includes(id) ? expanded.filter((one) => one !== id) : [...expanded, id] });
    },

    undo() {
      const { previous } = latest.current;
      if (!previous) return;
      announce("Undone");
      change({ pages: previous, previous: null, note: "Undone" });
    },
  };
}

type Actions = ReturnType<typeof useWorkspace>;

/* The menu */

function EmojiGrid({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const reduced = useContext(ReducedContext);

  return (
    <ContextMenu.RadioGroup value={value} onValueChange={onChange} className="grid grid-cols-6 gap-1 p-1">
      {EMOJIS.map((emoji) => (
        <ContextMenu.RadioItem
          key={emoji}
          value={emoji}
          closeOnClick
          aria-label={emoji}
          className="relative grid aspect-square cursor-default place-items-center rounded-[10px] text-[18px] outline-none data-checked:bg-white/[0.12] data-highlighted:bg-white/[0.08]"
        >
          <motion.span whileHover={reduced ? undefined : { scale: 1.2 }} transition={POP}>
            {emoji}
          </motion.span>
        </ContextMenu.RadioItem>
      ))}
    </ContextMenu.RadioGroup>
  );
}

function PageMenu({ page, actions }: { page: Page; actions: Actions }) {
  const destinations = actions.destinations();

  return (
    <>
      <div className={CAPTION}>
        {page.emoji} {page.title}
      </div>

      <Submenu index={0} icon={PlusSignSquareIcon} label="Add">
        <Item index={0} icon={NoteAddIcon} label="Page" keys={["⌘", "N"]} onSelect={actions.addPage} />
        <Item index={1} icon={NoteAddIcon} label="Sub-page" keys={["⇧", "⌘", "N"]} onSelect={() => actions.addSubpage()} />
        <div className={LINE} />
        <Submenu index={2} icon={LayoutTemplateIcon} label="From template" width="min-w-[208px]">
          {TEMPLATES.map((template, index) => (
            <Submenu key={template.group} index={index} icon={template.icon} label={template.group} width="min-w-[196px]">
              {template.pages.map((option, row) => (
                <Item key={option.title} index={row} icon={option.emoji} label={option.title} onSelect={() => actions.addSubpage(option.title, option.emoji)} />
              ))}
            </Submenu>
          ))}
        </Submenu>
      </Submenu>

      <Submenu index={1} icon={SmileIcon} label="Icon" width="min-w-[232px]" summary={<span className="text-[15px] leading-none">{page.emoji}</span>}>
        <EmojiGrid value={page.emoji} onChange={actions.setEmoji} />
      </Submenu>

      <Submenu index={2} icon={FolderTransferIcon} label="Move to">
        {page.parent !== null && <Item index={0} icon="⬆️" label="Top level" onSelect={() => actions.moveTo(null)} />}
        {destinations.map((destination, index) => (
          <Item key={destination.id} index={index + 1} icon={destination.emoji} label={destination.title} onSelect={() => actions.moveTo(destination.id)} />
        ))}
      </Submenu>

      <div className={LINE} />

      <Item index={3} icon={Link01Icon} label="Copy link" keys={["⌘", "L"]} onSelect={actions.copyLink} />
      <Item index={4} icon={Copy01Icon} label="Duplicate" keys={["⌘", "D"]} onSelect={actions.duplicate} />
      <Item index={5} icon={Delete02Icon} label="Delete" keys={["⌫"]} danger onSelect={actions.remove} />
    </>
  );
}

/* The sidebar */

function Branch({ parent, depth, value, actions }: { parent: string | null; depth: number; value: WorkspaceValue; actions: Actions }) {
  const reduced = useContext(ReducedContext);
  const children = value.pages.filter((page) => page.parent === parent);

  return (
    <AnimatePresence initial={false}>
      {children.map((page) => {
        const nested = value.pages.some((one) => one.parent === page.id);
        const expanded = nested && value.expanded.includes(page.id);
        const active = value.open && value.target === page.id;

        return (
          <motion.li
            key={page.id}
            layout="position"
            className="list-none overflow-hidden"
            initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0, x: -6 }}
            animate={{ opacity: 1, height: "auto", x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0, x: -6, transition: { duration: 0.2, ease: "easeOut" } }}
            transition={SLIDE}
          >
            <div
              data-page={page.id}
              data-active={active || undefined}
              className="flex h-8 cursor-default items-center gap-1.5 rounded-[9px] pr-2 text-[13.5px] font-medium text-(--ws-ink) transition-[background-color,color] duration-150 ease-out select-none hover:bg-(--ws-hover) data-active:bg-(--ws-select) data-active:text-(--ws-select-ink)"
              style={{ paddingLeft: 6 + depth * 16 }}
              onClick={() => nested && actions.toggle(page.id)}
            >
              <span className="grid w-3.5 flex-none place-items-center">
                {nested && (
                  <motion.span className="grid" animate={{ rotate: expanded ? 90 : 0 }} transition={POP}>
                    <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2.2} className="size-3 text-(--ws-faint)" aria-hidden="true" />
                  </motion.span>
                )}
              </span>
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={page.emoji}
                  className="grid w-5 flex-none place-items-center text-[15px] leading-none"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: -20 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.1 } }}
                  transition={POP}
                >
                  {page.emoji}
                </motion.span>
              </AnimatePresence>
              <span className="truncate">{page.title}</span>
            </div>
            {expanded && (
              <ul className="m-0 p-0">
                <Branch parent={page.id} depth={depth + 1} value={value} actions={actions} />
              </ul>
            )}
          </motion.li>
        );
      })}
    </AnimatePresence>
  );
}

function StatusBar({ note, count, canUndo, onUndo }: { note: string; count: number; canUndo: boolean; onUndo: () => void }) {
  return (
    <motion.div
      layout
      className="inline-flex h-9 items-center gap-1 justify-self-center rounded-full bg-(--ws-surface) py-1 pr-1 pl-3.5 text-[12.5px] text-(--ws-muted)"
      aria-live="polite"
      transition={SLIDE}
    >
      <Remold.Text className="inline-block whitespace-nowrap">{note || `${count} pages · right-click a page`}</Remold.Text>
      <AnimatePresence initial={false} mode="popLayout">
        {canUndo ? (
          <motion.button
            key="undo"
            type="button"
            className="ml-1 inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border-0 bg-(--ws-ink) px-2.5 font-sans text-[12px] font-semibold text-(--ws-surface) outline-none active:scale-[0.97] focus-visible:shadow-[0_0_0_2px_var(--ws-surface),0_0_0_4px_var(--ws-ink)] [&_svg]:size-3.5"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.12 } }}
            transition={POP}
            onClick={onUndo}
          >
            <HugeiconsIcon icon={UndoIcon} strokeWidth={2.2} aria-hidden="true" />
            Undo
          </motion.button>
        ) : (
          <motion.span key="spacer" className="w-2" />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const pointAt = (sidebar: HTMLElement | null, id: string | null) => ({
  getBoundingClientRect() {
    const row = id ? sidebar?.querySelector<HTMLElement>(`[data-page="${CSS.escape(id)}"]`) : null;
    const box = row?.getBoundingClientRect();
    const x = box ? box.left + box.width * 0.55 : 0;
    const y = box ? box.top + box.height * 0.6 : 0;

    return DOMRect.fromRect({ x, y, width: 0, height: 0 });
  },
});

export interface PageTreeProps {
  value: WorkspaceValue;
  onValueChange: (value: WorkspaceValue) => void;
  /** Opens the menu over the target row instead of at the pointer, for scripted playback. */
  scripted?: boolean;
}

export function PageTree({ value, onValueChange, scripted = false }: PageTreeProps) {
  const reduced = useReducedMotion() ?? false;
  const portal = usePortalContainer();
  const sidebar = useRef<HTMLDivElement>(null);
  const actions = useWorkspace(value, onValueChange);
  const target = value.pages.find((page) => page.id === value.target);

  return (
    <MotionConfig reducedMotion="user">
      <ReducedContext.Provider value={reduced}>
        <div className={`grid w-[min(100%,320px)] gap-3 font-sans text-(--ws-ink) ${TOKENS}`}>
          <ContextMenu.Root
            open={value.open}
            onOpenChange={(next, details) => {
              if (!next) return actions.change({ open: false });
              const row = (details.event?.target as Element | null)?.closest<HTMLElement>("[data-page]");
              if (row) actions.change({ open: true, target: row.dataset.page ?? null });
            }}
          >
            <ContextMenu.Trigger
              render={
                <nav
                  ref={sidebar}
                  className="grid gap-1 rounded-[20px] bg-(--ws-surface) p-2"
                  aria-label={`${WORKSPACE} pages`}
                />
              }
            >
              <div className="flex h-9 items-center gap-2 px-2">
                <RemoldLogo className="size-[18px] text-(--ws-ink)" />
                <span className="text-[13.5px] font-semibold">{WORKSPACE}</span>
                <span className="ml-auto text-[11px] font-semibold tracking-[0.06em] text-(--ws-faint) uppercase">Pages</span>
              </div>
              <ul className="m-0 min-h-[260px] p-0">
                <Branch parent={null} depth={0} value={value} actions={actions} />
              </ul>
            </ContextMenu.Trigger>

            <ContextMenu.Portal container={portal}>
              <ContextMenu.Positioner className="z-50 outline-none" anchor={scripted ? pointAt(sidebar.current, value.target) : undefined}>
                <ContextMenu.Popup className={POPUP}>
                  <Panel>{target && <PageMenu page={target} actions={actions} />}</Panel>
                </ContextMenu.Popup>
              </ContextMenu.Positioner>
            </ContextMenu.Portal>
          </ContextMenu.Root>

          <StatusBar note={value.note} count={value.pages.length} canUndo={value.previous !== null} onUndo={actions.undo} />
        </div>
      </ReducedContext.Provider>
    </MotionConfig>
  );
}

/* The still shown on catalogue cards */

function MenuPicture() {
  const rows: { icon: IconSvgElement; label: string; lit?: boolean }[] = [
    { icon: PlusSignSquareIcon, label: "Add", lit: true },
    { icon: SmileIcon, label: "Icon" },
    { icon: FolderTransferIcon, label: "Move to" },
  ];

  return (
    <div className="pointer-events-none absolute top-[22%] left-[34%] z-10 flex items-start gap-2" aria-hidden="true">
      <div className={PANEL}>
        <div className={CAPTION}>🚀 Launch</div>
        {rows.map((row) => (
          <div key={row.label} className={ROW_CLASS}>
            {row.lit && <span className="absolute inset-0 rounded-[inherit] bg-white/[0.09]" />}
            <span className="relative flex flex-1 items-center gap-3">
              <Glyph icon={row.icon} />
              {row.label}
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2.2} className="ml-auto size-3.5 text-white/45" />
            </span>
          </div>
        ))}
        <div className={LINE} />
        <div className={`${ROW_CLASS} ${DANGER}`}>
          <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.9} className="size-[18px] flex-none" />
          Delete
        </div>
      </div>
      <div className={`${PANEL} mt-9 min-w-[216px]`}>
        <div className={ROW_CLASS}>
          <Glyph icon={NoteAddIcon} />
          Page
          <Keys keys={["⌘", "N"]} />
        </div>
        <div className={ROW_CLASS}>
          <Glyph icon={NoteAddIcon} />
          Sub-page
        </div>
        <div className={LINE} />
        <div className={ROW_CLASS}>
          <span className="absolute inset-0 rounded-[inherit] bg-white/[0.09]" />
          <span className="relative flex flex-1 items-center gap-3">
            <Glyph icon={LayoutTemplateIcon} />
            From template
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2.2} className="ml-auto size-3.5 text-white/45" />
          </span>
        </div>
      </div>
    </div>
  );
}

/* The demo */

const PAGES: Page[] = [
  { id: "home", title: "Home", emoji: "🏠", parent: null },
  { id: "launch", title: "Launch", emoji: "🚀", parent: null },
  { id: "brief", title: "Brief", emoji: "📝", parent: "launch" },
  { id: "timeline", title: "Timeline", emoji: "🗓️", parent: "launch" },
  { id: "wiki", title: "Wiki", emoji: "📚", parent: null },
  { id: "onboarding", title: "Onboarding", emoji: "👋", parent: "wiki" },
  { id: "tasks", title: "Tasks", emoji: "✅", parent: null },
];

const REST: WorkspaceValue = { pages: PAGES, expanded: ["launch"], previous: null, open: false, target: null, note: "" };

const WITH_SYNC: Page[] = [...PAGES, { id: "weekly-sync", title: "Weekly sync", emoji: "🗓️", parent: "launch" }];

const BEATS: readonly (WorkspaceValue & { ms: number })[] = [
  { ...REST, ms: 1400 },
  { ...REST, open: true, target: "launch", ms: 1600 },
  { ...REST, pages: WITH_SYNC, previous: PAGES, note: "Added Weekly sync to Launch", ms: 1500 },
  {
    ...REST,
    pages: WITH_SYNC.map((page) => (page.id === "brief" ? { ...page, emoji: "🎯" } : page)),
    previous: WITH_SYNC,
    note: "Icon changed to 🎯",
    ms: 2400,
  },
];

const fromBeat = (step: number): WorkspaceValue => {
  const { ms: _ms, ...state } = BEATS[step]!;

  return state;
};

export function ContextMenuDemo({ playing, preview }: { playing?: boolean; preview?: boolean } = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const still = Boolean(preview && !playing && !scene.taken);

  return (
    <div ref={scene.ref} className="not-prose relative grid w-full place-items-center font-sans antialiased">
      <div className={`relative grid w-[min(100%,320px)] ${TOKENS}`}>
        <PageTree value={still ? REST : scene.state} onValueChange={(next) => scene.takeOver(next)} scripted={scene.live} />
        {still && <MenuPicture />}
      </div>
    </div>
  );
}
