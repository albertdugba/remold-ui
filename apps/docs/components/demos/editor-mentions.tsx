"use client";

import { Popover } from "@base-ui/react/popover";
import { Tooltip } from "@base-ui/react/tooltip";
import { ArrowUp01Icon, AtIcon, FileAttachmentIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";

import {
  avatarUrl,
  initialMentionsState,
  matchingPeople,
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

const SWAP = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.2 },
};

const firstName = (personId: string) => personById(personId).name.split(" ")[0]!;

const TOKENS = [
  "[--em-surface:#ffffff] [--em-raised:#ffffff] [--em-field:#f6f6f7] [--em-line:rgb(24_24_27/0.08)] [--em-ink:#18181b] [--em-on-ink:#fafafa]",
  "[--em-muted:#71717a] [--em-quiet:#a1a1aa] [--em-accent:#4f46e5] [--em-accent-soft:#eef2ff] [--em-chip:rgb(79_70_229/0.09)] [--em-chip-ink:#3f37c9]",
  "[--em-query:rgb(79_70_229/0.08)] [--em-lift:0_1px_2px_rgb(24_24_27/0.04),0_8px_24px_-10px_rgb(24_24_27/0.18)] [--em-online:#22c55e]",
  "dark:[--em-surface:#1f1f23] dark:[--em-raised:#1c1c1f] dark:[--em-field:#26262b] dark:[--em-line:rgb(255_255_255/0.08)] dark:[--em-ink:#fafafa] dark:[--em-on-ink:#18181b]",
  "dark:[--em-muted:#a1a1aa] dark:[--em-quiet:#71717a] dark:[--em-accent:#818cf8] dark:[--em-accent-soft:rgb(129_140_248/0.16)] dark:[--em-chip:rgb(129_140_248/0.16)] dark:[--em-chip-ink:#c7d2fe]",
  "dark:[--em-query:rgb(129_140_248/0.14)] dark:[--em-lift:0_1px_2px_rgb(0_0_0/0.3),0_10px_28px_-10px_rgb(0_0_0/0.6)]",
  "font-sans",
].join(" ");

const NOTIFY_LINE = "inline-flex min-w-0 items-center gap-[7px] whitespace-nowrap";
const KEY = "inline-grid place-items-center px-[3px] font-[inherit] text-[10.5px]";
const TIP_KEY = `${KEY} h-4 min-w-4 rounded-[4px] bg-white/18`;

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

function Thread({ posts }: { posts: MentionPost[] }) {
  return (
    <ol className="m-0 flex h-[172px] list-none flex-col justify-end gap-3 overflow-hidden px-0.5 py-3.5 [mask-image:linear-gradient(to_bottom,transparent,#000_36px)]">
      <AnimatePresence initial={false} mode="popLayout">
        {posts.map((post) => (
          <motion.li
            key={post.id}
            layout="position"
            className="flex origin-bottom-left gap-2.5"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={RISE}
          >
            <img
              className="size-7 flex-none rounded-full"
              src={avatarUrl(post.who === "You" ? "Yaw Darko" : post.who)}
              alt=""
              width={28}
              height={28}
              draggable={false}
            />
            <div>
              <p className="m-0 flex items-baseline gap-2 text-[13px]">
                <b>{post.who}</b>
                <time className="text-[11.5px] text-(--em-quiet)">{post.when}</time>
              </p>
              <p className="m-0 mt-0.5 text-[13.5px] leading-[1.6] text-(--em-ink)">
                <Segments segs={post.segs} />
              </p>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}

function NotifyLine({ notified }: { notified: string[] }) {
  return (
    <span className="inline-grid min-w-0 text-[12px] text-(--em-muted)">
      <AnimatePresence initial={false} mode="popLayout">
        {notified.length ? (
          <motion.span key="who" className={NOTIFY_LINE} {...SWAP}>
            <span className="inline-flex flex-none">
              <AnimatePresence initial={false}>
                {notified.map((personId) => (
                  <motion.img
                    key={personId}
                    className="-mr-[5px] size-[18px] flex-none rounded-full shadow-[0_0_0_2px_var(--em-surface)] last:mr-0"
                    src={avatarUrl(personById(personId).name)}
                    alt=""
                    width={18}
                    height={18}
                    draggable={false}
                    layout="position"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ ...POP, delay: 0.35 }}
                  />
                ))}
              </AnimatePresence>
            </span>
            <span className="min-w-0 truncate">
              {notificationLabel(notified.map(firstName))} will be notified
            </span>
          </motion.span>
        ) : (
          <motion.span key="hint" className={NOTIFY_LINE} {...SWAP}>
            <HugeiconsIcon icon={AtIcon} className="size-[13px]" aria-hidden="true" />
            Mention someone to notify them
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
        className="grid size-[30px] flex-none cursor-pointer place-items-center rounded-full border-0 bg-(--em-ink) text-white transition-opacity duration-200 focus-visible:outline-none disabled:cursor-default disabled:opacity-20"
        onClick={onSend}
        disabled={disabled}
        aria-label="Send comment"
        render={<motion.button type="button" whileTap={{ scale: 0.9 }} />}
      >
        <HugeiconsIcon icon={ArrowUp01Icon} className="size-4" aria-hidden="true" />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner className={TOKENS} sideOffset={8}>
          <Tooltip.Popup className="inline-flex origin-(--transform-origin) items-center gap-1 rounded-[7px] bg-(--em-ink) px-2 py-[5px] text-[12px] font-medium text-(--em-on-ink) [transition:opacity_0.14s,transform_0.18s] data-ending-style:[transform:scale(0.9)] data-ending-style:opacity-0 data-starting-style:[transform:scale(0.9)] data-starting-style:opacity-0">
            Send <kbd className={TIP_KEY}>⌘</kbd>
            <kbd className={TIP_KEY}>↵</kbd>
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function PeoplePicker({
  open,
  anchor,
  query,
  people,
  active,
  listId,
  layoutPrefix,
  avatarLayoutKey,
  onDismiss,
  onHighlight,
  onPick,
}: {
  open: boolean;
  anchor: RefObject<HTMLSpanElement | null>;
  query: string;
  people: MentionPerson[];
  active: number;
  listId: string;
  layoutPrefix: string;
  avatarLayoutKey: string;
  onDismiss: () => void;
  onHighlight: (index: number) => void;
  onPick: (personId: string) => void;
}) {
  return (
    <Popover.Root open={open} onOpenChange={(next) => !next && open && onDismiss()} modal={false}>
      <Popover.Portal>
        <Popover.Positioner
          className={TOKENS}
          anchor={anchor}
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={12}
        >
          <Popover.Popup
            className="w-[248px] origin-(--transform-origin) rounded-2xl border border-solid border-black/6 bg-(--em-raised) p-1 text-(--em-ink) shadow-[0_1px_2px_rgb(0_0_0/0.05),0_12px_28px_-20px_rgb(0_0_0/0.16)] outline-none [transition:opacity_0.16s,transform_0.24s_cubic-bezier(0.2,0.9,0.3,1.25)] data-ending-style:[transform:scale(0.9)_translateY(-6px)] data-ending-style:opacity-0 data-starting-style:[transform:scale(0.9)_translateY(-6px)] data-starting-style:opacity-0 dark:border-white/7 dark:shadow-[0_1px_2px_rgb(0_0_0/0.28),0_12px_28px_-20px_rgb(0_0_0/0.48)]"
            initialFocus={false}
            finalFocus={false}
          >
            <p className="m-0 px-2.5 pt-[7px] pb-[5px] text-[11px] font-medium text-(--em-quiet)">{query ? `People matching “${query}”` : "Mention someone"}</p>

            <ul id={listId} role="listbox" aria-label="People" className="m-0 grid list-none p-0">
              <AnimatePresence initial={false} mode="popLayout">
                {people.map((person, index) => (
                  <motion.li
                    key={person.id}
                    id={`${listId}-${person.id}`}
                    role="option"
                    aria-selected={index === active}
                    className="relative flex h-11 cursor-pointer items-center gap-2.5 rounded-xl px-2 [&>*:not([data-hl])]:relative"
                    layout="position"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                    transition={SLIDE}
                    onPointerDown={(event) => event.preventDefault()}
                    onPointerEnter={(event) =>
                      event.pointerType === "mouse" && index !== active && onHighlight(index)
                    }
                    onClick={() => onPick(person.id)}
                  >
                    {index === active && (
                      <motion.span
                        layoutId={`${layoutPrefix}-highlight`}
                        data-hl=""
                        className="absolute inset-0 rounded-[inherit] bg-[#f5f5f1] dark:bg-[#2a2a2f]"
                        transition={HIGHLIGHT}
                      />
                    )}

                    <span className="grid flex-none">
                      <motion.img
                        className="size-7 rounded-full"
                        layoutId={`${layoutPrefix}-${person.id}-${avatarLayoutKey}`}
                        src={avatarUrl(person.name)}
                        alt=""
                        width={28}
                        height={28}
                        draggable={false}
                        transition={FLY}
                      />
                      {person.online && (
                        <i
                          className="absolute -right-px -bottom-px size-2 rounded-full bg-(--em-online) shadow-[0_0_0_2px_var(--em-raised)]"
                          aria-label="Online"
                        />
                      )}
                    </span>

                    <span className="grid min-w-0 flex-1 leading-[1.25]">
                      <span className="text-[13px] font-medium [&_mark]:bg-transparent [&_mark]:font-semibold [&_mark]:text-(--em-chip-ink)">
                        <Matched name={person.name} query={query} />
                      </span>
                      <span className="text-[11.5px] text-(--em-muted)">{person.role}</span>
                    </span>

                    {index === active && (
                      <kbd
                        className={`${KEY} h-[18px] min-w-[18px] rounded-[5px] bg-transparent text-(--em-quiet) shadow-[inset_0_0_0_1px_var(--em-line),0_1px_0_var(--em-line)]`}
                      >
                        ↵
                      </kbd>
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>

              {!people.length && <li className="cursor-default px-2 py-2.5 text-[12.5px] text-(--em-muted)">No one called “{query}”</li>}
            </ul>
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

export function EditorMentions({
  state: controlledState,
  defaultState = initialMentionsState,
  onStateChange,
  onInteraction,
}: EditorMentionsProps) {
  const [uncontrolledState, setUncontrolledState] = useState(defaultState);
  const [focused, setFocused] = useState(false);
  const editor = useRef<HTMLDivElement>(null);
  const token = useRef<HTMLSpanElement>(null);
  const id = useId();

  const isControlled = controlledState !== undefined;
  const state = controlledState ?? uncontrolledState;
  const pickerOpen = state.query !== null;
  const people = pickerOpen ? matchingPeople(state.query!) : [];
  const listId = `${id}-people`;
  const notified = [
    ...new Set(state.segs.flatMap((segment) => (segment.kind === "mention" ? [segment.id] : []))),
  ];

  const setState = (next: MentionsState) => {
    if (!isControlled) setUncontrolledState(next);
    onStateChange?.(next);
  };

  const dispatch = (action: MentionsAction) => {
    onInteraction?.();
    setState(reduceMentions(state, action));
  };

  const setActive = (active: number) => {
    onInteraction?.();
    setState({ ...state, active });
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
    setState([...text].reduce((next, character) => reduceMentions(next, { type: "type", character }), state));
  };

  return (
    <Tooltip.Provider delay={400}>
      <LayoutGroup id={id}>
        <section
          className={`not-prose grid w-[min(100%,420px)] rounded-[22px] bg-(--em-surface) p-4 text-(--em-ink) ${TOKENS}`}
          aria-label="Comments"
        >
          <header className="flex items-center gap-2.5 border-b border-solid border-(--em-line) pb-3">
            <span className="grid size-8 place-items-center rounded-[9px] bg-(--em-accent-soft) text-(--em-accent)">
              <HugeiconsIcon icon={FileAttachmentIcon} className="size-4" aria-hidden="true" />
            </span>
            <span className="grid text-[14px] leading-[1.25]">
              <b>Pricing page v3</b>
              <span className="text-[12px] text-(--em-muted)">Comments</span>
            </span>
          </header>

          <Thread posts={state.posts} />

          <div
            data-focused={focused || undefined}
            className="grid rounded-2xl bg-(--em-field) shadow-[inset_0_0_0_1px_transparent] transition-[box-shadow,background-color] duration-250 data-focused:bg-(--em-surface) data-focused:shadow-[inset_0_0_0_1px_var(--em-line),var(--em-lift)]"
          >
            <div
              ref={editor}
              className="relative min-h-[52px] cursor-text px-3.5 pt-3 pb-1 text-[14px] leading-[1.75] break-words whitespace-pre-wrap caret-transparent outline-none focus-visible:outline-none"
              role="combobox"
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              aria-label="Write a comment. Type @ to mention someone."
              aria-expanded={pickerOpen}
              aria-controls={pickerOpen ? listId : undefined}
              aria-activedescendant={
                pickerOpen && people.length ? `${listId}-${people[state.active]?.id}` : undefined
              }
              onDrop={(event) => event.preventDefault()}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            >
              {!state.segs.length && !pickerOpen && (
                <span className="pointer-events-none absolute text-(--em-quiet)">Reply, or type @ to mention someone</span>
              )}

              <Segments segs={state.segs} id={id} interactive />

              {pickerOpen && (
                <motion.span
                  ref={token}
                  className="-mx-0.5 inline-block rounded-md bg-(--em-query) px-[3px] leading-normal font-medium text-(--em-chip-ink)"
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.12 }}
                >
                  @{state.query}
                </motion.span>
              )}

              {focused && (
                <span
                  className="ml-px inline-block h-[1.1em] w-[1.5px] animate-caret-blink rounded-[1px] bg-(--em-ink) align-[-0.18em] motion-reduce:animate-none"
                  aria-hidden="true"
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-2.5 pt-1 pr-2 pb-2 pl-3.5">
              <NotifyLine notified={notified} />
              <SendButton disabled={!state.segs.length} onSend={() => dispatch({ type: "send" })} />
            </div>
          </div>

          <PeoplePicker
            open={pickerOpen}
            anchor={token}
            query={state.query ?? ""}
            people={people}
            active={state.active}
            listId={listId}
            layoutPrefix={id}
            avatarLayoutKey={`m${state.made}`}
            onDismiss={() => dispatch({ type: "dismiss" })}
            onHighlight={setActive}
            onPick={(personId) => dispatch({ type: "pick", id: personId })}
          />
        </section>
      </LayoutGroup>
    </Tooltip.Provider>
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

function Segments({
  segs,
  id,
  interactive = false,
}: {
  segs: MentionSegment[];
  id?: string;
  interactive?: boolean;
}) {
  return (
    <>
      {segs.map((segment, index) =>
        segment.kind === "text" ? (
          <span key={index}>{segment.text}</span>
        ) : (
          <Chip
            key={segment.key}
            id={segment.id}
            layoutId={interactive && id ? `${id}-${segment.id}-${segment.key}` : undefined}
          />
        ),
      )}
    </>
  );
}

function Chip({ id, layoutId }: { id: string; layoutId?: string }) {
  const person = personById(id);
  return (
    <motion.span
      className="mx-px inline-flex h-[22px] origin-[12px_50%] items-center gap-[5px] rounded-full bg-(--em-chip) pr-[7px] pl-0.5 align-[-5px] text-[13px] leading-none font-semibold text-(--em-chip-ink)"
      initial={layoutId ? { opacity: 0, scale: 0.7, filter: "blur(4px)" } : false}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={POP}
    >
      <motion.img
        className="size-[18px] rounded-full bg-(--em-surface)"
        layoutId={layoutId}
        src={avatarUrl(person.name)}
        alt=""
        width={18}
        height={18}
        draggable={false}
        transition={FLY}
      />
      {person.name.split(" ")[0]}
    </motion.span>
  );
}
