"use client";

import { Button } from "@base-ui/react/button";
import { Popover } from "@base-ui/react/popover";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import {
  AtIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Comment01Icon,
  Notification03Icon,
  Rocket01Icon,
  Task01Icon,
  Tick02Icon,
  TickDouble02Icon,
  UserAdd01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { announce } from "@remold-ui/dom";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, LayoutGroup, motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, type Ref } from "react";
import useMeasure from "react-use-measure";
import { Odometer } from "./odometer";
import { useControllableState, type ChangeDetails } from "./use-controllable-state";
import { useScene } from "./use-scene";

type Kind = "mention" | "comment" | "invite" | "assign" | "deploy";
type Invite = "pending" | "accepted" | "declined";

export interface Notice {
  id: string;
  kind: Kind;
  who?: { name: string; initials: string; tint: string };
  did: string;
  what: string;
  quote?: string;
  time: string;
  day: "Today" | "Earlier";
  read: boolean;
  invite?: Invite;
}

export type InboxTab = "all" | "unread";

export interface InboxValue {
  open: boolean;
  tab: InboxTab;
  notices: Notice[];
}

export interface NotificationInboxProps {
  value?: InboxValue;
  defaultValue?: InboxValue;
  onValueChange?: (value: InboxValue, details: ChangeDetails) => void;
  announcements?: boolean;
  ref?: Ref<HTMLElement>;
}

const summaryOf = (notice: Notice) => (notice.who ? `${notice.who.name} ${notice.did} ${notice.what}` : `${notice.what} ${notice.did}`);

const KIND_ICON = {
  mention: AtIcon,
  comment: Comment01Icon,
  invite: UserAdd01Icon,
  assign: Task01Icon,
  deploy: Rocket01Icon,
} as const;

const AKOSUA = { name: "Akosua Boateng", initials: "AB", tint: "#e0e7ff" };
const KWAME = { name: "Kwame Asante", initials: "KA", tint: "#fce7f3" };
const ABENA = { name: "Abena Osei", initials: "AO", tint: "#fef3c7" };
const YAW = { name: "Yaw Darko", initials: "YD", tint: "#dcfce7" };
const AMA = { name: "Ama Mensah", initials: "AM", tint: "#e0f2fe" };

const NOTICES: Notice[] = [
  {
    id: "invite",
    kind: "invite",
    who: KWAME,
    did: "invited you to the",
    what: "Design team",
    time: "12m",
    day: "Today",
    read: false,
    invite: "pending",
  },
  {
    id: "comment",
    kind: "comment",
    who: ABENA,
    did: "commented on",
    what: "Checkout redesign",
    quote: "The new totals row reads so much better. Happy to ship this week.",
    time: "1h",
    day: "Today",
    read: false,
  },
  {
    id: "deploy",
    kind: "deploy",
    did: "deployed to production",
    what: "web-app",
    time: "3h",
    day: "Today",
    read: false,
  },
  {
    id: "assign",
    kind: "assign",
    who: YAW,
    did: "assigned you",
    what: "ENG-218 · Tax rounds twice on mobile",
    time: "Yesterday",
    day: "Earlier",
    read: true,
  },
  {
    id: "mention-old",
    kind: "mention",
    who: AMA,
    did: "mentioned you in",
    what: "Hiring plan",
    quote: "@albert can you take the second-round interviews?",
    time: "Mon",
    day: "Earlier",
    read: true,
  },
];

export const ARRIVING: Notice = {
  id: "mention",
  kind: "mention",
  who: AKOSUA,
  did: "mentioned you in",
  what: "Q4 roadmap",
  quote: "@albert could you sanity-check the launch dates before Friday?",
  time: "now",
  day: "Today",
  read: false,
};

const START: InboxValue = { open: false, tab: "all", notices: NOTICES };

const BAR = 56;
const BAR_WIDTH = 420;
const BELL = 40;
const WIDTH = 372;
const BELL_INSET = 12 + 30 + 8;
const DROP = BAR + 8;

const MORPH = { type: "spring" as const, stiffness: 350, damping: 30, mass: 0.8 };
const HIGHLIGHT = { type: "spring" as const, stiffness: 460, damping: 34, mass: 0.55 };
const SLIDE = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.6 };
const POP = { type: "spring" as const, duration: 0.35, bounce: 0.3 };
const SWAP = {
  initial: { opacity: 0, filter: "blur(4px)", scale: 0.96 },
  animate: { opacity: 1, filter: "blur(0px)", scale: 1 },
  exit: { opacity: 0, filter: "blur(4px)", scale: 0.96 },
  transition: { type: "spring" as const, duration: 0.35, bounce: 0 },
};

const PALETTE = [
  "[--nbx-ink:#0a0a0b] [--nbx-muted:#6e6e76] [--nbx-quiet:#a1a1aa] [--nbx-surface:#ffffff]",
  "[--nbx-fill:#f2f2f4] [--nbx-fill-hover:#ebebee] [--nbx-hl:#f5f5f7]",
  "[--nbx-accent:#4f46e5] [--nbx-good:#16a34a] [--nbx-badge:#e5484d]",
  "dark:[--nbx-ink:#fafafa] dark:[--nbx-muted:#a1a1aa] dark:[--nbx-quiet:#71717a] dark:[--nbx-surface:#161618]",
  "dark:[--nbx-fill:#232327] dark:[--nbx-fill-hover:#2b2b30] dark:[--nbx-hl:#1f1f23]",
  "dark:[--nbx-accent:#818cf8] dark:[--nbx-good:#4ade80] dark:[--nbx-badge:#ff6369]",
  "font-sans text-[14px] text-(--nbx-ink)",
].join(" ");

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--nbx-accent)";
const STRONG =
  "font-semibold text-(--nbx-ink) transition-colors duration-300 group-data-read/row:text-[color-mix(in_oklab,var(--nbx-ink)_70%,var(--nbx-muted))]";
const SMALL_BUTTON = `h-8 rounded-[10px] px-3.5 text-[13px] font-semibold transition-[background-color,scale] duration-150 active:scale-[0.97] ${FOCUS_RING}`;

const rise = (still: boolean | null, delay: number) => ({
  layout: "position" as const,
  initial: still ? { opacity: 0 } : { opacity: 0, y: 10, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: still ? { opacity: 0 } : { opacity: 0, scale: 0.97, filter: "blur(4px)", transition: { duration: 0.16 } },
  transition: { ...SLIDE, opacity: { duration: 0.22, delay }, filter: { duration: 0.22, delay }, y: { ...SLIDE, delay } },
});

const markRead = (notices: Notice[], ids: string[]) =>
  notices.map((notice) => (ids.includes(notice.id) ? { ...notice, read: true } : notice));

function Avatar({ notice }: { notice: Notice }) {
  return (
    <span className="pointer-events-none relative size-9" aria-hidden="true">
      {notice.who ? (
        <span
          className="grid size-9 place-items-center rounded-full text-[12px] font-bold text-stone-900"
          style={{ background: notice.who.tint }}
        >
          {notice.who.initials}
        </span>
      ) : (
        <span className="grid size-9 place-items-center rounded-[11px] bg-[color-mix(in_oklab,var(--nbx-good)_14%,var(--nbx-surface))] text-(--nbx-good)">
          <HugeiconsIcon icon={Rocket01Icon} strokeWidth={1.8} className="size-[18px]" />
        </span>
      )}
      {notice.who && (
        <span
          data-kind={notice.kind}
          className="absolute -right-1 -bottom-1 grid size-[18px] place-items-center rounded-full bg-(--nbx-ink) text-(--nbx-surface) shadow-[0_0_0_2px_var(--nbx-surface)] data-[kind=mention]:bg-(--nbx-accent) data-[kind=mention]:text-white"
        >
          <HugeiconsIcon icon={KIND_ICON[notice.kind]} strokeWidth={2.2} className="size-2.5" />
        </span>
      )}
    </span>
  );
}

function InviteAnswer({ notice, onAnswer }: { notice: Notice; onAnswer: (answer: Exclude<Invite, "pending">) => void }) {
  return (
    <div className="grid min-h-8">
      <AnimatePresence initial={false} mode="popLayout">
        {notice.invite === "pending" ? (
          <motion.div key="ask" className="pointer-events-auto flex gap-1.5" {...SWAP}>
            <Button className={`${SMALL_BUTTON} bg-(--nbx-ink) text-(--nbx-surface)`} onClick={() => onAnswer("accepted")}>
              Accept
            </Button>
            <Button
              className={`${SMALL_BUTTON} bg-(--nbx-fill) text-(--nbx-ink) hover:bg-(--nbx-fill-hover)`}
              onClick={() => onAnswer("declined")}
            >
              Decline
            </Button>
          </motion.div>
        ) : (
          <motion.p
            key="done"
            data-answer={notice.invite}
            className="m-0 inline-flex items-center gap-1.5 text-[13px] font-semibold text-(--nbx-muted) data-[answer=accepted]:text-(--nbx-good)"
            {...SWAP}
          >
            {notice.invite === "accepted" && <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />}
            {notice.invite === "accepted" ? `You joined the ${notice.what}` : "Invitation declined"}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({
  notice,
  delay,
  highlighted,
  layoutGroup,
  onHighlight,
  onOpen,
  onAnswer,
}: {
  notice: Notice;
  delay: number;
  highlighted: boolean;
  layoutGroup: string;
  onHighlight: () => void;
  onOpen: () => void;
  onAnswer: (answer: Exclude<Invite, "pending">) => void;
}) {
  const still = useReducedMotion();
  const summary = summaryOf(notice);

  return (
    <motion.li
      {...rise(still, delay)}
      data-read={notice.read || undefined}
      className="group/row relative grid grid-cols-[auto_1fr_auto] gap-3 rounded-2xl px-3 py-2.5"
      onPointerEnter={(event) => event.pointerType === "mouse" && onHighlight()}
    >
      {highlighted && (
        <motion.span
          layoutId={`${layoutGroup}-hl`}
          className="absolute inset-0 rounded-[inherit] bg-(--nbx-hl)"
          transition={HIGHLIGHT}
        />
      )}
      <button
        type="button"
        className="absolute inset-0 cursor-pointer rounded-[inherit] border-0 bg-transparent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--nbx-accent)"
        aria-label={`${summary}, ${notice.time}${notice.read ? "" : ", unread"}`}
        onClick={onOpen}
        onFocus={onHighlight}
      />
      <Avatar notice={notice} />
      <div className="pointer-events-none relative grid min-w-0 gap-[7px]">
        <p className="m-0 text-[13.5px] leading-[1.4] text-pretty text-(--nbx-muted)">
          {notice.who ? (
            <>
              <b className={STRONG}>{notice.who.name}</b> {notice.did} <b className={STRONG}>{notice.what}</b>
            </>
          ) : (
            <>
              <b className={STRONG}>{notice.what}</b> {notice.did}
            </>
          )}
        </p>
        {notice.quote && (
          <p className="m-0 line-clamp-2 rounded-xl bg-(--nbx-fill) px-[11px] py-2 text-[13px] leading-[1.45] text-(--nbx-ink)">
            {notice.quote}
          </p>
        )}
        {notice.invite && <InviteAnswer notice={notice} onAnswer={onAnswer} />}
      </div>
      <span className="pointer-events-none relative grid content-start justify-items-end gap-2 pt-px">
        <span className="text-[12px] whitespace-nowrap text-(--nbx-quiet)">{notice.time}</span>
        <AnimatePresence initial={false}>
          {!notice.read && (
            <motion.span
              className="size-2 rounded-full bg-(--nbx-accent)"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={POP}
            />
          )}
        </AnimatePresence>
      </span>
    </motion.li>
  );
}

function CaughtUp({ still }: { still: boolean | null }) {
  return (
    <motion.li key="caught-up" {...rise(still, 0.12)} className="grid justify-items-center pt-7 pb-8 text-center">
      <motion.span
        className="mb-3.5 grid size-12 place-items-center rounded-2xl bg-[color-mix(in_oklab,var(--nbx-good)_13%,var(--nbx-surface))] text-(--nbx-good)"
        initial={still ? false : { scale: 0.5, rotate: -16 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 0.6, bounce: 0.45, delay: 0.15 }}
      >
        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.2} className="size-6" />
      </motion.span>
      <b className="text-[14.5px] font-[650]">You&apos;re all caught up</b>
      <span className="mt-1 text-[13px] text-(--nbx-muted)">New notifications will show up here.</span>
    </motion.li>
  );
}

function AppBar({ open }: { open: boolean }) {
  return (
    <div className="flex h-14 items-center gap-2 rounded-[18px] bg-(--nbx-surface) pr-3 pl-4">
      <span className="flex min-w-0 flex-1 items-center gap-2 text-[13.5px] whitespace-nowrap text-(--nbx-muted)">
        <span
          className="grid size-6 place-items-center rounded-[7px] bg-(--nbx-ink) text-[12px] font-bold text-(--nbx-surface)"
          aria-hidden="true"
        >
          N
        </span>
        <span>Northwind</span>
        <span className="text-(--nbx-quiet)" aria-hidden="true">
          /
        </span>
        <b className="font-semibold text-(--nbx-ink)">Roadmap</b>
      </span>
      <span
        data-open={open || undefined}
        className="grid size-10 place-items-center rounded-full text-(--nbx-ink) transition-colors duration-200 data-open:bg-(--nbx-fill)"
        aria-hidden="true"
      >
        <HugeiconsIcon icon={Notification03Icon} strokeWidth={2} className="size-5" />
      </span>
      <span
        className="grid size-[30px] place-items-center rounded-full bg-amber-200 text-[11px] font-bold text-amber-900"
        aria-hidden="true"
      >
        AD
      </span>
    </div>
  );
}

export function NotificationInbox({ value, defaultValue = START, onValueChange, announcements = true, ref }: NotificationInboxProps) {
  const [inbox, setInbox] = useControllableState({ value, defaultValue, onValueChange });
  const id = useId();
  const still = useReducedMotion();
  const [shell, setShell] = useState<HTMLDivElement | null>(null);
  const [anchor, room] = useMeasure({ offsetSize: true });
  const [content, size] = useMeasure({ offsetSize: true });
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [bell, animateBell] = useAnimate();
  const marking = useRef<ReturnType<typeof setTimeout>[]>([]);
  const before = useRef<number | null>(null);
  const known = useRef<Set<string> | null>(null);
  const clearing = useRef(false);

  const open = inbox.open;
  const unread = inbox.notices.filter((notice) => !notice.read).length;
  const shown = inbox.tab === "unread" ? inbox.notices.filter((notice) => !notice.read) : inbox.notices;
  const barWidth = room.width || BAR_WIDTH;
  const width = Math.min(WIDTH, barWidth);
  const bellX = barWidth - BELL_INSET - BELL;
  const bellY = (BAR - BELL) / 2;
  const entries = (["Today", "Earlier"] as const).flatMap((day) => {
    const ofDay = shown.filter((notice) => notice.day === day);
    return ofDay.length ? [{ heading: day } as const, ...ofDay] : [];
  });

  useEffect(() => {
    if (before.current !== null && unread > before.current && bell.current && !still) {
      void animateBell(bell.current, { rotate: [0, 18, -14, 10, -6, 2, 0] }, { duration: 0.8, ease: "easeInOut" });
    }
    before.current = unread;
  }, [unread, animateBell, bell, still]);

  useEffect(() => {
    const seen = known.current;
    const arrived = seen ? inbox.notices.filter((notice) => !notice.read && !seen.has(notice.id)) : [];

    known.current = new Set(inbox.notices.map((notice) => notice.id));

    if (!announcements || arrived.length === 0) return;

    const news = arrived.length === 1 ? `New notification: ${summaryOf(arrived[0]!)}` : `${arrived.length} new notifications`;

    announce(`${news}. ${unread} unread.`);
  }, [inbox.notices, unread, announcements]);

  useEffect(() => {
    if (!clearing.current || unread > 0) return;

    clearing.current = false;

    if (announcements) announce("All notifications marked as read.");
  }, [unread, announcements]);

  useEffect(() => () => marking.current.forEach(clearTimeout), []);

  const update = (notice: string, change: Partial<Notice>) =>
    setInbox((current) => ({
      ...current,
      notices: current.notices.map((each) => (each.id === notice ? { ...each, ...change } : each)),
    }));

  const markAllRead = () => {
    clearing.current = true;
    marking.current.forEach(clearTimeout);
    marking.current = inbox.notices
      .filter((notice) => !notice.read)
      .map((notice, index) => setTimeout(() => update(notice.id, { read: true }), index * 70));
  };

  const onOpenChange = (next: boolean) => {
    setInbox((current) => ({ ...current, open: next }));
    if (!next) setHighlighted(null);
  };

  return (
    <section ref={ref} className={`not-prose grid w-full justify-items-center ${PALETTE}`} aria-label="Workspace">
      <div ref={anchor} className="relative h-[640px] w-[min(100%,420px)]">
        <AppBar open={open} />

        <Popover.Root open={open && shell !== null} onOpenChange={onOpenChange} modal={false}>
          <motion.div
            ref={setShell}
            className="absolute top-0 left-0 overflow-hidden bg-(--nbx-surface)"
            initial={false}
            animate={
              open
                ? { x: barWidth - width, y: DROP, width, height: Math.max(size.height, BELL), borderRadius: 26 }
                : { x: bellX, y: bellY, width: BELL, height: BELL, borderRadius: BELL / 2 }
            }
            transition={still ? { duration: 0.12 } : { ...MORPH, delay: open ? 0 : 0.08 }}
          >
            <Popover.Trigger
              className="group absolute top-0 right-0 z-2 grid size-10 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-(--nbx-ink) transition-[top,right,width,height,background-color,scale] duration-200 ease-out hover:bg-(--nbx-fill) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--nbx-accent) active:scale-[0.96] data-popup-open:top-2 data-popup-open:right-2 data-popup-open:size-9 data-popup-open:bg-(--nbx-fill) data-popup-open:hover:bg-(--nbx-fill-hover) motion-reduce:transition-none"
              aria-label={open ? "Close notifications" : unread ? `Notifications, ${unread} unread` : "Notifications"}
            >
              <span ref={bell} className="grid origin-[50%_10%] [&_svg]:size-5 group-data-popup-open:[&_svg]:size-4">
                <Remold.Icon
                  icon={<HugeiconsIcon icon={open ? Cancel01Icon : Notification03Icon} />}
                  strokeWidth={2}
                  spring={{ duration: 0.32, bounce: 0.08 }}
                  aria-hidden="true"
                />
              </span>
            </Popover.Trigger>

            <Popover.Portal container={shell}>
              <Popover.Positioner className="absolute! inset-0! transform-none!" side="bottom" align="center">
                <Popover.Popup
                  className="absolute inset-0 outline-none transition-[opacity,filter] duration-100 ease-out data-ending-style:opacity-0 data-ending-style:blur-[3px] motion-reduce:transition-none"
                  initialFocus={false}
                >
                  <motion.div
                    ref={content}
                    className="absolute top-0 left-0"
                    style={{ width }}
                    initial={still ? { opacity: 0 } : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={still ? { duration: 0.16 } : { ...SLIDE, delay: 0.06 }}
                  >
                    <header className="flex h-[52px] items-center pr-[60px] pl-5">
                      <Popover.Title className="m-0 text-[16px] font-bold tracking-[-0.015em]">Notifications</Popover.Title>
                    </header>

                    <div className="flex items-center justify-between gap-2 pr-3 pb-1.5 pl-3.5">
                      <ToggleGroup
                        className="flex rounded-xl bg-(--nbx-fill) p-[3px]"
                        aria-label="Show"
                        value={[inbox.tab]}
                        onValueChange={(next) => {
                          if (next[0]) setInbox((current) => ({ ...current, tab: next[0] as InboxTab }));
                        }}
                      >
                        {(["all", "unread"] as const).map((tab) => (
                          <Toggle
                            key={tab}
                            value={tab}
                            className={`relative h-[30px] cursor-pointer rounded-[9px] border-0 bg-transparent px-3.5 text-[13px] font-semibold text-(--nbx-muted) transition-colors duration-200 data-pressed:text-(--nbx-ink) ${FOCUS_RING}`}
                          >
                            {inbox.tab === tab && (
                              <motion.span
                                layoutId={`${id}-tab`}
                                className="absolute inset-0 rounded-[inherit] bg-(--nbx-surface)"
                                transition={HIGHLIGHT}
                              />
                            )}
                            <span className="relative inline-flex items-center gap-1.5">
                              {tab === "all" ? "All" : "Unread"}
                              {tab === "unread" && unread > 0 && (
                                <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-(--nbx-ink) px-[5px] text-[10.5px] font-bold text-(--nbx-surface)">
                                  <Odometer value={String(unread)} />
                                </span>
                              )}
                            </span>
                          </Toggle>
                        ))}
                      </ToggleGroup>

                      <Button
                        className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[10px] border-0 bg-transparent px-2.5 text-[12.5px] font-semibold whitespace-nowrap text-(--nbx-accent) transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--nbx-accent)_9%,transparent)] data-disabled:cursor-default data-disabled:bg-transparent data-disabled:text-(--nbx-quiet) ${FOCUS_RING}`}
                        disabled={!unread}
                        focusableWhenDisabled
                        onClick={markAllRead}
                      >
                        <HugeiconsIcon icon={TickDouble02Icon} strokeWidth={2} className="size-4" />
                        Mark all read
                      </Button>
                    </div>

                    <LayoutGroup id={id}>
                      <ul
                        className="relative m-0 max-h-[452px] list-none overflow-y-auto overscroll-contain px-2 pt-0 pb-2.5 [mask-image:linear-gradient(to_bottom,#000_calc(100%-32px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        onPointerLeave={() => setHighlighted(null)}
                      >
                        <AnimatePresence initial mode="popLayout">
                          {entries.map((entry, index) =>
                            "heading" in entry ? (
                              <motion.li
                                key={entry.heading}
                                {...rise(still, 0.1 + index * 0.035)}
                                className="px-3 pt-3 pb-1 text-[11.5px] font-semibold tracking-[0.02em] text-(--nbx-quiet)"
                              >
                                {entry.heading}
                              </motion.li>
                            ) : (
                              <Row
                                key={entry.id}
                                notice={entry}
                                delay={0.1 + index * 0.035}
                                layoutGroup={id}
                                highlighted={highlighted === entry.id}
                                onHighlight={() => setHighlighted(entry.id)}
                                onOpen={() => update(entry.id, { read: true })}
                                onAnswer={(answer) => update(entry.id, { invite: answer, read: true })}
                              />
                            ),
                          )}
                          {entries.length === 0 && <CaughtUp key="caught-up" still={still} />}
                        </AnimatePresence>
                      </ul>
                    </LayoutGroup>
                  </motion.div>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </motion.div>
        </Popover.Root>

        <AnimatePresence initial={false}>
          {!open && unread > 0 && (
            <motion.span
              className="pointer-events-none absolute z-3 grid h-4 min-w-4 place-items-center rounded-full bg-(--nbx-badge) px-1 text-[10px] font-bold text-white shadow-[0_0_0_2px_var(--nbx-surface)]"
              style={{ left: bellX + BELL - 15, top: bellY - 1 }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0, transition: { duration: 0.12 } }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.35 }}
            >
              <Odometer value={String(unread)} />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

const WITH_NEW = [ARRIVING, ...NOTICES];
const ACCEPTED = WITH_NEW.map((notice) =>
  notice.id === "invite" ? { ...notice, invite: "accepted" as const, read: true } : notice,
);
const CLEARING = ["mention", "comment", "deploy"];

const BEATS: readonly (InboxValue & { ms: number })[] = [
  { ...START, open: true, ms: 1400 },
  { ...START, open: true, notices: WITH_NEW, ms: 1900 },
  { ...START, open: true, notices: ACCEPTED, ms: 1600 },
  { ...START, open: true, tab: "unread", notices: ACCEPTED, ms: 1300 },
  ...CLEARING.map((_, index) => ({
    ...START,
    open: true,
    tab: "unread" as const,
    notices: markRead(ACCEPTED, CLEARING.slice(0, index + 1)),
    ms: index === CLEARING.length - 1 ? 1900 : 90,
  })),
  { ...START, open: true, notices: markRead(ACCEPTED, CLEARING), ms: 1700 },
  { ...START, notices: markRead(ACCEPTED, CLEARING), ms: 1300 },
];

const fromBeat = (step: number): InboxValue => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

export function NotificationInboxDemo({ playing = true }: { playing?: boolean } = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  return <NotificationInbox ref={scene.ref} value={scene.state} onValueChange={scene.onValueChange} announcements={!scene.live} />;
}
