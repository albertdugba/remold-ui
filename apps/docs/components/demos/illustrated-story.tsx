"use client";
import { Remold } from "@remold-ui/react";
import { useEffect, useState, type ReactNode } from "react";
import { useScene } from "./use-scene";
import "./illustrated-story.css";

export type StoryLayer =
  | "soft"
  | "ink"
  | "sheen"
  | "brand"
  | "light"
  | "top"
  | "topSoft"
  | "topBrand"
  | "topLight";

export interface StoryStage {
  /** Written as `data-stage`, for the story's CSS. */
  id: string;
  /** The step's name, for its button and the drawing's label. */
  label: string;
  title: string;
  line: string;
  /** Path data per layer, on the 160 × 128 frame. A layer left out shrinks to a point. */
  art: Partial<Record<StoryLayer, string>>;
}

const VIEW_BOX = "0 0 160 128";
const POINT = "M80 64h0.1v0.1h-0.1Z";
const BODY: readonly StoryLayer[] = ["ink", "sheen", "brand", "light"];
const PART: readonly StoryLayer[] = ["topSoft", "top", "topBrand", "topLight"];
const MORPH_MS = 600;

export interface IllustratedStoryProps {
  stages: readonly StoryStage[];
  stage: number;
  onStageChange?: (stage: number) => void;
  /** What the whole thing is, for screen readers: "Order status". */
  label: string;
  /** The story's own class, which its CSS hangs off; it can set `--ils-brand`. */
  className?: string;
  /** Drawn on the ground, behind everything (a road). */
  under?: ReactNode;
  /** Drawn with the object, so they move with it (spokes on the wheels). */
  extras?: ReactNode;
  /** Drawn over everything (a ping). */
  over?: ReactNode;
  /** Whether to show the step bars under the words. Leave them out for a status that isn't a sequence. */
  steps?: boolean;
}

function Layer({ layer, d }: { layer: StoryLayer; d?: string }) {
  return (
    <Remold.Icon
      className={`ils-frame ils-layer ils-${layer}`}
      path={d ?? POINT}
      viewBox={VIEW_BOX}
      fill="currentColor"
      aria-hidden="true"
    />
  );
}

/** A plain SVG on the story's frame, for the `under`, `extras` and `over` pieces. */
export function StoryFrame({ className, children }: { className: string; children: ReactNode }) {
  return (
    <svg className={`ils-frame ils-extra ${className}`} viewBox={VIEW_BOX} aria-hidden="true">
      {children}
    </svg>
  );
}

export function IllustratedStory({
  stages,
  stage,
  onStageChange,
  label,
  className = "",
  under,
  extras,
  over,
  steps = true,
}: IllustratedStoryProps) {
  const current = stages[stage]!;
  const [morphing, setMorphing] = useState(false);
  useEffect(() => {
    setMorphing(true);
    const timer = setTimeout(() => setMorphing(false), MORPH_MS);
    return () => clearTimeout(timer);
  }, [stage]);

  return (
    <section className={`ils ${className}`} aria-label={label}>
      <div
        className="ils-art"
        data-stage={current.id}
        data-morphing={morphing || undefined}
        role="img"
        aria-label={current.label}
      >
        <svg className="ils-frame ils-ground" viewBox={VIEW_BOX} aria-hidden="true">
          <ellipse cx="80" cy="114" rx="58" ry="5" />
        </svg>
        {under}
        <Layer layer="soft" d={current.art.soft} />
        <div className="ils-frame ils-body">
          {BODY.map((layer) => (
            <Layer key={layer} layer={layer} d={current.art[layer]} />
          ))}
          {extras}
          <div className="ils-frame ils-part">
            {PART.map((layer) => (
              <Layer key={layer} layer={layer} d={current.art[layer]} />
            ))}
          </div>
        </div>
        {over}
      </div>

      <div className="ils-copy" aria-live="polite">
        <Remold.Text className="ils-title">{current.title}</Remold.Text>
        <Remold.Text className="ils-line">{current.line}</Remold.Text>
      </div>

      {steps && (
      <ol className="ils-steps" style={{ gridTemplateColumns: `repeat(${stages.length}, 40px)` }}>
        {stages.map((entry, index) => (
          <li key={entry.id}>
            <button
              type="button"
              className="ils-step"
              data-state={index < stage ? "done" : index === stage ? "current" : "next"}
              aria-current={index === stage ? "step" : undefined}
              aria-label={entry.label}
              onClick={() => onStageChange?.(index)}
            />
          </li>
        ))}
      </ol>
      )}
    </section>
  );
}

const fromBeat = (step: number) => step;

/**
 * Plays a story through on its own, docs page included; tapping a step takes over. `ms` is how
 * long each stage plays, its morph in and then its live motion.
 */
export function useStory(ms: readonly number[], playing?: boolean) {
  const [beats] = useState(() => ms.map((duration) => ({ ms: duration })));
  return useScene(beats, fromBeat, playing ?? true);
}
