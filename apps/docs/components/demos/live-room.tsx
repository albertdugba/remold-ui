"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, MicOff01Icon, WavingHand01Icon } from "@hugeicons/core-free-icons";
import { Remold, useAutoplay } from "@remold-ui/react";
import { useEffect, useState } from "react";
import "./live-room.css";

interface Person {
  name: string;
  /** Muted on stage: no speaking ring, a small mic-off badge. */
  muted?: boolean;
}

type RoomState = "collapsed" | "open" | "hand-raised" | "on-stage";

/** Illustrated avatars from DiceBear's public API: drawn, so no real person's face. Same name, same face. */
const face = (name: string) => `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=ede9fe`;

const TITLE = "Ship It Friday";
const HOST = "Ama Mensah";
const SPEAKERS: Person[] = [{ name: HOST }, { name: "Kwame Owusu" }, { name: "Efua Addo", muted: true }];
const LISTENERS: Person[] = [
  { name: "Esi Ofori" },
  { name: "Kofi Agyeman" },
  { name: "Yaw Darko" },
  { name: "Abena Osei" },
  { name: "Kojo Amponsah" },
  { name: "Afia Sarpong" },
  { name: "Nii Lartey" },
];
const YOU: Person = { name: "You" };
/** Everyone in the room, including the ones not shown in the grid. */
const LISTENING = 14;

/** How long a speaker talks before the next one does. */
const TURN = 1500;
/** How long the host takes to invite someone who raised their hand. */
const INVITE = 1300;

const SPRING = { duration: 0.6, bounce: 0.16 };

const first = (name: string) => name.split(" ")[0]!;

function Face({ person, size, speaking, hand }: { person: Person; size: number; speaking?: boolean; hand?: boolean }) {
  return (
    <span className="lr-face" data-speaking={speaking || undefined} style={{ width: size, height: size }}>
      <img src={face(person.name)} alt="" width={size} height={size} draggable={false} />
      {person.muted && (
        <span className="lr-badge" aria-label="Muted">
          <HugeiconsIcon icon={MicOff01Icon} aria-hidden="true" />
        </span>
      )}
      {hand && (
        <span className="lr-badge hand" aria-label="Hand raised">
          <HugeiconsIcon icon={WavingHand01Icon} aria-hidden="true" />
        </span>
      )}
    </span>
  );
}

/** The scene: the pill, the room opening, a hand going up, the invite, then back to the pill. */
const STEPS = [
  { ms: 1800, act: "rest" },
  { ms: 2400, act: "open" },
  { ms: 300, act: "hand" },
  { ms: 3600, act: "wait" },
  { ms: 1800, act: "close" },
] as const;

interface LiveRoomDemoProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
  /** A catalogue preview opens immediately on attention, rather than waiting through the pill's rest beat. */
  previewOpen?: boolean;
}

export function LiveRoomDemo({ playing, previewOpen = false }: LiveRoomDemoProps = {}) {
  const [room, setRoom] = useState<RoomState>("collapsed");
  const [turn, setTurn] = useState(0);
  const autoplay = useAutoplay(STEPS.length, { every: (i) => STEPS[i]!.ms, stopOnInteraction: playing === undefined });
  const { step, playing: live, setPlaying } = autoplay;

  useEffect(() => {
    if (playing !== undefined) setPlaying(playing);
  }, [playing, setPlaying]);

  // The scene's beats.
  useEffect(() => {
    if (!live) return;
    const act = STEPS[step]!.act;
    if (act === "rest") setRoom("collapsed");
    else if (act === "open") setRoom("open");
    else if (act === "hand") setRoom("hand-raised");
    else if (act === "close") setRoom("collapsed");
  }, [step, live]);

  useEffect(() => {
    if (previewOpen) setRoom("open");
    else if (playing !== undefined) setRoom("collapsed");
  }, [playing, previewOpen]);

  // A raised hand is answered: the host invites you up.
  useEffect(() => {
    if (room !== "hand-raised") return;
    const timer = setTimeout(() => setRoom("on-stage"), INVITE);
    return () => clearTimeout(timer);
  }, [room]);

  // Speakers take turns while the room is open; whoever's muted is skipped.
  useEffect(() => {
    if (room === "collapsed") return;
    const timer = setInterval(() => setTurn((t) => t + 1), TURN);
    return () => clearInterval(timer);
  }, [room]);

  const onStage = room === "on-stage";
  const hand = room === "hand-raised";
  const open = room !== "collapsed";
  const stage = onStage ? [...SPEAKERS, YOU] : SPEAKERS;
  const talkers = stage.filter((p) => !p.muted);
  const speaking = talkers[turn % talkers.length]!.name;
  const listeners = onStage ? LISTENERS : [YOU, ...LISTENERS];

  return (
    <div ref={autoplay.ref} className="lr not-prose">
      {/* Only opening the room and you moving to the stage animate; who's speaking is CSS. */}
      <Remold.Layout trigger={[open, onStage]} spring={SPRING} className="lr-stage">
        {open ? (
          <section className="lr-room" aria-label={`${TITLE}, live room`}>
            <header className="lr-head">
              <span className="lr-live">Live</span>
              <span className="lr-count">{`${LISTENING} listening`}</span>
              <button type="button" className="lr-close" aria-label="Minimise room" onClick={() => setRoom("collapsed")}>
                <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden="true" />
              </button>
            </header>
            <h4 className="lr-title">{TITLE}</h4>

            <ul className="lr-speakers" aria-label="On stage">
              {stage.map((p) => (
                <li key={p.name}>
                  <Face person={p} size={60} speaking={p.name === speaking} />
                  <span className="lr-name">{p.name === HOST ? `${first(p.name)} · Host` : first(p.name)}</span>
                </li>
              ))}
            </ul>

            <p className="lr-section">Listening</p>
            <ul className="lr-listeners" aria-label="Listening">
              {listeners.map((p) => (
                <li key={p.name}>
                  <Face person={p} size={40} hand={p === YOU && hand} />
                  <span className="lr-name">{first(p.name)}</span>
                </li>
              ))}
              <li className="lr-more" aria-label={`and ${LISTENING - listeners.length} more`}>
                {`+${LISTENING - listeners.length}`}
              </li>
            </ul>

            <footer className="lr-foot">
              {onStage ? (
                <button type="button" className="lr-action" onClick={() => setRoom("open")}>
                  Leave the stage
                </button>
              ) : (
                <button type="button" className="lr-action" aria-pressed={hand} onClick={() => setRoom(hand ? "open" : "hand-raised")}>
                  <HugeiconsIcon icon={WavingHand01Icon} aria-hidden="true" />
                  {hand ? "Hand raised" : "Raise hand"}
                </button>
              )}
              <button type="button" className="lr-leave" onClick={() => setRoom("collapsed")}>
                Leave quietly
              </button>
            </footer>
          </section>
        ) : (
          <section className="lr-pill" aria-label={`${TITLE}, live room`}>
            <button type="button" className="lr-hit" aria-expanded={false} aria-label={`Open ${TITLE}`} onClick={() => setRoom("open")} />
            <span className="lr-stack" aria-hidden="true">
              {stage.slice(0, 3).map((p) => (
                <Face key={p.name} person={{ name: p.name }} size={30} />
              ))}
            </span>
            <span className="lr-pill-text">
              <h4 className="lr-title">{TITLE}</h4>
              <span className="lr-count">
                <span className="lr-live">Live</span>
                {`${LISTENING} listening`}
              </span>
            </span>
            <span className="lr-join" aria-hidden="true">
              Join
            </span>
          </section>
        )}
      </Remold.Layout>
    </div>
  );
}
