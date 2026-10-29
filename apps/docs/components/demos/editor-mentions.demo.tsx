"use client";

import { useAutoplay } from "@remold-ui/react";
import { useEffect, useState } from "react";
import { EditorMentions } from "./editor-mentions";
import {
  initialMentionsState,
  reduceMentions,
  type MentionsAction,
  type MentionsState,
} from "./editor-mentions.model";

type ScriptStep = { action: MentionsAction | null; duration: number };
const type = (text: string, duration = 55): ScriptStep[] =>
  [...text].map((character) => ({
    action: { type: "type", character },
    duration,
  }));
const script: ScriptStep[] = [
  { action: null, duration: 1300 },
  ...type("Agree. "),
  { action: { type: "type", character: "@" }, duration: 650 },
  { action: { type: "type", character: "a" }, duration: 420 },
  { action: { type: "type", character: "m" }, duration: 700 },
  { action: { type: "pick" }, duration: 900 },
  ...type("can you and "),
  { action: { type: "type", character: "@" }, duration: 500 },
  { action: { type: "type", character: "k" }, duration: 380 },
  { action: { type: "move", direction: 1 }, duration: 260 },
  { action: { type: "move", direction: -1 }, duration: 500 },
  { action: { type: "pick" }, duration: 900 },
  ...type("check the totals?"),
  { action: null, duration: 700 },
  { action: { type: "send" }, duration: 2800 },
];
const states = script.reduce<MentionsState[]>((all, step) => {
  const previous = all.at(-1) ?? initialMentionsState;
  return [
    ...all,
    step.action ? reduceMentions(previous, step.action) : previous,
  ];
}, []);

/** Showcase-only wrapper. The installable EditorMentions component has no autoplay dependency. */
export function EditorMentionsDemo({ playing }: { playing?: boolean } = {}) {
  const autoplay = useAutoplay(script.length, {
    every: (index) => script[index]!.duration,
    stopOnInteraction: playing === undefined,
  });
  const { step, setPlaying } = autoplay;
  const [editedState, setEditedState] = useState<MentionsState | null>(null);
  useEffect(() => {
    if (playing === undefined) return;
    setPlaying(playing);
    if (playing) setEditedState(null);
  }, [playing, setPlaying]);
  return (
    <div ref={autoplay.ref}>
      <EditorMentions
        state={editedState ?? states[step]!}
        onInteraction={() => setPlaying(false)}
        onStateChange={setEditedState}
      />
    </div>
  );
}
