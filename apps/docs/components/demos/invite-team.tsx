"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Remold } from "@remold-ui/react";
import {
  AnimatePresence,
  LayoutGroup,
  animate,
  motion,
  useAnimate,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type Ref,
} from "react";

import { Frame } from "./frame";
import { useControllableState, type ChangeDetails } from "./use-controllable-state";
import { useMeasuredSize } from "./use-measured-size";
import { typing, useScene } from "./use-scene";

export interface Person {
  email: string;
  name: string;
  firstName: string;
  initials: string;
  hue: number;
  role?: string;
}

export interface InviteTeamValue {
  draft: string;
  chips: readonly Person[];
  pending: readonly Person[];
  team: readonly Person[];
  note?: string;
  tone?: "wait" | "good" | "bad";
}

const SPRING = { type: "spring" as const, duration: 0.38, bounce: 0.1 };
const TRAVEL = { type: "spring" as const, duration: 0.55, bounce: 0.12 };

const SENT_FOR = 1400;
const JOINED_FOR = 1600;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SEPARATORS = /[\s,;]+/;

const FRESH = {
  initial: { opacity: 0, filter: "blur(3px)" },
  animate: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.3, delay: 0.16 } },
};

const CHIP_MOTION = {
  initial: { opacity: 0, scale: 0.9, filter: "blur(3px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 0.9, filter: "blur(3px)", transition: { duration: 0.15 } },
};

const capitalize = (word: string) => word[0]!.toUpperCase() + word.slice(1);

export function personFromEmail(email: string): Person {
  const local = email.split("@")[0]!;
  const words = local.split(/[._+-]/).filter((word) => /^[a-z]+$/i.test(word));
  const named = words.length > 1;
  const initials = named ? words[0]![0]! + words[1]![0]! : local.replace(/[^a-z]/gi, "").slice(0, 2) || "?";

  return {
    email,
    name: named ? words.map(capitalize).join(" ") : email,
    firstName: named ? capitalize(words[0]!) : email,
    initials: initials.toUpperCase(),
    hue: [...email].reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) % 360, 7),
  };
}

const parseEmails = (text: string) =>
  text
    .split(SEPARATORS)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

const emailsIn = (value: InviteTeamValue) =>
  new Set([...value.team, ...value.pending, ...value.chips].map((person) => person.email));

const byName = (people: readonly Person[]) => [...people].sort((a, b) => a.name.localeCompare(b.name));

const TEAM: readonly Person[] = [
  { ...personFromEmail("kwesi.appiah@acme.co"), role: "Owner" },
  personFromEmail("dzifa.kpodo@acme.co"),
  personFromEmail("naa.quaye@acme.co"),
];

const EMPTY: InviteTeamValue = { draft: "", chips: [], pending: [], team: TEAM };

const PALETTE = [
  "[--iv-surface:#ffffff] [--iv-well:#f4f4f5] [--iv-token:#e8e8eb] [--iv-ink:#18181b] [--iv-muted:#71717a] [--iv-faint:#a1a1aa]",
  "[--iv-line:rgb(24_24_27/0.08)] [--iv-border:rgb(24_24_27/0.12)] [--iv-good:#16a34a] [--iv-on-good:#ffffff] [--iv-bad:#e5484d]",
  "dark:[--iv-surface:#1c1c1f] dark:[--iv-well:#26262b] dark:[--iv-token:#313137] dark:[--iv-ink:#fafafa] dark:[--iv-muted:#a1a1aa] dark:[--iv-faint:#63636b]",
  "dark:[--iv-line:rgb(255_255_255/0.07)] dark:[--iv-border:rgb(255_255_255/0.14)] dark:[--iv-good:#4ade80] dark:[--iv-on-good:#0a0a0b] dark:[--iv-bad:#ff6369]",
].join(" ");

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--iv-ink)";

function useSentCount(pending: readonly Person[]) {
  const [sentCount, setSentCount] = useState(0);
  const before = useRef(pending.length);

  useEffect(() => {
    const added = pending.length - before.current;
    before.current = pending.length;
    if (added <= 0) return;

    setSentCount(added);
    const timer = setTimeout(() => setSentCount(0), SENT_FOR);
    return () => clearTimeout(timer);
  }, [pending.length]);

  return sentCount;
}

function useJustJoined(team: readonly Person[]) {
  const [joined, setJoined] = useState<string | null>(null);
  const before = useRef(new Set(team.map((member) => member.email)));

  useEffect(() => {
    const newcomer = team.find((member) => !before.current.has(member.email));
    before.current = new Set(team.map((member) => member.email));
    if (!newcomer) return;

    setJoined(newcomer.email);
    const timer = setTimeout(() => setJoined(null), JOINED_FOR);
    return () => clearTimeout(timer);
  }, [team]);

  return joined;
}

function useShake() {
  const [scope, animateScope] = useAnimate<HTMLDivElement>();
  const reduced = useReducedMotion();

  const shake = () => {
    if (reduced || !scope.current) return;
    void animateScope(scope.current, { x: [0, -7, 6, -4, 2, 0] }, { duration: 0.42, ease: "easeOut" });
  };

  return [scope, shake] as const;
}

function useSpringHeight() {
  const [contentRef, size] = useMeasuredSize<HTMLDivElement>();
  const height = useMotionValue<number | "auto">("auto");
  const reduced = useReducedMotion();
  const sized = useRef(false);

  useLayoutEffect(() => {
    if (!size) return;
    if (!sized.current || reduced) height.set(size.height);
    else void animate(height, size.height, SPRING);
    sized.current = true;
  }, [size, height, reduced]);

  return [contentRef, height] as const;
}

function Avatar({
  person,
  className,
  member = false,
}: {
  person: Person;
  className: string;
  member?: boolean;
}) {
  return (
    <motion.span
      layoutId={`avatar:${person.email}`}
      transition={TRAVEL}
      className={`relative grid flex-none place-items-center overflow-hidden rounded-full bg-[linear-gradient(180deg,oklch(0.74_0.09_var(--hue)),oklch(0.6_0.1_var(--hue)))] font-semibold tracking-[0.02em] text-white before:absolute before:inset-0 before:bg-[linear-gradient(180deg,#b4b4bc,#8e8e96)] before:transition-opacity before:duration-600 before:content-[''] data-member:before:opacity-0 motion-reduce:before:transition-none dark:before:bg-[linear-gradient(180deg,#6b6b73,#4f4f56)] [&>span]:relative ${className}`}
      data-member={member || undefined}
      style={{ "--hue": person.hue } as CSSProperties}
      aria-hidden="true"
    >
      <span>{person.initials}</span>
    </motion.span>
  );
}

function Chip({
  person,
  onRemove,
  ref,
}: {
  person: Person;
  onRemove: () => void;
  ref?: Ref<HTMLSpanElement>;
}) {
  return (
    <motion.span
      ref={ref}
      layout="position"
      transition={SPRING}
      className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full bg-(--iv-token) pr-1 pl-[3px]"
      title={person.email}
      {...CHIP_MOTION}
    >
      <Avatar person={person} className="size-[22px] text-[8.5px]" />
      <span className="truncate text-[13px] font-medium">{person.email}</span>
      <button
        type="button"
        className={`grid size-5 flex-none cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-(--iv-muted) hover:bg-[color-mix(in_oklab,var(--iv-ink)_8%,transparent)] hover:text-(--iv-ink) [&_svg]:size-[11px] ${FOCUS}`}
        aria-label={`Remove ${person.email}`}
        onClick={onRemove}
      >
        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2.4} aria-hidden="true" />
      </button>
    </motion.span>
  );
}

function PersonRow({
  person,
  invited,
  joined,
  onRevoke,
  ref,
}: {
  person: Person;
  invited: boolean;
  joined: boolean;
  onRevoke: () => void;
  ref?: Ref<HTMLLIElement>;
}) {
  const role = invited ? "Invited" : joined ? "Joined" : (person.role ?? "Editor");

  return (
    <motion.li
      ref={ref}
      layout="position"
      transition={TRAVEL}
      exit={{ opacity: 0, scale: 0.9, filter: "blur(3px)", transition: { duration: 0.18 } }}
      data-invited={invited || undefined}
      data-joined={joined || undefined}
      className="group/person relative flex min-h-14 items-center gap-3 rounded-[14px] pr-2.5 pl-2 transition-[background-color] duration-200 hover:bg-(--iv-well)"
    >
      <span className="relative grid flex-none after:pointer-events-none after:absolute after:-inset-1 after:rounded-full after:border-[1.5px] after:border-dashed after:border-(--iv-faint) after:opacity-0 after:[transition:opacity_0.5s_ease,border-color_0.3s_ease] after:content-[''] group-data-invited/person:after:opacity-100 motion-safe:group-data-invited/person:after:animate-[spin_9s_linear_infinite] group-data-joined/person:after:border-solid group-data-joined/person:after:border-(--iv-good) group-data-joined/person:after:opacity-100">
        <Avatar person={person} className="size-9 text-[12.5px]" member={!invited} />
      </span>

      <span className="grid min-w-0 flex-1">
        <motion.span className="truncate text-[14px] font-semibold" {...(invited ? FRESH : {})}>
          {person.name}
        </motion.span>
        {person.name !== person.email && (
          <span className="truncate text-[12.5px] text-(--iv-muted)">{person.email}</span>
        )}
      </span>

      <span className="flex-none text-[13px] text-(--iv-muted) transition-colors duration-300 group-data-invited/person:text-(--iv-faint) group-data-joined/person:font-semibold group-data-joined/person:text-(--iv-good)">
        <Remold.Text>{role}</Remold.Text>
      </span>

      {invited && (
        <motion.button
          type="button"
          className={`-ml-1 grid size-6 flex-none cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-(--iv-faint) transition-[opacity,background-color,color] duration-150 group-hover/person:opacity-100! hover:bg-[color-mix(in_oklab,var(--iv-bad)_12%,transparent)] hover:text-(--iv-bad) focus-visible:opacity-100! [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [&_svg]:size-[11px] ${FOCUS}`}
          aria-label={`Revoke the invite to ${person.email}`}
          onClick={onRevoke}
          {...FRESH}
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2.4} aria-hidden="true" />
        </motion.button>
      )}
    </motion.li>
  );
}

function sendLabel(sentCount: number) {
  if (sentCount === 0) return "Invite";
  if (sentCount === 1) return "Sent";
  return `Sent to ${sentCount}`;
}

export interface InviteTeamProps {
  value?: InviteTeamValue;
  defaultValue?: InviteTeamValue;
  onValueChange?: (value: InviteTeamValue, details: ChangeDetails) => void;
  ref?: Ref<HTMLElement>;
}

export function InviteTeam({ value, defaultValue = EMPTY, onValueChange, ref }: InviteTeamProps) {
  const [invites, setInvites] = useControllableState({ value, defaultValue, onValueChange });
  const inputRef = useRef<HTMLInputElement>(null);

  const sentCount = useSentCount(invites.pending);
  const joinedEmail = useJustJoined(invites.team);
  const [shakeRef, shake] = useShake();
  const [contentRef, height] = useSpringHeight();

  const hasDraft = invites.draft.trim() !== "";
  const nothingToSend = !invites.chips.length && !hasDraft;
  const error = invites.tone === "bad" ? invites.note : undefined;
  const memberCount = invites.team.length;
  const count = invites.pending.length
    ? `${memberCount} members · ${invites.pending.length} invited`
    : `${memberCount} members`;

  const addChips = (text: string) => {
    const emails = parseEmails(text);
    if (!emails.length) return true;

    const invalid = emails.find((email) => !EMAIL.test(email));
    if (invalid) {
      shake();
      setInvites((current) => ({ ...current, note: `“${invalid}” isn't an email address`, tone: "bad" }));
      return false;
    }

    if (emails.some((email) => emailsIn(invites).has(email))) shake();

    setInvites((current) => {
      const taken = emailsIn(current);
      const fresh = [...new Set(emails)].filter((email) => !taken.has(email));
      const already = emails.length - fresh.length;
      const chips = [...current.chips, ...fresh.map(personFromEmail)];

      if (!already) return { ...current, draft: "", chips };

      const note =
        emails.length === 1
          ? "They're already on the team or invited"
          : `${already} already on the team or invited`;
      return { ...current, draft: "", chips, note, tone: "bad" };
    });

    return true;
  };

  const send = (event: FormEvent) => {
    event.preventDefault();
    if (sentCount && nothingToSend) return;
    if (!addChips(invites.draft)) return;
    if (nothingToSend) shake();

    setInvites((current) => {
      if (!current.chips.length) return { ...current, note: "Add an email to invite", tone: "bad" };

      const sent = current.chips;
      const note =
        sent.length === 1 ? `Invite sent to ${sent[0]!.email}` : `Invites sent to ${sent.length} people`;
      return { ...current, chips: [], pending: [...current.pending, ...sent], note, tone: "wait" };
    });

    inputRef.current?.focus();
  };

  const removeChip = (chip: Person) =>
    setInvites((current) => ({ ...current, chips: current.chips.filter((other) => other !== chip) }));

  const revoke = (invitee: Person) =>
    setInvites((current) => ({
      ...current,
      pending: current.pending.filter((pending) => pending !== invitee),
      note: `Invite to ${invitee.email} revoked`,
      tone: undefined,
    }));

  const onDraftChange = (draft: string) =>
    setInvites((current) => ({ ...current, draft, tone: current.tone === "bad" ? undefined : current.tone }));

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const commits = event.key === "," || event.key === " " || event.key === "Enter";

    if (commits && hasDraft) {
      event.preventDefault();
      addChips(invites.draft);
    } else if (event.key === "Backspace" && !invites.draft && invites.chips.length) {
      setInvites((current) => ({ ...current, chips: current.chips.slice(0, -1) }));
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text");
    if (!SEPARATORS.test(text.trim())) return;

    event.preventDefault();
    addChips(invites.draft + text);
  };

  const rows = [
    ...byName(invites.team).map((person) => ({ person, invited: false })),
    ...invites.pending.map((person) => ({ person, invited: true })),
  ];

  return (
    <section
      ref={ref}
      className={`grid min-h-[470px] w-[420px] max-w-full content-start font-sans tracking-[-0.01em] text-(--iv-ink) antialiased ${PALETTE}`}
      aria-label="Team members"
    >
      <LayoutGroup>
        <motion.div className="overflow-clip rounded-[22px] bg-(--iv-surface)" style={{ height }}>
          <div ref={contentRef} className="grid gap-4 px-4 pt-[18px] pb-4">
            <header className="flex items-center justify-between gap-3 px-0.5">
              <span className="grid gap-px">
                <strong className="text-[17px] font-[650] tracking-[-0.02em]">Design team</strong>
                <span className="text-[12.5px] text-(--iv-muted)">
                  <Remold.Text>{count}</Remold.Text>
                </span>
              </span>
            </header>

            <form className="grid" onSubmit={send} noValidate>
              <div ref={shakeRef} className="grid">
                <div
                  data-invalid={error ? "" : undefined}
                  className="flex min-h-12 min-w-0 cursor-text flex-wrap items-center gap-[5px] rounded-[14px] border-[1.8px] border-solid border-(--iv-border) bg-(--iv-surface) py-1.5 pr-1.5 pl-3 text-[14px] transition-[border-color] duration-[180ms] focus-within:border-(--iv-ink) data-invalid:border-(--iv-bad)!"
                  onPointerDown={(event) => event.target === event.currentTarget && inputRef.current?.focus()}
                >
                  <span className="mr-[3px] text-[13px] font-medium text-(--iv-faint)" aria-hidden="true">
                    To
                  </span>

                  <AnimatePresence initial={false} mode="popLayout">
                    {invites.chips.map((chip) => (
                      <Chip key={chip.email} person={chip} onRemove={() => removeChip(chip)} />
                    ))}
                  </AnimatePresence>

                  <span className="flex min-w-0 flex-[1_1_180px] items-center gap-1.5">
                    <input
                      ref={inputRef}
                      className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0.5 text-ellipsis text-inherit outline-0 placeholder:text-(--iv-faint)"
                      type="email"
                      value={invites.draft}
                      placeholder={invites.chips.length ? "" : "name@company.com"}
                      aria-label="Email addresses"
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? "iv-error" : undefined}
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(event) => onDraftChange(event.target.value)}
                      onKeyDown={onKeyDown}
                      onPaste={onPaste}
                    />

                    <motion.button
                      layout="position"
                      transition={SPRING}
                      type="submit"
                      className={`grid h-[34px] flex-none cursor-pointer place-items-center rounded-[10px] border-0 bg-(--iv-ink) px-[15px] font-[inherit] text-[13.5px] font-semibold text-(--iv-surface) transition-colors duration-250 disabled:cursor-default disabled:bg-[color-mix(in_oklab,var(--iv-ink)_8%,transparent)] disabled:text-(--iv-faint) data-sent:bg-(--iv-good) data-sent:text-(--iv-on-good) motion-reduce:transition-none ${FOCUS}`}
                      data-sent={sentCount > 0 || undefined}
                      disabled={!sentCount && nothingToSend}
                      whileTap={{ scale: 0.96 }}
                    >
                      <Remold.Text>{sendLabel(sentCount)}</Remold.Text>
                    </motion.button>
                  </span>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {error && (
                  <motion.p
                    key="error"
                    className="overflow-clip text-[12.5px] font-medium text-(--iv-bad) [&>span]:block [&>span]:px-1 [&>span]:pt-2"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={SPRING}
                  >
                    <span id="iv-error" role="alert">
                      <Remold.Text>{error}</Remold.Text>
                    </span>
                  </motion.p>
                )}
              </AnimatePresence>
            </form>

            <ul className="relative -mx-2 grid list-none p-0" aria-label="People">
              <AnimatePresence initial={false} mode="popLayout">
                {rows.map(({ person, invited }) => (
                  <PersonRow
                    key={person.email}
                    person={person}
                    invited={invited}
                    joined={person.email === joinedEmail}
                    onRevoke={() => revoke(person)}
                  />
                ))}
              </AnimatePresence>
            </ul>

            <p
              className="min-h-4 overflow-hidden px-3 text-[12px] whitespace-nowrap text-(--iv-muted) transition-colors duration-300 data-[tone=good]:text-(--iv-good) motion-reduce:transition-none"
              data-tone={error ? undefined : invites.tone} aria-live="polite">
              <Remold.Text>{(!error && invites.note) || "Invites expire after 7 days."}</Remold.Text>
            </p>
          </div>
        </motion.div>
      </LayoutGroup>
    </section>
  );
}

const AKUA = personFromEmail("akua.asante@acme.co");
const FIIFI = personFromEmail("fiifi.quansah@acme.co");

const ACCEPT_AFTER = 1500;
const ACCEPT_APART = 1100;

const BEATS: readonly (InviteTeamValue & { ms: number })[] = [
  { ...EMPTY, ms: 1400 },
  ...typing(AKUA.email, (draft) => ({ ...EMPTY, draft }), { every: 40, hold: 650 }),
  { ...EMPTY, chips: [AKUA], ms: 650 },
  ...typing(FIIFI.email, (draft) => ({ ...EMPTY, chips: [AKUA], draft }), { every: 40, hold: 650 }),
  { ...EMPTY, chips: [AKUA, FIIFI], ms: 1000 },
  { ...EMPTY, pending: [AKUA, FIIFI], note: "Invites sent to 2 people", tone: "wait", ms: 1500 },
  { ...EMPTY, pending: [FIIFI], team: [...TEAM, AKUA], note: "Akua joined the team", tone: "good", ms: 1300 },
  { ...EMPTY, team: [...TEAM, AKUA, FIIFI], note: "Fiifi joined the team", tone: "good", ms: 2600 },
];

const fromBeat = (step: number): InviteTeamValue => {
  const { ms: _, ...value } = BEATS[step]!;
  return value;
};

const accept =
  (invitee: Person) =>
  (current: InviteTeamValue): InviteTeamValue => {
    if (!current.pending.includes(invitee)) return current;

    return {
      ...current,
      pending: current.pending.filter((pending) => pending !== invitee),
      team: [...current.team, invitee],
      note: `${invitee.firstName} joined the team`,
      tone: "good",
    };
  };

function useAcceptInvites(
  pending: readonly Person[],
  enabled: boolean,
  update: (change: (current: InviteTeamValue) => InviteTeamValue) => void,
) {
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const scheduled = timers.current;
    return () => scheduled.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const stillPending = new Set(pending.map((invitee) => invitee.email));
    for (const [email, timer] of timers.current) {
      if (stillPending.has(email)) continue;
      clearTimeout(timer);
      timers.current.delete(email);
    }

    pending.forEach((invitee, index) => {
      if (timers.current.has(invitee.email)) return;

      const timer = setTimeout(
        () => {
          timers.current.delete(invitee.email);
          update(accept(invitee));
        },
        ACCEPT_AFTER + index * ACCEPT_APART,
      );

      timers.current.set(invitee.email, timer);
    });
  }, [enabled, pending, update]);
}

interface InviteTeamDemoProps {
  framed?: boolean;
  playing?: boolean;
}

export function InviteTeamDemo({ framed = true, playing }: InviteTeamDemoProps) {
  const scene = useScene(BEATS, fromBeat, playing);
  useAcceptInvites(scene.state.pending, !scene.live, scene.takeOver);

  const element = <InviteTeam ref={scene.ref} value={scene.state} onValueChange={scene.onValueChange} />;
  return framed ? <Frame>{element}</Frame> : element;
}
