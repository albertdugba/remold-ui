"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import { Frame } from "./frame";
import { useScene } from "./use-scene";
import "./avatar-stack.css";

/*
 * Who's on a file, as overlapping faces with a "+3" for the rest. Opening it loosens the stack and
 * the three faces it stood for join the row; closing folds them back into the count. Hover or
 * focus a face for the name.
 */

const PEOPLE = [
  { name: "Ada Obi", color: "#7c5cff" },
  { name: "Ben Hart", color: "#14a596" },
  { name: "Chloe Park", color: "#ef7d22" },
  { name: "Dev Rao", color: "#2f7cf0" },
  { name: "Esi Mensah", color: "#e0457b" },
  { name: "Finn Walsh", color: "#5b8c2a" },
  { name: "Gia Russo", color: "#a855f7" },
] as const;
/** Faces shown before the count. */
const SHOWN = 4;
const HIDDEN = PEOPLE.length - SHOWN;

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("");

interface State {
  open: boolean;
}

const BEATS = [
  { open: false, ms: 2200 },
  { open: true, ms: 2600 },
] as const;

const fromBeat = (step: number): State => ({ open: BEATS[step]!.open });

const SPRING = { duration: 0.5, bounce: 0.12 };

interface AvatarStackDemoProps {
  framed?: boolean;

  playing?: boolean;
}

export function AvatarStackDemo({ framed = true, playing }: AvatarStackDemoProps) {
  const { ref, state, take } = useScene(BEATS, fromBeat, playing);
  const { open } = state;
  const people = open ? PEOPLE : PEOPLE.slice(0, SHOWN);

  const body = (
    <section ref={ref} className="as" aria-label="People on this file">
      <Remold.Layout trigger={open} spring={SPRING} className="as-row" data-open={open || undefined} role="list">
        {people.map((person, i) => (
          <span
            key={person.name}
            role="listitem"
            className="as-face"
            // Earlier faces sit on top, so the stack reads left to right.
            style={{ background: person.color, zIndex: PEOPLE.length - i }}
            tabIndex={0}
            aria-label={person.name}
            data-name={person.name}
          >
            <span aria-hidden="true">{initials(person.name)}</span>
          </span>
        ))}
        {open ? (
          <button key="less" type="button" className="as-toggle" aria-expanded="true" aria-label="Show fewer people" onClick={() => take({ open: false })}>
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : (
          <button key="more" type="button" className="as-toggle" aria-expanded="false" aria-label={`Show ${HIDDEN} more people`} onClick={() => take({ open: true })}>
            +{HIDDEN}
          </button>
        )}
      </Remold.Layout>
      <p className="as-caption">{PEOPLE.length} people on this file</p>
    </section>
  );

  return framed ? <Frame>{body}</Frame> : body;
}
