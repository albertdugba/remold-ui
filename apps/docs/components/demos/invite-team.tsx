"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Frame } from "./frame";
import { typing, useScene } from "./use-scene";
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
  ...typing(MAYA.email, (draft) => ({ ...REST, draft }), { every: 40, hold: 650 }),
  { ...REST, chips: [MAYA], ms: 650 },
  ...typing(SAM.email, (draft) => ({ ...REST, chips: [MAYA], draft }), { every: 40, hold: 650 }),
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
/** How long Invite says what it sent, and how long someone who just joined stays picked out. */
const SENT_FOR = 1400;
const JOINED_FOR = 1600;

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

  // Invite says what it just sent for a moment, then goes back to "Invite".
  const [sentCount, setSentCount] = useState(0);
  const pendingBefore = useRef(state.pending.length);
  useEffect(() => {
    const added = state.pending.length - pendingBefore.current;
    pendingBefore.current = state.pending.length;
    if (added <= 0) return;
    setSentCount(added);
    const t = setTimeout(() => setSentCount(0), SENT_FOR);
    return () => clearTimeout(t);
  }, [state.pending.length]);

  // Someone who just joined is picked out in their new row, then settles in with the rest.
  const [joined, setJoined] = useState<string | null>(null);
  const teamBefore = useRef(new Set(state.team.map((who) => who.email)));
  useEffect(() => {
    const newcomer = state.team.find((who) => !teamBefore.current.has(who.email));
    teamBefore.current = new Set(state.team.map((who) => who.email));
    if (!newcomer) return;
    setJoined(newcomer.email);
    const t = setTimeout(() => setJoined(null), JOINED_FOR);
    return () => clearTimeout(t);
  }, [state.team]);

  const add = (text: string) => {
    const found = text
      .split(/[\s,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    if (!found.length) return true;
    const bad = found.find((email) => !EMAIL.test(email));
    if (bad) {
      take((current) => ({
        ...current,
        note: `${bad} doesn't look like an email`,
        tone: "bad",
      }));
      return false;
    }
    take((current) => {
      const taken = new Set(
        [...current.team, ...current.pending, ...current.chips].map((person) => person.email),
      );
      const fresh = [...new Set(found)].filter((email) => !taken.has(email));
      const already = found.length - fresh.length;
      const chips = [...current.chips, ...fresh.map(person)];
      if (!already) return { ...current, draft: "", chips };
      const note =
        found.length === 1
          ? "They're already on the team or invited"
          : `${already} already on the team or invited`;
      return { ...current, draft: "", chips, note, tone: "bad" };
    });
    return true;
  };

  const join = (email: string) => {
    timers.current.delete(email);
    take((current) => {
      const who = current.pending.find((p) => p.email === email);
      if (!who) return current;
      return {
        ...current,
        pending: current.pending.filter((p) => p !== who),
        team: [...current.team, who],
        note: `${who.first} joined the team`,
        tone: "good",
      };
    });
  };

  useEffect(() => {
    if (scene.live) return;
    state.pending.forEach((p, index) => {
      if (!timers.current.has(p.email))
        timers.current.set(
          p.email,
          setTimeout(() => join(p.email), WAIT + index * APART),
        );
    });
  });

  const send = (event: FormEvent) => {
    event.preventDefault();
    // While it still says "Sent", pressing it with nothing new to send does nothing.
    if (sentCount && !state.chips.length && !state.draft.trim()) return;
    if (!add(state.draft)) return;
    take((current) => {
      if (!current.chips.length)
        return { ...current, note: "Add an email to invite", tone: "bad" };
      const sent = current.chips;
      sent.forEach((p, index) =>
        timers.current.set(
          p.email,
          setTimeout(
            () => join(p.email),
            WAIT + (current.pending.length + index) * APART,
          ),
        ),
      );
      return {
        ...current,
        chips: [],
        pending: [...current.pending, ...sent],
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
    take((current) => ({
      ...current,
      pending: current.pending.filter((p) => p !== who),
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
      take((current) => ({ ...current, chips: current.chips.slice(0, -1) }));
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
            onPointerDown={(event) =>
              event.target === event.currentTarget && input.current?.focus()
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
                    take((current) => ({
                      ...current,
                      chips: current.chips.filter((c) => c !== chip),
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
                  take((current) => ({
                    ...current,
                    draft: event.target.value,
                    tone: current.tone === "bad" ? undefined : current.tone,
                  }))
                }
                onKeyDown={onKeyDown}
                onPaste={onPaste}
              />
              <motion.button
                layout
                transition={SPRING}
                type="submit"
                className="iv-send"
                data-sent={sentCount > 0 || undefined}
                disabled={!sentCount && !state.chips.length && !state.draft.trim()}
              >
                <motion.span layout="position" className="inline-block">
                  <Remold.Text>
                    {sentCount === 0 ? "Invite" : sentCount === 1 ? "Sent" : `Sent to ${sentCount}`}
                  </Remold.Text>
                </motion.span>
              </motion.button>
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
            <motion.li
              layout
              transition={SPRING}
              {...ROW}
              key={`team:${who.email}`}
              className="iv-row"
              data-joined={who.email === joined || undefined}
            >
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
