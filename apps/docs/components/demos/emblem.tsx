"use client";
/**
 * Filled SVG artwork that reshapes between symbols: different numbers of pieces, holes and
 * points, from one path into the next. The shapes are drawn for this page on a 100 × 100 grid.
 */
import { springs, Remold } from "@remold-ui/react";
import { useId, useState } from "react";
import { Frame, Segmented } from "./frame";
import "./emblem.css";

const EMBLEMS = {
  Listen: "M28 72a12 10 0 1 0 24 0a12 10 0 1 0 -24 0Z M62 64a12 10 0 1 0 24 0a12 10 0 1 0 -24 0Z M46 72V26L86 16V64H80V30L52 37V72Z",
  Shop: "M22 36H78L72 86H28Z M38 36V30a12 12 0 0 1 24 0v6h-6v-6a6 6 0 0 0-12 0v6Z",
  Measure: "M18 80V56H32V80Z M40 80V40H54V80Z M62 80V24H76V80Z M14 86H86V91H14Z",
  Talk: "M18 22h64a8 8 0 0 1 8 8v32a8 8 0 0 1-8 8H46l-18 15v-15H18a8 8 0 0 1-8-8V30a8 8 0 0 1 8-8Z",
  Create: "M50 10l10 28h30l-24 18 9 29-25-18-25 18 9-29-24-18h30Z",
} as const;
type Emblem = keyof typeof EMBLEMS;
const NAMES = Object.keys(EMBLEMS) as Emblem[];

export function EmblemDemo({ framed = true, index }: { framed?: boolean; index?: number }) {
  const [own, setOwn] = useState<Emblem>("Listen");
  const name = index === undefined ? own : NAMES[index % NAMES.length]!;
  const gradient = `emblem-${useId().replace(/:/g, "")}`;
  const body = (
    <div className="rm-emblem">
      <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#60a5fa" />
            <stop offset="1" stopColor="#4f46e5" />
          </linearGradient>
        </defs>
      </svg>
      <Remold.Icon
        className="rm-emblem-art"
        d={EMBLEMS[name]}
        viewBox="0 0 100 100"
        fill={`url(#${gradient})`}
        spring={springs.bouncy}
        role="img"
        aria-label={name}
      />
      {index === undefined ? (
        <Segmented label="Symbol" value={name} onChange={setOwn} options={NAMES} />
      ) : (
        <Remold.Text className="rm-emblem-name">{name}</Remold.Text>
      )}
    </div>
  );
  return framed ? <Frame>{body}</Frame> : body;
}
