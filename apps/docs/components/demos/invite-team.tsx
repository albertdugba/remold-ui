"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  useEffect,
  useRef,
  type ClipboardEvent,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Frame } from "./frame";
import { useScene } from "./use-scene";
import "./invite-team.css";

interface Person {
  email: string;

  name: string;

  first: string;
  initials: string;
  hue: number;
}

const capital = (word: string) => word[0]!.toUpperCase() + word.slice(1);

function person(email: string): Person {
  const local = email.split("@")[0]!;
  const words = local.split(/[._+-]/).filter((w) => /^[a-z]+$/i.test(w));
  const named = words.length > 1;
  const hue = [...email].reduce(
    (sum, char) => (sum * 31 + char.charCodeAt(0)) % 360,
    7,
  );
  return {
    email,
    name: named ? words.map(capital).join(" ") : email,
    first: named ? capital(words[0]!) : email,
    initials: (named
      ? words[0]![0]! + words[1]![0]!
      : local.replace(/[^a-z]/gi, "").slice(0, 2) || "?"
    ).toUpperCase(),
    hue,
  };
}

const TEAM: readonly Person[] = [
  person("kwesi.appiah@acme.co"),
  person("dzifa.kpodo@acme.co"),
  person("naa.quaye@acme.co"),
];
const MAYA = person("akua.asante@acme.co");
const SAM = person("fiifi.quansah@acme.co");

interface State {
  draft: string;

  chips: readonly Person[];

  pending: readonly Person[];
  team: readonly Person[];

  note?: string;
  tone?: "wait" | "good" | "bad";
}

const REST: State = {
  draft: "",
  chips: [],
  pending: [],
  team: TEAM,
};

const BEATS: readonly (State & { ms: number })[] = [
  { ...REST, ms: 1400 },
  { ...REST, draft: MAYA.email, ms: 650 },
  { ...REST, chips: [MAYA], ms: 650 },
  { ...REST, chips: [MAYA], draft: SAM.email, ms: 650 },
  { ...REST, chips: [MAYA, SAM], ms: 1000 },
  {
    ...REST,
    pending: [MAYA, SAM],
    note: "Invites sent to 2 people",
    tone: "wait",
    ms: 1500,
  },
  {
    ...REST,
    pending: [SAM],
    team: [...TEAM, MAYA],
    note: "Akua joined the team",
    tone: "good",
    ms: 1300,
  },
  {
    ...REST,
    team: [...TEAM, MAYA, SAM],
    note: "Fiifi joined the team",
    tone: "good",
    ms: 2600,
  },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

const SPRING = { type: "spring" as const, duration: 0.32, bounce: 0.12 };
/** A person moving between places (chip to row, invited to team): a little longer, so it reads. */
const TRAVEL = { type: "spring" as const, duration: 0.55, bounce: 0.14 };

const WAIT = 1500;
const APART = 1100;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Someone's initials. The same person's avatar is one element wherever it shows, so it travels. */
function Avatar({
  person: who,
  className,
}: {
  person: Person;
  className: string;
}) {
  return (
    <motion.span
      layoutId={`avatar:${who.email}`}
      transition={TRAVEL}
      className={`iv-avatar ${className}`}
      style={{ "--hue": who.hue } as CSSProperties}
      aria-hidden="true"
    >
      {who.initials}
    </motion.span>
  );
}

/** A row arriving or leaving: it fades, while its avatar does the travelling. */
const ROW = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.25, delay: 0.08 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const byName = (people: readonly Person[]) =>
  [...people].sort((a, b) => a.name.localeCompare(b.name));

interface InviteTeamDemoProps {
  framed?: boolean;

  playing?: boolean;
}

export function InviteTeamDemo({
  framed = true,
  playing,
}: InviteTeamDemoProps) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const input = useRef<HTMLInputElement>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const all = timers.current;
    return () => all.forEach(clearTimeout);
  }, []);

  const add = (text: string) => {
    const found = text
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (!found.length) return true;
    const bad = found.find((e) => !EMAIL.test(e));
    if (bad) {
      take((s) => ({
        ...s,
        note: `${bad} doesn't look like an email`,
        tone: "bad",
      }));
      return false;
    }
    take((s) => {
      const taken = new Set(
        [...s.team, ...s.pending, ...s.chips].map((p) => p.email),
      );
      const fresh = [...new Set(found)].filter((e) => !taken.has(e));
      const already = found.length - fresh.length;
      const chips = [...s.chips, ...fresh.map((e) => person(e))];
      if (!already) return { ...s, draft: "", chips };
      const note =
        found.length === 1
          ? "They're already on the team or invited"
          : `${already} already on the team or invited`;
      return { ...s, draft: "", chips, note, tone: "bad" };
    });
    return true;
  };

  const join = (email: string) => {
    timers.current.delete(email);
    take((s) => {
      const who = s.pending.find((p) => p.email === email);
      if (!who) return s;
      return {
        ...s,
        pending: s.pending.filter((p) => p !== who),
        team: [...s.team, who],
        note: `${who.first} joined the team`,
        tone: "good",
      };
    });
  };

  useEffect(() => {
    if (scene.live) return;
    state.pending.forEach((p, i) => {
      if (!timers.current.has(p.email))
        timers.current.set(
          p.email,
          setTimeout(() => join(p.email), WAIT + i * APART),
        );
    });
  });

  const send = (event: FormEvent) => {
    event.preventDefault();
    if (!add(state.draft)) return;
    take((s) => {
      if (!s.chips.length)
        return { ...s, note: "Add an email to invite", tone: "bad" };
      const sent = s.chips;
      sent.forEach((p, i) =>
        timers.current.set(
          p.email,
          setTimeout(
            () => join(p.email),
            WAIT + (s.pending.length + i) * APART,
          ),
        ),
      );
      return {
        ...s,
        chips: [],
        pending: [...s.pending, ...sent],
        note:
          sent.length === 1
            ? `Invite sent to ${sent[0]!.email}`
            : `Invites sent to ${sent.length} people`,
        tone: "wait",
      };
    });
    input.current?.focus();
  };

  const revoke = (who: Person) => {
    clearTimeout(timers.current.get(who.email));
    timers.current.delete(who.email);
    take((s) => ({
      ...s,
      pending: s.pending.filter((p) => p !== who),
      note: `Invite to ${who.email} revoked`,
      tone: undefined,
    }));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      (event.key === "," || event.key === " " || event.key === "Enter") &&
      state.draft.trim()
    ) {
      event.preventDefault();
      add(state.draft);
    } else if (
      event.key === "Backspace" &&
      !state.draft &&
      state.chips.length
    ) {
      take((s) => ({ ...s, chips: s.chips.slice(0, -1) }));
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text");
    if (/[\s,;]/.test(text.trim())) {
      event.preventDefault();
      add(state.draft + text);
    }
  };

  const body = (
    <section ref={scene.ref} className="iv" aria-label="Team members">
      <LayoutGroup>
      <motion.div layout transition={SPRING} className="iv-card">
        <header className="iv-head">
          <strong>Invite to Design team</strong>
        </header>

        <form className="iv-invite" onSubmit={send} noValidate>
          <div
            className="iv-field"
            data-invalid={state.tone === "bad" ? "" : undefined}
            onPointerDown={(e) =>
              e.target === e.currentTarget && input.current?.focus()
            }
          >
            <AnimatePresence initial={false}>
            {state.chips.map((chip) => (
              <motion.span layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }} transition={SPRING} key={chip.email} className="iv-chip" title={chip.email}>
                <Avatar person={chip} className="iv-chip-avatar" />
                <span className="iv-chip-email">{chip.email}</span>
                <button
                  type="button"
                  className="iv-chip-remove"
                  aria-label={`Remove ${chip.email}`}
                  onClick={() =>
                    take((s) => ({
                      ...s,
                      chips: s.chips.filter((c) => c !== chip),
                    }))
                  }
                >
                  <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
                </button>
              </motion.span>
            ))}
            </AnimatePresence>
            {/* The typing and the Invite button wrap as one, so the button always sits beside the
                typing, at the end of the field's last line. */}
            <span className="iv-entry">
              <input
                ref={input}
                className="iv-input"
                type="email"
                value={state.draft}
                placeholder={state.chips.length ? "" : "name@company.com"}
                aria-label="Email addresses"
                aria-invalid={state.tone === "bad" ? true : undefined}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) =>
                  take((s) => ({
                    ...s,
                    draft: event.target.value,
                    tone: s.tone === "bad" ? undefined : s.tone,
                  }))
                }
                onKeyDown={onKeyDown}
                onPaste={onPaste}
              />
              <button
                type="submit"
                className="iv-send"
                disabled={!state.chips.length && !state.draft.trim()}
              >
                Invite
              </button>
            </span>
          </div>
        </form>

        <ul className="iv-rows" aria-label="People">
          <AnimatePresence initial={false} mode="popLayout">
          {state.pending.map((who) => (
            <motion.li layout transition={SPRING} {...ROW} key={`invited:${who.email}`} className="iv-row" data-pending="">
              <Avatar person={who} className="iv-row-avatar" />
              <span className="iv-row-copy">
                <span className="iv-name">{who.name}</span>
                <span className="iv-row-email">{who.email}</span>
              </span>
              <span className="iv-invited">Invited</span>
              <button
                type="button"
                className="iv-row-revoke"
                onClick={() => revoke(who)}
                aria-label={`Revoke the invite to ${who.email}`}
              >
                <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
              </button>
            </motion.li>
          ))}
          {byName(state.team).map((who) => (
            <motion.li layout transition={SPRING} {...ROW} key={`team:${who.email}`} className="iv-row">
              <Avatar person={who} className="iv-row-avatar" />
              <span className="iv-row-copy">
                <span className="iv-name">{who.name}</span>
                <span className="iv-row-email">{who.email}</span>
              </span>
            </motion.li>
          ))}
          </AnimatePresence>
        </ul>

        <p className="iv-status" data-tone={state.tone} aria-live="polite">
          {state.note && <span className="iv-dot" aria-hidden="true" />}
          <span className="iv-note">{state.note ?? ""}</span>
        </p>
      </motion.div>
      </LayoutGroup>
    </section>
  );

  return framed ? <Frame>{body}</Frame> : body;
}
