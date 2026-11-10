"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUp02Icon, Mic01Icon } from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useId, useRef, type FormEvent, type Ref } from "react";
import { useControllableState, type ChangeDetails } from "./use-controllable-state";
import { typing, useScene } from "./use-scene";

export interface ChatMessage {
  id: string;
  from: "them" | "me";
  text: string;
}

const THEM = "Kofi Agyeman";
const BEFORE: ChatMessage[] = [
  { id: "m0", from: "me", text: "Found the totals bug: tax was rounding twice" },
  { id: "m1", from: "them", text: "Did the checkout fix go out?" },
  { id: "m2", from: "me", text: "Building now, two minutes" },
];
const SENT: ChatMessage = { id: "m3", from: "me", text: "It's live on northwind.app 🚀" };
const REPLY: ChatMessage = { id: "m4", from: "them", text: "Legend. Totals look right on mobile too" };
const REPLIES = ["Nice one 🙌", "On it, thanks!", "Perfect, merging now", "Haha fair 😄"];

export interface SendMessageValue {
  draft: string;
  messages: readonly ChatMessage[];
  /** Your message they've read up to; their face sits under it. */
  read: string;
  typing: boolean;
}

const REST: SendMessageValue = { draft: "", messages: BEFORE, read: "m2", typing: false };
const AFTER = [...BEFORE, SENT];

const RISE = { type: "spring" as const, duration: 0.5, bounce: 0.2 };

const face = (name: string) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=fef3c7`;

export interface SendMessageProps {
  /** What's typed, the messages, the last one of yours they've read, and whether they're typing. */
  value?: SendMessageValue;
  defaultValue?: SendMessageValue;
  onValueChange?: (value: SendMessageValue, details: ChangeDetails) => void;
  /** Called with each message you send, after it's added to the thread. */
  onSend?: (message: ChatMessage) => void;
  ref?: Ref<HTMLElement>;
}

/** A chat thread with a composer: your message rises into place, and their read receipt and typing show under it. */
export function SendMessage({ value, defaultValue = REST, onValueChange, onSend, ref }: SendMessageProps) {
  const [chat, setChat] = useControllableState({ value, defaultValue, onValueChange });
  const id = useId();
  const sentCount = useRef(0);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = chat.draft.trim();
    if (!text) return;
    const mine: ChatMessage = { id: `you-${sentCount.current++}`, from: "me", text };
    setChat((current) => ({
      ...current,
      draft: "",
      typing: false,
      messages: [...current.messages, mine].slice(-5),
    }));
    onSend?.(mine);
  };

  const last = chat.messages[chat.messages.length - 1];

  return (
    <section
      ref={ref}
      className="not-prose grid w-[min(100%,360px)] rounded-[26px] bg-(--ch-surface) p-3.5 font-sans text-(--ch-ink) [--ch-accent:#2563eb] [--ch-field:#f4f4f5] [--ch-ink:#18181b] [--ch-line:rgb(24_24_27/0.08)] [--ch-me:#18181b] [--ch-muted:#71717a] [--ch-on-me:#fafafa] [--ch-surface:#ffffff] [--ch-them:#f1f1f3] dark:[--ch-accent:#60a5fa] dark:[--ch-field:#2e2e33] dark:[--ch-ink:#fafafa] dark:[--ch-line:rgb(255_255_255/0.08)] dark:[--ch-me:#fafafa] dark:[--ch-muted:#a1a1aa] dark:[--ch-on-me:#18181b] dark:[--ch-surface:#232327] dark:[--ch-them:#34343a]"
      aria-label={`Chat with ${THEM}`}
    >
      <header className="flex items-center gap-[9px] border-b border-(--ch-line) px-0.5 pb-3">
        <img
          className="size-[30px] rounded-full bg-amber-100"
          src={face(THEM)}
          alt=""
          width={30}
          height={30}
          draggable={false}
        />
        <span className="grid text-[13.5px] leading-[1.25]">
          <b>{THEM}</b>
          <small className="text-[11.5px] text-(--ch-muted)">{chat.typing ? "typing…" : "Active now"}</small>
        </span>
      </header>

      <LayoutGroup id={id}>
        <ol
          className="m-0 flex h-[268px] list-none flex-col justify-end gap-1.5 overflow-hidden px-0.5 pt-3 pb-2.5 mask-[linear-gradient(to_bottom,transparent,#000_40px)]"
          aria-live="polite"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {chat.messages.map((message) => (
              <motion.li
                key={message.id}
                layout="position"
                className="group/row grid justify-items-start gap-[3px] origin-bottom-left data-[from=me]:justify-items-end data-[from=me]:origin-bottom-right"
                data-from={message.from}
                initial={
                  message.from === "me" ? { opacity: 0, y: 56, scale: 0.9 } : { opacity: 0, scale: 0.9 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={RISE}
              >
                <span className="max-w-[78%] rounded-[19px_19px_19px_6px] bg-(--ch-them) px-[13px] py-2 text-[14px] leading-[1.38] group-data-[from=me]/row:rounded-[19px_19px_6px_19px] group-data-[from=me]/row:bg-(--ch-me) group-data-[from=me]/row:text-(--ch-on-me)">
                  {message.text}
                </span>
                {message.id === chat.read && (
                  <motion.img
                    layoutId="seen"
                    className="mr-0.5 size-4 rounded-full bg-amber-100"
                    src={face(THEM)}
                    alt={`Read by ${THEM}`}
                    width={16}
                    height={16}
                    draggable={false}
                    transition={RISE}
                  />
                )}
                {message.from === "me" && message === last && message.id !== chat.read && (
                  <motion.span
                    className="mr-1 text-[11px] text-(--ch-muted)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                  >
                    Delivered
                  </motion.span>
                )}
              </motion.li>
            ))}
            {chat.typing && (
              <motion.li
                key="typing"
                layout="position"
                className="group/row grid justify-items-start gap-[3px] origin-bottom-left data-[from=me]:justify-items-end data-[from=me]:origin-bottom-right"
                data-from="them"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.12 } }}
                transition={RISE}
              >
                <span
                  className="max-w-[78%] rounded-[19px_19px_19px_6px] bg-(--ch-them) px-[13px] py-2 text-[14px] leading-[1.38] group-data-[from=me]/row:rounded-[19px_19px_6px_19px] group-data-[from=me]/row:bg-(--ch-me) group-data-[from=me]/row:text-(--ch-on-me) inline-flex h-9 items-center gap-1 px-3.5 py-0"
                  aria-label={`${THEM} is typing`}
                >
                  {[0, 1, 2].map((dot) => (
                    <motion.i
                      className="size-[7px] rounded-full bg-(--ch-muted)"
                      key={dot}
                      animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.15, ease: "easeInOut" }}
                    />
                  ))}
                </span>
              </motion.li>
            )}
          </AnimatePresence>
        </ol>
      </LayoutGroup>

      <form
        className="flex items-center gap-2 rounded-full bg-(--ch-field) py-[5px] pr-[5px] pl-3.5"
        onSubmit={send}
      >
        <input
          className="h-[34px] min-w-0 flex-1 border-0 bg-transparent text-[14px] text-(--ch-ink) outline-none placeholder:text-(--ch-muted)"
          value={chat.draft}
          onChange={(event) => setChat((current) => ({ ...current, draft: event.target.value }))}
          placeholder="Message"
          aria-label="Message"
          autoComplete="off"
        />
        <motion.button
          type="submit"
          className="grid size-[34px] flex-none cursor-pointer place-items-center rounded-full bg-transparent text-(--ch-muted) transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ch-accent) data-ready:bg-(--ch-accent) data-ready:text-white [&_svg]:size-[19px]"
          data-ready={chat.draft.trim() ? "" : undefined}
          aria-label={chat.draft.trim() ? "Send" : "Record a voice message"}
          whileTap={{ scale: 0.88 }}
        >
          <Remold.Icon
            icon={<HugeiconsIcon icon={chat.draft.trim() ? ArrowUp02Icon : Mic01Icon} />}
            strokeWidth={2.2}
          />
        </motion.button>
      </form>
    </section>
  );
}

// The docs demo: a short scripted scene that plays the element above. Your app doesn't need it.

const BEATS: readonly (SendMessageValue & { ms: number })[] = [
  { ...REST, ms: 1200 },
  ...typing(SENT.text, (draft) => ({ ...REST, draft }), { every: 45, hold: 650 }),
  { ...REST, messages: AFTER, ms: 900 },
  { ...REST, messages: AFTER, read: "m3", ms: 700 },
  { ...REST, messages: AFTER, read: "m3", typing: true, ms: 1600 },
  { ...REST, messages: [...AFTER, REPLY], read: "m3", ms: 2800 },
];

const fromBeat = (step: number): SendMessageValue => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

interface SendMessageDemoProps {
  playing?: boolean;
}

export function SendMessageDemo({ playing }: SendMessageDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const replies = useRef(0);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const reply = (mine: ChatMessage) => {
    const { takeOver } = scene;
    const later = (ms: number, run: () => void) => timers.current.push(setTimeout(run, ms));
    const turn = replies.current++;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    later(800, () => takeOver((current) => ({ ...current, read: mine.id })));
    later(1300, () => takeOver((current) => ({ ...current, typing: true })));
    later(2700, () =>
      takeOver((current) => ({
        ...current,
        typing: false,
        messages: [
          ...current.messages,
          { id: `them-${turn}`, from: "them" as const, text: REPLIES[turn % REPLIES.length]! },
        ].slice(-5),
      })),
    );
  };

  return (
    <SendMessage ref={scene.ref} value={scene.state} onValueChange={scene.onValueChange} onSend={reply} />
  );
}
