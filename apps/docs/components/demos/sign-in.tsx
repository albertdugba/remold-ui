"use client";

import { Avatar } from "@base-ui/react/avatar";
import { Button } from "@base-ui/react/button";
import { Field } from "@base-ui/react/field";
import { Separator } from "@base-ui/react/separator";
import { Toggle } from "@base-ui/react/toggle";
import {
  FingerPrintIcon,
  Loading03Icon,
  PencilEdit02Icon,
  Tick02Icon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { announce } from "@remold-ui/dom";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, type FormEvent, type ReactNode } from "react";
import { GitHubLogo, GoogleLogo, RemoldLogo } from "./demo-icons";
import { useMeasuredSize } from "./use-measured-size";
import { typing, useScene } from "./use-scene";
import { useSpringHeight } from "./use-spring-height";

export type SignInProvider = "google" | "github" | "passkey";

export interface SignInValue {
  step: "email" | "password" | "done";
  email: string;
  password: string;
  reveal: boolean;
  busy: "email" | "password" | SignInProvider | null;
  error: string | null;
  tries: number;
  passed: boolean;
}

export interface SignInPerson {
  name: string;
  face: string;
}

export interface SignInProps {
  value: SignInValue;
  onValueChange: (value: SignInValue) => void;
  brand: string;
  logo?: ReactNode;
  person: SignInPerson;
  onSubmit: () => void;
  onProvider: (provider: SignInProvider) => void;
  onBack: () => void;
  onSignOut: () => void;
  /** Where "Forgot it?" goes. Pass `null` to show it as plain text, for previews inside another link. */
  forgot?: string | null;
}

const SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.14 };
const SETTLE = { type: "spring" as const, duration: 0.35, bounce: 0 };
const SHAKE = { duration: 0.34, ease: "easeOut" as const };

const PART = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  shown: { opacity: 1, y: 0, filter: "blur(0px)", transition: { ...SPRING, delay: 0.06 } },
  gone: { opacity: 0, filter: "blur(4px)", transition: { duration: 0.12 } },
};
const INNER = {
  hidden: { opacity: 0, filter: "blur(4px)" },
  shown: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.2, delay: 0.12 } },
  gone: { opacity: 0, filter: "blur(4px)", transition: { duration: 0.1 } },
};
const STILL_PART = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.12 } },
  gone: { opacity: 0, transition: { duration: 0.1 } },
};

const PROVIDERS: readonly { id: SignInProvider; label: string; icon: ReactNode }[] = [
  { id: "google", label: "Google", icon: <GoogleLogo /> },
  { id: "github", label: "GitHub", icon: <GitHubLogo /> },
  { id: "passkey", label: "Passkey", icon: <HugeiconsIcon icon={FingerPrintIcon} strokeWidth={1.8} /> },
];

const TOKENS = [
  "[--sgn-ink:#0a0a0b] [--sgn-ink-hover:#26262a] [--sgn-muted:#6c6c75] [--sgn-surface:#ffffff] [--sgn-well:#f4f4f5] [--sgn-hover:#ececee] [--sgn-focus:#ebebed]",
  "[--sgn-line:rgb(10_10_11/0.08)] [--sgn-danger:#c8323a] [--sgn-danger-well:#fdf0f0]",
  "dark:[--sgn-ink:#fafafa] dark:[--sgn-ink-hover:#e4e4e7] dark:[--sgn-muted:#a1a1aa] dark:[--sgn-surface:#1c1c1f] dark:[--sgn-well:#27272b] dark:[--sgn-hover:#303035] dark:[--sgn-focus:#2e2e33]",
  "dark:[--sgn-line:rgb(255_255_255/0.09)] dark:[--sgn-danger:#f87171] dark:[--sgn-danger-well:rgb(248_113_113/0.12)]",
].join(" ");

const RING = "outline-none focus-visible:shadow-[0_0_0_2px_var(--sgn-surface),0_0_0_4px_var(--sgn-ink)]";
const EASE = "transition-[background-color,color,box-shadow,scale] duration-150 ease-out motion-reduce:transition-none";
const LABEL = "text-[13px] font-medium text-(--sgn-ink)";
const INPUT =
  "relative h-11 w-full rounded-[14px] border-0 bg-transparent px-3.5 font-sans text-[15px] text-(--sgn-ink) outline-none";
const FILL =
  "absolute inset-0 bg-(--sgn-well) shadow-[inset_0_0_0_1.8px_var(--sgn-ink)] transition-[background-color,box-shadow] duration-150 ease-out group-hover/field:bg-(--sgn-focus) group-focus-within/field:bg-(--sgn-focus) data-invalid:bg-(--sgn-danger-well) data-invalid:shadow-[inset_0_0_0_1.8px_var(--sgn-danger)] motion-reduce:transition-none";

function Spinner() {
  return (
    <span className="grid place-items-center [&_svg]:size-[18px] [&_svg]:animate-spin motion-reduce:[&_svg]:[animation-duration:2.4s]">
      <HugeiconsIcon icon={Loading03Icon} strokeWidth={2.2} aria-hidden="true" />
    </span>
  );
}

function Shaken({ error, tries, children }: { error: string | null; tries: number; children: ReactNode }) {
  const reduced = useReducedMotion();
  const [scope, shake] = useAnimate<HTMLDivElement>();

  useEffect(() => {
    if (!error || reduced || !scope.current) return;

    shake(scope.current, { x: [0, -7, 6, -4, 2, 0] }, SHAKE);
  }, [error, tries, reduced, scope, shake]);

  return (
    <div ref={scope} className="group/field relative grid">
      {children}
    </div>
  );
}

export function SignIn({ value, onValueChange, brand, logo, person, onSubmit, onProvider, onBack, onSignOut, forgot = "#" }: SignInProps) {
  const id = useId();
  const reduced = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const within = useRef(false);
  const [content, size] = useMeasuredSize<HTMLDivElement>();
  const sprung = useSpringHeight(size ? size.height + 4 : null);
  const { step, busy } = value;
  const part = reduced ? STILL_PART : PART;
  const inner = reduced ? STILL_PART : INNER;
  const invalid = value.error ? "" : undefined;
  const first = person.name.split(" ")[0];
  const change = (next: Partial<SignInValue>) => onValueChange({ ...value, ...next });

  useEffect(() => {
    if (!within.current) return;

    root.current?.querySelector<HTMLElement>(`[data-sgn-focus="${step}"]`)?.focus({ preventScroll: true });
  }, [step]);

  const submit = (event: FormEvent) => {
    event.preventDefault();

    if (!busy && !value.passed) onSubmit();
  };

  const title = step === "email" ? `Sign in to ${brand}` : step === "password" ? "Enter your password" : `Welcome back, ${first}`;
  const detail =
    step === "email" ? "Good to see you again. Pick a way in." : step === "password" ? "One more step and you’re in." : `You’re signed in as ${value.email}.`;

  const face = (
    <Avatar.Root className="grid size-full place-items-center overflow-hidden rounded-full bg-(--sgn-well) text-[0.42em] font-semibold text-(--sgn-ink) uppercase">
      <Avatar.Image src={person.face} alt="" className="size-full object-cover" draggable={false} />
      <Avatar.Fallback delay={400}>{first.charAt(0)}</Avatar.Fallback>
    </Avatar.Root>
  );

  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <LayoutGroup id={id}>
        <section
          ref={root}
          onFocus={() => {
            within.current = true;
          }}
          onBlur={(event) => {
            if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) within.current = false;
          }}
          className={`w-[min(100%,384px)] rounded-[28px] bg-(--sgn-surface) px-7 pt-8 pb-6 font-sans text-(--sgn-ink) ${TOKENS}`}
          aria-label={`Sign in to ${brand}`}
        >
          <motion.div className="-mx-2 overflow-hidden px-2 pb-1" style={{ height: sprung }}>
            <div ref={content} className="grid">
              <div className="grid justify-items-center gap-1 pb-5 text-center">
                <span className="relative mb-2 grid size-12 place-items-center">
                  <AnimatePresence initial={false} mode="popLayout">
                    {step === "done" ? (
                      <motion.span key="face" layoutId="face" className="block size-12 text-[48px]" style={{ borderRadius: 999 }}>
                        {face}
                      </motion.span>
                    ) : (
                      <motion.span
                        key="brand"
                        className="grid size-12 place-items-center rounded-[15px] bg-(--sgn-ink) text-[20px] font-semibold text-(--sgn-surface) uppercase [&_svg]:size-6"
                        exit={{ opacity: 0, scale: 0.8, filter: "blur(4px)", transition: SETTLE }}
                        aria-hidden="true"
                      >
                        {logo ?? brand.charAt(0)}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <h2 className="m-0 text-[19px] leading-[1.25] font-semibold tracking-[-0.015em]">
                  <Remold.Text className="inline-block whitespace-nowrap">{title}</Remold.Text>
                </h2>
                <p className="m-0 max-w-full truncate text-[14px] text-(--sgn-muted)">
                  <Remold.Text className="inline-block whitespace-nowrap">{detail}</Remold.Text>
                </p>
              </div>

              <AnimatePresence initial={false} mode="popLayout">
                {step === "done" ? (
                  <motion.div key="done" className="grid justify-items-center" initial="hidden" animate="shown" exit="gone" variants={part}>
                    <button
                      type="button"
                      data-sgn-focus="done"
                      onClick={onSignOut}
                      className={`h-10 cursor-pointer rounded-full border-0 bg-(--sgn-well) px-4 font-sans text-[14px] font-semibold text-(--sgn-ink) hover:bg-(--sgn-hover) active:scale-[0.97] ${EASE} ${RING}`}
                    >
                      Sign out
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    noValidate
                    onSubmit={submit}
                    className="grid gap-4"
                    initial="hidden"
                    animate="shown"
                    exit="gone"
                    variants={part}
                  >
                    <AnimatePresence initial={false} mode="popLayout">
                      {step === "email" ? (
                        <motion.div key="email" className="grid gap-4" initial="hidden" animate="shown" exit="gone">
                          <motion.div className="grid grid-cols-3 gap-2" variants={part}>
                            {PROVIDERS.map((provider) => (
                              <Button
                                key={provider.id}
                                type="button"
                                onClick={() => onProvider(provider.id)}
                                disabled={busy !== null && busy !== provider.id}
                                aria-busy={busy === provider.id || undefined}
                                aria-label={`Continue with ${provider.label}`}
                                className={`flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[14px] border-0 bg-(--sgn-surface) font-sans text-[13.5px] font-medium text-(--sgn-ink) shadow-[0_0_0_1px_var(--sgn-line),0_1px_2px_rgb(10_10_11/0.04)] not-disabled:hover:bg-(--sgn-well) not-disabled:active:scale-[0.97] disabled:cursor-default disabled:opacity-45 aria-busy:cursor-progress [&_svg]:size-[18px] ${EASE} ${RING}`}
                              >
                                {busy === provider.id ? <Spinner /> : provider.icon}
                                {provider.label}
                              </Button>
                            ))}
                          </motion.div>

                          <motion.div className="flex items-center gap-3 text-[12.5px] text-(--sgn-muted)" variants={part}>
                            <Separator className="h-px flex-1 bg-(--sgn-line)" />
                            or
                            <Separator className="h-px flex-1 bg-(--sgn-line)" />
                          </motion.div>

                          <Field.Root name="email" invalid={value.error !== null} className="grid gap-[7px] text-left">
                            <motion.div className="grid" variants={part}>
                              <Field.Label className={LABEL}>Email</Field.Label>
                            </motion.div>
                            <Shaken error={value.error} tries={value.tries}>
                              <motion.span layoutId="email" data-invalid={invalid} className={FILL} style={{ borderRadius: 14 }} />
                              <motion.div className="relative grid" variants={inner}>
                                <Field.Control
                                  data-sgn-focus="email"
                                  className={INPUT}
                                  inputMode="email"
                                  autoComplete="username"
                                  autoCapitalize="none"
                                  autoCorrect="off"
                                  spellCheck={false}
                                  value={value.email}
                                  readOnly={busy !== null}
                                  onChange={(event) => change({ email: event.target.value, error: null })}
                                />
                              </motion.div>
                            </Shaken>
                            {value.error && (
                              <Field.Error match className="text-[12.5px] text-(--sgn-danger)">
                                {value.error}
                              </Field.Error>
                            )}
                          </Field.Root>
                        </motion.div>
                      ) : (
                        <motion.div key="password" className="grid gap-4" initial="hidden" animate="shown" exit="gone">
                          <div className="grid justify-items-center">
                            <button
                              type="button"
                              onClick={onBack}
                              disabled={busy !== null || value.passed}
                              aria-label={`Change email, ${value.email}`}
                              className={`group/chip relative flex h-10 max-w-full cursor-pointer items-center gap-2 rounded-full border-0 bg-transparent pr-3 pl-1.5 font-sans text-[13.5px] font-medium text-(--sgn-ink) not-disabled:active:scale-[0.97] disabled:cursor-default [&_svg]:size-3.5 [&_svg]:flex-none [&_svg]:text-(--sgn-muted) ${EASE} ${RING}`}
                            >
                              <motion.span layoutId="email" className="absolute inset-0 bg-(--sgn-well)" style={{ borderRadius: 999 }} />
                              <motion.span layoutId="face" className="relative block size-7 flex-none text-[28px]" style={{ borderRadius: 999 }} variants={inner}>
                                {face}
                              </motion.span>
                              <motion.span className="relative min-w-0 truncate" variants={inner}>
                                {value.email}
                              </motion.span>
                              <motion.span className="relative grid" variants={inner}>
                                <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} aria-hidden="true" />
                              </motion.span>
                            </button>
                          </div>

                          <motion.div className="grid" variants={part}>
                            <Field.Root name="password" invalid={value.error !== null} className="grid gap-[7px] text-left">
                              <span className="flex items-baseline justify-between">
                                <Field.Label className={LABEL}>Password</Field.Label>
                                {forgot === null ? (
                                  <span className="text-[12.5px] font-medium text-(--sgn-muted)">Forgot it?</span>
                                ) : (
                                  <a href={forgot} onClick={(event) => forgot === "#" && event.preventDefault()} className={`rounded-sm text-[12.5px] font-medium text-(--sgn-muted) no-underline hover:text-(--sgn-ink) ${EASE} ${RING}`}>
                                    Forgot it?
                                  </a>
                                )}
                              </span>
                              <Shaken error={value.error} tries={value.tries}>
                                <span data-invalid={invalid} className={`${FILL} rounded-[14px]`} />
                                <Field.Control
                                  data-sgn-focus="password"
                                  className={`${INPUT} pr-12`}
                                  type={value.reveal ? "text" : "password"}
                                  autoComplete="current-password"
                                  autoCapitalize="none"
                                  autoCorrect="off"
                                  spellCheck={false}
                                  value={value.password}
                                  readOnly={busy !== null || value.passed}
                                  onChange={(event) => change({ password: event.target.value, error: null })}
                                />
                                <Toggle
                                  pressed={value.reveal}
                                  onPressedChange={(reveal) => change({ reveal })}
                                  aria-label="Show password"
                                  className={`absolute top-1.5 right-1.5 grid size-8 cursor-pointer place-items-center rounded-[10px] border-0 bg-transparent text-(--sgn-muted) hover:bg-(--sgn-hover) hover:text-(--sgn-ink) [&_svg]:size-[18px] ${EASE} ${RING}`}
                                >
                                  <Remold.Icon
                                    icon={<HugeiconsIcon icon={value.reveal ? ViewOffSlashIcon : ViewIcon} />}
                                    strokeWidth={1.8}
                                    spring={{ duration: 0.4, bounce: 0.1 }}
                                    aria-hidden="true"
                                  />
                                </Toggle>
                              </Shaken>
                              {value.error && (
                                <Field.Error match className="text-[12.5px] text-(--sgn-danger)">
                                  {value.error}
                                </Field.Error>
                              )}
                            </Field.Root>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.div className="grid" layout="position">
                      <Button
                        type="submit"
                        disabled={busy !== null && busy !== step}
                        aria-busy={busy === step || undefined}
                        aria-label={value.passed ? "Signed in" : busy === step ? "Checking" : step === "email" ? "Continue" : "Sign in"}
                        className={`grid h-11 cursor-pointer place-items-center rounded-full border-0 bg-(--sgn-ink) font-sans text-[14.5px] font-semibold text-(--sgn-surface) shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_1px_2px_rgb(10_10_11/0.16)] not-disabled:hover:bg-(--sgn-ink-hover) not-disabled:active:scale-[0.97] disabled:cursor-default disabled:opacity-45 aria-busy:cursor-progress ${EASE} ${RING}`}
                      >
                        <AnimatePresence initial={false} mode="popLayout">
                          {value.passed ? (
                            <motion.span
                              key="passed"
                              className="grid place-items-center [&_svg]:size-5"
                              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5, filter: "blur(3px)" }}
                              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                              transition={{ type: "spring", duration: 0.45, bounce: 0.4 }}
                            >
                              <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.6} aria-hidden="true" />
                            </motion.span>
                          ) : busy === step ? (
                            <motion.span
                              key="busy"
                              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, filter: "blur(3px)" }}
                              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                              exit={{ opacity: 0, transition: { duration: 0.1 } }}
                              transition={SETTLE}
                            >
                              <Spinner />
                            </motion.span>
                          ) : (
                            <motion.span key="label" exit={{ opacity: 0, filter: "blur(3px)", transition: { duration: 0.1 } }} aria-hidden="true">
                              <Remold.Text className="inline-block whitespace-nowrap">{step === "email" ? "Continue" : "Sign in"}</Remold.Text>
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </Button>
                    </motion.div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </section>
      </LayoutGroup>
    </MotionConfig>
  );
}

const BRAND = "Remold";
const EMAIL = "elorm@remold.app";
const SECRET = "sunbird-harbour";
const REQUEST = 900;
const LOOKUP = 450;
const HANDOVER = 750;

const REST: SignInValue = { step: "email", email: "", password: "", reveal: false, busy: null, error: null, tries: 0, passed: false };
const KNOWN: SignInValue = { ...REST, email: EMAIL };
const ASKED: SignInValue = { ...KNOWN, step: "password" };
const FILLED: SignInValue = { ...ASKED, password: SECRET };

const BEATS: readonly (SignInValue & { ms: number })[] = [
  { ...REST, ms: 1500 },
  ...typing(EMAIL, (email) => ({ ...REST, email }), { every: 60, hold: 500 }),
  { ...KNOWN, busy: "email", ms: LOOKUP },
  { ...ASKED, ms: 1000 },
  ...typing(SECRET, (password) => ({ ...ASKED, password }), { every: 60, hold: 500 }),
  { ...FILLED, busy: "password", ms: REQUEST },
  { ...FILLED, passed: true, ms: HANDOVER },
  { ...FILLED, step: "done", ms: 2800 },
];

const fromBeat = (step: number): SignInValue => {
  const { ms: _ms, ...state } = BEATS[step]!;

  return state;
};

const personOf = (email: string): SignInPerson => {
  const handle = email.split("@")[0]?.replace(/[^a-z0-9]+/gi, " ").trim() || "there";
  const name = handle.replace(/\b\w/g, (letter) => letter.toUpperCase());

  return { name, face: `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(email === EMAIL ? "Elorm Kpodo" : name)}&backgroundColor=f1f1f3` };
};

interface SignInDemoProps {
  playing?: boolean;
  preview?: boolean;
}

export function SignInDemo({ playing, preview: previewing }: SignInDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing, false, previewing ? ASKED : undefined);
  const preview = previewing && !scene.taken;
  const { ref, takeOver, live } = scene;
  const state = scene.state;
  const { busy, passed } = state;

  useEffect(() => {
    if (live || preview || !busy) return;

    const timer = setTimeout(
      () => {
        takeOver((current) => {
          if (current.busy === "email") return { ...current, busy: null, step: "password" };

          if (current.busy === "password" && current.password.length < 8) {
            announce("That password isn’t right");

            return { ...current, busy: null, error: "That password isn’t right. Try again.", tries: current.tries + 1 };
          }

          return current.busy === "password" ? { ...current, busy: null, passed: true } : { ...current, busy: null, step: "done", email: current.email || EMAIL };
        });
      },
      busy === "email" ? LOOKUP : busy === "password" ? REQUEST : 1200,
    );

    return () => clearTimeout(timer);
  }, [busy, live, preview, takeOver]);

  useEffect(() => {
    if (live || preview || !passed || state.step === "done") return;

    const timer = setTimeout(() => {
      takeOver((current) => ({ ...current, step: "done" }));
      announce("Signed in");
    }, HANDOVER);

    return () => clearTimeout(timer);
  }, [passed, state.step, live, preview, takeOver]);

  const submit = () => {
    if (state.step === "email" && !/^\S+@\S+\.\S+$/.test(state.email.trim())) {
      takeOver((current) => ({ ...current, error: "Enter a full email address, like you@company.com.", tries: current.tries + 1 }));
      announce("Enter a full email address");

      return;
    }

    takeOver((current) => ({ ...current, email: current.email.trim(), busy: current.step === "email" ? "email" : "password", error: null }));
  };

  return (
    <div ref={ref} className="not-prose grid w-full place-items-center font-sans antialiased">
      <div className="grid min-h-[470px] w-full place-items-center">
        <SignIn
          value={state}
          onValueChange={(next) => takeOver(next)}
          brand={BRAND}
          logo={<RemoldLogo />}
          person={personOf(state.email || EMAIL)}
          onSubmit={submit}
          onProvider={(provider) => takeOver((current) => ({ ...current, busy: provider, error: null }))}
          onBack={() => takeOver((current) => ({ ...current, step: "email", password: "", reveal: false, error: null }))}
          onSignOut={() => takeOver(REST)}
          forgot={previewing ? null : undefined}
        />
      </div>
    </div>
  );
}
