"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, MicOff01Icon, WavingHand01Icon } from "@hugeicons/core-free-icons";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { flushSync } from "react-dom";
import { memo, useEffect, useRef, useState, type Ref } from "react";
import { useScene } from "./use-scene";
import "./live-room.css";

interface Person {
  name: string;
  muted?: boolean;
}

type RoomState = "collapsed" | "open" | "hand-raised" | "on-stage";

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
const LISTENING = 14;
const TURN = 1500;
const INVITE = 1300;
const SPRING = { type: "spring" as const, duration: 0.6, bounce: 0.16 };

const STEPS = [
  { ms: 1800, act: "rest" },
  { ms: 2400, act: "open" },
  { ms: 300, act: "hand" },
  { ms: 3600, act: "wait" },
  { ms: 1800, act: "close" },
] as const;

type Act = (typeof STEPS)[number]["act"];

const FOLLOW: Partial<Record<Act, RoomState>> = {
  rest: "collapsed",
  open: "open",
  hand: "hand-raised",
  close: "collapsed",
};

const first = (name: string) => name.split(" ")[0]!;
const act = (step: number) => STEPS[step]!.act;

function Face({ person, size, speaking, hand, layoutId }: { person: Person; size: number; speaking?: boolean; hand?: boolean; layoutId?: string }) {
  return (
    <motion.span
      layoutId={layoutId}
      layoutDependency={layoutId ? `${layoutId}-${size}` : undefined}
      className="lr-face"
      data-speaking={speaking || undefined}
      style={{ width: size, height: size }}
      transition={SPRING}
    >
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
    </motion.span>
  );
}

function Title({ place }: { place: "pill" | "room" }) {
  return (
    <motion.h4 layoutId="lr-title" layoutDependency={`lr-title-${place}`} className="lr-title" transition={SPRING}>
      {TITLE}
    </motion.h4>
  );
}

function Live({ place }: { place: "pill" | "room" }) {
  return (
    <motion.span layoutId="lr-live" layoutDependency={`lr-live-${place}`} className="lr-live" transition={SPRING}>
      Live
    </motion.span>
  );
}

function Count({ place, className }: { place: "pill" | "room"; className?: string }) {
  return (
    <motion.span layoutId="lr-count" layoutDependency={`lr-count-${place}`} className={className} transition={SPRING}>
      {`${LISTENING} listening`}
    </motion.span>
  );
}

function Member({ person, size, speaking, hand, layoutId, host }: { person: Person; size: number; speaking?: boolean; hand?: boolean; layoutId?: string; host?: boolean }) {
  return (
    <li>
      <Face person={person} size={size} speaking={speaking} hand={hand} layoutId={layoutId} />
      <span className="lr-name">{host ? `${first(person.name)} · Host` : first(person.name)}</span>
    </li>
  );
}

function Pill({ onOpen, ref }: { onOpen: () => void; ref?: Ref<HTMLElement> }) {
  return (
    <motion.section ref={ref} layoutId="lr-shell" layoutDependency="pill" className="lr-pill" transition={SPRING} aria-label={`${TITLE}, live room`}>
      <button type="button" className="lr-hit" aria-expanded={false} aria-label={`Open ${TITLE}`} onClick={onOpen} />
      <span className="lr-stack" aria-hidden="true">
        {SPEAKERS.map((person) => (
          <Face key={person.name} person={{ name: person.name }} size={30} layoutId={`face-${person.name}`} />
        ))}
      </span>
      <span className="lr-pill-text">
        <Title place="pill" />
        <span className="lr-count">
          <Live place="pill" />
          <Count place="pill" />
        </span>
      </span>
      <motion.span layout layoutDependency="lr-join" className="lr-join" transition={SPRING} aria-hidden="true">
        Join
      </motion.span>
    </motion.section>
  );
}

function Room({ room, speaking, onRoom, ref }: { room: RoomState; speaking: string; onRoom: (next: RoomState) => void; ref?: Ref<HTMLElement> }) {
  const onStage = room === "on-stage";
  const hand = room === "hand-raised";
  const stage = onStage ? [...SPEAKERS, YOU] : SPEAKERS;
  const listeners = onStage ? LISTENERS : [YOU, ...LISTENERS];

  return (
    <motion.section
      ref={ref}
      layoutId="lr-shell"
      layoutDependency={onStage ? "stage" : "open"}
      className="lr-room"
      transition={SPRING}
      aria-label={`${TITLE}, live room`}
    >
      <header className="lr-head">
        <Live place="room" />
        <Count place="room" className="lr-count" />
        <button type="button" className="lr-close" aria-label="Minimise room" onClick={() => onRoom("collapsed")}>
          <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden="true" />
        </button>
      </header>
      <Title place="room" />

      <ul className="lr-speakers" aria-label="On stage">
        {stage.map((person) => (
          <Member key={person.name} person={person} size={60} speaking={person.name === speaking} host={person.name === HOST} layoutId={`face-${person.name}`} />
        ))}
      </ul>

      <p className="lr-section">Listening</p>
      <ul className="lr-listeners" aria-label="Listening">
        {listeners.map((person) => (
          <Member key={person.name} person={person} size={40} hand={person === YOU && hand} layoutId={person === YOU ? "face-You" : undefined} />
        ))}
        <li className="lr-more" aria-label={`and ${LISTENING - listeners.length} more`}>
          {`+${LISTENING - listeners.length}`}
        </li>
      </ul>

      <footer className="lr-foot">
        {onStage ? (
          <button type="button" className="lr-action" onClick={() => onRoom("open")}>
            Leave the stage
          </button>
        ) : (
          <button type="button" className="lr-action" aria-pressed={hand} onClick={() => onRoom(hand ? "open" : "hand-raised")}>
            <HugeiconsIcon icon={WavingHand01Icon} aria-hidden="true" />
            {hand ? "Hand raised" : "Raise hand"}
          </button>
        )}
        <button type="button" className="lr-leave" onClick={() => onRoom("collapsed")}>
          Leave quietly
        </button>
      </footer>
    </motion.section>
  );
}

const Stage = memo(function Stage({ room, speaking, onRoom }: { room: RoomState; speaking: string; onRoom: (next: RoomState) => void }) {
  return (
    <LayoutGroup>
      <div className="lr-stage">
        <AnimatePresence initial={false} mode="popLayout">
          {room === "collapsed" ? <Pill key="pill" onOpen={() => onRoom("open")} /> : <Room key="room" room={room} speaking={speaking} onRoom={onRoom} />}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
});

interface LiveRoomDemoProps {
  playing?: boolean;
  previewOpen?: boolean;
}

export function LiveRoomDemo({ playing, previewOpen = false }: LiveRoomDemoProps = {}) {
  const scene = useScene(STEPS, act, playing);
  const [room, setRoom] = useState<RoomState>(previewOpen ? "open" : "collapsed");
  const [turn, setTurn] = useState(0);
  const firstBeat = useRef(true);

  useEffect(() => {
    if (firstBeat.current) {
      firstBeat.current = false;
      return;
    }
    if (!scene.live) return;
    const next = FOLLOW[scene.state];
    if (!next) return;
    // A timer update freezes the shared fade. Flushing it on the next turn runs it the way a click does.
    const id = setTimeout(() => flushSync(() => setRoom(next)), 0);
    return () => clearTimeout(id);
  }, [scene.live, scene.state]);

  useEffect(() => {
    if (playing === undefined) return;
    const next = previewOpen ? "open" : "collapsed";
    const id = setTimeout(() => flushSync(() => setRoom(next)), 0);
    return () => clearTimeout(id);
  }, [playing, previewOpen]);

  useEffect(() => {
    if (room === "collapsed") return;
    const turns = setInterval(() => setTurn((current) => current + 1), TURN);
    if (room !== "hand-raised") return () => clearInterval(turns);
    const invite = setTimeout(() => setRoom("on-stage"), INVITE);
    return () => {
      clearInterval(turns);
      clearTimeout(invite);
    };
  }, [room]);

  const onStage = room === "on-stage";
  const stage = onStage ? [...SPEAKERS, YOU] : SPEAKERS;
  const talkers = stage.filter((person) => !person.muted);
  const speaking = talkers[turn % talkers.length]!.name;

  return (
    <div ref={scene.ref} className="lr not-prose">
      <Stage room={room} speaking={speaking} onRoom={setRoom} />
    </div>
  );
}
