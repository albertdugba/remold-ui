"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick01Icon } from "@hugeicons/core-free-icons";
import { Field } from "@base-ui/react/field";
import { Input } from "@base-ui/react/input";
import { AnimatePresence, LayoutGroup, motion, useAnimate } from "motion/react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { MorphIcon } from "./morph-icon";
import { Odometer } from "./odometer";
import { useScene } from "./use-scene";
import "./waitlist.css";

type Phase = "form" | "joining" | "joined";

interface State {
  email: string;
  phase: Phase;
  /** People already on the list. */
  waiting: number;
  /** Bumped when the email is rejected, to shake the field. */
  rejected: number;
}

const START: State = { email: "", phase: "form", waiting: 3214, rejected: 0 };
const EMAIL = "ama@studio.dev";

const BEATS: readonly (State & { ms: number })[] = [
  { ...START, ms: 1300 },
  { ...START, waiting: 3215, ms: 900 },
  ...[3, 7, 11, EMAIL.length].map((n) => ({ ...START, waiting: 3215, email: EMAIL.slice(0, n), ms: 200 })),
  { ...START, waiting: 3215, email: EMAIL, ms: 500 },
  { ...START, waiting: 3215, email: EMAIL, phase: "joining" as const, ms: 900 },
  { ...START, waiting: 3216, email: EMAIL, phase: "joined" as const, ms: 3600 },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

/** What joining early gets you. */
const PERKS = ["Early access, weeks before launch", "Founding-member pricing, for life", "A say in what we build next"];

const VALID = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** The shared shapes travel on one spring, so the field and the button arrive together. */
const MORPH = { type: "spring" as const, duration: 0.6, bounce: 0.16 };
const FOLD = { type: "spring" as const, duration: 0.5, bounce: 0 };
/** Two strokes each: the spinner's arcs reshape into the check's two strokes. */
const SPINNER = "M12 4a8 8 0 0 1 8 8M12 20a8 8 0 0 1-8-8";
const CHECK = "M6.5 12.5l3.5 3.5M10 16l7.5-8";
/** When the disc has landed, the arcs become the check. */
const LAND = 330;
const SETTLE = { type: "spring" as const, duration: 0.45, bounce: 0.25 };

/** Words fade out fast and in late, once the shapes have mostly arrived. */
const OUT = { duration: 0.12 };
const IN = { duration: 0.25, delay: 0.22 };

const FACES = ["Abena Osei", "Yaw Darko", "Esi Ofori", "Kojo Amponsah"];
const face = (name: string) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=${["e0e7ff", "fce7f3", "d1fae5", "fef3c7"][name.length % 4]}`;

interface WaitlistDemoProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function WaitlistDemo({ playing }: WaitlistDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const [field, shake] = useAnimate<HTMLDivElement>();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const id = useId();

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (state.rejected && field.current)
      shake(field.current, { x: [0, -8, 7, -5, 3, 0] }, { duration: 0.42, ease: "easeOut" });
  }, [state.rejected, field, shake]);

  const invalid = state.rejected > 0 && !VALID.test(state.email);
  const joined = state.phase === "joined";

  // The spinner becomes the check once the disc has landed.
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    if (!joined) {
      setLanded(false);
      return;
    }
    const t = setTimeout(() => setLanded(true), LAND);
    return () => clearTimeout(t);
  }, [joined]);

  // The form only animates in when it's coming back from the confirmation, never on first load.
  const back = useRef(false);
  useEffect(() => {
    if (joined) back.current = true;
  }, [joined]);

  const join = (event: FormEvent) => {
    event.preventDefault();
    if (!VALID.test(state.email)) {
      take((s) => ({ ...s, rejected: s.rejected + 1 }));
      return;
    }
    take((s) => ({ ...s, phase: "joining" }));
    timer.current = setTimeout(() => take((s) => ({ ...s, phase: "joined", waiting: s.waiting + 1 })), 900);
  };

  return (
    <section ref={scene.ref} className="wl not-prose" aria-label="Join the waitlist">
      <header className="wl-brand">
        <span className="wl-logo" aria-hidden="true">
          N
        </span>
        <b>Northwind</b>
        <span className="wl-beta">Private beta</span>
      </header>

      <h4 className="wl-title">The calmer way to ship your side project</h4>
      <p className="wl-sub">We're letting people in every week. Get on the list and we'll email you.</p>

      <div className="wl-crowd">
        <span className="wl-faces" aria-hidden="true">
          {FACES.map((n) => (
            <img key={n} src={face(n)} alt="" width={24} height={24} draggable={false} />
          ))}
        </span>
        <span>
          <Odometer value={state.waiting.toLocaleString("en-US")} /> builders waiting
        </span>
      </div>

      <LayoutGroup id={id}>
        <div className="wl-slot" aria-live="polite">
          {joined ? (
            <div className="wl-done">
              {/* The field's background, reshaped into the panel */}
              <motion.span layoutId="shell" className="wl-shell" data-done="" transition={MORPH} />
              <span className="wl-badge">
                {/* The button's fill, slid across and turned into a green disc */}
                <motion.span
                  layoutId="knob"
                  className="wl-knob"
                  initial={{ borderRadius: "0px 14px 14px 0px" }}
                  animate={{ borderRadius: "18px 18px 18px 18px" }}
                  transition={MORPH}
                >
                  {/* The button's dark colour fades off during the trip, so it lands already green */}
                  <motion.span
                    className="wl-knob-tint"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                </motion.span>
                {/* The spinner rides over on the disc, then its arcs reshape into the check */}
                <motion.span layoutId="glyph" className="wl-glyph" transition={MORPH}>
                  <MorphIcon d={landed ? CHECK : SPINNER} strokeWidth={2.6} transition={SETTLE} />
                </motion.span>
              </span>
              <motion.span
                className="wl-done-copy"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={IN}
              >
                <b>You're on the list</b>
                <span>
                  We'll email <em>{state.email}</em> when your spot opens.
                </span>
                <button
                  type="button"
                  className="wl-again"
                  onClick={() => take((s) => ({ ...START, waiting: s.waiting, email: s.email }))}
                >
                  Use a different email
                </button>
              </motion.span>
            </div>
          ) : (
            <form className="wl-form" onSubmit={join} noValidate>
              <Field.Root invalid={invalid}>
                <div ref={field} className="wl-field" data-invalid={invalid || undefined}>
                  <motion.span layoutId="shell" className="wl-shell" transition={MORPH} />
                  <motion.span
                    className="wl-input-wrap"
                    initial={back.current ? { opacity: 0 } : false}
                    animate={{ opacity: 1 }}
                    transition={IN}
                  >
                    <Field.Control
                      render={<Input />}
                      className="wl-input"
                      type="email"
                      placeholder="you@company.com"
                      value={state.email}
                      onValueChange={(v: string) => take((s) => ({ ...s, email: v }))}
                      disabled={state.phase === "joining"}
                      aria-label="Email address"
                    />
                  </motion.span>
                  <button type="submit" className="wl-join" disabled={state.phase === "joining"}>
                    <motion.span
                      layoutId="knob"
                      className="wl-knob"
                      initial={back.current ? { borderRadius: "18px 18px 18px 18px" } : false}
                      animate={{ borderRadius: "0px 14px 14px 0px" }}
                      transition={MORPH}
                    >
                      {/* Coming back, the green fades off the dark as it returns */}
                      {back.current && (
                        <motion.span
                          className="wl-knob-tint"
                          data-good=""
                          initial={{ opacity: 1 }}
                          animate={{ opacity: 0 }}
                          transition={{ duration: 0.4, delay: 0.1 }}
                        />
                      )}
                    </motion.span>
                    <span className="wl-join-label">
                      <AnimatePresence initial={false} mode="popLayout">
                        <motion.span
                          key={state.phase}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0, transition: IN }}
                          exit={{ opacity: 0, y: -8, transition: OUT }}
                        >
                          {state.phase === "joining" ? (
                            <motion.span layoutId="glyph" className="wl-glyph" data-spin="" aria-label="Joining" transition={MORPH}>
                              <MorphIcon d={SPINNER} strokeWidth={2.6} />
                            </motion.span>
                          ) : (
                            "Join waitlist"
                          )}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  </button>
                </div>
              </Field.Root>
            </form>
          )}
        </div>
      </LayoutGroup>

      {/* Everything under the field folds away once you've joined, and comes back if you start over */}
      <AnimatePresence initial={false}>
        {!joined && (
          <motion.div
            key="extra"
            className="wl-extra"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={FOLD}
          >
            <AnimatePresence initial={false}>
              {invalid && (
                <motion.p
                  key="error"
                  role="alert"
                  className="wl-error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={FOLD}
                >
                  That email doesn't look quite right.
                </motion.p>
              )}
            </AnimatePresence>
            <ul className="wl-perks">
              {PERKS.map((perk) => (
                <li key={perk}>
                  <HugeiconsIcon icon={Tick01Icon} aria-hidden="true" />
                  {perk}
                </li>
              ))}
            </ul>
            <p className="wl-fine">No spam. One email when it's your turn.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
