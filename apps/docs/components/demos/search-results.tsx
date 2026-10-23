"use client";
/**
 * A search field resting in the middle with a word in it. Open it and it rises to the top with
 * recent searches under it (`Remold.Layout`); choose one and the word in the field becomes it, the
 * letters both share sliding into place (`Remold.Text`). Then the menu closes and the field settles
 * back to the middle.
 *
 * It plays a short scene while it's on screen. Touch it and it's yours: click the field, move with
 * the arrow keys or the pointer, and choose with Enter or a click.
 */
import { Remold } from "@remold-ui/react";
import { History, Search } from "lucide-react";
import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from "react";
import { Frame } from "./frame";
import { useScene } from "./use-scene";
import "./search-results.css";

/** Everything that can be in the field. The menu shows the other three. */
const SEARCHES = ["spring physics", "shared layout", "text morph", "easing curves"] as const;

/** The recent searches under a word: the one after it sits second, where the scene's selection stops. */
const recents = (word: string) => {
  const i = SEARCHES.indexOf(word as (typeof SEARCHES)[number]);
  return [3, 1, 2].map((n) => SEARCHES[(i + n) % SEARCHES.length]!);
};

interface State {
  word: string;
  open: boolean;
  active?: number;
}

interface Beat {
  round: number;
  /** How long the beat holds before the next one, in ms. */
  ms: number;
  open?: boolean;
  active?: number;
  /** The field already shows the chosen word. */
  chosen?: boolean;
}

/**
 * One round: rest in the middle, rise and open (held until the move has settled), a beat before the
 * selection moves, a step down, then the word changes while the menu is still open so it reads as
 * the result of choosing. The menu closes after, and the new word gets the longest rest.
 */
const BEATS: readonly Beat[] = SEARCHES.flatMap((_, round) => [
  { round, ms: 1800 },
  { round, open: true, ms: 820 },
  { round, open: true, active: 0, ms: 560 },
  { round, open: true, active: 1, ms: 780 },
  { round, open: true, active: 1, chosen: true, ms: 1000 },
]);

const fromBeat = (step: number): State => {
  const beat = BEATS[step]!;
  const word = SEARCHES[beat.round]!;
  return { word: beat.chosen ? recents(word)[1]! : word, open: beat.open ?? false, active: beat.active };
};

const SPRING = { duration: 0.6, bounce: 0.1 };

/** How long a chosen word shows in the open field before the menu closes, in ms. */
const SETTLE = 420;

interface SearchResultsDemoProps {
  framed?: boolean;
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function SearchResultsDemo({ framed = true, playing }: SearchResultsDemoProps) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const section = useRef<HTMLElement>(null);
  const closing = useRef<ReturnType<typeof setTimeout>>(undefined);
  // The list is the one under the word the menu opened on, so choosing doesn't reshuffle it.
  const opened = useRef(state.word);
  if (!state.open) opened.current = state.word;
  const list = recents(opened.current);

  const choose = (item: string, index: number) => {
    take((s) => ({ ...s, word: item, active: index }));
    clearTimeout(closing.current);
    closing.current = setTimeout(() => take((s) => ({ ...s, open: false, active: undefined })), SETTLE);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const by = event.key === "ArrowDown" ? 1 : -1;
      take((s) =>
        s.open ? { ...s, active: ((s.active ?? (by > 0 ? -1 : 0)) + by + list.length) % list.length } : { ...s, open: true, active: 0 },
      );
    } else if (event.key === "Enter" && state.open && state.active !== undefined) {
      event.preventDefault();
      choose(list[state.active]!, state.active);
    } else if (event.key === "Escape" && state.open) {
      take((s) => ({ ...s, open: false, active: undefined }));
    }
  };

  // A click anywhere else closes the menu.
  useEffect(() => {
    if (!state.open || scene.live) return;
    const away = (event: PointerEvent) => {
      if (!section.current?.contains(event.target as Node)) take((s) => ({ ...s, open: false, active: undefined }));
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [state.open, scene.live, take]);

  useEffect(() => () => clearTimeout(closing.current), []);

  const setRefs = (element: HTMLElement | null) => {
    section.current = element;
    scene.ref(element);
  };

  const body = (
    <section ref={setRefs} className="sr" data-open={state.open ? "" : undefined} aria-label="Search with recent searches">
      {/* Only the layout moves here: the field rising, the menu, the highlight. The word is Remold.Text's. */}
      <Remold.Layout trigger={[state.open, state.active]} spring={SPRING} className="sr-stage">
        <button
          type="button"
          className="sr-field"
          aria-haspopup="listbox"
          aria-expanded={state.open}
          onClick={() => take((s) => ({ ...s, open: !s.open, active: undefined }))}
          onKeyDown={onKeyDown}
        >
          <Search className="sr-glass" aria-hidden="true" />
          <Remold.Text className="sr-word">{state.word}</Remold.Text>
          {!state.open && <kbd className="sr-kbd">⌘K</kbd>}
        </button>
        {state.open && (
          <div className="sr-menu">
            <p className="sr-label" id="sr-recent">
              Recent
            </p>
            <ul className="sr-list" role="listbox" aria-labelledby="sr-recent">
              {/* The highlight sits in the active row's grid cell, so moving it is a layout change. */}
              {state.active !== undefined && (
                <li className="sr-highlight" style={{ gridRow: state.active + 1 } as CSSProperties} aria-hidden="true" />
              )}
              {list.map((item, i) => (
                <li
                  key={item}
                  role="option"
                  aria-selected={i === state.active}
                  className="sr-row"
                  style={{ gridRow: i + 1 } as CSSProperties}
                  onPointerEnter={() => !scene.live && state.active !== i && take((s) => ({ ...s, active: i }))}
                  onClick={() => choose(item, i)}
                >
                  <History aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Remold.Layout>
    </section>
  );

  return framed ? <Frame>{body}</Frame> : body;
}
