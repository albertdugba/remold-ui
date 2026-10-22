"use client";
import { Remold } from "@remold-ui/react";
import { useState } from "react";
import { Frame } from "./frame";
import { SCENE } from "./scene";

const CHAPTERS: Remold.Story.Chapter[] = [
  {
    id: "clients",
    layout: "Simple",
    focused: "web",
    title: "Requests start in the clients",
    description: "Web and mobile both talk to the same API.",
  },
  { id: "api", layout: "Simple", focused: "api", title: "One API owns the data", description: "Nothing else reads the database directly." },
  {
    id: "scale",
    layout: "Scaled",
    focused: "db",
    title: "Then the database grows",
    description: "The layout changes; the story keeps its place.",
  },
];

/** A scene told as chapters, with Back and Next. */
export function StoryDemo() {
  const [chapter, setChapter] = useState(CHAPTERS[0]!.id);
  const index = CHAPTERS.findIndex((c) => c.id === chapter);
  return (
    <Frame tone="dark">
      <div className="rm-scene">
        <Remold.Story
          {...SCENE}
          palette="slate"
          chapters={CHAPTERS}
          chapter={chapter}
          onChapterChange={setChapter}
          canvasClassName="rm-scene-canvas"
        />
        <div className="rm-scene-foot">
          <button type="button" className="rm-button" disabled={index === 0} onClick={() => setChapter(CHAPTERS[index - 1]!.id)}>
            Back
          </button>
          <p>
            {index + 1} of {CHAPTERS.length}
          </p>
          <button
            type="button"
            className="rm-button"
            disabled={index === CHAPTERS.length - 1}
            onClick={() => setChapter(CHAPTERS[index + 1]!.id)}
          >
            Next
          </button>
        </div>
      </div>
    </Frame>
  );
}
