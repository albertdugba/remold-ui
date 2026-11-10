"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type Ref,
} from "react";
import { useControllableState, type ChangeDetails } from "./use-controllable-state";
import { typing, useScene } from "./use-scene";
import { useScramble } from "./use-scramble";
import "./api-keys.css";

type Env = "live" | "test";

export interface ApiKey {
  id: string;
  name: string;
  env: Env;
  value: string;
  used: string;
}

const KEYS: ApiKey[] = [
  { id: "prod", name: "Production", env: "live", value: "nw_live_8fK2pQ7xVt3mLs9R7Q3f", used: "2 min ago" },
  { id: "stage", name: "Staging", env: "test", value: "nw_test_Yh4nB8cW2kPz6Ej1x2Dd", used: "1 hr ago" },
  { id: "ci", name: "CI deploys", env: "live", value: "nw_live_Rm5tG9aQ1sZu7Kc3b8Hw", used: "Yesterday" },
];

const MADE: ApiKey = {
  id: "mobile",
  name: "Mobile app",
  env: "live",
  value: "nw_live_Vb3sK8wZ1nQe5Ry7t4Mc",
  used: "Never used",
};

const mask = (value: string) => value.slice(0, 8) + "•".repeat(8) + value.slice(-4);

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const freshValue = (env: Env) =>
  `nw_${env}_${Array.from({ length: 20 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("")}`;

type Stage = "list" | "naming" | "secret";

export interface ApiKeysValue {
  keys: readonly ApiKey[];
  stage: Stage;
  draft: string;
  env: Env;
  made: ApiKey | null;
  copied: boolean;
  /** The newest row, which lands with its secret still showing, then masks itself. */
  landed: string | null;
  revoking: string | null;
  note: string | null;
}

const REST: ApiKeysValue = {
  keys: KEYS,
  stage: "list",
  draft: "",
  env: "live",
  made: null,
  copied: false,
  landed: null,
  revoking: null,
  note: null,
};

const SUBTITLES: Record<Stage, string> = {
  list: "For calling the Northwind API",
  naming: "Name it after what will use it",
  secret: "Copy it now. You won’t see it again.",
};
const NOTE_FOR = 1800;

const SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.18 };
const QUICK = { duration: 0.14 };
const CARD_PADDING = 18;

const part = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.94, filter: "blur(6px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { ...SPRING, delay } },
  exit: { opacity: 0, scale: 0.94, filter: "blur(6px)", transition: QUICK },
});

interface KeyRowProps {
  apiKey: ApiKey;
  index: number;
  landed: boolean;
  confirming: boolean;
  onRevoke: () => void;
  onCancel: () => void;
}

function KeyRow({ apiKey, index, landed, confirming, onRevoke, onCancel }: KeyRowProps) {
  const [masked, setMasked] = useState(!landed);
  useEffect(() => {
    if (!landed) return;
    const timer = setTimeout(() => setMasked(true), 700);
    return () => clearTimeout(timer);
  }, [landed]);
  const shown = useScramble(masked ? mask(apiKey.value) : apiKey.value, { duration: 0.8 });

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape" && confirming) {
      event.stopPropagation();
      onCancel();
    }
  };

  const arrive = part(0.06 + index * 0.04);

  return (
    <motion.li
      className="ak-row"
      data-landed={landed || undefined}
      data-confirming={confirming || undefined}
      initial={landed ? false : arrive.initial}
      animate={arrive.animate}
      exit={{ opacity: 0, height: 0, filter: "blur(4px)", transition: { ...SPRING, bounce: 0 } }}
    >
      <span className="ak-row-inner">
        <span className="ak-dot" data-env={apiKey.env} aria-label={apiKey.env === "live" ? "Live" : "Test"} />
        <span className="ak-row-copy">
          <span className="ak-row-name">{apiKey.name}</span>
          <motion.code layout="position" layoutId={`ak-secret-${apiKey.id}`} className="ak-row-key">
            {shown}
          </motion.code>
        </span>
        <span className="ak-row-used">{apiKey.used}</span>
        <button
          type="button"
          className="ak-revoke"
          aria-label={confirming ? `Confirm revoking ${apiKey.name}` : `Revoke ${apiKey.name}`}
          onClick={onRevoke}
          onBlur={confirming ? onCancel : undefined}
          onKeyDown={handleKeyDown}
        >
          <Remold.Text>{confirming ? "Confirm" : "Revoke"}</Remold.Text>
        </button>
      </span>
    </motion.li>
  );
}

function Secret({ apiKey }: { apiKey: ApiKey }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setOpen(true), 260);
    return () => clearTimeout(timer);
  }, []);
  const shown = useScramble(open ? apiKey.value : "•".repeat(apiKey.value.length), {
    duration: 0.9,
    steady: "",
  });
  return (
    <motion.code layout="position" layoutId={`ak-secret-${apiKey.id}`} className="ak-secret-key">
      {shown}
    </motion.code>
  );
}

function CreateButton({
  type = "button",
  disabled,
  onClick,
}: {
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.button
      layoutId="ak-create"
      type={type}
      className="ak-create"
      disabled={disabled}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
    >
      <HugeiconsIcon icon={Add01Icon} aria-hidden="true" />
      Create key
    </motion.button>
  );
}

export interface ApiKeysProps {
  /** The keys, which face the card shows, the new key's name and environment, and its transient notes. */
  value?: ApiKeysValue;
  defaultValue?: ApiKeysValue;
  onValueChange?: (value: ApiKeysValue, details: ChangeDetails) => void;
  /** Moves focus to the name field when you start a new key. */
  autoFocus?: boolean;
  ref?: Ref<HTMLElement>;
}

/** An API keys card: create a key, copy its secret once, and revoke with a second press to confirm. */
export function ApiKeys({ value, defaultValue = REST, onValueChange, autoFocus = true, ref }: ApiKeysProps) {
  const [card, setCard] = useControllableState({ value, defaultValue, onValueChange });
  const input = useRef<HTMLInputElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const springUntil = useRef(0);
  const [height, setHeight] = useState<{ value: number; spring: boolean } | null>(null);
  const { stage, made } = card;

  useLayoutEffect(() => {
    springUntil.current = performance.now() + 600;
  }, [stage]);

  useEffect(() => {
    const element = content.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setHeight({ value: element.offsetHeight, spring: performance.now() < springUntil.current }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (stage === "naming" && autoFocus) input.current?.focus({ preventScroll: true });
  }, [stage, autoFocus]);

  useEffect(() => {
    if (!card.note) return;
    const timer = setTimeout(() => setCard((current) => ({ ...current, note: null }), "timer"), NOTE_FOR);
    return () => clearTimeout(timer);
  }, [card.note, setCard]);

  useEffect(() => {
    if (!card.copied) return;
    const timer = setTimeout(() => setCard((current) => ({ ...current, copied: false }), "timer"), 1600);
    return () => clearTimeout(timer);
  }, [card.copied, setCard]);

  const create = (event: FormEvent) => {
    event.preventDefault();
    setCard((current) => {
      const name = current.draft.trim();
      if (!name) return current;
      const key: ApiKey = {
        id: `k${Date.now()}`,
        name,
        env: current.env,
        value: freshValue(current.env),
        used: "Never used",
      };
      return { ...current, stage: "secret", made: key, copied: false };
    });
  };

  const copy = () => {
    if (made) void navigator.clipboard?.writeText(made.value).catch(() => {});
    setCard((current) => ({ ...current, copied: true }));
  };

  const done = () =>
    setCard((current) =>
      current.made ? { ...REST, keys: [current.made, ...current.keys], landed: current.made.id } : current,
    );

  const revoke = (key: ApiKey) =>
    setCard((current) =>
      current.revoking === key.id
        ? {
            ...current,
            keys: current.keys.filter((other) => other.id !== key.id),
            revoking: null,
            landed: null,
            note: `${key.name} revoked`,
          }
        : { ...current, revoking: key.id },
    );

  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <motion.section
        ref={ref}
        className="ak not-prose"
        aria-label="API keys"
        initial={false}
        animate={{ height: height ? height.value + CARD_PADDING * 2 : "auto" }}
        transition={height?.spring ? SPRING : { duration: 0 }}
      >
        <div ref={content} className="ak-content">
          <LayoutGroup>
            <header className="ak-head">
              <span className="ak-title">
                <b>API keys</b>
                <span aria-live="polite">
                  <Remold.Text>{(stage === "list" && card.note) || SUBTITLES[stage]}</Remold.Text>
                </span>
              </span>
              {stage === "list" && (
                <CreateButton
                  onClick={() =>
                    setCard((current) => ({ ...current, stage: "naming", draft: "", landed: null }))
                  }
                />
              )}
            </header>

            <AnimatePresence mode="popLayout" initial={false}>
              {stage === "naming" && (
                <motion.form key="naming" className="ak-view ak-form" onSubmit={create}>
                  <motion.label className="ak-field" {...part(0.04)}>
                    <span>Name</span>
                    <input
                      ref={input}
                      value={card.draft}
                      placeholder="What will use this key?"
                      onChange={(event) => setCard((current) => ({ ...current, draft: event.target.value }))}
                      maxLength={40}
                    />
                  </motion.label>
                  <div className="ak-form-foot">
                    <motion.div className="ak-env-wrap" {...part(0.08)}>
                      <ToggleGroup
                        className="ak-env"
                        aria-label="Environment"
                        value={[card.env]}
                        onValueChange={(value) =>
                          value[0] && setCard((current) => ({ ...current, env: value[0] as Env }))
                        }
                      >
                        {(["live", "test"] as const).map((env) => (
                          <Toggle key={env} value={env} className="ak-env-item">
                            {card.env === env && (
                              <motion.span layoutId="ak-env-pill" className="ak-env-pill" />
                            )}
                            <span className="ak-dot" data-env={env} aria-hidden="true" />
                            <span>{env === "live" ? "Live" : "Test"}</span>
                          </Toggle>
                        ))}
                      </ToggleGroup>
                    </motion.div>
                    <motion.button
                      type="button"
                      className="ak-ghost"
                      {...part(0.1)}
                      onClick={() => setCard((current) => ({ ...current, stage: "list" }))}
                    >
                      Cancel
                    </motion.button>
                    <CreateButton type="submit" disabled={!card.draft.trim()} />
                  </div>
                </motion.form>
              )}

              {stage === "secret" && made && (
                <motion.div key="secret" className="ak-view">
                  <motion.div className="ak-secret" {...part(0.02)}>
                    <span className="ak-secret-head">
                      <span className="ak-dot" data-env={made.env} />
                      {made.name}
                      <span className="ak-secret-env">{made.env === "live" ? "Live" : "Test"}</span>
                    </span>
                    <span className="ak-secret-line">
                      <Secret apiKey={made} />
                      <button
                        type="button"
                        className="ak-copy"
                        data-copied={card.copied || undefined}
                        onClick={copy}
                      >
                        <Remold.Icon
                          icon={<HugeiconsIcon icon={card.copied ? Tick02Icon : Copy01Icon} />}
                          strokeWidth={2}
                        />
                        <Remold.Text>{card.copied ? "Copied" : "Copy"}</Remold.Text>
                      </button>
                    </span>
                  </motion.div>
                  <motion.button type="button" className="ak-done" {...part(0.1)} onClick={done}>
                    Done
                  </motion.button>
                </motion.div>
              )}

              {stage === "list" && (
                <motion.ul key="list" className="ak-view ak-list">
                  <AnimatePresence>
                    {card.keys.map((apiKey, index) => (
                      <KeyRow
                        key={apiKey.id}
                        apiKey={apiKey}
                        index={index}
                        landed={card.landed === apiKey.id}
                        confirming={card.revoking === apiKey.id}
                        onRevoke={() => revoke(apiKey)}
                        onCancel={() => setCard((current) => ({ ...current, revoking: null }))}
                      />
                    ))}
                  </AnimatePresence>
                </motion.ul>
              )}
            </AnimatePresence>
          </LayoutGroup>
        </div>
      </motion.section>
    </MotionConfig>
  );
}

// The docs demo: a short scripted scene that plays the element above. Your app doesn't need it.

const BEATS: readonly (ApiKeysValue & { ms: number })[] = [
  { ...REST, ms: 1500 },
  { ...REST, stage: "naming", ms: 650 },
  ...typing("Mobile app", (draft) => ({ ...REST, stage: "naming" as const, draft }), { hold: 900 }),
  { ...REST, stage: "secret", draft: "Mobile app", made: MADE, ms: 1900 },
  { ...REST, stage: "secret", draft: "Mobile app", made: MADE, copied: true, ms: 1300 },
  { ...REST, keys: [MADE, ...KEYS], landed: MADE.id, ms: 3000 },
  { ...REST, keys: [MADE, ...KEYS], revoking: "ci", ms: 1500 },
  { ...REST, keys: [MADE, ...KEYS.filter((key) => key.id !== "ci")], note: "CI deploys revoked", ms: 2600 },
];

const fromBeat = (step: number): ApiKeysValue => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

export function ApiKeysDemo({ playing }: { playing?: boolean } = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  return (
    <ApiKeys
      ref={scene.ref}
      value={scene.state}
      onValueChange={scene.onValueChange}
      autoFocus={!scene.live}
    />
  );
}
