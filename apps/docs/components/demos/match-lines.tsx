"use client";

import type { Transition } from "@remold-ui/react";
import { useCallback, useRef, useState, type ReactNode } from "react";
import "./match-lines.css";

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Drawing {
  id: number;
  lines: Line[];
  arrivals: { x: number; y: number }[];
}

const SHORTEST = 6;

export function useMatchLines(
  enabled = true,
  { select }: { select?: string } = {},
): { onTransition: (t: Transition) => void; overlay: ReactNode } {
  const box = useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const count = useRef(0);

  const onTransition = useCallback(
    (t: Transition) => {
      if (!enabled) return;
      t.ready
        .then(({ before, after, matches }) => {
          const frame = box.current?.getBoundingClientRect();
          if (!frame) return;
          const centre = (b: {
            x: number;
            y: number;
            width: number;
            height: number;
          }) => ({
            x: b.x + b.width / 2 - frame.left,
            y: b.y + b.height / 2 - frame.top,
          });

          const matchedAfter = new Set(matches.pairs.map((p) => p.to));
          const lines: Line[] = [];
          for (const pair of matches.pairs) {
            if (select) {
              if (!after.elements[pair.to]?.matches(select)) continue;
            } else {
              const parent = after.nodes[pair.to]?.parent ?? -1;
              if (parent >= 0 && matchedAfter.has(parent)) continue;
            }
            const a = before.boxes[pair.from];
            const b = after.boxes[pair.to];
            if (!a || !b) continue;
            const p = centre(a);
            const q = centre(b);
            if (Math.hypot(q.x - p.x, q.y - p.y) < SHORTEST) continue;
            lines.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y });
          }
          const arrivals = matches.added.flatMap((index) => {
            if (select && !after.elements[index]?.matches(select)) return [];
            const parent = after.nodes[index]?.parent ?? -1;
            if (
              parent >= 0 &&
              (matchedAfter.has(parent) || matches.added.includes(parent))
            )
              return [];
            const b = after.boxes[index];
            return b ? [centre(b)] : [];
          });
          setDrawing({ id: ++count.current, lines, arrivals });
        })
        .catch(() => {});
    },
    [enabled, select],
  );

  const overlay = (
    <svg ref={box} className="ml-overlay" aria-hidden="true">
      {enabled && drawing && (
        <g key={drawing.id} className="ml-drawing">
          {drawing.lines.map((l, index) => (
            <g key={index}>
              <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} pathLength={1} />
              <circle cx={l.x1} cy={l.y1} r={2.5} className="ml-from" />
              <circle cx={l.x2} cy={l.y2} r={3.5} className="ml-to" />
            </g>
          ))}
          {drawing.arrivals.map((p, index) => (
            <circle key={`a${index}`} cx={p.x} cy={p.y} r={5} className="ml-new" />
          ))}
        </g>
      )}
    </svg>
  );

  return { onTransition, overlay };
}
