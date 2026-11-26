"use client";

import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  CheckListIcon,
  CodeIcon,
  InboxIcon,
  Megaphone01Icon,
  PaintBoardIcon,
  Search01Icon,
  SidebarLeftIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Remold, useConnectorMotion } from "@remold-ui/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useReducer, useRef, useState, type ReactNode } from "react";
import { useControllableState, type ChangeDetails } from "./use-controllable-state";
import { useScript } from "./use-script";
import { useTimeout } from "./use-timeout";

const SPRING = { type: "spring" as const, duration: 0.45, bounce: 0.2 };
const PAGE_ENTER = { opacity: 0, y: -6, filter: "blur(4px)" };
const WIDE = 272;
const RAIL = 56;
const FLYOUT_CLOSE_DELAY = 140;
const REMOLD_MARK = "M7 23.5V8.5A1.5 1.5 0 0 1 8.5 7H14A11 11 0 0 1 25 18H18A4 4 0 0 0 14 14V23.5A1.5 1.5 0 0 1 12.5 25H8.5A1.5 1.5 0 0 1 7 23.5Z";

export interface NavGroup {
  id: string;
  name: string;
  icon: IconSvgElement;
  pages: { id: string; name: string }[];
}

export interface SidebarValue {
  active: string;
  open: string[];
  collapsed?: boolean;
}

const GROUPS: NavGroup[] = [
  {
    id: "design",
    name: "Design",
    icon: PaintBoardIcon,
    pages: [
      { id: "briefs", name: "Briefs" },
      { id: "reviews", name: "Reviews" },
      { id: "assets", name: "Assets" },
    ],
  },
  {
    id: "engineering",
    name: "Engineering",
    icon: CodeIcon,
    pages: [
      { id: "issues", name: "Issues" },
      { id: "pull-requests", name: "Pull requests" },
      { id: "releases", name: "Releases" },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    icon: Megaphone01Icon,
    pages: [
      { id: "campaigns", name: "Campaigns" },
      { id: "launch-plan", name: "Launch plan" },
    ],
  },
];

const START: SidebarValue = { active: "reviews", open: ["design", "engineering"], collapsed: false };

const THEME =
  "[--sn-surface:#ffffff] [--sn-ink:#141414] [--sn-text:#2b2b2b] [--sn-muted:#7a7a7a] [--sn-hover:rgb(0_0_0/0.035)] [--sn-active:rgb(0_0_0/0.055)] [--sn-line:#e2e2e2] " +
  "dark:[--sn-surface:#1b1b1b] dark:[--sn-ink:#f2f2f2] dark:[--sn-text:#dcdcdc] dark:[--sn-muted:#8f8f8f] dark:[--sn-hover:rgb(255_255_255/0.04)] dark:[--sn-active:rgb(255_255_255/0.07)] dark:[--sn-line:#363636]";

const FOCUS = "outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-(--sn-ink)";
const ROW = `relative flex h-8 cursor-pointer items-center gap-2.5 rounded-[9px] border-0 bg-transparent px-2 text-left text-[13.5px] text-(--sn-text) transition-[background-color,color] duration-150 ease-out hover:bg-(--sn-hover) ${FOCUS}`;
const FADES_IN_RAIL = "transition-[opacity,filter] duration-200 ease-out group-data-collapsed/sn:opacity-0 group-data-collapsed/sn:blur-[2px] motion-reduce:transition-none";
const CONNECTORS =
  "grid grid-cols-[minmax(0,1fr)] gap-px [&_.rm-connector]:stroke-(--sn-line) [&_.rm-connector]:[stroke-width:1.5] [&_.rm-connector]:transition-[stroke] [&_.rm-connector]:duration-200 [&_.rm-connector[data-line=lit]]:stroke-(--sn-ink)";

const holdsPage = (group: NavGroup, page: string) => group.pages.some((each) => each.id === page);
const toggled = (list: string[], id: string) => (list.includes(id) ? list.filter((each) => each !== id) : [...list, id]);

interface Rail {
  hovered: string | null;
  flyout: { id: string; top: number } | null;
}

type RailAction = { type: "open"; id: string; top: number } | { type: "dismiss" } | { type: "leave" };

function railReducer(rail: Rail, action: RailAction): Rail {
  switch (action.type) {
    case "open":
      return { hovered: action.id, flyout: { id: action.id, top: action.top } };
    case "dismiss":
      return { ...rail, flyout: null };
    case "leave":
      return { hovered: null, flyout: null };
  }
}

function topWithin(container: HTMLElement, element: HTMLElement) {
  const box = container.getBoundingClientRect();
  const scale = box.height / container.offsetHeight || 1;

  return (element.getBoundingClientRect().top - box.top) / scale;
}

function Highlight() {
  return <motion.span layoutId="sn-active" aria-hidden="true" className="absolute inset-0 rounded-[9px] bg-(--sn-active)" transition={SPRING} />;
}

function Label({ children }: { children: ReactNode }) {
  return <span className={`relative min-w-0 flex-1 overflow-hidden whitespace-nowrap ${FADES_IN_RAIL}`}>{children}</span>;
}

function TeamIcon({ group, anchor, lit }: { group: NavGroup; anchor?: string; lit: boolean }) {
  return (
    <span data-rm-anchor={anchor} className={`relative grid size-5 shrink-0 place-items-center transition-[color] duration-200 ease-out ${lit ? "text-(--sn-ink)" : "text-(--sn-muted)"}`}>
      <HugeiconsIcon icon={group.icon} size={17} strokeWidth={1.7} aria-hidden="true" />
    </span>
  );
}

function Header({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between pb-3">
      <motion.div className="overflow-hidden" initial={false} animate={{ width: collapsed ? 0 : "auto", opacity: collapsed ? 0 : 1 }}>
        <div className="flex items-center gap-2.5 px-2 whitespace-nowrap">
          <svg viewBox="6 6 20 20" className="size-5 shrink-0 fill-(--sn-ink)" aria-hidden="true">
            <path d={REMOLD_MARK} />
          </svg>
          <span className="text-[14px] font-semibold text-(--sn-ink)">Remold</span>
          <HugeiconsIcon icon={ArrowDown01Icon} size={15} strokeWidth={2} className="shrink-0 text-(--sn-muted)" aria-hidden="true" />
        </div>
      </motion.div>

      <motion.button
        layout="position"
        type="button"
        className={`flex h-8 w-9 shrink-0 cursor-pointer items-center rounded-[9px] border-0 bg-transparent px-2 text-(--sn-muted) transition-[background-color,color] duration-150 ease-out hover:bg-(--sn-hover) hover:text-(--sn-ink) active:scale-[0.97] ${FOCUS}`}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        onClick={onToggle}
      >
        <HugeiconsIcon icon={SidebarLeftIcon} size={17} strokeWidth={1.7} aria-hidden="true" />
      </motion.button>
    </div>
  );
}

function InboxBadge() {
  return (
    <>
      <span className={`relative rounded-full bg-(--sn-hover) px-1.5 text-[11.5px] font-medium text-(--sn-muted) tabular-nums ${FADES_IN_RAIL}`}>4</span>
      <span
        aria-hidden="true"
        className="absolute top-[7px] left-[21px] size-[7px] scale-0 rounded-full bg-(--sn-ink) shadow-[0_0_0_2px_var(--sn-surface)] transition-[scale] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-collapsed/sn:scale-100 motion-reduce:transition-none"
      />
    </>
  );
}

function SectionHeading({ children, motionProps }: { children: ReactNode; motionProps: ReturnType<typeof useConnectorMotion> }) {
  return (
    <motion.p layout="position" {...motionProps} className="relative m-0 whitespace-nowrap px-2 pt-4 pb-1.5 text-[11.5px] font-medium text-(--sn-muted)">
      <span className={FADES_IN_RAIL}>{children}</span>
      <span
        aria-hidden="true"
        className="absolute top-[calc(50%+5px)] left-[10px] h-px w-4 bg-(--sn-line) opacity-0 transition-opacity duration-200 ease-out group-data-collapsed/sn:opacity-100 motion-reduce:transition-none"
      />
    </motion.p>
  );
}

function Flyout({
  group,
  active,
  top,
  onPick,
  onHold,
  onLeave,
}: {
  group: NavGroup;
  active: string;
  top: number;
  onPick: (page: string) => void;
  onHold: () => void;
  onLeave: () => void;
}) {
  const connectorRoot = useRef<HTMLDivElement>(null);
  const connectorMotion = useConnectorMotion(connectorRoot);
  const anchor = `flyout-${group.id}`;

  return (
    <motion.div
      id={`sn-flyout-${group.id}`}
      role="group"
      aria-label={group.name}
      layoutId="sn-flyout"
      {...connectorMotion}
      className="absolute z-10 w-[200px] overflow-hidden bg-(--sn-surface) p-1.5"
      style={{ left: RAIL + 8, top: top - 6, borderRadius: 16 }}
      exit={{ opacity: 0, scale: 0.96, filter: "blur(4px)", transition: { duration: 0.15, ease: "easeOut" } }}
      onPointerEnter={onHold}
      onPointerLeave={onLeave}
    >
      <motion.div initial={{ opacity: 0, filter: "blur(4px)" }} animate={{ opacity: 1, filter: "blur(0px)", transition: { duration: 0.2, delay: 0.08 } }}>
        <Remold.Connectors ref={connectorRoot} radius={9} gap={3} className={CONNECTORS}>
          <p className="m-0 flex h-8 items-center gap-2.5 px-2 text-[13.5px] font-medium whitespace-nowrap text-(--sn-ink)">
            <TeamIcon group={group} anchor={anchor} lit={holdsPage(group, active)} />
            {group.name}
          </p>

          {group.pages.map((page) => {
            const current = page.id === active;

            return (
              <button
                key={page.id}
                type="button"
                data-rm-link={anchor}
                data-rm-line={current ? "lit" : undefined}
                aria-current={current ? "page" : undefined}
                className={`${ROW} ml-[30px] whitespace-nowrap ${current ? "font-medium text-(--sn-ink)" : ""}`}
                onClick={() => onPick(page.id)}
              >
                {current && <span aria-hidden="true" className="absolute inset-0 rounded-[9px] bg-(--sn-active)" />}
                <span className="relative">{page.name}</span>
              </button>
            );
          })}
        </Remold.Connectors>
      </motion.div>
    </motion.div>
  );
}

export interface SidebarNavProps {
  groups?: NavGroup[];
  value?: SidebarValue;
  defaultValue?: SidebarValue;
  onValueChange?: (value: SidebarValue, details: ChangeDetails) => void;
}

export function SidebarNav({ groups = GROUPS, value: controlled, defaultValue = START, onValueChange }: SidebarNavProps) {
  const shell = useRef<HTMLDivElement>(null);
  const connectorRoot = useRef<HTMLDivElement>(null);
  const connectorMotion = useConnectorMotion(connectorRoot);
  const [value, setValue] = useControllableState<SidebarValue>({ value: controlled, defaultValue, onValueChange });
  const [rail, dispatch] = useReducer(railReducer, { hovered: null, flyout: null });
  const flyoutClose = useTimeout();

  const collapsed = Boolean(value.collapsed);
  const flyoutGroup = collapsed && rail.flyout ? groups.find((group) => group.id === rail.flyout!.id) : undefined;

  const selectPage = (active: string) => setValue({ ...value, active });
  const toggleTeam = (id: string) => setValue({ ...value, open: toggled(value.open, id) });

  const toggleCollapsed = () => {
    dispatch({ type: "leave" });
    setValue({ ...value, collapsed: !collapsed });
  };

  const openFlyout = (id: string, button: HTMLElement) => {
    flyoutClose.cancel();
    dispatch({ type: "open", id, top: topWithin(shell.current!, button) });
  };

  const leaveFlyout = () => flyoutClose.schedule(() => dispatch({ type: "leave" }), FLYOUT_CLOSE_DELAY);

  const navRow = (id: string, name: string, icon: IconSvgElement, extra?: ReactNode) => (
    <motion.button
      key={id}
      layout="position"
      {...connectorMotion}
      type="button"
      className={ROW}
      aria-label={collapsed ? name : undefined}
      aria-current={value.active === id ? "page" : undefined}
      onClick={() => selectPage(id)}
    >
      {value.active === id && <Highlight />}
      <HugeiconsIcon icon={icon} size={17} strokeWidth={1.7} className="relative shrink-0 text-(--sn-muted)" aria-hidden="true" />
      <Label>{name}</Label>
      {extra}
    </motion.button>
  );

  const teamRow = (group: NavGroup, expanded: boolean) => {
    const flying = flyoutGroup?.id === group.id;

    const railHandlers = {
      "aria-label": group.name,
      "aria-expanded": flying,
      "aria-controls": flying ? `sn-flyout-${group.id}` : undefined,
      onPointerEnter: (event: { currentTarget: HTMLButtonElement }) => openFlyout(group.id, event.currentTarget),
      onPointerLeave: leaveFlyout,
      onFocus: (event: { currentTarget: HTMLButtonElement }) => openFlyout(group.id, event.currentTarget),
      onClick: (event: { currentTarget: HTMLButtonElement }) => (flying ? dispatch({ type: "dismiss" }) : openFlyout(group.id, event.currentTarget)),
    };

    return (
      <motion.button
        key={group.id}
        layout="position"
        {...connectorMotion}
        type="button"
        className={`group/team ${ROW} font-medium ${collapsed ? "hover:bg-transparent" : ""}`}
        {...(collapsed ? railHandlers : { "aria-expanded": expanded, onClick: () => toggleTeam(group.id) })}
      >
        {holdsPage(group, value.active) && !expanded && <Highlight />}
        {collapsed && rail.hovered === group.id && !flying && (
          <motion.span layoutId="sn-flyout" aria-hidden="true" className="absolute inset-0 bg-(--sn-hover)" style={{ borderRadius: 9 }} />
        )}
        <TeamIcon group={group} anchor={group.id} lit={holdsPage(group, value.active)} />
        <Label>{group.name}</Label>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          size={14}
          strokeWidth={2}
          aria-hidden="true"
          className={`relative shrink-0 text-(--sn-muted) opacity-0 transition-[rotate,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/team:opacity-100 group-focus-visible/team:opacity-100 group-data-collapsed/sn:hidden motion-reduce:transition-none ${expanded ? "rotate-90" : ""}`}
        />
      </motion.button>
    );
  };

  const pageRow = (group: NavGroup, page: NavGroup["pages"][number], index: number) => {
    const active = value.active === page.id;

    return (
      <motion.button
        key={page.id}
        layout="position"
        {...connectorMotion}
        initial={PAGE_ENTER}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { ...SPRING, delay: index * 0.035 } }}
        type="button"
        data-rm-link={group.id}
        data-rm-line={active ? "lit" : undefined}
        className={`${ROW} ml-[30px] ${active ? "font-medium text-(--sn-ink)" : ""}`}
        aria-current={active ? "page" : undefined}
        onClick={() => selectPage(page.id)}
      >
        {active && <Highlight />}
        <Label>{page.name}</Label>
      </motion.button>
    );
  };

  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <div ref={shell} className={`${THEME} relative max-w-full font-sans`} onKeyDown={(event) => event.key === "Escape" && dispatch({ type: "dismiss" })}>
        <motion.nav
          aria-label="Workspace"
          data-collapsed={collapsed || undefined}
          className="group/sn not-prose max-w-full overflow-hidden rounded-[20px] bg-(--sn-surface) p-2.5"
          initial={false}
          animate={{ width: collapsed ? RAIL : WIDE }}
        >
          <Header collapsed={collapsed} onToggle={toggleCollapsed} />

          <Remold.Connectors ref={connectorRoot} radius={9} gap={3} className={CONNECTORS}>
            <AnimatePresence initial={false}>
              {navRow("search", "Search", Search01Icon)}
              {navRow("inbox", "Inbox", InboxIcon, <InboxBadge />)}
              {navRow("tasks", "My tasks", CheckListIcon)}
              <SectionHeading key="teams" motionProps={connectorMotion}>
                Teams
              </SectionHeading>

              {groups.flatMap((group) => {
                const expanded = value.open.includes(group.id) && !collapsed;

                return [teamRow(group, expanded), ...(expanded ? group.pages.map((page, index) => pageRow(group, page, index)) : [])];
              })}
            </AnimatePresence>
          </Remold.Connectors>
        </motion.nav>

        <AnimatePresence>
          {flyoutGroup && rail.flyout && (
            <Flyout
              key={flyoutGroup.id}
              group={flyoutGroup}
              active={value.active}
              top={rail.flyout.top}
              onHold={flyoutClose.cancel}
              onLeave={leaveFlyout}
              onPick={(page) => {
                dispatch({ type: "leave" });
                selectPage(page);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

const SCRIPT: SidebarValue[] = [
  START,
  { active: "issues", open: ["design", "engineering"] },
  { active: "issues", open: ["engineering"] },
  { active: "issues", open: ["engineering", "marketing"] },
  { active: "launch-plan", open: ["engineering", "marketing"] },
  { active: "launch-plan", open: ["marketing"] },
  { active: "launch-plan", open: ["design", "marketing"] },
  { active: "reviews", open: ["design", "marketing"] },
  { active: "reviews", open: ["design", "marketing"], collapsed: true },
  { active: "reviews", open: ["design", "marketing"], collapsed: true },
  { active: "reviews", open: ["design", "engineering"] },
];

export function SidebarNavDemo({ playing }: { playing?: boolean } = {}) {
  const shell = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(START);

  useScript(
    shell,
    playing,
    SCRIPT.map((step, index) => [index === 0 ? 1400 : 1500, () => setValue(step)] as const),
  );

  return (
    <div ref={shell} className="grid w-full place-items-center">
      <SidebarNav value={value} onValueChange={setValue} />
    </div>
  );
}

