"use client";

import { Popover } from "@base-ui/react/popover";
import { Tooltip } from "@base-ui/react/tooltip";
import { ArrowUp02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { announce } from "@remold-ui/dom";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { Fragment, useCallback, useEffect, useId, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode, type RefObject } from "react";

import {
  avatarUrl,
  initialMentionsState,
  matchingPeople,
  mentionedIds,
  notificationLabel,
  personById,
  reduceMentions,
  type MentionPerson,
  type MentionPost,
  type MentionSegment,
  type MentionsAction,
  type MentionsState,
} from "./editor-mentions.model";

const POP = { type: "spring" as const, duration: 0.4, bounce: 0.3 };
const FLY = { type: "spring" as const, duration: 0.55, bounce: 0.2 };
const RISE = { type: "spring" as const, duration: 0.5, bounce: 0.18 };
const SLIDE = { type: "spring" as const, duration: 0.3, bounce: 0.1 };
const HIGHLIGHT = { type: "spring" as const, duration: 0.25, bounce: 0.1 };
const OPEN = { type: "spring" as const, duration: 0.35, bounce: 0 };

const SWAP = {
  initial: { opacity: 0, y: 6, filter: "blur(3px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -6, filter: "blur(3px)" },
  transition: { duration: 0.2 },
};

const YOU = "Yaw Darko";

const firstName = (personId: string) => personById(personId).name.split(" ")[0]!;

const TOKENS = [
  "[--em-surface:#ffffff] [--em-well:#f2f2f4] [--em-line:#e6e6ea] [--em-ink:#1b1c21] [--em-text:#3c3e45] [--em-muted:#6b6e76] [--em-quiet:#9a9ca3]",
  "[--em-accent:#5e6ad2] [--em-accent-hover:#5461c8] [--em-chip:rgb(94_106_210/0.12)] [--em-chip-ink:#4450b8] [--em-code:rgb(27_28_33/0.06)] [--em-review:#26b5ce] [--em-review-soft:rgb(38_181_206/0.12)] [--em-review-ink:#0e7490]",
  "dark:[--em-surface:#16171b] dark:[--em-well:#26272d] dark:[--em-line:#2a2b31] dark:[--em-ink:#f2f2f4] dark:[--em-text:#d5d6db] dark:[--em-muted:#9a9ca5] dark:[--em-quiet:#6f717a]",
  "dark:[--em-accent:#7480e6] dark:[--em-accent-hover:#828deb] dark:[--em-chip:rgb(116_128_230/0.2)] dark:[--em-chip-ink:#c3c8f7] dark:[--em-code:rgb(255_255_255/0.08)] dark:[--em-review-soft:rgb(38_181_206/0.18)] dark:[--em-review-ink:#67e8f9]",
  "font-sans",
].join(" ");

const FOCUS = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--em-accent)";
const COMPOSER_KEY = "inline-grid h-[18px] min-w-[18px] place-items-center rounded-[5px] bg-(--em-well) px-1 font-sans text-[10.5px] font-medium text-(--em-muted)";
const TIP_KEY = "inline-grid h-4 min-w-4 place-items-center rounded-[4px] bg-white/15 px-[3px] text-[10.5px]";

const MENU_PANEL =
  "w-[272px] origin-(--transform-origin) overflow-hidden rounded-[16px] bg-white/70 p-1.5 font-sans text-[#1b1c21] antialiased shadow-[inset_0_0_0_1px_rgb(255_255_255/0.7),0_0_0_0.5px_rgb(0_0_0/0.08),0_1px_2px_rgb(0_0_0/0.05),0_16px_36px_-16px_rgb(0_0_0/0.22)] backdrop-blur-xl backdrop-saturate-[1.8] outline-none transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0 motion-reduce:transition-opacity dark:bg-[#1c1c1f]/70 dark:text-[#fafafa] dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08),0_0_0_0.5px_rgb(0_0_0/0.4),0_16px_36px_-16px_rgb(0_0_0/0.6)]";
const MENU_KEY = "grid h-[20px] min-w-[20px] place-items-center rounded-[6px] bg-black/[0.055] dark:bg-white/[0.08] px-1 text-[11px] font-medium text-(--em-muted)";

function useTypedInput(editor: RefObject<HTMLDivElement | null>, dispatch: (action: MentionsAction) => void) {
  const latest = useRef(dispatch);
  latest.current = dispatch;

  useEffect(() => {
    const element = editor.current;
    if (!element) return;

    const onBeforeInput = (event: InputEvent) => {
      event.preventDefault();
      const { inputType, data } = event;

      if (inputType === "insertText" && data) {
        for (const character of data) latest.current({ type: "type", character });
      } else if (inputType.startsWith("deleteContentBackward") || inputType === "deleteWordBackward") {
        latest.current({ type: "backspace" });
      } else if (inputType === "insertParagraph" || inputType === "insertLineBreak") {
        latest.current({ type: "send" });
      }
    };

    element.addEventListener("beforeinput", onBeforeInput);
    return () => element.removeEventListener("beforeinput", onBeforeInput);
  }, [editor]);
}

function Avatar({ name, size, layoutId, ring }: { name: string; size: number; layoutId?: string; ring?: string }) {
  return (
    <motion.img
      src={avatarUrl(name)}
      alt=""
      width={size}
      height={size}
      draggable={false}
      layoutId={layoutId}
      transition={FLY}
      className="block flex-none rounded-full"
      style={{ width: size, height: size, boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}
    />
  );
}

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`)/g;

function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(INLINE).map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={index}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2)
          return (
            <code key={index} className="rounded-[5px] bg-(--em-code) px-[5px] py-px font-mono text-[12.5px]">
              {part.slice(1, -1)}
            </code>
          );
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </>
  );
}

function StatusIcon() {
  return (
    <span aria-hidden="true" className="relative grid size-3.5 flex-none place-items-center rounded-full border-[1.5px] border-solid border-(--em-review)">
      <span className="size-[7px] rounded-full bg-[conic-gradient(var(--em-review)_0_75%,transparent_0)]" />
    </span>
  );
}

function IssueHeader() {
  return (
    <header className="grid gap-1.5 border-0 border-b border-solid border-(--em-line) pb-4">
      <span className="flex items-center gap-2 text-[12.5px] font-medium text-(--em-muted)">
        <span className="tabular-nums">PAY-482</span>
        <span aria-hidden="true" className="text-(--em-quiet)">·</span>
        <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-(--em-review-soft) pr-2 pl-1.5 text-(--em-review-ink)">
          <StatusIcon />
          In Review
        </span>
      </span>
      <h3 className="m-0 text-[19px] leading-[1.3] font-semibold tracking-[-0.02em] text-(--em-ink)">Add Apple Pay to checkout</h3>
    </header>
  );
}

function Comment({ post }: { post: MentionPost }) {
  return (
    <motion.li
      layout="position"
      className="flex origin-bottom-left gap-3"
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={RISE}
    >
      <Avatar name={post.who === "You" ? YOU : post.who} size={26} />
      <div className="min-w-0 flex-1">
        <p className="m-0 flex items-baseline gap-2 text-[13px] leading-[26px]">
          <b className="font-semibold text-(--em-ink)">{post.who}</b>
          <time className="text-[12px] text-(--em-quiet)">{post.when}</time>
        </p>
        <p className="m-0 text-[14px] leading-[1.6] text-(--em-text)">
          <Segments segs={post.segs} rich />
        </p>
      </div>
    </motion.li>
  );
}

const NEAR_BOTTOM = 24;

function useStickToBottom(lastId: string | undefined) {
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const glide = useRef(false);
  const firstId = useRef(lastId);

  useEffect(() => {
    if (lastId === firstId.current) return;
    pinned.current = true;
    glide.current = true;
  }, [lastId]);

  const content = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(() => {
      const element = scroller.current;
      if (!element || !pinned.current) return;
      element.scrollTo({ top: element.scrollHeight, behavior: glide.current ? "smooth" : "instant" });
      glide.current = false;
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const onScroll = () => {
    const element = scroller.current;
    if (element) pinned.current = element.scrollHeight - element.clientHeight - element.scrollTop < NEAR_BOTTOM;
  };

  return { scroller, content, onScroll };
}

function Conversation({ posts }: { posts: MentionPost[] }) {
  const { scroller, content, onScroll } = useStickToBottom(posts.at(-1)?.id);

  return (
    <div className="relative -mx-1 my-1">
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-linear-to-b from-(--em-surface) to-transparent" />
      <div
        ref={scroller}
        tabIndex={0}
        aria-label="Conversation"
        onScroll={onScroll}
        className="flex h-[300px] flex-col overflow-y-auto overscroll-contain [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--em-accent) [&::-webkit-scrollbar]:hidden"
      >
        <ol ref={content} className="m-0 mt-auto grid list-none gap-5 px-1 pt-6 pb-4">
          <AnimatePresence initial={false} mode="popLayout">
            {posts.map((post) => (
              <Comment key={post.id} post={post} />
            ))}
          </AnimatePresence>
        </ol>
      </div>
    </div>
  );
}

function NotifyLine({ notified }: { notified: string[] }) {
  return (
    <span className="inline-grid min-w-0 text-[12px] text-(--em-muted)">
      <AnimatePresence initial={false} mode="popLayout">
        {notified.length ? (
          <motion.span key="who" className="inline-flex min-w-0 items-center gap-2 whitespace-nowrap" {...SWAP}>
            <span className="inline-flex flex-none">
              <AnimatePresence initial={false}>
                {notified.map((personId) => (
                  <motion.span
                    key={personId}
                    className="-mr-1 last:mr-0"
                    layout="position"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ ...POP, delay: 0.35 }}
                  >
                    <Avatar name={personById(personId).name} size={18} ring="var(--em-surface)" />
                  </motion.span>
                ))}
              </AnimatePresence>
            </span>
            <span className="min-w-0 truncate">
              <span className="font-medium text-(--em-text)">{notificationLabel(notified.map(firstName))}</span> will be notified
            </span>
          </motion.span>
        ) : (
          <motion.span key="hint" className="inline-flex min-w-0 items-center gap-1 whitespace-nowrap text-(--em-quiet)" {...SWAP}>
            <kbd className={COMPOSER_KEY}>@</kbd> to mention · <kbd className={COMPOSER_KEY}>↵</kbd> to send
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function SendButton({ disabled, onSend }: { disabled: boolean; onSend: () => void }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        aria-label="Comment"
        className={`grid size-7 flex-none cursor-pointer place-items-center rounded-full border-0 bg-(--em-accent) p-0 text-white transition-[background-color,color] duration-150 ease-out hover:bg-(--em-accent-hover) disabled:cursor-default disabled:bg-(--em-well) disabled:text-(--em-quiet) ${FOCUS}`}
        render={
          <motion.button
            type="button"
            disabled={disabled}
            initial={false}
            animate={{ scale: disabled ? 0.88 : 1 }}
            transition={POP}
            whileTap={disabled ? undefined : { scale: 0.94 }}
            onPointerDown={(event) => event.preventDefault()}
          />
        }
        onClick={onSend}
      >
        <HugeiconsIcon icon={ArrowUp02Icon} size={15} strokeWidth={2.2} aria-hidden="true" />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={8}>
          <Tooltip.Popup className="inline-flex origin-(--transform-origin) items-center gap-1 rounded-[7px] bg-[#1b1c21] px-2 py-[5px] font-sans text-[12px] font-medium text-white transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-90 data-ending-style:opacity-0 data-starting-style:scale-90 data-starting-style:opacity-0 motion-reduce:transition-none">
            Comment <kbd className={TIP_KEY}>⌘</kbd>
            <kbd className={TIP_KEY}>↵</kbd>
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

interface PickerProps {
  open: boolean;
  anchor: RefObject<HTMLSpanElement | null>;
  container: HTMLElement | null;
  query: string;
  people: MentionPerson[];
  alreadyTagged: boolean;
  active: number;
  listId: string;
  layoutPrefix: string;
  avatarLayoutKey: string;
  onDismiss: () => void;
  onHighlight: (index: number) => void;
  onPick: (personId: string) => void;
}

function PeoplePicker({ open, anchor, container, query, people, alreadyTagged, active, listId, layoutPrefix, avatarLayoutKey, onDismiss, onHighlight, onPick }: PickerProps) {
  return (
    <Popover.Root open={open} onOpenChange={(next) => !next && open && onDismiss()} modal={false}>
      <Popover.Portal container={container}>
        <Popover.Positioner className="z-20" anchor={anchor} side="top" align="start" sideOffset={10} collisionPadding={8}>
          <Popover.Popup className={MENU_PANEL} initialFocus={false} finalFocus={false}>
            <p className="m-0 truncate px-2.5 pt-1.5 pb-1.5 text-[12px] font-medium text-(--em-muted)">{query ? <>People matching “{query}”</> : "Mention a teammate"}</p>

            <ul id={listId} role="listbox" aria-label="People" className="m-0 grid list-none p-0">
              <AnimatePresence initial={false} mode="popLayout">
                {people.map((person, index) => {
                  const highlighted = index === active;
                  return (
                    <motion.li
                      key={person.id}
                      id={`${listId}-${person.id}`}
                      role="option"
                      aria-selected={highlighted}
                      className="relative flex h-9 cursor-default items-center gap-2.5 rounded-[11px] px-2"
                      layout="position"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, transition: { duration: 0.1 } }}
                      transition={SLIDE}
                      onPointerDown={(event) => event.preventDefault()}
                      onPointerEnter={(event) => event.pointerType === "mouse" && !highlighted && onHighlight(index)}
                      onClick={() => onPick(person.id)}
                    >
                      {highlighted && <motion.span layoutId={`${layoutPrefix}-highlight`} className="absolute inset-0 rounded-[inherit] bg-black/[0.055] dark:bg-white/[0.08]" transition={HIGHLIGHT} />}

                      <span className="relative grid flex-none">
                        <Avatar name={person.name} size={24} layoutId={`${layoutPrefix}-${person.id}-${avatarLayoutKey}`} />
                        {person.online && <i className="absolute -right-px -bottom-px size-2 rounded-full bg-[#4cb782] shadow-[0_0_0_2px_var(--em-surface)]" aria-hidden="true" />}
                      </span>

                      <span className="relative flex min-w-0 flex-1 items-baseline gap-2">
                        <span className="truncate text-[13.5px] font-medium text-(--em-text) [&_mark]:bg-transparent [&_mark]:font-semibold [&_mark]:text-(--em-ink)">
                          <Matched name={person.name} query={query} />
                        </span>
                        <span className="truncate text-[12px] text-(--em-muted)">{person.role}</span>
                        {person.online && <span className="sr-only">Online</span>}
                      </span>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>

            <p className={people.length ? "sr-only" : "m-0 px-2.5 py-3 text-[13px] text-(--em-muted)"} role="status">
              {people.length ? "" : alreadyTagged ? "Already mentioned in this comment" : `No one called “${query}”`}
            </p>

            <div aria-hidden="true" className="-mx-1.5 mt-1.5 h-px bg-black/[0.06] dark:bg-white/[0.08]" />
            <p aria-hidden="true" className="m-0 flex items-center gap-3 px-2.5 pt-2 pb-1 text-[11.5px] text-(--em-muted)">
              <span className="flex items-center gap-1">
                <kbd className={MENU_KEY}>↑</kbd>
                <kbd className={MENU_KEY}>↓</kbd>
                move
              </span>
              <span className="flex items-center gap-1">
                <kbd className={MENU_KEY}>↵</kbd>
                mention
              </span>
              <span className="flex items-center gap-1">
                <kbd className={MENU_KEY}>esc</kbd>
                close
              </span>
            </p>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export interface EditorMentionsProps {
  state?: MentionsState;
  defaultState?: MentionsState;
  onStateChange?: (state: MentionsState) => void;
  onInteraction?: () => void;
}

export function EditorMentions({ state: controlledState, defaultState = initialMentionsState, onStateChange, onInteraction }: EditorMentionsProps) {
  const [uncontrolledState, setUncontrolledState] = useState(defaultState);
  const [focused, setFocused] = useState(false);
  const [card, setCard] = useState<HTMLElement | null>(null);
  const editor = useRef<HTMLDivElement>(null);
  const token = useRef<HTMLSpanElement>(null);
  const id = useId();

  const isControlled = controlledState !== undefined;
  const state = controlledState ?? uncontrolledState;
  const latest = useRef(state);
  latest.current = state;
  const pickerOpen = state.query !== null;
  const notified = mentionedIds(state.segs);
  const people = pickerOpen ? matchingPeople(state.query!, notified) : [];
  const alreadyTagged = pickerOpen && !people.length && matchingPeople(state.query!).length > 0;
  const listId = `${id}-people`;
  const empty = !state.segs.length;
  const composing = focused || !empty || pickerOpen;

  const setState = (next: MentionsState) => {
    latest.current = next;
    if (!isControlled) setUncontrolledState(next);
    onStateChange?.(next);
  };

  const dispatch = (action: MentionsAction) => {
    onInteraction?.();
    const before = latest.current;
    const next = reduceMentions(before, action);
    const picked = next.made > before.made ? next.segs.at(-2) : undefined;
    if (picked?.kind === "mention") announce(`${firstName(picked.id)} will be notified`);
    if (next.posts !== before.posts) announce("Comment posted");
    setState(next);
  };

  const setActive = (active: number) => {
    onInteraction?.();
    setState({ ...latest.current, active });
  };

  useTypedInput(editor, dispatch);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      dispatch({ type: "send" });
      return;
    }

    if (pickerOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      dispatch({ type: "move", direction: event.key === "ArrowDown" ? 1 : -1 });
    } else if (pickerOpen && (event.key === "Enter" || event.key === "Tab")) {
      event.preventDefault();
      if (people.length) dispatch({ type: "pick" });
    } else if (event.key === "Enter") {
      event.preventDefault();
      dispatch({ type: "send" });
    } else if (event.key === "Escape" && pickerOpen) {
      event.preventDefault();
      dispatch({ type: "dismiss" });
    }
  };

  const onPaste = (event: ClipboardEvent) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text").replace(/\s+/g, " ");
    onInteraction?.();
    setState([...text].reduce((next, character) => reduceMentions(next, { type: "type", character }), latest.current));
  };

  const send = () => {
    const keyboard = document.activeElement?.matches(":focus-visible");
    dispatch({ type: "send" });
    if (keyboard) editor.current?.focus();
  };

  return (
    <MotionConfig reducedMotion="user">
      <Tooltip.Provider delay={400}>
        <LayoutGroup id={id}>
          <article ref={setCard} className={`not-prose relative grid w-[min(100%,460px)] rounded-[20px] bg-(--em-surface) px-6 pt-5 pb-5 text-(--em-ink) antialiased ${TOKENS}`} aria-label="Issue PAY-482">
            <IssueHeader />

            <Conversation posts={state.posts} />

            <div className="flex items-start gap-3 pt-1">
              <span className="pt-[7px]">
                <Avatar name={YOU} size={26} />
              </span>
              <div
                data-open={composing || undefined}
                className="grid min-w-0 flex-1 rounded-[14px] bg-(--em-well) transition-[background-color,box-shadow] duration-200 ease-out data-open:bg-(--em-surface) data-open:shadow-[inset_0_0_0_1px_var(--em-line)] motion-reduce:transition-none"
              >
              <div
                ref={editor}
                className="relative min-h-[40px] cursor-text px-3.5 py-2 text-[14px] leading-[1.7] break-words whitespace-pre-wrap text-(--em-ink) caret-transparent outline-none focus-visible:outline-none"
                role="combobox"
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                aria-label="Leave a comment. Type @ to mention someone."
                aria-expanded={pickerOpen}
                aria-controls={pickerOpen ? listId : undefined}
                aria-activedescendant={pickerOpen && people.length ? `${listId}-${people[state.active]?.id}` : undefined}
                onDrop={(event) => event.preventDefault()}
                onKeyDown={onKeyDown}
                onPaste={onPaste}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              >
                {empty && !pickerOpen && (
                  <span className="pointer-events-none absolute text-(--em-quiet)" aria-hidden="true">
                    Leave a comment…
                  </span>
                )}

                <Segments segs={state.segs} id={id} interactive />

                {pickerOpen && (
                  <motion.span
                    ref={token}
                    className="-mx-0.5 inline-block rounded-[5px] bg-(--em-chip) px-[3px] leading-normal font-medium text-(--em-chip-ink)"
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.12 }}
                  >
                    @{state.query}
                  </motion.span>
                )}

                {focused && <span className="ml-px inline-block h-[1.1em] w-[1.5px] animate-caret-blink rounded-[1px] bg-(--em-accent) align-[-0.18em] motion-reduce:animate-none" aria-hidden="true" />}
              </div>

              <AnimatePresence initial={false}>
                {composing && (
                  <motion.div
                    key="footer"
                    className="overflow-hidden"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={OPEN}
                  >
                    <div className="flex items-center gap-1.5 pr-2 pb-2 pl-3.5">
                      <span className="min-w-0 flex-1">
                        <NotifyLine notified={notified} />
                      </span>
                      <SendButton disabled={empty} onSend={send} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </div>

            <PeoplePicker
              open={pickerOpen}
              anchor={token}
              container={card}
              query={state.query ?? ""}
              people={people}
              alreadyTagged={alreadyTagged}
              active={state.active}
              listId={listId}
              layoutPrefix={id}
              avatarLayoutKey={`m${state.made}`}
              onDismiss={() => dispatch({ type: "dismiss" })}
              onHighlight={setActive}
              onPick={(personId) => dispatch({ type: "pick", id: personId })}
            />
          </article>
        </LayoutGroup>
      </Tooltip.Provider>
    </MotionConfig>
  );
}

function Matched({ name, query }: { name: string; query: string }) {
  if (!query) return <>{name}</>;
  return (
    <>
      {name.split(" ").map((word, index) => (
        <Fragment key={index}>
          {index > 0 && " "}
          {word.toLowerCase().startsWith(query.toLowerCase()) ? (
            <>
              <mark>{word.slice(0, query.length)}</mark>
              {word.slice(query.length)}
            </>
          ) : (
            word
          )}
        </Fragment>
      ))}
    </>
  );
}

function Segments({ segs, id, interactive = false, rich = false }: { segs: MentionSegment[]; id?: string; interactive?: boolean; rich?: boolean }) {
  return (
    <>
      {segs.map((segment, index): ReactNode =>
        segment.kind === "text" ? (
          <span key={index}>{rich ? <Inline text={segment.text} /> : segment.text}</span>
        ) : (
          <Chip key={segment.key} id={segment.id} layoutId={interactive && id ? `${id}-${segment.id}-${segment.key}` : undefined} />
        ),
      )}
    </>
  );
}

function Chip({ id, layoutId }: { id: string; layoutId?: string }) {
  const person = personById(id);
  return (
    <motion.span
      className="mx-px inline-flex h-[22px] origin-[12px_50%] items-center gap-[5px] rounded-[6px] bg-(--em-chip) pr-1.5 pl-0.5 align-[-5px] text-[13px] leading-none font-semibold text-(--em-chip-ink)"
      initial={layoutId ? { opacity: 0, scale: 0.7, filter: "blur(4px)" } : false}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={POP}
    >
      <Avatar name={person.name} size={18} layoutId={layoutId} ring="var(--em-surface)" />
      {person.name.split(" ")[0]}
    </motion.span>
  );
}
