"use client";
/**
 * One person in four forms. An email becomes a chip in the invite field; sending moves each chip
 * down into a pending row; and when they accept, their avatar travels from that row up into the
 * team's stack. Every form is different markup in a different place, and `Remold.Layout` matches
 * them by what they show: the name and the initials.
 *
 * It plays a short scene while it's on screen. Touch it and it's yours: type or paste emails, send
 * them, cancel one before it's accepted. The invites are pretend; people accept a moment later.
 */
import { Remold } from "@remold-ui/react";
import { X } from "lucide-react";
import { useEffect, useRef, useState, type ClipboardEvent, type CSSProperties, type FormEvent, type KeyboardEvent } from "react";
import { Frame } from "./frame";
import { useScene } from "./use-scene";
import "./invite-team.css";

interface Person {
  email: string;
  /** "Maya Ortiz" from maya.ortiz@…; the email itself when there's no name in it. */
  name: string;
  /** What the chip and the status line call them. */
  first: string;
  initials: string;
  hue: number;
}

const capital = (word: string) => word[0]!.toUpperCase() + word.slice(1);

/** A person from their email: a name, initials and a colour from the part before the @. */
function person(email: string): Person {
  const local = email.split("@")[0]!;
  const words = local.split(/[._+-]/).filter((w) => /^[a-z]+$/i.test(w));
  const named = words.length > 1;
  const hue = [...email].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 360, 7);
  return {
    email,
    name: named ? words.map(capital).join(" ") : email,
    first: named ? capital(words[0]!) : email,
    initials: (named ? words[0]![0]! + words[1]![0]! : local.replace(/[^a-z]/gi, "").slice(0, 2) || "?").toUpperCase(),
    hue,
  };
}

const TEAM: readonly Person[] = ["amir.khan", "jules.lambert", "rosa.silva", "tom.ng"].map((n) => person(`${n}@acme.co`));
const MAYA = person("maya.ortiz@acme.co");
const SAM = person("sam.lee@acme.co");

/** The most avatars the stack shows before it counts the rest. */
const SHOWN = 5;

interface State {
  draft: string;
  /** In the field, ready to send. */
  chips: readonly Person[];
  /** Sent, waiting to be accepted. */
  pending: readonly Person[];
  team: readonly Person[];
  /** The last thing that happened, for the status line. */
  note?: string;
  tone?: "wait" | "good" | "bad";
}

const REST: State = { draft: "", chips: [], pending: [], team: TEAM };

/**
 * Two emails pasted in one after the other, each a beat as text before it becomes a chip. Sending
 * moves both chips down into the pending list, and then they're accepted one at a time, a little
 * apart, so each avatar's trip up into the stack can be followed. The full team rests longest.
 */
const BEATS: readonly (State & { ms: number })[] = [
  { ...REST, ms: 1400 },
  { ...REST, draft: MAYA.email, ms: 650 },
  { ...REST, chips: [MAYA], ms: 650 },
  { ...REST, chips: [MAYA], draft: SAM.email, ms: 650 },
  { ...REST, chips: [MAYA, SAM], ms: 1000 },
  { ...REST, pending: [MAYA, SAM], note: "Invites sent to 2 people", tone: "wait", ms: 1500 },
  { ...REST, pending: [SAM], team: [...TEAM, MAYA], note: "Maya joined the team", tone: "good", ms: 1300 },
  { ...REST, team: [...TEAM, MAYA, SAM], note: "Sam joined the team", tone: "good", ms: 2600 },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

const SPRING = { duration: 0.6, bounce: 0.12 };

/** When each sent invite is accepted: the first after a wait, the rest a little apart. */
const WAIT = 1500;
const APART = 1100;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Avatar({ person: who, className }: { person: Person; className: string }) {
  return (
    <span className={`iv-avatar ${className}`} style={{ "--hue": who.hue } as CSSProperties} title={who.name}>
      {who.initials}
    </span>
  );
}

const emails = (people: readonly Person[]) => people.map((p) => p.email).join();

interface InviteTeamDemoProps {
  framed?: boolean;
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function InviteTeamDemo({ framed = true, playing }: InviteTeamDemoProps) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const input = useRef<HTMLInputElement>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  // Pointing at the stack opens it out. Only a look, so it doesn't stop the scene.
  const [spread, setSpread] = useState(false);

  useEffect(() => {
    const all = timers.current;
    return () => all.forEach(clearTimeout);
  }, []);

  /** Turn typed or pasted text into chips. Returns whether everything in it was a good address. */
  const add = (text: string) => {
    const found = text
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (!found.length) return true;
    const bad = found.find((e) => !EMAIL.test(e));
    if (bad) {
      take((s) => ({ ...s, note: `${bad} doesn't look like an email`, tone: "bad" }));
      return false;
    }
    take((s) => {
      const taken = new Set([...s.team, ...s.pending, ...s.chips].map((p) => p.email));
      const fresh = [...new Set(found)].filter((e) => !taken.has(e));
      const already = found.length - fresh.length;
      if (!already) return { ...s, draft: "", chips: [...s.chips, ...fresh.map(person)] };
      const note = found.length === 1 ? "They're already on the team or invited" : `${already} already on the team or invited`;
      return { ...s, draft: "", chips: [...s.chips, ...fresh.map(person)], note, tone: "bad" };
    });
    return true;
  };

  const join = (email: string) => {
    timers.current.delete(email);
    take((s) => {
      const who = s.pending.find((p) => p.email === email);
      if (!who) return s;
      return { ...s, pending: s.pending.filter((p) => p !== who), team: [...s.team, who], note: `${who.first} joined the team`, tone: "good" };
    });
  };

  // Invites the scene sent before someone took over are accepted too, in their turn.
  useEffect(() => {
    if (scene.live) return;
    state.pending.forEach((p, i) => {
      if (!timers.current.has(p.email)) timers.current.set(p.email, setTimeout(() => join(p.email), WAIT + i * APART));
    });
  });

  const send = (event: FormEvent) => {
    event.preventDefault();
    if (!add(state.draft)) return;
    take((s) => {
      if (!s.chips.length) return { ...s, note: "Add an email to invite", tone: "bad" };
      s.chips.forEach((p, i) => timers.current.set(p.email, setTimeout(() => join(p.email), WAIT + (s.pending.length + i) * APART)));
      const count = s.chips.length;
      return {
        ...s,
        chips: [],
        pending: [...s.pending, ...s.chips],
        note: count === 1 ? `Invite sent to ${s.chips[0]!.first}` : `Invites sent to ${count} people`,
        tone: "wait",
      };
    });
    input.current?.focus();
  };

  const cancel = (who: Person) => {
    clearTimeout(timers.current.get(who.email));
    timers.current.delete(who.email);
    take((s) => ({ ...s, pending: s.pending.filter((p) => p !== who), note: `Invite to ${who.first} cancelled`, tone: undefined }));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.key === "," || event.key === " " || event.key === "Enter") && state.draft.trim()) {
      event.preventDefault();
      add(state.draft);
    } else if (event.key === "Backspace" && !state.draft && state.chips.length) {
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

  const shown = state.team.slice(-SHOWN);
  const more = state.team.length - shown.length;
  const note = state.note ?? "Invites expire after 7 days";

  const body = (
    <section ref={scene.ref} className="iv" aria-label="Invite teammates">
      {/* Only the people move: chips, pending rows and avatars. Text in the field is never animated. */}
      <Remold.Layout
        trigger={[emails(state.chips), emails(state.pending), emails(state.team), spread]}
        spring={SPRING}
        className="iv-card"
      >
        <header className="iv-head">
          <span className="iv-copy">
            <strong>Design team</strong>
            <span>{`${state.team.length} members`}</span>
          </span>
          <span
            className="iv-stack"
            data-spread={spread ? "" : undefined}
            onPointerEnter={() => setSpread(true)}
            onPointerLeave={() => setSpread(false)}
          >
            {shown.map((member) => (
              <Avatar key={member.email} person={member} className="iv-member" />
            ))}
            {more > 0 && <span className="iv-avatar iv-member iv-more">{`+${more}`}</span>}
          </span>
        </header>

        <form className="iv-invite" onSubmit={send} noValidate>
          {/* A click on the field's padding focuses its input, like a real field. */}
          <div className="iv-field" data-invalid={state.tone === "bad" ? "" : undefined} onPointerDown={(e) => e.target === e.currentTarget && input.current?.focus()}>
            {state.chips.map((chip) => (
              <span key={chip.email} className="iv-chip" title={chip.email}>
                <Avatar person={chip} className="iv-chip-avatar" />
                <span className="iv-name">{chip.first}</span>
                <button
                  type="button"
                  className="iv-chip-remove"
                  aria-label={`Remove ${chip.email}`}
                  onClick={() => take((s) => ({ ...s, chips: s.chips.filter((c) => c !== chip) }))}
                >
                  <X aria-hidden="true" />
                </button>
              </span>
            ))}
            <input
              ref={input}
              className="iv-input"
              type="email"
              value={state.draft}
              placeholder={state.chips.length ? "" : "Add people by email"}
              aria-label="Email addresses"
              aria-invalid={state.tone === "bad" ? true : undefined}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => take((s) => ({ ...s, draft: event.target.value, tone: s.tone === "bad" ? undefined : s.tone }))}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
            />
          </div>
          <button type="submit" className="iv-send" disabled={!state.chips.length && !state.draft.trim()}>
            Invite
          </button>
        </form>

        {state.pending.length > 0 && (
          <div className="iv-pending">
            <p className="iv-label">{`Pending · ${state.pending.length}`}</p>
            <ul className="iv-rows">
              {state.pending.map((who) => (
                <li key={who.email} className="iv-row">
                  <Avatar person={who} className="iv-row-avatar" />
                  <span className="iv-row-copy">
                    <span className="iv-name">{who.name}</span>
                    {who.name !== who.email && <span className="iv-row-email">{who.email}</span>}
                  </span>
                  <button type="button" className="iv-row-cancel" onClick={() => cancel(who)} aria-label={`Cancel the invite to ${who.email}`}>
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="iv-status" data-tone={state.tone} aria-live="polite">
          <span className="iv-dot" aria-hidden="true" />
          {/* The line moves with the card; its sentence just changes, rather than morphing into another. */}
          <Remold.Ignore render={<span className="iv-note" />}>{note}</Remold.Ignore>
        </p>
      </Remold.Layout>
    </section>
  );

  return framed ? <Frame>{body}</Frame> : body;
}
