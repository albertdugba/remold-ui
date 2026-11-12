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

const PALETTE = [
  "[--ak-surface:#ffffff] [--ak-field:#f4f4f5] [--ak-line:rgb(24_24_27/0.07)] [--ak-ink:#18181b] [--ak-muted:#71717a] [--ak-quiet:#a1a1aa]",
  "[--ak-live:#22c55e] [--ak-test:#f59e0b] [--ak-vault:#111113] [--ak-vault-ink:#f4f4f5] [--ak-vault-muted:#8b8b93] [--ak-vault-line:rgb(255_255_255/0.08)]",
  "[--ak-danger:#dc2626] [--ak-on-danger:#ffffff] [--ak-danger-tint:color-mix(in_oklab,#dc2626_7%,transparent)]",
  "dark:[--ak-surface:#1f1f23] dark:[--ak-field:#2a2a2f] dark:[--ak-line:rgb(255_255_255/0.07)] dark:[--ak-ink:#fafafa] dark:[--ak-muted:#a1a1aa] dark:[--ak-quiet:#71717a] dark:[--ak-vault:#0b0b0d]",
  "dark:[--ak-danger:#f87171] dark:[--ak-on-danger:#1f1f23] dark:[--ak-danger-tint:rgb(248_113_113/0.12)]",
].join(" ");

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1]";
const BUTTON_TYPE = `inline-flex cursor-pointer items-center gap-[5px] border-0 px-[13px] text-[13px] font-semibold whitespace-nowrap ${FOCUS}`;
const BUTTON = `h-[34px] rounded-[10px] ${BUTTON_TYPE}`;
const VIEW = "grid min-w-0 gap-2.5";
const MONO = "font-[ui-monospace,'SF_Mono',Menlo,monospace]";

function Dot({ env, small, label }: { env: Env; small?: boolean; label?: string }) {
  return (
    <span
      data-env={env}
      data-small={small || undefined}
      className="size-[7px] flex-none rounded-full bg-(--ak-live) shadow-[0_0_0_3px_color-mix(in_oklab,var(--ak-live)_18%,transparent)] data-[env=test]:bg-(--ak-test) data-[env=test]:shadow-[0_0_0_3px_color-mix(in_oklab,var(--ak-test)_18%,transparent)] data-small:size-1.5 data-small:shadow-none!"
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

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
      data-landed={landed || undefined}
      data-confirming={confirming || undefined}
      className="group/row relative overflow-clip rounded-xl transition-[background-color] duration-200 not-first:before:absolute not-first:before:top-0 not-first:before:right-1 not-first:before:left-[22px] not-first:before:h-px not-first:before:bg-(--ak-line) not-first:before:content-[''] data-confirming:bg-(--ak-danger-tint)"
      initial={landed ? false : arrive.initial}
      animate={arrive.animate}
      exit={{ opacity: 0, height: 0, filter: "blur(4px)", transition: { ...SPRING, bounce: 0 } }}
    >
      <span className="flex min-h-[52px] items-center gap-[11px] px-1">
        <Dot env={apiKey.env} label={apiKey.env === "live" ? "Live" : "Test"} />
        <span className="grid min-w-0 flex-1 leading-[1.35]">
          <span className="truncate text-[13.5px] font-semibold">{apiKey.name}</span>
          <motion.code
            layout="position"
            layoutId={`ak-secret-${apiKey.id}`}
            className={`overflow-hidden text-[12px] whitespace-nowrap text-(--ak-muted) ${MONO}`}
          >
            {shown}
          </motion.code>
        </span>
        <span className="flex-none text-[12px] text-(--ak-quiet) group-data-confirming/row:hidden">{apiKey.used}</span>
        <button
          type="button"
          className="h-7 flex-none cursor-pointer rounded-lg border-0 bg-transparent px-2.5 text-[12.5px] font-semibold whitespace-nowrap text-(--ak-muted) opacity-0 transition-[opacity,background-color,color] duration-150 group-hover/row:opacity-100 hover:text-(--ak-danger) focus-visible:opacity-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--ak-ink) group-data-confirming/row:bg-(--ak-danger) group-data-confirming/row:text-(--ak-on-danger) group-data-confirming/row:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100"
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
    <motion.code
      layout="position"
      layoutId={`ak-secret-${apiKey.id}`}
      className={`min-w-0 flex-1 truncate text-[13px] tracking-[0.01em] @max-[520px]:text-[12px] ${MONO}`}
    >
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
      className={`${BUTTON} bg-(--ak-ink) text-(--ak-surface) disabled:cursor-default disabled:opacity-30`}
      disabled={disabled}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
    >
      <HugeiconsIcon icon={Add01Icon} strokeWidth={2.5} className="size-3.5" aria-hidden="true" />
      Create key
    </motion.button>
  );
}

export interface ApiKeysProps {
  value?: ApiKeysValue;
  defaultValue?: ApiKeysValue;
  onValueChange?: (value: ApiKeysValue, details: ChangeDetails) => void;
  autoFocus?: boolean;
  ref?: Ref<HTMLElement>;
}

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
        className={`ak not-prose relative box-border block w-[min(100%,420px)] min-w-0 overflow-clip rounded-[22px] bg-(--ak-surface) p-[18px] font-sans text-(--ak-ink) @max-[520px]:w-[min(100%,360px)] @max-[520px]:rounded-[20px] @max-[520px]:p-4 ${PALETTE}`}
        aria-label="API keys"
        initial={false}
        animate={{ height: height ? height.value + CARD_PADDING * 2 : "auto" }}
        transition={height?.spring ? SPRING : { duration: 0 }}
      >
        <div ref={content} className="relative grid min-w-0 gap-3.5">
          <LayoutGroup>
            <header className="flex min-h-9 items-center justify-between gap-3">
              <span className="grid leading-[1.3]">
                <b className="text-[15px] font-[650] tracking-[-0.01em]">API keys</b>
                <span className="text-[12.5px] text-(--ak-muted)" aria-live="polite">
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
                <motion.form key="naming" className={VIEW} onSubmit={create}>
                  <motion.label className="grid gap-[5px]" {...part(0.04)}>
                    <span className="text-[11.5px] font-medium text-(--ak-muted)">Name</span>
                    <input
                      className="h-[42px] rounded-xl border-0 bg-(--ak-field) px-3 text-[14px] text-(--ak-ink) outline-none transition-shadow duration-150 placeholder:text-(--ak-quiet) focus:shadow-[inset_0_0_0_1.5px_color-mix(in_oklab,var(--ak-ink)_20%,transparent)]"
                      ref={input}
                      value={card.draft}
                      placeholder="What will use this key?"
                      onChange={(event) => setCard((current) => ({ ...current, draft: event.target.value }))}
                      maxLength={40}
                    />
                  </motion.label>
                  <div className="flex items-center gap-2">
                    <motion.div className="min-w-0 flex-1" {...part(0.08)}>
                      <ToggleGroup
                        className="flex h-[34px] gap-0.5 rounded-[10px] bg-(--ak-field) p-[3px]"
                        aria-label="Environment"
                        value={[card.env]}
                        onValueChange={(value) =>
                          value[0] && setCard((current) => ({ ...current, env: value[0] as Env }))
                        }
                      >
                        {(["live", "test"] as const).map((env) => (
                          <Toggle
                            key={env}
                            value={env}
                            className={`relative inline-flex h-full min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[7px] border-0 bg-transparent px-2 text-[12.5px] font-semibold text-(--ak-muted) data-pressed:text-(--ak-ink) [&>*]:relative ${FOCUS}`}
                          >
                            {card.env === env && (
                              <motion.span
                                layoutId="ak-env-pill"
                                className="absolute! inset-0 rounded-[7px] bg-(--ak-surface) shadow-[0_1px_2px_rgb(24_24_27/0.08)]"
                              />
                            )}
                            <Dot env={env} small />
                            <span>{env === "live" ? "Live" : "Test"}</span>
                          </Toggle>
                        ))}
                      </ToggleGroup>
                    </motion.div>
                    <motion.button
                      type="button"
                      className={`${BUTTON} bg-transparent text-(--ak-muted) hover:text-(--ak-ink)`}
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
                <motion.div key="secret" className={VIEW}>
                  <motion.div
                    className="grid min-w-0 gap-3 rounded-2xl bg-(--ak-vault) p-3.5 text-(--ak-vault-ink) @max-[520px]:gap-2.5 @max-[520px]:rounded-[14px] @max-[520px]:p-3"
                    {...part(0.02)}
                  >
                    <span className="flex items-center gap-2 text-[13px] font-semibold">
                      <Dot env={made.env} />
                      {made.name}
                      <span className="ml-auto text-[11.5px] font-medium text-(--ak-vault-muted)">{made.env === "live" ? "Live" : "Test"}</span>
                    </span>
                    <span className="flex h-11 min-w-0 items-center gap-2 overflow-hidden rounded-[10px] bg-white/6 pr-1.5 pl-3 shadow-[inset_0_0_0_1px_var(--ak-vault-line)] @max-[520px]:h-10 @max-[520px]:pr-[5px] @max-[520px]:pl-2.5">
                      <Secret apiKey={made} />
                      <button
                        type="button"
                        data-copied={card.copied || undefined}
                        className={`inline-flex h-8 flex-none cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-(--ak-vault-ink) pr-[11px] pl-[9px] text-[12.5px] font-semibold text-(--ak-vault) transition-colors duration-250 @max-[520px]:h-[30px] @max-[520px]:gap-[5px] @max-[520px]:pr-[9px] @max-[520px]:pl-2 [&_svg]:size-[15px] ${FOCUS}`}
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
                  <motion.button
                    type="button"
                    className={`${BUTTON_TYPE} h-[42px] justify-center rounded-xl bg-(--ak-field) text-(--ak-ink) hover:bg-[color-mix(in_oklab,var(--ak-ink)_8%,var(--ak-field))]`}
                    {...part(0.1)}
                    onClick={done}
                  >
                    Done
                  </motion.button>
                </motion.div>
              )}

              {stage === "list" && (
                <motion.ul key="list" className="m-0 grid min-w-0 list-none gap-0 p-0">
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
