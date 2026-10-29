"use client";
/**
 * Sending a message, the moment chat apps get right. The mic turns into a send arrow as you type.
 * Send, and your message rises out of the composer into the thread, pushing the others up. Their
 * face slides down to it once they've read it, a typing bubble bounces in, and their reply takes
 * its place.
 *
 * Built with Motion; the mic and arrow reshape with Remold's `createMorph`. The read receipt is the
 * same small face moving to a new message, which is what `layoutId` is for. It plays a short scene
 * while it's on screen. Touch it and it's yours. The people are made up; the avatars are from DiceBear.
 */
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useId, useRef, type FormEvent } from "react";
import { MorphIcon } from "./morph-icon";
import { useScene } from "./use-scene";
import "./send-message.css";

interface Message {
  id: string;
  from: "them" | "me";
  text: string;
}

const THEM = "Kofi Agyeman";
const BEFORE: Message[] = [
  { id: "m0", from: "me", text: "Found the totals bug: tax was rounding twice" },
  { id: "m1", from: "them", text: "Did the checkout fix go out?" },
  { id: "m2", from: "me", text: "Building now, two minutes" },
];
const SENT: Message = { id: "m3", from: "me", text: "It's live on northwind.app 🚀" };
const REPLY: Message = { id: "m4", from: "them", text: "Legend. Totals look right on mobile too" };
/** What they say back to anything you send yourself. */
const REPLIES = ["Nice one 🙌", "On it, thanks!", "Perfect, merging now", "Haha fair 😄"];

interface State {
  draft: string;
  messages: readonly Message[];
  /** Your message they've read up to; their face sits under it. */
  read: string;
  typing: boolean;
}

const typed = (n: number) => SENT.text.slice(0, n);
const REST: State = { draft: "", messages: BEFORE, read: "m2", typing: false };
const AFTER = [...BEFORE, SENT];

const BEATS: readonly (State & { ms: number })[] = [
  { ...REST, ms: 1200 },
  ...[4, 9, 14, 19, 24, SENT.text.length].map((n, i, all) => ({
    ...REST,
    draft: typed(n),
    ms: i === all.length - 1 ? 650 : 150,
  })),
  { ...REST, messages: AFTER, ms: 900 },
  { ...REST, messages: AFTER, read: "m3", ms: 700 },
  { ...REST, messages: AFTER, read: "m3", typing: true, ms: 1600 },
  { ...REST, messages: [...AFTER, REPLY], read: "m3", ms: 2800 },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

/** Two strokes each: a mic (capsule and stand), an arrow (shaft and head). */
const MIC = "M12 4a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3zM6.5 11a5.5 5.5 0 0 0 11 0";
const ARROW = "M12 18.5V6M6.5 11.5L12 6l5.5 5.5";

const RISE = { type: "spring" as const, duration: 0.5, bounce: 0.2 };

const face = (name: string) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=fef3c7`;

interface SendMessageDemoProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function SendMessageDemo({ playing }: SendMessageDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const id = useId();
  const count = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = (ms: number, run: () => void) => timers.current.push(setTimeout(run, ms));

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = state.draft.trim();
    if (!text) return;
    const n = count.current++;
    const mine: Message = { id: `you-${n}`, from: "me", text };
    timers.current.forEach(clearTimeout);
    timers.current = [];
    take((s) => ({ ...s, draft: "", typing: false, messages: [...s.messages, mine].slice(-5) }));
    // They read it, start typing, and answer.
    later(800, () => take((s) => ({ ...s, read: mine.id })));
    later(1300, () => take((s) => ({ ...s, typing: true })));
    later(2700, () =>
      take((s) => ({
        ...s,
        typing: false,
        messages: [...s.messages, { id: `them-${n}`, from: "them" as const, text: REPLIES[n % REPLIES.length]! }].slice(-5),
      })),
    );
  };

  const last = state.messages[state.messages.length - 1];

  return (
    <section ref={scene.ref} className="ch not-prose" aria-label={`Chat with ${THEM}`}>
      <header className="ch-head">
        <img src={face(THEM)} alt="" width={30} height={30} draggable={false} />
        <span>
          <b>{THEM}</b>
          <small>{state.typing ? "typing…" : "Active now"}</small>
        </span>
      </header>

      <LayoutGroup id={id}>
        <ol className="ch-thread" aria-live="polite">
          <AnimatePresence initial={false} mode="popLayout">
            {state.messages.map((m) => (
              <motion.li
                key={m.id}
                layout="position"
                className="ch-row"
                data-from={m.from}
                initial={m.from === "me" ? { opacity: 0, y: 56, scale: 0.9 } : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={RISE}
              >
                <span className="ch-bubble">{m.text}</span>
                {m.id === state.read && (
                  <motion.img
                    layoutId="seen"
                    className="ch-seen"
                    src={face(THEM)}
                    alt={`Read by ${THEM}`}
                    width={16}
                    height={16}
                    draggable={false}
                    transition={RISE}
                  />
                )}
                {m.from === "me" && m === last && m.id !== state.read && (
                  <motion.span
                    className="ch-status"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                  >
                    Delivered
                  </motion.span>
                )}
              </motion.li>
            ))}
            {state.typing && (
              <motion.li
                key="typing"
                layout="position"
                className="ch-row"
                data-from="them"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.12 } }}
                transition={RISE}
              >
                <span className="ch-bubble ch-typing" aria-label={`${THEM} is typing`}>
                  {[0, 1, 2].map((i) => (
                    <motion.i
                      key={i}
                      animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                    />
                  ))}
                </span>
              </motion.li>
            )}
          </AnimatePresence>
        </ol>
      </LayoutGroup>

      <form className="ch-composer" onSubmit={send}>
        <input
          value={state.draft}
          onChange={(e) => take((s) => ({ ...s, draft: e.target.value }))}
          placeholder="Message"
          aria-label="Message"
          autoComplete="off"
        />
        <motion.button
          type="submit"
          className="ch-send"
          data-ready={state.draft.trim() ? "" : undefined}
          aria-label={state.draft.trim() ? "Send" : "Record a voice message"}
          whileTap={{ scale: 0.88 }}
        >
          <MorphIcon d={state.draft.trim() ? ARROW : MIC} strokeWidth={2.2} />
        </motion.button>
      </form>
    </section>
  );
}
