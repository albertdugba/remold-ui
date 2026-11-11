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
import { Remold } from "@remold-ui/react";
import { AnimatePresence, LayoutGroup, motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, type Ref } from "react";
import useMeasure from "react-use-measure";
import { Odometer } from "./odometer";
import { useControllableState, type ChangeDetails } from "./use-controllable-state";
import { useScene } from "./use-scene";
import "./notification-inbox.css";

type Kind = "mention" | "comment" | "invite" | "assign" | "deploy";
type Invite = "pending" | "accepted" | "declined";

export interface Notice {
  id: string;
  kind: Kind;
  /** Who did it; a deploy has no person, just its own mark */
  who?: { name: string; initials: string; tint: string };
  /** "mentioned you in", "commented on"… */
  did: string;
  /** What it happened to: a doc, an issue, a team */
  what: string;
  /** A line of what they wrote, for mentions and comments */
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

const KIND_ICON = {
  mention: AtIcon,
  comment: Comment01Icon,
  invite: UserAdd01Icon,
  assign: Task01Icon,
  deploy: Rocket01Icon,
} as const;

const MAYA = { name: "Maya Chen", initials: "MC", tint: "#e0e7ff" };
const JORDAN = { name: "Jordan Lee", initials: "JL", tint: "#fce7f3" };
const PRIYA = { name: "Priya Nair", initials: "PN", tint: "#fef3c7" };
const SAM = { name: "Sam Okafor", initials: "SO", tint: "#dcfce7" };
const AMA = { name: "Ama Mensah", initials: "AM", tint: "#e0f2fe" };

const NOTICES: Notice[] = [
  {
    id: "invite",
    kind: "invite",
    who: JORDAN,
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
    who: PRIYA,
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
    who: SAM,
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

/** A new one, for the demo to drop in at the top */
export const ARRIVING: Notice = {
  id: "mention",
  kind: "mention",
  who: MAYA,
  did: "mentioned you in",
  what: "Q4 roadmap",
  quote: "@albert could you sanity-check the launch dates before Friday?",
  time: "now",
  day: "Today",
  read: false,
};

const START: InboxValue = { open: false, tab: "all", notices: NOTICES };

/** The app bar the bell lives in, the bell, and the inbox it grows into below the bar */
const BAR = 56;
const BAR_WIDTH = 420;
const BELL = 40;
const WIDTH = 372;
/** From the bar's right edge to the bell's: the avatar, and the gaps around it */
const BELL_INSET = 12 + 30 + 8;
const DROP = BAR + 8;

/** The shell grows and shrinks on this, like the popover menu's */
const MORPH = { type: "spring" as const, stiffness: 350, damping: 30, mass: 0.8 };
const HIGHLIGHT = { type: "spring" as const, stiffness: 460, damping: 34, mass: 0.55 };
const SLIDE = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.6 };
const SWAP = {
  initial: { opacity: 0, filter: "blur(4px)", scale: 0.96 },
  animate: { opacity: 1, filter: "blur(0px)", scale: 1 },
  exit: { opacity: 0, filter: "blur(4px)", scale: 0.96 },
  transition: { type: "spring" as const, duration: 0.35, bounce: 0 },
};

function Avatar({ notice }: { notice: Notice }) {
  return (
    <span className="nbx-avatar" data-kind={notice.kind} aria-hidden="true">
      {notice.who ? (
        <span className="nbx-face" style={{ background: notice.who.tint }}>
          {notice.who.initials}
        </span>
      ) : (
        <span className="nbx-face nbx-face-app">
          <HugeiconsIcon icon={Rocket01Icon} strokeWidth={1.8} />
        </span>
      )}
      {notice.who && (
        <span className="nbx-kind">
          <HugeiconsIcon icon={KIND_ICON[notice.kind]} strokeWidth={2.2} />
        </span>
      )}
    </span>
  );
}

/** Rows rise in one after another as the inbox opens, and slide to make room after that */
const rise = (still: boolean | null, delay: number) => ({
  layout: "position" as const,
  initial: still ? { opacity: 0 } : { opacity: 0, y: 10, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: still ? { opacity: 0 } : { opacity: 0, scale: 0.97, filter: "blur(4px)", transition: { duration: 0.16 } },
  transition: { ...SLIDE, opacity: { duration: 0.22, delay }, filter: { duration: 0.22, delay }, y: { ...SLIDE, delay } },
});

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
  const summary = notice.who ? `${notice.who.name} ${notice.did} ${notice.what}` : `${notice.what} ${notice.did}`;
  return (
    <motion.li
      {...rise(still, delay)}
      className="nbx-row"
      data-read={notice.read || undefined}
      onPointerEnter={(event) => event.pointerType === "mouse" && onHighlight()}
    >
      {highlighted && <motion.span layoutId={`${layoutGroup}-hl`} className="nbx-hl" transition={HIGHLIGHT} />}
      {/* The whole row opens it; the invite's own buttons sit above this */}
      <button
        type="button"
        className="nbx-hit"
        aria-label={`${summary}, ${notice.time}${notice.read ? "" : ", unread"}`}
        onClick={onOpen}
        onFocus={onHighlight}
      />
      <Avatar notice={notice} />
      <div className="nbx-body">
        <p className="nbx-line">
          {notice.who ? (
            <>
              <b>{notice.who.name}</b> {notice.did} <b>{notice.what}</b>
            </>
          ) : (
            <>
              <b>{notice.what}</b> {notice.did}
            </>
          )}
        </p>
        {notice.quote && <p className="nbx-quote">{notice.quote}</p>}
        {notice.invite && (
          <div className="nbx-answer">
            <AnimatePresence initial={false} mode="popLayout">
              {notice.invite === "pending" ? (
                <motion.div key="ask" className="nbx-buttons" {...SWAP}>
                  <Button className="nbx-accept" onClick={() => onAnswer("accepted")}>
                    Accept
                  </Button>
                  <Button className="nbx-decline" onClick={() => onAnswer("declined")}>
                    Decline
                  </Button>
                </motion.div>
              ) : (
                <motion.p key="done" className="nbx-answered" data-answer={notice.invite} {...SWAP}>
                  {notice.invite === "accepted" && <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />}
                  {notice.invite === "accepted" ? `You joined the ${notice.what}` : "Invitation declined"}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
      <span className="nbx-meta">
        <span className="nbx-time">{notice.time}</span>
        <AnimatePresence initial={false}>
          {!notice.read && (
            <motion.span
              className="nbx-dot"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.3 }}
            />
          )}
        </AnimatePresence>
      </span>
    </motion.li>
  );
}

export interface NotificationInboxProps {
  value?: InboxValue;
  defaultValue?: InboxValue;
  onValueChange?: (value: InboxValue, details: ChangeDetails) => void;
  ref?: Ref<HTMLElement>;
}

/**
 * A bell that grows into your notifications, the way the popover menu grows out of its button:
 * one shell, morphing from the bell's circle to the inbox's size and back.
 */
export function NotificationInbox({ value, defaultValue = START, onValueChange, ref }: NotificationInboxProps) {
  const [inbox, setInbox] = useControllableState({ value, defaultValue, onValueChange });
  const id = useId();
  const still = useReducedMotion();
  const shell = useRef<HTMLDivElement>(null);
  const [anchor, room] = useMeasure();
  const [content, size] = useMeasure();
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [bell, animateBell] = useAnimate();
  const marking = useRef<ReturnType<typeof setTimeout>[]>([]);

  const open = inbox.open;
  const unread = inbox.notices.filter((notice) => !notice.read).length;
  const shown = inbox.tab === "unread" ? inbox.notices.filter((notice) => !notice.read) : inbox.notices;
  const barWidth = room.width || BAR_WIDTH;
  const width = Math.min(WIDTH, barWidth);
  // Closed, the shell is the bell in the bar; open, it's the inbox just below, flush with the bar's right edge
  const bellX = barWidth - BELL_INSET - BELL;
  const bellY = (BAR - BELL) / 2;

  // The rows in order, each day's name above its own, so they all slide together
  const entries = (["Today", "Earlier"] as const).flatMap((day) => {
    const today = shown.filter((notice) => notice.day === day);
    return today.length ? [{ heading: day } as const, ...today] : [];
  });

  // The bell rings when something new comes in
  const before = useRef(unread);
  useEffect(() => {
    if (unread > before.current && bell.current && !still) {
      void animateBell(bell.current, { rotate: [0, 18, -14, 10, -6, 2, 0] }, { duration: 0.8, ease: "easeInOut" });
    }
    before.current = unread;
  }, [unread, animateBell, bell, still]);

  useEffect(() => () => marking.current.forEach(clearTimeout), []);

  const update = (notice: string, change: Partial<Notice>) =>
    setInbox((current) => ({
      ...current,
      notices: current.notices.map((each) => (each.id === notice ? { ...each, ...change } : each)),
    }));

  // One after another, top to bottom, so the count ticks down instead of jumping
  const markAllRead = () => {
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
    <section ref={ref} className="nbx nbx-layer not-prose" aria-label="Workspace">
      <div ref={anchor} className="nbx-anchor">
        <div className="nbx-bar">
          <span className="nbx-crumbs">
            <span className="nbx-workspace" aria-hidden="true">
              N
            </span>
            <span>Northwind</span>
            <span className="nbx-slash" aria-hidden="true">
              /
            </span>
            <b>Roadmap</b>
          </span>
          {/* Where the bell sits: it stays lit while its inbox is open below */}
          <span className="nbx-bell-spot" data-open={open || undefined} aria-hidden="true">
            <HugeiconsIcon icon={Notification03Icon} strokeWidth={2} />
          </span>
          <span className="nbx-me" aria-hidden="true">
            AD
          </span>
        </div>

        <Popover.Root open={open} onOpenChange={onOpenChange} modal={false}>
          <motion.div
            ref={shell}
            className="nbx-shell"
            initial={false}
            animate={
              open
                ? { x: barWidth - width, y: DROP, width, height: Math.max(size.height, BELL), borderRadius: 26 }
                : { x: bellX, y: bellY, width: BELL, height: BELL, borderRadius: BELL / 2 }
            }
            transition={still ? { duration: 0.12 } : { ...MORPH, delay: open ? 0 : 0.08 }}
          >
            <Popover.Trigger
              className="nbx-trigger"
              aria-label={open ? "Close notifications" : unread ? `Notifications, ${unread} unread` : "Notifications"}
            >
              <span ref={bell} className="nbx-bell">
                <Remold.Icon
                  icon={<HugeiconsIcon icon={open ? Cancel01Icon : Notification03Icon} />}
                  strokeWidth={2}
                  spring={{ duration: 0.32, bounce: 0.08 }}
                  aria-hidden="true"
                />
              </span>
            </Popover.Trigger>

            <Popover.Portal container={shell}>
              <Popover.Positioner className="nbx-positioner" side="bottom" align="center">
                <Popover.Popup className="nbx-popup" initialFocus={false}>
                  <motion.div
                    ref={content}
                    className="nbx-content"
                    style={{ width }}
                    initial={still ? { opacity: 0 } : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={still ? { duration: 0.16 } : { ...SLIDE, delay: 0.06 }}
                  >
                    <header className="nbx-head">
                      <Popover.Title className="nbx-title">Notifications</Popover.Title>
                    </header>

                    <div className="nbx-tools">
                      <ToggleGroup
                        className="nbx-tabs"
                        aria-label="Show"
                        value={[inbox.tab]}
                        onValueChange={(next) => {
                          if (next[0]) setInbox((current) => ({ ...current, tab: next[0] as InboxTab }));
                        }}
                      >
                        {(["all", "unread"] as const).map((tab) => (
                          <Toggle key={tab} value={tab} className="nbx-tab">
                            {inbox.tab === tab && (
                              <motion.span layoutId={`${id}-tab`} className="nbx-tab-picked" transition={HIGHLIGHT} />
                            )}
                            <span className="nbx-tab-words">
                              {tab === "all" ? "All" : "Unread"}
                              {tab === "unread" && unread > 0 && (
                                <span className="nbx-tab-count">
                                  <Odometer value={String(unread)} />
                                </span>
                              )}
                            </span>
                          </Toggle>
                        ))}
                      </ToggleGroup>

                      <Button className="nbx-mark" disabled={!unread} focusableWhenDisabled onClick={markAllRead}>
                        <HugeiconsIcon icon={TickDouble02Icon} strokeWidth={2} />
                        Mark all read
                      </Button>
                    </div>

                    <LayoutGroup id={id}>
                      <ul className="nbx-list" onPointerLeave={() => setHighlighted(null)}>
                        <AnimatePresence initial mode="popLayout">
                          {entries.map((entry, index) =>
                            "heading" in entry ? (
                              <motion.li key={entry.heading} {...rise(still, 0.1 + index * 0.035)} className="nbx-day">
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
                          {entries.length === 0 && (
                            <motion.li key="caught-up" {...rise(still, 0.12)} className="nbx-empty">
                              <motion.span
                                className="nbx-empty-mark"
                                initial={still ? false : { scale: 0.5, rotate: -16 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", duration: 0.6, bounce: 0.45, delay: 0.15 }}
                              >
                                <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.2} />
                              </motion.span>
                              <b>You&apos;re all caught up</b>
                              <span>New notifications will show up here.</span>
                            </motion.li>
                          )}
                        </AnimatePresence>
                      </ul>
                    </LayoutGroup>
                  </motion.div>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </motion.div>
        </Popover.Root>

        {/* Over the bell's corner, outside the round shell so nothing clips it */}
        <AnimatePresence initial={false}>
          {!open && unread > 0 && (
            <motion.span
              className="nbx-badge"
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

// The docs demo: a short scripted scene that plays the element above. Your app doesn't need it.

const read = (notices: Notice[], ids: string[]) =>
  notices.map((notice) => (ids.includes(notice.id) ? { ...notice, read: true } : notice));

const WITH_NEW = [ARRIVING, ...NOTICES];
const ACCEPTED = WITH_NEW.map((notice) =>
  notice.id === "invite" ? { ...notice, invite: "accepted" as const, read: true } : notice,
);
// Marking all as read clears these, top to bottom
const CLEARING = ["mention", "comment", "deploy"];

const BEATS: readonly (InboxValue & { ms: number })[] = [
  { ...START, ms: 1200 },
  { ...START, notices: WITH_NEW, ms: 1300 },
  { ...START, open: true, notices: WITH_NEW, ms: 1900 },
  { ...START, open: true, notices: ACCEPTED, ms: 1600 },
  { ...START, open: true, tab: "unread", notices: ACCEPTED, ms: 1300 },
  ...CLEARING.map((_, index) => ({
    ...START,
    open: true,
    tab: "unread" as const,
    notices: read(ACCEPTED, CLEARING.slice(0, index + 1)),
    ms: index === CLEARING.length - 1 ? 1900 : 90,
  })),
  { ...START, open: true, notices: read(ACCEPTED, CLEARING), ms: 1700 },
  { ...START, notices: read(ACCEPTED, CLEARING), ms: 1300 },
];

const fromBeat = (step: number): InboxValue => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

export function NotificationInboxDemo({ playing = true }: { playing?: boolean } = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  return <NotificationInbox ref={scene.ref} value={scene.state} onValueChange={scene.onValueChange} />;
}
