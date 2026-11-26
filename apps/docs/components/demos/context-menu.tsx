"use client";

import { ContextMenu } from "@base-ui/react/context-menu";
import {
  Add01Icon,
  Archive02Icon,
  ArrowRight01Icon,
  ChartLineData01Icon,
  Copy01Icon,
  DashboardSquare01Icon,
  Folder01Icon,
  FolderAddIcon,
  FolderOpenIcon,
  FolderTransferIcon,
  Image01Icon,
  LayoutTemplateIcon,
  Link01Icon,
  Megaphone01Icon,
  PlusSignSquareIcon,
  RecordIcon,
  Settings01Icon,
  Rocket01Icon,
  Search01Icon,
  Target02Icon,
  UndoIcon,
  UnfoldMoreIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { announce } from "@remold-ui/dom";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "motion/react";
import { createContext, useContext, useId, useRef, type HTMLAttributes, type ReactElement, type ReactNode, type Ref } from "react";
import { RemoldLogo } from "./demo-icons";
import { usePortalContainer } from "./portal-container";
import { useScene } from "./use-scene";

export type Status = "active" | "paused" | "draft";

export interface Entry {
  id: string;
  name: string;
  kind: "folder" | "campaign";
  parent: string | null;
  status?: Status;
  budget?: number;
  spent?: number;
}

export interface CampaignsValue {
  entries: Entry[];
  expanded: string[];
  folder: string | null;
  previous: Entry[] | null;
  open: boolean;
  target: string | null;
  note: string;
}

const STATUSES: readonly { value: Status; label: string; dot: string }[] = [
  { value: "active", label: "Active", dot: "bg-[#22c55e]" },
  { value: "paused", label: "Paused", dot: "bg-[#f59e0b]" },
  { value: "draft", label: "Draft", dot: "bg-[#a1a1aa]" },
];

const TEMPLATES: readonly { group: string; icon: IconSvgElement; names: readonly string[] }[] = [
  { group: "Prospecting", icon: Target02Icon, names: ["Lookalike 1%", "Interest stack", "Broad audience"] },
  { group: "Retargeting", icon: UserGroupIcon, names: ["Cart abandoners", "Site visitors 30d", "Video viewers"] },
  { group: "Launch", icon: Rocket01Icon, names: ["Teaser", "Launch day", "Last chance"] },
];

const OPEN = { type: "spring" as const, duration: 0.36, bounce: 0.26 };
const ROW = { type: "spring" as const, duration: 0.3, bounce: 0.12 };
const HOVER = { type: "spring" as const, stiffness: 520, damping: 36, mass: 0.5 };
const SLIDE = { type: "spring" as const, duration: 0.42, bounce: 0.16 };
const POP = { type: "spring" as const, duration: 0.4, bounce: 0.38 };

const TOKENS = [
  "[--cm-ink:#18181b] [--cm-text:#3f3f46] [--cm-side:#fafafa] [--cm-muted:#71717a] [--cm-faint:#a1a1aa] [--cm-surface:#ffffff] [--cm-hover:#f4f4f5] [--cm-line:rgb(24_24_27/0.08)] [--cm-select:rgb(59_130_246/0.1)] [--cm-select-ink:#1d4ed8]",
  "dark:[--cm-ink:#fafafa] dark:[--cm-text:#d4d4d8] dark:[--cm-side:#18181b] dark:[--cm-muted:#a1a1aa] dark:[--cm-faint:#71717a] dark:[--cm-surface:#1c1c1f] dark:[--cm-hover:#27272b] dark:[--cm-line:rgb(255_255_255/0.08)] dark:[--cm-select:rgb(96_165_250/0.16)] dark:[--cm-select-ink:#93c5fd]",
].join(" ");

const PANEL =
  "relative min-w-[240px] origin-(--transform-origin) overflow-hidden rounded-[20px] p-1.5 font-sans text-[14px] font-medium text-white antialiased outline-none [background:linear-gradient(160deg,rgb(255_255_255/0.06),rgb(255_255_255/0)_45%),rgb(46_46_49/0.9)] shadow-[inset_0_0_0_0.5px_rgb(255_255_255/0.08),0_0_0_0.5px_rgb(0_0_0/0.25),0_12px_24px_-10px_rgb(0_0_0/0.25),0_32px_64px_-20px_rgb(0_0_0/0.35)] backdrop-blur-2xl backdrop-saturate-150";
const POPUP = "outline-none transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-[0.97] data-ending-style:opacity-0 motion-reduce:transition-opacity";
const ROW_CLASS = "group/row relative flex h-9 cursor-default items-center gap-3 rounded-[12px] px-2.5 outline-none select-none data-disabled:opacity-40";
const KEY = "grid h-[20px] min-w-[20px] place-items-center rounded-[6px] bg-white/[0.09] px-1.5 text-[11px] font-medium text-white/55";
const LINE = "-mx-1.5 my-1.5 h-px bg-white/[0.08]";
const CAPTION = "flex items-center gap-2 truncate px-2.5 pt-1.5 pb-1 text-[12.5px] font-medium text-white/45";
const DANGER = "text-[#ff8a8a]";

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const statusOf = (status: Status) => STATUSES.find((one) => one.value === status)!;

/* Workspace changes */

const childrenOf = (entries: readonly Entry[], parent: string | null) => entries.filter((entry) => entry.parent === parent);

function within(entries: readonly Entry[], entry: Entry, ancestor: string): boolean {
  if (entry.id === ancestor) return true;
  const parent = entries.find((one) => one.id === entry.parent);
  return parent ? within(entries, parent, ancestor) : false;
}

const homeFor = (entries: readonly Entry[], id: string | null) => {
  const entry = entries.find((one) => one.id === id);
  if (!entry) return null;
  return entry.kind === "folder" ? entry.id : entry.parent;
};

function commit(value: CampaignsValue, entries: Entry[], note: string, open: string | null = null): CampaignsValue {
  const expanded = open && !value.expanded.includes(open) ? [...value.expanded, open] : value.expanded;
  return { ...value, entries, expanded, previous: value.entries, note, open: false };
}

function uniqueName(entries: readonly Entry[], parent: string | null, wanted: string) {
  const taken = new Set(childrenOf(entries, parent).map((entry) => entry.name));
  let name = wanted;
  for (let count = 2; taken.has(name); count += 1) name = `${wanted} ${count}`;
  return name;
}

export function addEntry(value: CampaignsValue, wanted: string, kind: Entry["kind"]): CampaignsValue {
  const parent = homeFor(value.entries, value.target);
  const name = uniqueName(value.entries, parent, wanted);
  const entry: Entry = kind === "folder" ? { id: `${slug(name)}-${value.entries.length}`, name, kind, parent } : { id: `${slug(name)}-${value.entries.length}`, name, kind, parent, status: "draft", budget: 150, spent: 0 };
  const where = value.entries.find((one) => one.id === parent)?.name ?? "Campaigns";
  return commit(value, [...value.entries, entry], `Added ${name} to ${where}`, parent);
}

export function setStatus(value: CampaignsValue, status: Status): CampaignsValue {
  const entry = value.entries.find((one) => one.id === value.target);
  if (!entry || entry.kind !== "campaign") return value;
  return commit(
    value,
    value.entries.map((one) => (one.id === entry.id ? { ...one, status } : one)),
    `${entry.name} is now ${statusOf(status).label}`,
  );
}

export function moveEntry(value: CampaignsValue, parent: string | null): CampaignsValue {
  const entry = value.entries.find((one) => one.id === value.target);
  if (!entry) return value;
  const where = value.entries.find((one) => one.id === parent)?.name ?? "the top level";
  return commit(
    value,
    value.entries.map((one) => (one.id === entry.id ? { ...one, parent } : one)),
    `Moved ${entry.name} to ${where}`,
    parent,
  );
}

export function duplicateEntry(value: CampaignsValue): CampaignsValue {
  const entry = value.entries.find((one) => one.id === value.target);
  if (!entry) return value;
  const name = uniqueName(value.entries, entry.parent, `${entry.name} copy`);
  const copy = { ...entry, id: `${slug(name)}-${value.entries.length}`, name, status: entry.kind === "campaign" ? ("draft" as const) : undefined, spent: 0 };
  return commit(value, [...value.entries, copy], `Duplicated ${entry.name}`);
}

export function archiveEntry(value: CampaignsValue): CampaignsValue {
  const entry = value.entries.find((one) => one.id === value.target);
  if (!entry) return value;
  return commit(
    value,
    value.entries.filter((one) => !within(value.entries, one, entry.id)),
    `Archived ${entry.name}`,
  );
}

/* Menu building blocks */

const HighlightContext = createContext("");
const ReducedContext = createContext(false);

function Highlight({ on }: { on: boolean }) {
  const layoutId = useContext(HighlightContext);
  if (!on) return null;
  return (
    <motion.span
      layoutId={layoutId}
      className="pointer-events-none absolute inset-0 rounded-[inherit] bg-white/[0.1] in-data-[tone=bad]:bg-[rgb(255_107_107/0.16)]"
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
  return <HugeiconsIcon icon={icon} strokeWidth={1.9} className="size-[17px] flex-none text-white/70 in-data-[tone=bad]:text-current" aria-hidden="true" />;
}

function Dot({ status }: { status: Status }) {
  return (
    <span className="grid size-[17px] flex-none place-items-center" aria-hidden="true">
      <span className={`size-2 rounded-full ${statusOf(status).dot}`} />
    </span>
  );
}

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

function Item({ index, icon, label, keys, danger = false, onSelect }: { index: number; icon: IconSvgElement; label: string; keys?: string[]; danger?: boolean; onSelect: () => void }) {
  return (
    <ContextMenu.Item className={`${ROW_CLASS} ${danger ? DANGER : ""}`} data-tone={danger ? "bad" : undefined} render={withHighlight} onClick={onSelect}>
      <Line index={index}>
        <Glyph icon={icon} />
        <span className="truncate">{label}</span>
        {keys && <Keys keys={keys} />}
      </Line>
    </ContextMenu.Item>
  );
}

function Submenu({ index, icon, label, summary, width, children }: { index: number; icon: IconSvgElement; label: string; summary?: ReactNode; width?: string; children: ReactNode }) {
  const portal = usePortalContainer();
  return (
    <ContextMenu.SubmenuRoot>
      <ContextMenu.SubmenuTrigger className={ROW_CLASS} render={withHighlight}>
        <Line index={index}>
          <Glyph icon={icon} />
          <span className="truncate">{label}</span>
          <span className="ml-auto flex items-center gap-2">
            {summary}
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2.2} className="size-3.5 text-white/45" aria-hidden="true" />
          </span>
        </Line>
      </ContextMenu.SubmenuTrigger>
      <ContextMenu.Portal container={portal}>
        <ContextMenu.Positioner className="z-50 outline-none" sideOffset={8} alignOffset={-6}>
          <ContextMenu.Popup className={POPUP}>
            <Panel width={width ?? "min-w-[210px]"} from={0.92}>
              {children}
            </Panel>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.SubmenuRoot>
  );
}

/* The menu */

interface Actions {
  add: (name: string, kind: Entry["kind"]) => void;
  status: (status: Status) => void;
  move: (parent: string | null) => void;
  copyLink: () => void;
  duplicate: () => void;
  archive: () => void;
}

function MoveTargets({ entries, entry, parent, depth, onMove }: { entries: readonly Entry[]; entry: Entry; parent: string | null; depth: number; onMove: (parent: string | null) => void }) {
  const folders = childrenOf(entries, parent).filter((one) => one.kind === "folder" && !within(entries, one, entry.id));
  return (
    <>
      {folders.map((folder, index) => {
        const inner = childrenOf(entries, folder.id).some((one) => one.kind === "folder" && !within(entries, one, entry.id));
        const here = folder.id === entry.parent;
        if (!inner) return <Item key={folder.id} index={index} icon={Folder01Icon} label={here ? `${folder.name} (here)` : folder.name} onSelect={() => onMove(folder.id)} />;
        return (
          <Submenu key={folder.id} index={index} icon={Folder01Icon} label={folder.name} width="min-w-[200px]">
            <Item index={0} icon={FolderOpenIcon} label={here ? "Already here" : `Into ${folder.name}`} onSelect={() => onMove(folder.id)} />
            <div className={LINE} />
            <MoveTargets entries={entries} entry={entry} parent={folder.id} depth={depth + 1} onMove={onMove} />
          </Submenu>
        );
      })}
    </>
  );
}

function EntryMenu({ entry, entries, actions }: { entry: Entry; entries: readonly Entry[]; actions: Actions }) {
  const campaign = entry.kind === "campaign";
  let row = 0;
  const next = () => row++;

  return (
    <>
      <div className={CAPTION}>
        {campaign && entry.status ? <span className={`size-2 rounded-full ${statusOf(entry.status).dot}`} /> : <HugeiconsIcon icon={Folder01Icon} size={14} strokeWidth={2} />}
        {entry.name}
      </div>

      <Submenu index={next()} icon={PlusSignSquareIcon} label="New">
        <Item index={0} icon={Megaphone01Icon} label="Campaign" keys={["⌘", "N"]} onSelect={() => actions.add("New campaign", "campaign")} />
        <Item index={1} icon={FolderAddIcon} label="Folder" keys={["⇧", "⌘", "N"]} onSelect={() => actions.add("New folder", "folder")} />
        <div className={LINE} />
        <Submenu index={2} icon={LayoutTemplateIcon} label="From template" width="min-w-[200px]">
          {TEMPLATES.map((template, index) => (
            <Submenu key={template.group} index={index} icon={template.icon} label={template.group} width="min-w-[200px]">
              {template.names.map((name, line) => (
                <Item key={name} index={line} icon={Megaphone01Icon} label={name} onSelect={() => actions.add(name, "campaign")} />
              ))}
            </Submenu>
          ))}
        </Submenu>
      </Submenu>

      {campaign && entry.status && (
        <Submenu index={next()} icon={RecordIcon} label="Status" summary={<span className={`size-2 rounded-full ${statusOf(entry.status).dot}`} />}>
          <ContextMenu.RadioGroup value={entry.status} onValueChange={(status) => actions.status(status as Status)}>
            {STATUSES.map((status, index) => (
              <ContextMenu.RadioItem key={status.value} value={status.value} closeOnClick className={ROW_CLASS} render={withHighlight}>
                <Line index={index}>
                  <Dot status={status.value} />
                  {status.label}
                  <ContextMenu.RadioItemIndicator className="ml-auto text-[12px] text-white/55">Current</ContextMenu.RadioItemIndicator>
                </Line>
              </ContextMenu.RadioItem>
            ))}
          </ContextMenu.RadioGroup>
        </Submenu>
      )}

      <Submenu index={next()} icon={FolderTransferIcon} label="Move to" width="min-w-[210px]">
        {entry.parent !== null && <Item index={0} icon={Folder01Icon} label="Top level" onSelect={() => actions.move(null)} />}
        <MoveTargets entries={entries} entry={entry} parent={null} depth={0} onMove={actions.move} />
      </Submenu>

      <div className={LINE} />

      <Item index={next()} icon={Link01Icon} label="Copy link" keys={["⌘", "L"]} onSelect={actions.copyLink} />
      <Item index={next()} icon={Copy01Icon} label="Duplicate" keys={["⌘", "D"]} onSelect={actions.duplicate} />
      <Item index={next()} icon={Archive02Icon} label="Archive" keys={["⌫"]} danger onSelect={actions.archive} />
    </>
  );
}

/* The workspace */

const money = (amount: number) => `$${amount.toLocaleString("en-US")}`;

const campaignsIn = (entries: readonly Entry[], folder: string) => entries.filter((entry) => entry.kind === "campaign" && within(entries, entry, folder));

const ROW_BASE =
  "flex h-[30px] cursor-default items-center gap-1.5 rounded-[8px] pr-2 text-[13px] font-medium text-(--cm-text) transition-[background-color,color,box-shadow] duration-150 ease-out select-none hover:bg-(--cm-hover) data-selected:bg-(--cm-surface) data-selected:text-(--cm-ink) data-selected:shadow-[0_0_0_0.5px_var(--cm-line),0_1px_2px_rgb(0_0_0/0.06)] data-targeted:shadow-[inset_0_0_0_1.5px_var(--cm-select-ink)]";

function CampaignMeta({ entry }: { entry: Entry }) {
  const status = entry.status ?? "draft";
  const label = status === "active" ? money(entry.budget ?? 0) : statusOf(status).label;
  return (
    <span className="ml-auto pl-2 text-[11.5px] font-normal whitespace-nowrap text-(--cm-faint) tabular-nums">
      <Remold.Text className="inline-block whitespace-nowrap">{label}</Remold.Text>
    </span>
  );
}

function Branch({ parent, depth, value, onSelect }: { parent: string | null; depth: number; value: CampaignsValue; onSelect: (id: string) => void }) {
  const reduced = useContext(ReducedContext);
  const entries = childrenOf(value.entries, parent).sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "folder" ? -1 : 1));

  return (
    <AnimatePresence initial={false}>
      {entries.map((entry) => {
        const folder = entry.kind === "folder";
        const nested = folder && value.entries.some((one) => one.parent === entry.id);
        const expanded = nested && value.expanded.includes(entry.id);

        return (
          <motion.li
            key={entry.id}
            layout="position"
            className="list-none overflow-hidden"
            initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0, transition: { duration: 0.2, ease: "easeOut" } }}
            transition={SLIDE}
          >
            <div
              data-entry={entry.id}
              data-selected={value.folder === entry.id || undefined}
              data-targeted={(value.open && value.target === entry.id) || undefined}
              className={ROW_BASE}
              style={{ paddingLeft: 4 + depth * 14 }}
              onClick={() => onSelect(entry.id)}
            >
              <span className="grid w-3.5 flex-none place-items-center">
                {nested && (
                  <motion.span className="grid" animate={{ rotate: expanded ? 90 : 0 }} transition={POP}>
                    <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2.2} className="size-3 text-(--cm-faint)" aria-hidden="true" />
                  </motion.span>
                )}
              </span>
              <span className="grid size-4 flex-none place-items-center">
                {folder ? (
                  <HugeiconsIcon icon={expanded ? FolderOpenIcon : Folder01Icon} strokeWidth={1.8} className="size-4 text-(--cm-muted)" aria-hidden="true" />
                ) : (
                  <span className={`size-[7px] rounded-full transition-[background-color] duration-300 ease-out ${statusOf(entry.status ?? "draft").dot}`} aria-hidden="true" />
                )}
              </span>
              <span className="truncate">{entry.name}</span>
              {folder ? <span className="ml-auto pl-2 text-[11.5px] font-normal text-(--cm-faint) tabular-nums">{campaignsIn(value.entries, entry.id).length}</span> : <CampaignMeta entry={entry} />}
            </div>
            {expanded && (
              <ul className="m-0 grid gap-px p-0">
                <Branch parent={entry.id} depth={depth + 1} value={value} onSelect={onSelect} />
              </ul>
            )}
          </motion.li>
        );
      })}
    </AnimatePresence>
  );
}

const AVATAR = "https://api.dicebear.com/9.x/notionists/svg?seed=Yaw%20Darko&backgroundColor=fce7f3";

const NAV: readonly { label: string; icon: IconSvgElement; current?: boolean }[] = [
  { label: "Overview", icon: DashboardSquare01Icon },
  { label: "Campaigns", icon: Megaphone01Icon, current: true },
  { label: "Audiences", icon: UserGroupIcon },
  { label: "Creatives", icon: Image01Icon },
  { label: "Reports", icon: ChartLineData01Icon },
];

function Sidebar({ value, onSelect, onNew }: { value: CampaignsValue; onSelect: (id: string) => void; onNew: () => void }) {
  return (
    <>
      <div className="flex h-10 items-center gap-2.5 rounded-[10px] px-2 transition-[background-color] duration-150 ease-out hover:bg-(--cm-hover)">
        <RemoldLogo className="size-5 flex-none text-(--cm-ink)" />
        <span className="grid min-w-0 leading-[1.2]">
          <span className="truncate text-[13.5px] font-semibold tracking-[-0.01em]">Remold</span>
          <span className="truncate text-[11.5px] text-(--cm-muted)">Ads workspace</span>
        </span>
        <HugeiconsIcon icon={UnfoldMoreIcon} size={14} strokeWidth={2} className="ml-auto text-(--cm-faint)" aria-hidden="true" />
      </div>

      <span className="flex h-8 items-center gap-2 rounded-[8px] bg-(--cm-surface) px-2.5 text-[12.5px] text-(--cm-faint) shadow-[0_0_0_0.5px_var(--cm-line),0_1px_2px_rgb(0_0_0/0.04)]">
        <HugeiconsIcon icon={Search01Icon} size={14} strokeWidth={2} aria-hidden="true" />
        Search
        <kbd className="ml-auto rounded-[5px] bg-(--cm-hover) px-1.5 font-sans text-[10.5px] text-(--cm-muted)">⌘K</kbd>
      </span>

      <ul className="m-0 grid gap-px p-0">
        {NAV.map((item) => (
          <li
            key={item.label}
            data-current={item.current || undefined}
            className="flex h-[30px] list-none items-center gap-2.5 rounded-[8px] px-2 text-[13px] font-medium text-(--cm-muted) transition-[background-color,color] duration-150 ease-out hover:bg-(--cm-hover) hover:text-(--cm-ink) data-current:bg-(--cm-surface) data-current:text-(--cm-ink) data-current:shadow-[0_0_0_0.5px_var(--cm-line),0_1px_2px_rgb(0_0_0/0.06)]"
          >
            <HugeiconsIcon icon={item.icon} size={16} strokeWidth={1.8} aria-hidden="true" />
            {item.label}
            {item.current && <span className="ml-auto text-[11.5px] font-normal text-(--cm-faint) tabular-nums">{value.entries.filter((one) => one.kind === "campaign").length}</span>}
          </li>
        ))}
      </ul>

      <div className="flex min-h-0 flex-1 flex-col gap-1">
        <span className="flex items-center justify-between pr-1 pl-2">
          <span className="text-[11px] font-medium tracking-[0.04em] text-(--cm-faint) uppercase">Campaigns</span>
          <motion.button
            type="button"
            aria-label="New campaign"
            className="grid size-6 cursor-pointer place-items-center rounded-[6px] border-0 bg-transparent p-0 text-(--cm-faint) transition-[background-color,color] duration-150 ease-out hover:bg-(--cm-hover) hover:text-(--cm-ink) outline-none focus-visible:shadow-[0_0_0_2px_var(--cm-select-ink)]"
            whileTap={{ scale: 0.97 }}
            onClick={onNew}
          >
            <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2.2} aria-hidden="true" />
          </motion.button>
        </span>
        <ul className="m-0 grid min-h-0 flex-1 content-start gap-px overflow-y-auto p-0 [scrollbar-width:none]">
          <Branch parent={null} depth={0} value={value} onSelect={onSelect} />
        </ul>
      </div>

      <div className="-mx-2.5 -mb-2.5 flex items-center gap-2.5 border-0 border-t border-solid border-(--cm-line) px-3.5 py-3">
        <img src={AVATAR} alt="" width={28} height={28} draggable={false} className="size-7 flex-none rounded-full bg-(--cm-hover)" />
        <span className="grid min-w-0 leading-[1.25]">
          <span className="truncate text-[13px] font-medium text-(--cm-ink)">Yaw Darko</span>
          <span className="truncate text-[11.5px] text-(--cm-muted)">Admin</span>
        </span>
        <button
          type="button"
          aria-label="Settings"
          className="ml-auto grid size-7 cursor-pointer place-items-center rounded-[7px] border-0 bg-transparent p-0 text-(--cm-faint) transition-[background-color,color] duration-150 ease-out outline-none hover:bg-(--cm-hover) hover:text-(--cm-ink) focus-visible:shadow-[0_0_0_2px_var(--cm-select-ink)]"
        >
          <HugeiconsIcon icon={Settings01Icon} size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
    </>
  );
}

function StatusBar({ note, canUndo, onUndo }: { note: string; canUndo: boolean; onUndo: () => void }) {
  return (
    <motion.div layout className="inline-flex h-9 items-center gap-1 justify-self-center rounded-full bg-(--cm-surface) py-1 pr-1 pl-3.5 text-[12.5px] text-(--cm-muted)" aria-live="polite" transition={SLIDE}>
      <Remold.Text className="inline-block whitespace-nowrap">{note || "Right-click any campaign or folder"}</Remold.Text>
      <AnimatePresence initial={false} mode="popLayout">
        {canUndo ? (
          <motion.button
            key="undo"
            type="button"
            className="ml-1 inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border-0 bg-(--cm-ink) px-2.5 font-sans text-[12px] font-semibold text-(--cm-surface) outline-none active:scale-[0.97] focus-visible:shadow-[0_0_0_2px_var(--cm-surface),0_0_0_4px_var(--cm-ink)] [&_svg]:size-3.5"
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

const pointAt = (frame: HTMLElement | null, id: string | null) => ({
  getBoundingClientRect() {
    const row = id ? frame?.querySelector<HTMLElement>(`[data-entry="${CSS.escape(id)}"]`) : null;
    const box = row?.getBoundingClientRect();
    return DOMRect.fromRect({ x: box ? box.left + box.width * 0.55 : 0, y: box ? box.top + box.height * 0.6 : 0, width: 0, height: 0 });
  },
});

export interface CampaignSidebarProps {
  value: CampaignsValue;
  onValueChange: (value: CampaignsValue) => void;
  scripted?: boolean;
}

export function CampaignSidebar({ value, onValueChange, scripted = false }: CampaignSidebarProps) {
  const reduced = useReducedMotion() ?? false;
  const portal = usePortalContainer();
  const frame = useRef<HTMLElement>(null);
  const latest = useRef(value);
  latest.current = value;
  const entry = value.entries.find((one) => one.id === value.target);

  const apply = (next: CampaignsValue) => {
    if (next.note && next.note !== latest.current.note) announce(next.note);
    latest.current = next;
    onValueChange(next);
  };

  const actions: Actions = {
    add: (name, kind) => apply(addEntry(latest.current, name, kind)),
    status: (status) => apply(setStatus(latest.current, status)),
    move: (parent) => apply(moveEntry(latest.current, parent)),
    copyLink: () => entry && apply({ ...latest.current, open: false, note: `Copied ads.example/${slug(entry.name)}` }),
    duplicate: () => apply(duplicateEntry(latest.current)),
    archive: () => apply(archiveEntry(latest.current)),
  };

  const select = (id: string) => {
    const current = latest.current;
    const toggles = current.entries.some((one) => one.parent === id);
    const expanded = !toggles ? current.expanded : current.expanded.includes(id) ? current.expanded.filter((one) => one !== id) : [...current.expanded, id];
    apply({ ...current, folder: id, expanded });
  };

  const undo = () => {
    const { previous } = latest.current;
    if (previous) apply({ ...latest.current, entries: previous, previous: null, note: "Undone" });
  };

  return (
    <MotionConfig reducedMotion="user">
      <ReducedContext.Provider value={reduced}>
        <div className={`grid w-[min(100%,272px)] grid-cols-[minmax(0,1fr)] gap-3 font-sans text-(--cm-ink) ${TOKENS}`} onContextMenu={(event) => event.preventDefault()}>
          <ContextMenu.Root
            open={value.open}
            onOpenChange={(next, details) => {
              if (!next) return apply({ ...latest.current, open: false });
              const row = (details.event?.target as Element | null)?.closest<HTMLElement>("[data-entry]");
              if (row) apply({ ...latest.current, open: true, target: row.dataset.entry ?? null });
            }}
          >
            <ContextMenu.Trigger
              render={
                <aside
                  ref={frame}
                  aria-label="Ads workspace"
                  className="flex h-[620px] flex-col gap-3 overflow-hidden rounded-[18px] bg-(--cm-side) p-2.5 shadow-[0_0_0_1px_var(--cm-line),0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-24px_rgb(0_0_0/0.16)]"
                />
              }
            >
              <Sidebar value={value} onSelect={select} onNew={() => apply(addEntry({ ...latest.current, target: latest.current.folder }, "New campaign", "campaign"))} />
            </ContextMenu.Trigger>

            <ContextMenu.Portal container={portal}>
              <ContextMenu.Positioner className="z-50 outline-none" anchor={scripted ? pointAt(frame.current, value.target) : undefined}>
                <ContextMenu.Popup className={POPUP}>
                  <Panel>{entry && <EntryMenu entry={entry} entries={value.entries} actions={actions} />}</Panel>
                </ContextMenu.Popup>
              </ContextMenu.Positioner>
            </ContextMenu.Portal>
          </ContextMenu.Root>

          <StatusBar note={value.note} canUndo={value.previous !== null} onUndo={undo} />
        </div>
      </ReducedContext.Provider>
    </MotionConfig>
  );
}

/* The still shown on catalogue cards */

function MenuPicture() {
  const rows: { icon: IconSvgElement; label: string; lit?: boolean }[] = [
    { icon: PlusSignSquareIcon, label: "New", lit: true },
    { icon: RecordIcon, label: "Status" },
    { icon: FolderTransferIcon, label: "Move to" },
  ];
  return (
    <div className="pointer-events-none absolute top-[52%] left-[46%] z-10 flex items-start gap-2" aria-hidden="true">
      <div className={PANEL}>
        <div className={CAPTION}>
          <span className="size-2 rounded-full bg-[#f59e0b]" />
          Doorbusters
        </div>
        {rows.map((row) => (
          <div key={row.label} className={ROW_CLASS}>
            {row.lit && <span className="absolute inset-0 rounded-[inherit] bg-white/[0.1]" />}
            <span className="relative flex flex-1 items-center gap-3">
              <Glyph icon={row.icon} />
              {row.label}
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2.2} className="ml-auto size-3.5 text-white/45" />
            </span>
          </div>
        ))}
        <div className={LINE} />
        <div className={`${ROW_CLASS} ${DANGER}`}>
          <HugeiconsIcon icon={Archive02Icon} strokeWidth={1.9} className="size-[17px] flex-none" />
          Archive
        </div>
      </div>
    </div>
  );
}

/* The demo */

const ENTRIES: Entry[] = [
  { id: "q4", name: "Q4 Holiday", kind: "folder", parent: null },
  { id: "black-friday", name: "Black Friday", kind: "folder", parent: "q4" },
  { id: "cyber-monday", name: "Cyber Monday", kind: "folder", parent: "q4" },
  { id: "early-access", name: "Early access", kind: "campaign", parent: "black-friday", status: "active", budget: 420, spent: 312 },
  { id: "doorbusters", name: "Doorbusters", kind: "campaign", parent: "black-friday", status: "paused", budget: 600, spent: 264 },
  { id: "flash-deals", name: "Flash deals", kind: "campaign", parent: "cyber-monday", status: "draft", budget: 350, spent: 0 },
  { id: "gift-guide", name: "Gift guide", kind: "campaign", parent: "q4", status: "active", budget: 250, spent: 190 },
  { id: "evergreen", name: "Evergreen", kind: "folder", parent: null },
  { id: "retargeting", name: "Retargeting 30d", kind: "campaign", parent: "evergreen", status: "active", budget: 180, spent: 141 },
  { id: "lookalike", name: "Lookalike 1%", kind: "campaign", parent: "evergreen", status: "draft", budget: 150, spent: 0 },
  { id: "brand", name: "Brand", kind: "folder", parent: null },
  { id: "spring", name: "Spring launch", kind: "campaign", parent: "brand", status: "draft", budget: 300, spent: 0 },
];

const REST: CampaignsValue = { entries: ENTRIES, expanded: ["q4", "black-friday"], folder: "early-access", previous: null, open: false, target: null, note: "" };
const ACTIVATED = setStatus({ ...REST, target: "doorbusters" }, "active");
const ADDED = addEntry({ ...ACTIVATED, target: "doorbusters" }, "Cart abandoners", "campaign");
const MOVED = moveEntry({ ...ADDED, target: "gift-guide" }, "black-friday");

const BEATS: readonly (CampaignsValue & { ms: number })[] = [
  { ...REST, ms: 1400 },
  { ...REST, open: true, target: "doorbusters", ms: 1600 },
  { ...ACTIVATED, ms: 1500 },
  { ...ADDED, ms: 1500 },
  { ...MOVED, ms: 2400 },
];

const fromBeat = (step: number): CampaignsValue => {
  const { ms: _ms, ...state } = BEATS[step]!;
  return state;
};

export function ContextMenuDemo({ playing, preview }: { playing?: boolean; preview?: boolean } = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const still = Boolean(preview && !playing && !scene.taken);

  return (
    <div ref={scene.ref} className="not-prose relative grid w-full place-items-center font-sans antialiased">
      <div className={`relative grid w-[min(100%,272px)] grid-cols-[minmax(0,1fr)] ${TOKENS}`}>
        <CampaignSidebar value={still ? REST : scene.state} onValueChange={(next) => scene.takeOver(next)} scripted={scene.live} />
        {still && <MenuPicture />}
      </div>
    </div>
  );
}
