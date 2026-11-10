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
): { onTransition: (transition: Transition) => void; overlay: ReactNode } {
  const overlayRef = useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const drawings = useRef(0);

  const onTransition = useCallback(
    (transition: Transition) => {
      if (!enabled) return;
      transition.ready
        .then(({ before, after, matches }) => {
          const frame = overlayRef.current?.getBoundingClientRect();
          if (!frame) return;
          const centre = (rect: { x: number; y: number; width: number; height: number }) => ({
            x: rect.x + rect.width / 2 - frame.left,
            y: rect.y + rect.height / 2 - frame.top,
          });

          const matchedAfter = new Set(matches.pairs.map((pair) => pair.to));
          const lines: Line[] = [];
          for (const pair of matches.pairs) {
            if (select) {
              if (!after.elements[pair.to]?.matches(select)) continue;
            } else {
              const parent = after.nodes[pair.to]?.parent ?? -1;
              if (parent >= 0 && matchedAfter.has(parent)) continue;
            }
            const beforeBox = before.boxes[pair.from];
            const afterBox = after.boxes[pair.to];
            if (!beforeBox || !afterBox) continue;
            const from = centre(beforeBox);
            const to = centre(afterBox);
            if (Math.hypot(to.x - from.x, to.y - from.y) < SHORTEST) continue;
            lines.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y });
          }
          const arrivals = matches.added.flatMap((index) => {
            if (select && !after.elements[index]?.matches(select)) return [];
            const parent = after.nodes[index]?.parent ?? -1;
            if (parent >= 0 && (matchedAfter.has(parent) || matches.added.includes(parent))) return [];
            const arrived = after.boxes[index];
            return arrived ? [centre(arrived)] : [];
          });
          setDrawing({ id: ++drawings.current, lines, arrivals });
        })
        .catch(() => {});
    },
    [enabled, select],
  );

  const overlay = (
    <svg ref={overlayRef} className="ml-overlay" aria-hidden="true">
      {enabled && drawing && (
        <g key={drawing.id} className="ml-drawing">
          {drawing.lines.map((segment, index) => (
            <g key={index}>
              <line x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} pathLength={1} />
              <circle cx={segment.x1} cy={segment.y1} r={2.5} className="ml-from" />
              <circle cx={segment.x2} cy={segment.y2} r={3.5} className="ml-to" />
            </g>
          ))}
          {drawing.arrivals.map((arrival, index) => (
            <circle key={`a${index}`} cx={arrival.x} cy={arrival.y} r={5} className="ml-new" />
          ))}
        </g>
      )}
    </svg>
  );

  return { onTransition, overlay };
}
