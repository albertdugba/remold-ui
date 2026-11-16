"use client";

import { Avatar } from "@base-ui/react/avatar";
import { Button } from "@base-ui/react/button";
import { Dialog } from "@base-ui/react/dialog";
import { Field } from "@base-ui/react/field";
import { Delete02Icon, Folder01Icon, Invoice01Icon, Loading03Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { announce } from "@remold-ui/dom";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { typing, useScene } from "./use-scene";

const SURFACE = { type: "spring" as const, duration: 0.5, bounce: 0.12 };
const SETTLE = { type: "spring" as const, duration: 0.35, bounce: 0 };
const UNLOCK = { type: "spring" as const, duration: 0.45, bounce: 0.45 };
const SHAKE = { duration: 0.34, ease: "easeOut" as const };

const COLOURS = {
  light: { button: "#fdeceb", sheet: "#ffffff", bar: "#18181b" },
  dark: { button: "#3b2023", sheet: "#1f1f23", bar: "#fafafa" },
};

const TOKENS =
  "[--dla-ink:#0a0a0b] [--dla-muted:#6c6c75] [--dla-ghost:#a1a1aa] [--dla-surface:#ffffff] [--dla-well:#f4f4f5] [--dla-line:rgb(10_10_11/0.08)] [--dla-input-line:rgb(10_10_11/0.12)] [--dla-danger:#c8323a] [--dla-danger-tint:#fdeceb] [--dla-on-danger:#ffffff] dark:[--dla-ink:#fafafa] dark:[--dla-muted:#a1a1aa] dark:[--dla-ghost:#71717a] dark:[--dla-surface:#1f1f23] dark:[--dla-well:#2a2a2f] dark:[--dla-line:rgb(255_255_255/0.08)] dark:[--dla-input-line:rgb(255_255_255/0.14)] dark:[--dla-danger:#f87171] dark:[--dla-danger-tint:#3b2023] dark:[--dla-on-danger:#1f1f23]";

const SURFACE_CLASS = "pointer-events-none absolute inset-0";
const RING = "focus-visible:outline-hidden focus-visible:shadow-[0_0_0_2px_var(--dla-surface),0_0_0_4px_var(--dla-ink)]";
const BUTTON = `grid h-9 cursor-pointer place-items-center rounded-full border-0 px-4 font-sans text-[13.5px] font-semibold whitespace-nowrap transition-[background-color,color,scale] duration-150 ease-out not-disabled:active:scale-[0.97] disabled:cursor-default motion-reduce:transition-none ${RING}`;

function useColours() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.classList.contains("dark"));
    const observer = new MutationObserver(read);

    read();
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  return dark ? COLOURS.dark : COLOURS.light;
}

const matched = (typed: string, phrase: string) => {
  let count = 0;

  while (count < typed.length && count < phrase.length && typed[count] === phrase[count]) count++;

  return count;
};

type Glyph = typeof Delete02Icon;

export interface DeleteAccountDialogProps {
  phrase: string;
  detail: string;
  losses: readonly { icon: Glyph; text: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typed: string;
  onTypedChange: (typed: string) => void;
  deleting: boolean;
  onDelete: () => void;
  surface: number;
  container?: HTMLElement | null;
  modal?: boolean | "trap-focus";
  finalFocus?: RefObject<HTMLElement | null>;
}

export function DeleteAccountDialog({
  phrase,
  detail,
  losses,
  open,
  onOpenChange,
  typed,
  onTypedChange,
  deleting,
  onDelete,
  surface,
  container,
  modal = true,
  finalFocus,
}: DeleteAccountDialogProps) {
  const colours = useColours();
  const reduced = useReducedMotion();
  const id = useId();
  const field = useRef<HTMLInputElement>(null);
  const [shaker, shake] = useAnimate<HTMLSpanElement>();
  const right = matched(typed, phrase);
  const wrong = typed.length > right;
  const ready = typed === phrase;
  const left = phrase.length - right;
  const hint = wrong ? "That doesn’t match" : ready ? "That’s it" : `${left} ${left === 1 ? "character" : "characters"} to go`;

  useEffect(() => {
    if (!wrong || reduced || !shaker.current) return;

    shake(shaker.current, { x: [0, -7, 6, -4, 2, 0] }, SHAKE);
  }, [wrong, typed, reduced, shake, shaker]);

  const fade = (delay = 0) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.12 } }
      : {
          initial: { opacity: 0, y: 6, filter: "blur(4px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          transition: { ...SETTLE, delay },
        };

  const label = (
    <AnimatePresence initial={false} mode="popLayout">
      {deleting ? (
        <motion.span
          key="spinner"
          className="grid place-items-center [&_svg]:size-4 [&_svg]:animate-spin motion-reduce:[&_svg]:[animation-duration:2.4s]"
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, filter: "blur(3px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0 }}
          transition={SETTLE}
        >
          <HugeiconsIcon icon={Loading03Icon} strokeWidth={2.2} aria-hidden="true" />
        </motion.span>
      ) : (
        <motion.span key="label" exit={{ opacity: 0, filter: "blur(3px)" }} transition={SETTLE}>
          Delete account
        </motion.span>
      )}
    </AnimatePresence>
  );

  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)} modal={modal}>
      <Dialog.Trigger
        className={`relative inline-grid h-9 cursor-pointer place-items-center rounded-full border-0 bg-transparent px-4 font-sans text-[13.5px] font-semibold text-(--dla-danger) ${RING}`}
      >
        {!open && (
          <motion.span
            layoutId={`dla-surface-${surface}`}
            className={SURFACE_CLASS}
            initial={false}
            style={{ borderRadius: 999, backgroundColor: colours.button }}
            transition={reduced ? { duration: 0 } : SURFACE}
          />
        )}
        <motion.span
          className="relative whitespace-nowrap"
          initial={false}
          animate={{ opacity: open ? 0 : 1 }}
          transition={{ duration: open ? 0.08 : 0.2, delay: open ? 0 : 0.18 }}
        >
          Delete account
        </motion.span>
      </Dialog.Trigger>

      <Dialog.Portal container={container}>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-[rgb(10_10_11/0.18)] backdrop-blur-[2px] transition-[opacity,backdrop-filter] duration-300 ease-out in-data-dla-stage:absolute in-data-dla-stage:-inset-[2000px] in-data-dla-stage:bg-[rgb(10_10_11/0.14)] data-ending-style:opacity-0 data-ending-style:backdrop-blur-none data-starting-style:opacity-0 data-starting-style:backdrop-blur-none motion-reduce:transition-opacity motion-reduce:duration-150" />
        <Dialog.Popup
          className="fixed inset-0 z-41 m-auto h-fit w-[min(400px,calc(100%-32px))] font-sans text-(--dla-ink) outline-none in-data-dla-stage:absolute"
          aria-describedby={`${id}-description`}
          initialFocus={modal ? field : false}
          finalFocus={finalFocus}
        >
          <motion.span
            layoutId={`dla-surface-${surface}`}
            className={`${SURFACE_CLASS} shadow-[0_0_0_1px_var(--dla-line),0_2px_4px_rgb(0_0_0/0.04),0_24px_48px_-16px_rgb(0_0_0/0.22)]`}
            animate={{ backgroundColor: [colours.button, colours.sheet] }}
            style={{ borderRadius: 28 }}
            transition={reduced ? { duration: 0 } : { ...SURFACE, backgroundColor: { duration: 0.25 } }}
          />
          <AnimatePresence>
            <form
              key="form"
              className="relative grid gap-[18px] p-5"
              onSubmit={(event) => {
                event.preventDefault();

                if (ready && !deleting) onDelete();
              }}
            >
              <motion.div className="flex items-start gap-3" {...fade(0.22)}>
                <span
                  className="grid size-[38px] flex-none place-items-center rounded-[14px] bg-(--dla-danger-tint) text-(--dla-danger) [&_svg]:size-[19px]"
                  aria-hidden="true"
                >
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.8} />
                </span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <Dialog.Title className="m-0 text-[15px] font-semibold tracking-[-0.01em]">Delete your account?</Dialog.Title>
                  <Dialog.Description id={`${id}-description`} className="m-0 text-[13px] leading-[1.45] text-(--dla-muted)">
                    {detail}
                  </Dialog.Description>
                </span>
              </motion.div>

              <motion.ul className="m-0 grid list-none gap-0.5 rounded-2xl bg-(--dla-well) p-1.5" {...fade(0.25)}>

                {losses.map((loss) => (

                  <li key={loss.text} className="flex h-8 items-center gap-2.5 px-2 text-[13px] [&_svg]:size-4 [&_svg]:flex-none [&_svg]:text-(--dla-muted)">

                    <HugeiconsIcon icon={loss.icon} strokeWidth={1.8} aria-hidden="true" />

                    {loss.text}

                  </li>

                ))}

              </motion.ul>


              <motion.div {...fade(0.28)}>
                <Field.Root className="grid gap-[7px]" invalid={wrong}>
                  <Field.Label className="text-[13px] font-medium text-(--dla-ink)">
                    Type <b className="font-semibold">{phrase}</b> to confirm
                  </Field.Label>
                  <motion.span ref={shaker} className="relative grid">
                    <span
                      data-wrong={wrong || undefined}
                      className="pointer-events-none absolute inset-0 flex items-center px-[13.8px] text-[15px] text-(--dla-ghost) transition-opacity duration-150 ease-out data-wrong:opacity-0 motion-reduce:transition-none"
                      aria-hidden="true"
                    >
                      {phrase}
                    </span>
                    <Field.Control
                      ref={field}
                      className="relative h-11 rounded-2xl border-[1.8px] border-solid border-(--dla-input-line) bg-transparent px-3 font-sans text-[15px] text-(--dla-ink) outline-none transition-[border-color,color] duration-[180ms] ease-out focus:border-(--dla-ink) data-invalid:border-(--dla-danger) data-invalid:text-(--dla-danger) motion-reduce:transition-none"
                      inputMode="email"
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={typed}
                      readOnly={deleting}
                      onChange={(event) => onTypedChange(event.target.value)}
                    />
                  </motion.span>
                  <Field.Description
                    data-wrong={wrong || undefined}
                    className="m-0 h-[18px] text-[12.5px] leading-[18px] text-(--dla-muted) transition-[color] duration-150 ease-out data-wrong:text-(--dla-danger) motion-reduce:transition-none"
                  >
                    <Remold.Text className="inline-block whitespace-nowrap">{hint}</Remold.Text>
                  </Field.Description>
                </Field.Root>
              </motion.div>

              <motion.div className="flex justify-end gap-2 pt-0.5" {...fade(0.31)}>
                <Dialog.Close
                  className={`${BUTTON} min-w-[78px] bg-transparent text-(--dla-muted) enabled:hover:bg-(--dla-well) enabled:hover:text-(--dla-ink)`}
                  disabled={deleting}
                >
                  Cancel
                </Dialog.Close>
                <motion.span className="grid" initial={false} animate={{ scale: ready ? [0.94, 1] : 1 }} transition={UNLOCK}>
                  <Button
                    type="submit"
                    className={`${BUTTON} relative min-w-[138px] overflow-hidden bg-(--dla-danger-tint) text-(--dla-danger) aria-busy:cursor-progress`}
                    disabled={!ready}
                    aria-busy={deleting || undefined}
                    aria-disabled={deleting || undefined}
                    aria-label={deleting ? "Deleting" : "Delete account"}
                  >
                    <span className="relative grid place-items-center" aria-hidden="true">
                      Delete account
                    </span>
                    <motion.span
                      className="absolute inset-0 grid place-items-center bg-(--dla-danger) text-(--dla-on-danger)"
                      initial={false}
                      animate={{ clipPath: `inset(0% ${((1 - right / phrase.length) * 100).toFixed(2)}% 0% 0%)` }}
                      transition={reduced ? { duration: 0 } : SETTLE}
                      aria-hidden="true"
                    >
                      {label}
                    </motion.span>
                  </Button>
                </motion.span>
              </motion.div>
            </form>
          </AnimatePresence>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export interface UndoBarProps {
  children: string;
  seconds: number;
  surface: number;
  onUndo: () => void;
  ref?: RefObject<HTMLButtonElement | null>;
}

export function UndoBar({ children, seconds, surface, onUndo, ref }: UndoBarProps) {
  const colours = useColours();
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="relative w-[min(340px,calc(100%-32px))] font-sans text-(--dla-surface)"
      role="status"
      exit={{ opacity: 0, y: 8, filter: "blur(4px)", transition: SETTLE }}
    >
      <motion.span
        layoutId={`dla-surface-${surface}`}
        className={`${SURFACE_CLASS} shadow-[0_8px_24px_rgb(0_0_0/0.18)]`}
        initial={false}
        animate={{ backgroundColor: [colours.sheet, colours.bar] }}
        style={{ borderRadius: 16 }}
        transition={reduced ? { duration: 0 } : { ...SURFACE, backgroundColor: { duration: 0.3 } }}
      />
      <motion.div
        className="relative flex h-[52px] items-center gap-3 pr-2 pl-4"
        initial={reduced ? { opacity: 0 } : { opacity: 0, filter: "blur(4px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ ...SETTLE, delay: 0.26 }}
      >
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{children}</span>
        <button
          ref={ref}
          type="button"
          onClick={onUndo}
          className="flex h-9 flex-none cursor-pointer items-center gap-2 rounded-full border-0 bg-[color-mix(in_srgb,var(--dla-surface)_16%,transparent)] pr-3.5 pl-2.5 font-sans text-[13px] font-semibold text-(--dla-surface) transition-[background-color,scale] duration-150 ease-out hover:bg-[color-mix(in_srgb,var(--dla-surface)_24%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--dla-surface) active:scale-[0.97] motion-reduce:transition-none"
        >
          <svg viewBox="0 0 20 20" className="size-4 -rotate-90" aria-hidden="true">
            <circle cx="10" cy="10" r="7.5" fill="none" strokeWidth="2.4" className="stroke-current opacity-25" />
            <motion.circle
              cx="10"
              cy="10"
              r="7.5"
              fill="none"
              strokeWidth="2.4"
              strokeLinecap="round"
              className="stroke-current"
              initial={{ pathLength: 1 }}
              animate={{ pathLength: 0 }}
              transition={{ duration: seconds, ease: "linear" }}
            />
          </svg>
          Undo
        </button>
      </motion.div>
    </motion.div>
  );
}

const PERSON = "Elorm Kpodo";
const EMAIL = "elorm@remold.app";
const FACE = `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(PERSON)}&backgroundColor=f1f1f3`;
const DETAIL = "You’ll be signed out everywhere, and this goes with you. It can’t be brought back.";
const LOSSES = [
  { icon: Folder01Icon, text: "3 projects and their deployments" },
  { icon: UserGroupIcon, text: "Your place in 2 teams" },
  { icon: Invoice01Icon, text: "Billing history and invoices" },
];
const REQUEST = 900;
const UNDO_SECONDS = 6;

interface State {
  open: boolean;
  typed: string;
  deleting: boolean;
  account: "here" | "deleted" | "gone";
  surface: number;
}

const HERE: State = { open: false, typed: "", deleting: false, account: "here", surface: 0 };
const OPEN: State = { ...HERE, open: true };
const TYPED: State = { ...OPEN, typed: EMAIL };

const BEATS: readonly (State & { ms: number })[] = [
  { ...HERE, ms: 1500 },
  { ...OPEN, ms: 1000 },
  ...typing(EMAIL, (typed) => ({ ...OPEN, typed }), { every: 80, hold: 700 }),
  { ...TYPED, deleting: true, ms: REQUEST },
  { ...HERE, account: "deleted", surface: 1, ms: 3400 },
];

const fromBeat = (step: number): State => {
  const { ms: _ms, ...state } = BEATS[step]!;

  return state;
};

const STILL: State = { ...OPEN, typed: "elorm@rem" };

interface DeleteAccountDemoProps {
  playing?: boolean;
  preview?: boolean;
}

export function DeleteAccountDemo({ playing, preview: previewing }: DeleteAccountDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing, false, previewing ? STILL : undefined);
  const preview = previewing && !scene.taken;
  const { ref, takeOver, live } = scene;
  const state = scene.state;
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const [modal, setModal] = useState(false);
  const undo = useRef<HTMLButtonElement>(null);
  const settled = useRef(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (live || preview || !state.deleting) return;

    const timer = setTimeout(() => {
      takeOver((current) => ({ ...HERE, account: "deleted", surface: current.surface + 1 }));
      announce(`Account deleted. Undo is available for ${UNDO_SECONDS} seconds.`);
    }, REQUEST);

    return () => clearTimeout(timer);
  }, [state.deleting, live, preview, takeOver]);

  useEffect(() => {
    if (live || preview || state.account !== "deleted") return;

    const timer = setTimeout(() => takeOver((current) => ({ ...current, account: "gone" })), UNDO_SECONDS * 1000);

    return () => clearTimeout(timer);
  }, [state.account, live, preview, takeOver]);

  const restore = () => {
    takeOver((current) => ({ ...HERE, surface: current.surface + 1 }));
    announce("Account restored");
  };

  useEffect(() => {
    settled.current = true;
  }, []);

  const arrive = {
    initial: !settled.current ? false : reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, filter: "blur(4px)" },
    animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  };

  return (
    <MotionConfig reducedMotion="user">
      <div ref={ref} className="not-prose grid w-full place-items-center font-sans antialiased">
        <div
          ref={setStage}
          data-dla-stage=""
          className={`relative grid min-h-[500px] w-full place-items-center text-[14px] text-(--dla-ink) ${TOKENS}`}
        >
          <LayoutGroup>
            <section className="grid h-[164px] w-[min(100%,400px)] rounded-[24px] bg-(--dla-surface) p-5" aria-label="Account">
              {state.account === "here" ? (
                <motion.div key="here" className="grid content-between" {...arrive} transition={SETTLE}>
                  <div className="flex items-center gap-3">
                    <Avatar.Root className="grid size-10 flex-none place-items-center overflow-hidden rounded-full bg-(--dla-well) text-[14px] font-semibold text-(--dla-ink)">
                      <Avatar.Image src={FACE} alt="" width={40} height={40} className="size-full object-cover" draggable={false} />
                      <Avatar.Fallback delay={400}>EK</Avatar.Fallback>
                    </Avatar.Root>
                    <span className="grid min-w-0 leading-[1.3]">
                      <span className="truncate text-[15px] font-semibold tracking-[-0.01em]">{PERSON}</span>
                      <span className="truncate text-[13px] text-(--dla-muted)">{EMAIL}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="grid min-w-0 flex-1 leading-[1.35]">
                      <span className="text-[14px] font-medium">Delete account</span>
                      <span className="truncate text-[12.5px] text-(--dla-muted)">Your projects and data go with it.</span>
                    </span>
                    <span onPointerDownCapture={() => setModal(true)} onKeyDownCapture={() => setModal(true)} onClickCapture={() => setModal(true)}>
                      <DeleteAccountDialog
                        phrase={EMAIL}
                        detail={DETAIL}
                        losses={LOSSES}
                        open={state.open}
                        onOpenChange={(open) => takeOver((current) => ({ ...current, open, typed: "", deleting: false }))}
                        typed={state.typed}
                        onTypedChange={(typed) => takeOver((current) => ({ ...current, typed }))}
                        deleting={state.deleting}
                        onDelete={() => takeOver((current) => ({ ...current, deleting: true }))}
                        surface={state.surface}
                        container={stage}
                        modal={modal && "trap-focus"}
                        finalFocus={undo}
                      />
                    </span>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="empty" className="grid place-content-center justify-items-center gap-1 text-center" {...arrive} transition={SETTLE}>
                  <span className="text-[15px] font-semibold tracking-[-0.01em]">You’re signed out</span>
                  <span className="text-[13px] text-(--dla-muted)">
                    <Remold.Text className="inline-block whitespace-nowrap">{state.account === "deleted" ? "Your account was deleted just now." : "Your account is gone for good."}</Remold.Text>
                  </span>
                  {state.account === "gone" && (
                    <motion.button
                      type="button"
                      onClick={restore}
                      className={`${BUTTON} mt-2 bg-(--dla-well) text-(--dla-ink)`}
                      initial={reduced ? { opacity: 0 } : { opacity: 0, filter: "blur(4px)" }}
                      animate={{ opacity: 1, filter: "blur(0px)" }}
                      transition={SETTLE}
                    >
                      Start again
                    </motion.button>
                  )}
                </motion.div>
              )}
            </section>

            <div className="pointer-events-none absolute inset-x-0 bottom-5 grid justify-items-center *:pointer-events-auto">
              <AnimatePresence initial={false}>
                {state.account === "deleted" && (
                  <UndoBar key={state.surface} ref={undo} seconds={UNDO_SECONDS} surface={state.surface - 1} onUndo={restore}>
                    Account deleted
                  </UndoBar>
                )}
              </AnimatePresence>
            </div>
          </LayoutGroup>
        </div>
      </div>
    </MotionConfig>
  );
}
