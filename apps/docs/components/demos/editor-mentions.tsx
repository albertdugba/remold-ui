"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUp01Icon, AtIcon, FileAttachmentIcon } from "@hugeicons/core-free-icons";
import { Popover } from "@base-ui/react/popover";
import { Tooltip } from "@base-ui/react/tooltip";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import {
  avatarUrl,
  initialMentionsState,
  matchingPeople,
  notificationLabel,
  personById,
  reduceMentions,
  type MentionSegment,
  type MentionsAction,
  type MentionsState,
} from "./editor-mentions.model";
import "./editor-mentions.css";

const pop = { type: "spring" as const, duration: 0.4, bounce: 0.3 };
const fly = { type: "spring" as const, duration: 0.55, bounce: 0.2 };
const rise = { type: "spring" as const, duration: 0.5, bounce: 0.18 };

export interface EditorMentionsProps {
  state?: MentionsState;
  defaultState?: MentionsState;
  onStateChange?: (state: MentionsState) => void;
  onInteraction?: () => void;
}

/** A keyboard-accessible comment editor with @mentions. Controlled or self-contained. */
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
  const state = controlledState ?? uncontrolledState;
  const isControlled = controlledState !== undefined;
  const people = state.query === null ? [] : matchingPeople(state.query);
  const pickerOpen = state.query !== null;
  const listId = `${id}-people`;
  const nextMentionKey = `m${state.made}`;
  const notified = [
    ...new Set(
      state.segs.flatMap((segment) =>
        segment.kind === "mention" ? [segment.id] : [],
      ),
    ),
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

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      if (event.key === "Enter") {
        event.preventDefault();
        dispatch({ type: "send" });
      }
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

  const latestDispatch = useRef(dispatch);
  latestDispatch.current = dispatch;
  useEffect(() => {
    const element = editor.current;
    if (!element) return;
    const onBeforeInput = (event: InputEvent) => {
      event.preventDefault();
      if (event.inputType === "insertText" && event.data) {
        for (const character of event.data)
          latestDispatch.current({ type: "type", character });
      } else if (
        event.inputType.startsWith("deleteContentBackward") ||
        event.inputType === "deleteWordBackward"
      ) {
        latestDispatch.current({ type: "backspace" });
      } else if (
        event.inputType === "insertParagraph" ||
        event.inputType === "insertLineBreak"
      ) {
        latestDispatch.current({ type: "send" });
      }
    };
    element.addEventListener("beforeinput", onBeforeInput);
    return () => element.removeEventListener("beforeinput", onBeforeInput);
  }, []);

  const onPaste = (event: ClipboardEvent) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text").replace(/\s+/g, " ");
    onInteraction?.();
    setState(
      [...text].reduce(
        (next, character) => reduceMentions(next, { type: "type", character }),
        state,
      ),
    );
  };

  return (
    <Tooltip.Provider delay={400}>
      <LayoutGroup id={id}>
        <section className="em em-layer not-prose" aria-label="Comments">
          <header className="em-head">
            <span className="em-doc">
              <HugeiconsIcon icon={FileAttachmentIcon} aria-hidden="true" />
            </span>
            <span className="em-head-copy">
              <b>Pricing page v3</b>
              <span>Comments</span>
            </span>
          </header>
          <ol className="em-thread">
            <AnimatePresence initial={false} mode="popLayout">
              {state.posts.map((post) => (
                <motion.li
                  key={post.id}
                  layout="position"
                  className="em-post"
                  initial={{ opacity: 0, y: 40, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  transition={rise}
                >
                  <img
                    src={avatarUrl(post.who === "You" ? "Yaw Darko" : post.who)}
                    alt=""
                    width={28}
                    height={28}
                    draggable={false}
                  />
                  <div>
                    <p className="em-post-meta">
                      <b>{post.who}</b>
                      <time>{post.when}</time>
                    </p>
                    <p className="em-post-text">
                      <Segments segs={post.segs} />
                    </p>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
          <div className="em-composer" data-focused={focused || undefined}>
            <div
              ref={editor}
              className="em-editor"
              role="combobox"
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              onDrop={(event) => event.preventDefault()}
              aria-label="Write a comment. Type @ to mention someone."
              aria-expanded={pickerOpen}
              aria-controls={pickerOpen ? listId : undefined}
              aria-activedescendant={
                pickerOpen && people.length
                  ? `${listId}-${people[state.active]?.id}`
                  : undefined
              }
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            >
              {!state.segs.length && !pickerOpen && (
                <span className="em-placeholder">
                  Reply, or type @ to mention someone
                </span>
              )}
              <Segments segs={state.segs} id={id} interactive />
              {pickerOpen && (
                <motion.span
                  ref={token}
                  className="em-token"
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.12 }}
                >
                  @{state.query}
                </motion.span>
              )}
              {focused && <span className="em-caret" aria-hidden="true" />}
            </div>
            <div className="em-foot">
              <span className="em-notify">
                <AnimatePresence initial={false} mode="popLayout">
                  {notified.length ? (
                    <motion.span
                      key="who"
                      className="em-notify-who"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                    >
                      <span className="em-notify-faces">
                        <AnimatePresence initial={false}>
                          {notified.map((personId) => (
                            <motion.img
                              key={personId}
                              src={avatarUrl(personById(personId).name)}
                              alt=""
                              width={18}
                              height={18}
                              draggable={false}
                              layout="position"
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0 }}
                              transition={{ ...pop, delay: 0.35 }}
                            />
                          ))}
                        </AnimatePresence>
                      </span>
                      <span className="em-notify-names">
                        {notificationLabel(
                          notified.map(
                            (personId) =>
                              personById(personId).name.split(" ")[0]!,
                          ),
                        )}{" "}
                        will be notified
                      </span>
                    </motion.span>
                  ) : (
                    <motion.span
                      key="hint"
                      className="em-notify-hint"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                    >
                      <HugeiconsIcon icon={AtIcon} aria-hidden="true" />
                      Mention someone to notify them
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              <Tooltip.Root>
                <Tooltip.Trigger
                  className="em-send"
                  onClick={() => dispatch({ type: "send" })}
                  disabled={!state.segs.length}
                  aria-label="Send comment"
                  render={
                    <motion.button type="button" whileTap={{ scale: 0.9 }} />
                  }
                >
                  <HugeiconsIcon icon={ArrowUp01Icon} aria-hidden="true" />
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Positioner className="em-layer" sideOffset={8}>
                    <Tooltip.Popup className="em-tip">
                      Send <kbd>⌘</kbd>
                      <kbd>↵</kbd>
                    </Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>
          </div>
          <Popover.Root
            open={pickerOpen}
            onOpenChange={(open) =>
              !open && pickerOpen && dispatch({ type: "dismiss" })
            }
            modal={false}
          >
            <Popover.Portal>
              <Popover.Positioner
                className="em-layer"
                anchor={token}
                side="bottom"
                align="start"
                sideOffset={8}
                collisionPadding={12}
              >
                <Popover.Popup
                  className="em-picker"
                  initialFocus={false}
                  finalFocus={false}
                >
                  <p className="em-picker-head">
                    {state.query
                      ? `People matching “${state.query}”`
                      : "Mention someone"}
                  </p>
                  <ul
                    id={listId}
                    role="listbox"
                    aria-label="People"
                    className="em-people"
                  >
                    <AnimatePresence initial={false} mode="popLayout">
                      {people.map((person, index) => (
                        <motion.li
                          key={person.id}
                          id={`${listId}-${person.id}`}
                          role="option"
                          aria-selected={index === state.active}
                          layout="position"
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, transition: { duration: 0.1 } }}
                          transition={{
                            type: "spring",
                            duration: 0.3,
                            bounce: 0.1,
                          }}
                          onPointerDown={(event) => event.preventDefault()}
                          onPointerEnter={(event) => event.pointerType === "mouse" &&
                            index !== state.active && setActive(index)
                          }
                          onClick={() =>
                            dispatch({ type: "pick", id: person.id })
                          }
                        >
                          {index === state.active && (
                            <motion.span
                              layoutId={`${id}-highlight`}
                              className="em-highlight"
                              transition={{
                                type: "spring",
                                duration: 0.25,
                                bounce: 0.1,
                              }}
                            />
                          )}
                          <span className="em-face">
                            <motion.img
                              layoutId={`${id}-${person.id}-${nextMentionKey}`}
                              src={avatarUrl(person.name)}
                              alt=""
                              width={28}
                              height={28}
                              draggable={false}
                              transition={fly}
                            />
                            {person.online && <i aria-label="Online" />}
                          </span>
                          <span className="em-person">
                            <span className="em-person-name">
                              <Matched
                                name={person.name}
                                query={state.query ?? ""}
                              />
                            </span>
                            <span className="em-person-role">
                              {person.role}
                            </span>
                          </span>
                          {index === state.active && (
                            <kbd className="em-enter">↵</kbd>
                          )}
                        </motion.li>
                      ))}
                    </AnimatePresence>
                    {!people.length && (
                      <li className="em-none">No one called “{state.query}”</li>
                    )}
                  </ul>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
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
            layoutId={
              interactive && id
                ? `${id}-${segment.id}-${segment.key}`
                : undefined
            }
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
      className="em-chip"
      initial={
        layoutId ? { opacity: 0, scale: 0.7, filter: "blur(4px)" } : false
      }
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={pop}
    >
      <motion.img
        layoutId={layoutId}
        src={avatarUrl(person.name)}
        alt=""
        width={18}
        height={18}
        draggable={false}
        transition={fly}
      />
      {person.name.split(" ")[0]}
    </motion.span>
  );
}
