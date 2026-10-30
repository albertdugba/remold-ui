"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { MorphIcon } from "./morph-icon";
import { useScene } from "./use-scene";
import { useScramble } from "./use-scramble";
import "./api-keys.css";

type Env = "live" | "test";

interface Key {
  id: string;
  name: string;
  env: Env;
  value: string;
  used: string;
}

const KEYS: Key[] = [
  { id: "prod", name: "Production", env: "live", value: "nw_live_8fK2pQ7xVt3mLs9R7Q3f", used: "2 min ago" },
  { id: "stage", name: "Staging", env: "test", value: "nw_test_Yh4nB8cW2kPz6Ej1x2Dd", used: "1 hr ago" },
  { id: "ci", name: "CI deploys", env: "live", value: "nw_live_Rm5tG9aQ1sZu7Kc3b8Hw", used: "Yesterday" },
];

const MADE: Key = { id: "mobile", name: "Mobile app", env: "live", value: "nw_live_Vb3sK8wZ1nQe5Ry7t4Mc", used: "Never used" };

/** The prefix and the last four stay readable; everything between is masked. */
const mask = (value: string) => value.slice(0, 8) + "•".repeat(8) + value.slice(-4);

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const freshValue = (env: Env) =>
  `nw_${env}_${Array.from({ length: 20 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("")}`;

const COPY = "M9 9.5h9.5V19H9zM6 14.5H5.5V5h9.5v.5";
const CHECK = "M5.5 12.5l4 4M9.5 16.5L18.5 7.5";

type Stage = "list" | "naming" | "secret";

interface State {
  keys: readonly Key[];
  stage: Stage;
  /** The name being typed, and its environment. */
  draft: string;
  env: Env;
  /** The key just made: its secret shows once, in the panel. */
  made: Key | null;
  copied: boolean;
  /** The newest row, which lands with its secret still showing, then masks itself. */
  landed: string | null;
}

const REST: State = { keys: KEYS, stage: "list", draft: "", env: "live", made: null, copied: false, landed: null };

const BEATS: readonly (State & { ms: number })[] = [
  { ...REST, ms: 1500 },
  { ...REST, stage: "naming", ms: 650 },
  { ...REST, stage: "naming", draft: "Mob", ms: 260 },
  { ...REST, stage: "naming", draft: "Mobile a", ms: 260 },
  { ...REST, stage: "naming", draft: "Mobile app", ms: 900 },
  { ...REST, stage: "secret", draft: "Mobile app", made: MADE, ms: 1900 },
  { ...REST, stage: "secret", draft: "Mobile app", made: MADE, copied: true, ms: 1300 },
  { ...REST, keys: [MADE, ...KEYS], landed: MADE.id, ms: 3000 },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

const SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.14 };

/** Folded away: no height, and a negative margin that takes back the gap it sat in. Only a plain
 *  wrapper folds; the padded panel inside it keeps its shape and is simply clipped. */
const FOLDED = { opacity: 0, height: 0, marginBottom: -10 };
const OPEN = { opacity: 1, height: "auto", marginBottom: 0 };
/** Folding shut: one eased timing for height, padding and fade, so they land together. */
const FOLD = { duration: 0.34, ease: [0.32, 0.72, 0, 1] as const };

/** A key in the list: masked. The one that just landed arrives with its secret and masks itself. */
function KeyRow({ k, landed }: { k: Key; landed: boolean }) {
  // A key that just landed still shows its secret, then scrambles into its mask once it has settled.
  const [masked, setMasked] = useState(!landed);
  useEffect(() => {
    if (!landed) return;
    const t = setTimeout(() => setMasked(true), 520);
    return () => clearTimeout(t);
  }, [landed]);
  const shown = useScramble(masked ? mask(k.value) : k.value, { duration: 0.8 });
  return (
    <motion.li
      layout="position"
      className="ak-row"
      data-landed={landed || undefined}
      // A new row opens by height, never by scale, so nothing in it is squeezed.
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={SPRING}
    >
      <span className="ak-dot" data-env={k.env} aria-label={k.env === "live" ? "Live" : "Test"} />
      <span className="ak-row-copy">
        <span className="ak-row-name">{k.name}</span>
        <motion.code layout="position" layoutId={`secret-${k.id}`} transition={SPRING} className="ak-row-key">
          {shown}
        </motion.code>
      </span>
      <span className="ak-row-used">{k.used}</span>
    </motion.li>
  );
}

/** The secret, shown once: it decodes from noise as the panel opens. */
function Secret({ k }: { k: Key }) {
  // It opens as dots and decodes, left to right, into the real key.
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 180);
    return () => clearTimeout(t);
  }, []);
  const shown = useScramble(open ? k.value : "•".repeat(k.value.length), { duration: 0.9, steady: "" });
  return (
    <motion.code layout="position" layoutId={`secret-${k.id}`} transition={SPRING} className="ak-secret-key">
      {shown}
    </motion.code>
  );
}

interface ApiKeysDemoProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function ApiKeysDemo({ playing }: ApiKeysDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const input = useRef<HTMLInputElement>(null);

  // Opening the form puts you in the name field.
  useEffect(() => {
    if (state.stage === "naming" && !scene.live) input.current?.focus({ preventScroll: true });
  }, [state.stage, scene.live]);

  // The check turns back into the copy icon after a moment.
  useEffect(() => {
    if (!state.copied || scene.live) return;
    const t = setTimeout(() => take((s) => ({ ...s, copied: false })), 1600);
    return () => clearTimeout(t);
  }, [state.copied, scene.live, take]);

  const create = (event: FormEvent) => {
    event.preventDefault();
    take((s) => {
      const name = s.draft.trim();
      if (!name) return s;
      const made: Key = { id: `k${Date.now()}`, name, env: s.env, value: freshValue(s.env), used: "Never used" };
      return { ...s, stage: "secret", made, copied: false };
    });
  };

  const copy = () => {
    if (state.made) void navigator.clipboard?.writeText(state.made.value).catch(() => {});
    take((s) => ({ ...s, copied: true }));
  };

  const done = () =>
    take((s) => (s.made ? { ...REST, keys: [s.made, ...s.keys], landed: s.made.id } : s));

  const made = state.made;

  return (
    <section ref={scene.ref} className="ak not-prose" aria-label="API keys">
      <header className="ak-head">
        <span className="ak-title">
          <b>API keys</b>
          <span>For calling the Northwind API</span>
        </span>
        <AnimatePresence initial={false}>
          {state.stage === "list" && (
            <motion.button
              type="button"
              className="ak-create"
              onClick={() => take((s) => ({ ...s, stage: "naming", draft: "", landed: null }))}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
              transition={SPRING}
            >
              <HugeiconsIcon icon={Add01Icon} aria-hidden="true" />
              Create key
            </motion.button>
          )}
        </AnimatePresence>
      </header>

      <LayoutGroup>
        {/* The form and the panel open and close by height (and padding), in the flow: the list below
            moves with them, and nothing is scaled. */}
        <AnimatePresence initial={false}>
          {state.stage === "naming" && (
            <motion.div key="naming" className="ak-fold" initial={FOLDED} animate={OPEN} exit={{ ...FOLDED, transition: FOLD }} transition={SPRING}>
            <form className="ak-form" onSubmit={create}>
              <label className="ak-field">
                <span>Name</span>
                <input
                  ref={input}
                  value={state.draft}
                  placeholder="What will use this key?"
                  onChange={(e) => take((s) => ({ ...s, draft: e.target.value }))}
                  maxLength={40}
                />
              </label>
              <div className="ak-form-foot">
                <ToggleGroup
                  className="ak-env"
                  aria-label="Environment"
                  value={[state.env]}
                  onValueChange={(v) => v[0] && take((s) => ({ ...s, env: v[0] as Env }))}
                >
                  <Toggle value="live" className="ak-env-item">
                    <span className="ak-dot" data-env="live" aria-hidden="true" />
                    Live
                  </Toggle>
                  <Toggle value="test" className="ak-env-item">
                    <span className="ak-dot" data-env="test" aria-hidden="true" />
                    Test
                  </Toggle>
                </ToggleGroup>
                <span className="ak-actions">
                  <button type="button" className="ak-ghost" onClick={() => take((s) => ({ ...s, stage: "list" }))}>
                    Cancel
                  </button>
                  <button type="submit" className="ak-primary" disabled={!state.draft.trim()}>
                    Create
                  </button>
                </span>
              </div>
            </form>
            </motion.div>
          )}

          {state.stage === "secret" && made && (
            <motion.div key={`panel-${made.id}`} className="ak-fold" initial={FOLDED} animate={OPEN} exit={{ ...FOLDED, transition: FOLD }} transition={SPRING}>
            <div className="ak-secret">
              <span className="ak-secret-head">
                <span className="ak-dot" data-env={made.env} />
                {made.name}
                <span className="ak-secret-env">{made.env === "live" ? "Live" : "Test"}</span>
              </span>
              <span className="ak-secret-line">
                <Secret k={made} />
                <button type="button" className="ak-copy" data-copied={state.copied || undefined} onClick={copy}>
                  <MorphIcon d={state.copied ? CHECK : COPY} />
                  <span className="ak-copy-label">
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.span
                        key={state.copied ? "done" : "copy"}
                        initial={{ y: 8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -8, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        {state.copied ? "Copied" : "Copy"}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </button>
              </span>
              <span className="ak-secret-foot">
                <span>Copy it now. You won’t see it again.</span>
                <button type="button" className="ak-done" onClick={done}>
                  Done
                </button>
              </span>
            </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.ul layout="position" className="ak-list" transition={SPRING}>
          <AnimatePresence initial={false}>
            {state.keys.map((k) => (
              <KeyRow key={k.id} k={k} landed={state.landed === k.id} />
            ))}
          </AnimatePresence>
        </motion.ul>
      </LayoutGroup>
    </section>
  );
}
