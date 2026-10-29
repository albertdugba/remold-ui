"use client";
/**
 * A value with undo and redo. Rapid changes to the same thing (dragging a slider, typing) are
 * folded into one step, so undo goes back to before the drag, not one pixel.
 */
import { useCallback, useReducer } from "react";

interface History<T> {
  past: T[];
  present: T;
  future: T[];
  /** What the last change was to, and when, for folding rapid changes together. */
  last: { key: string; at: number } | null;
}

type Action<T> =
  | { type: "set"; next: T; key?: string; at: number }
  | { type: "reset"; next: T }
  | { type: "undo" }
  | { type: "redo" };

const FOLD_MS = 700;
const LIMIT = 100;

function reduce<T>(h: History<T>, action: Action<T>): History<T> {
  switch (action.type) {
    case "set": {
      if (action.next === h.present) return h;
      const fold = action.key !== undefined && h.last?.key === action.key && action.at - h.last.at < FOLD_MS;
      return {
        past: fold ? h.past : [...h.past, h.present].slice(-LIMIT),
        present: action.next,
        future: [],
        last: action.key === undefined ? null : { key: action.key, at: action.at },
      };
    }
    case "reset":
      return { past: [], present: action.next, future: [], last: null };
    case "undo": {
      const previous = h.past[h.past.length - 1];
      if (previous === undefined) return h;
      return { past: h.past.slice(0, -1), present: previous, future: [h.present, ...h.future], last: null };
    }
    case "redo": {
      const [next, ...rest] = h.future;
      if (next === undefined) return h;
      return { past: [...h.past, h.present], present: next, future: rest, last: null };
    }
  }
}

export function useHistory<T>(initial: () => T) {
  const [h, dispatch] = useReducer(reduce<T>, undefined, () => ({ past: [], present: initial(), future: [], last: null }));
  return {
    value: h.present,
    /** Make a change. Give changes to the same field the same `key` to fold quick runs into one undo. */
    set: useCallback((next: T, key?: string) => dispatch({ type: "set", next, key, at: Date.now() }), []),
    /** Start over from `next`, forgetting history. */
    reset: useCallback((next: T) => dispatch({ type: "reset", next }), []),
    undo: useCallback(() => dispatch({ type: "undo" }), []),
    redo: useCallback(() => dispatch({ type: "redo" }), []),
    canUndo: h.past.length > 0,
    canRedo: h.future.length > 0,
  };
}
