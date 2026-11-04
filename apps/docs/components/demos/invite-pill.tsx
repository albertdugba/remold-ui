"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Mail01Icon } from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useRef, type FocusEvent, type FormEvent, type KeyboardEvent } from "react";
import { Frame } from "./frame";
import { typing, useScene } from "./use-scene";

/*
 * Who's on a file, and a way to add someone, in one pill. Invite opens into an email field beside
 * the faces; sending folds it back, and the person you invited joins the front of the stack.
 */

type Status = "idle" | "sent" | "invalid" | "taken";

interface State {
  open: boolean;
  draft: string;
  status: Status;
  /** Everyone on the file, newest first. */
  members: readonly string[];
  /** Who just joined, picked out until they settle in. */
  fresh: string | null;
}

const TEAM = ["kofi.boateng@acme.co", "esi.owusu@acme.co", "yaw.darko@acme.co"];
const NEWCOMER = "ama.mensah@acme.co";
const SHOWN = 4;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialsOf = (email: string) => {
  const words = email.split("@")[0]!.split(/[._+-]/).filter(Boolean);
  const letters = words.length > 1 ? words[0]![0]! + words[1]![0]! : (words[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
};

const REST: State = { open: false, draft: "", status: "idle", members: TEAM, fresh: null };

const BEATS: readonly (State & { ms: number })[] = [
  { ...REST, ms: 1500 },
  { ...REST, open: true, ms: 700 },
  ...typing(NEWCOMER, (draft) => ({ ...REST, open: true, draft }), { every: 45 }),
  { ...REST, open: true, draft: NEWCOMER, status: "sent" as const, ms: 800 },
  { ...REST, members: [NEWCOMER, ...TEAM], fresh: NEWCOMER, ms: 2600 },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

const SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.22 };
/** What arrives waits for the pill to start growing; what leaves goes quickly, before anything moves into its place. */
const ARRIVE = { ...SPRING, delay: 0.12 };
const LEAVE = { duration: 0.12 };
const ROUND = { borderRadius: 999 };
/** How long "Sent" shows before the field folds away, and how long a newcomer stays picked out. */
const SENT_FOR = 700;
const FRESH_FOR = 1600;

const LABELS: Record<Status, string> = {
  idle: "Send",
  sent: "Sent",
  invalid: "Check email",
  taken: "Already in",
};

interface InvitePillDemoProps {
  framed?: boolean;

  playing?: boolean;
}

export function InvitePillDemo({ framed = true, playing }: InvitePillDemoProps) {
  const { ref, state, take, live } = useScene(BEATS, fromBeat, playing);
  const input = useRef<HTMLInputElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { open, status, members } = state;
  const shown = members.slice(0, SHOWN);
  const extra = members.length - shown.length;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (open && !live) input.current?.focus({ preventScroll: true });
  }, [open, live]);

  const later = (ms: number, run: () => void) => timers.current.push(setTimeout(run, ms));

  const close = () => take((current) => ({ ...current, open: false, draft: "", status: "idle" }));

  const send = (event: FormEvent) => {
    event.preventDefault();
    if (status === "sent") return;
    const email = state.draft.trim().toLowerCase();
    if (!EMAIL.test(email)) return take((current) => ({ ...current, status: "invalid" }));
    if (members.includes(email)) return take((current) => ({ ...current, status: "taken" }));

    take((current) => ({ ...current, status: "sent" }));
    later(SENT_FOR, () =>
      take((current) => ({ ...REST, members: [email, ...current.members], fresh: email })),
    );
    later(SENT_FOR + FRESH_FOR, () =>
      take((current) => (current.fresh === email ? { ...current, fresh: null } : current)),
    );
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") close();
  };

  const closeWhenFocusLeaves = (event: FocusEvent<HTMLFormElement>) => {
    if (status === "sent") return;
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
  };

  const body = (
    <MotionConfig reducedMotion="user" transition={SPRING}>
      <section ref={ref} className="grid place-items-center font-sans" aria-label="People on this file">
        <motion.div
          layout
          className="group/invite flex items-center gap-2 bg-zinc-100 p-1.5 dark:bg-[#2c2c31]"
          style={ROUND}
          data-open={open || undefined}
          data-status={status}
        >
          <motion.ul layout className="relative m-0 flex list-none items-center p-0 pl-0.5" aria-label={`${members.length} people`}>
            <AnimatePresence initial={false} mode="popLayout">
              {shown.map((email, index) => (
                <motion.li
                  key={email}
                  layout
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1, transition: ARRIVE }}
                  exit={{ opacity: 0, scale: 0.5, transition: LEAVE }}
                  className="grid size-8 place-items-center rounded-full bg-zinc-300 text-[11px] font-semibold text-zinc-700 shadow-[0_0_0_2px_#f4f4f5] transition-[background-color,color] duration-700 not-first:-ml-2 group-data-open/invite:not-first:-ml-5 group-data-open/invite:not-first:text-transparent data-fresh:bg-green-600 data-fresh:text-white motion-reduce:transition-none dark:bg-[#4a4a52] dark:text-zinc-100 dark:shadow-[0_0_0_2px_#2c2c31] dark:data-fresh:bg-green-500 dark:data-fresh:text-zinc-950"
                  style={{ ...ROUND, zIndex: shown.length - index }}
                  data-fresh={email === state.fresh || undefined}
                  title={email}
                >
                  <span aria-hidden="true">{initialsOf(email)}</span>
                  <span className="sr-only">{email}</span>
                </motion.li>
              ))}
              {extra > 0 && !open && (
                <motion.li
                  key="extra"
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: ARRIVE }}
                  exit={{ opacity: 0, transition: LEAVE }}
                  style={ROUND}
                  className="-ml-2 grid h-8 min-w-8 place-items-center rounded-full bg-zinc-200 px-1.5 text-[11px] font-semibold text-zinc-600 shadow-[0_0_0_2px_#f4f4f5] dark:bg-[#3a3a40] dark:text-zinc-300 dark:shadow-[0_0_0_2px_#2c2c31]">
                  +{extra}
                </motion.li>
              )}
            </AnimatePresence>
          </motion.ul>

          <motion.form
            layout
            style={ROUND}
            className="relative flex h-9 items-center gap-2 bg-white pr-1 pl-3 text-[13.5px] font-medium text-zinc-900 shadow-[0_1px_2px_rgb(0_0_0/0.06)] has-[button[data-invite]:focus-visible]:outline-2 has-[button[data-invite]:focus-visible]:outline-offset-2 has-[button[data-invite]:focus-visible]:outline-zinc-900 group-data-open/invite:pr-1 dark:bg-[#3a3a40] dark:text-zinc-50 dark:has-[button[data-invite]:focus-visible]:outline-zinc-50"
            onSubmit={send}
            onBlur={open ? closeWhenFocusLeaves : undefined}
          >
            <motion.span layout="position" className="grid shrink-0">
              <Remold.Icon
                icon={<HugeiconsIcon icon={open ? Mail01Icon : Add01Icon} />}
                className="size-4 text-zinc-500 dark:text-zinc-400"
                strokeWidth={2}
                aria-hidden="true"
              />
            </motion.span>
            <AnimatePresence initial={false} mode="popLayout">
              {open ? (
                [
                  <motion.input
                    key="field"
                    layout="position"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)", transition: ARRIVE }}
                    exit={{ opacity: 0, transition: LEAVE }}
                    ref={input}
                    className="h-full w-44 min-w-0 bg-transparent text-[13.5px] font-normal outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                    type="text"
                    inputMode="email"
                    value={state.draft}
                    placeholder="Email address"
                    aria-label="Email address"
                    aria-invalid={status === "invalid" || status === "taken" || undefined}
                    autoComplete="off"
                    onChange={(event) => take((current) => ({ ...current, draft: event.target.value, status: "idle" }))}
                    onKeyDown={handleKeyDown}
                  />,
                  <motion.button
                    key="send"
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1, transition: { ...ARRIVE, delay: 0.18 } }}
                    exit={{ opacity: 0, transition: LEAVE }}
                    style={ROUND}
                    type="submit"
                    className="h-7 cursor-pointer bg-zinc-900 px-3 text-[12.5px] font-medium whitespace-nowrap text-white transition-colors duration-200 group-data-[status=invalid]/invite:bg-red-700 group-data-[status=sent]/invite:bg-green-600 group-data-[status=taken]/invite:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 motion-reduce:transition-none dark:bg-zinc-50 dark:text-[#232327] dark:group-data-[status=sent]/invite:bg-green-500 dark:focus-visible:outline-zinc-50"
                    aria-disabled={status === "sent" || undefined}
                  >
                    <motion.span layout="position" className="inline-block">
                      <Remold.Text>{LABELS[status]}</Remold.Text>
                    </motion.span>
                  </motion.button>,
                ]
              ) : (
                <motion.button
                  key="invite"
                  layout="position"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: ARRIVE }}
                  exit={{ opacity: 0, transition: LEAVE }}
                  type="button"
                  data-invite=""
                  className="cursor-pointer pr-2.5 outline-none after:absolute after:inset-0 after:rounded-full"
                  aria-expanded="false"
                  onClick={() => take((current) => ({ ...current, open: true, fresh: null }))}
                >
                  <Remold.Text>Invite</Remold.Text>
                </motion.button>
              )}
            </AnimatePresence>
          </motion.form>
        </motion.div>
        <p className="sr-only" aria-live="polite">
          {status === "sent" ? `Invite sent to ${state.draft}` : status === "invalid" ? "That doesn't look like an email" : status === "taken" ? "They're already on this file" : ""}
        </p>
      </section>
    </MotionConfig>
  );

  return framed ? <Frame>{body}</Frame> : body;
}
