"use client";
import { Remold } from "@remold-ui/react";
import { useEffect, useState, type ReactNode } from "react";
import { useScene } from "./use-scene";

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

export interface StoryMotion {
  body?: string;
  part?: string;
  soft?: string;
}

export interface StoryStage {
  id: string;
  label: string;
  title: string;
  line: string;
  art: Partial<Record<StoryLayer, string>>;
  motion?: StoryMotion;
}

export interface IllustratedStoryProps {
  stages: readonly StoryStage[];
  stage: number;
  onStageChange?: (stage: number) => void;
  label: string;
  colors?: string;
  artClassName?: string;
  under?: ReactNode;
  extras?: ReactNode;
  over?: ReactNode;
  steps?: boolean;
}

export const STORY_COLORS =
  "[--ils-ink:#27272a] [--ils-brand:#16a34a] [--ils-soft:#d4d4d8] [--ils-track:#e4e4e7] dark:[--ils-ink:#e4e4e7] dark:[--ils-soft:#3f3f46] dark:[--ils-track:#3f3f46]";

export const STORY_STAGE = "not-prose grid w-full place-items-center px-4 py-6";

const BASE =
  "[--ils-light:#ffffff] [--ils-muted:#71717a] [--ils-sheen:rgb(255_255_255/0.16)] dark:[--ils-light:#18181b] dark:[--ils-muted:#a1a1aa] dark:[--ils-sheen:rgb(0_0_0/0.12)]";

const VIEW_BOX = "0 0 160 128";
const POINT = "M80 64h0.1v0.1h-0.1Z";
const BODY: readonly StoryLayer[] = ["ink", "sheen", "brand", "light"];
const PART: readonly StoryLayer[] = ["topSoft", "top", "topBrand", "topLight"];
const MORPH_MS = 600;

const FRAME = "absolute inset-0 size-full";
const LAYER_COLOR: Record<StoryLayer, string> = {
  soft: "text-(--ils-soft)",
  topSoft: "text-(--ils-soft)",
  ink: "text-(--ils-ink)",
  top: "text-(--ils-ink)",
  sheen: "text-(--ils-sheen)",
  brand: "text-(--ils-brand) transition-colors duration-400 ease-out",
  topBrand: "text-(--ils-brand) transition-colors duration-400 ease-out",
  light: "text-(--ils-light)",
  topLight: "text-(--ils-light)",
};

const fromBeat = (step: number) => step;

function Layer({ layer, d, className = "" }: { layer: StoryLayer; d?: string; className?: string }) {
  return (
    <Remold.Icon
      className={`${FRAME} ${LAYER_COLOR[layer]} ${className}`}
      path={d ?? POINT}
      viewBox={VIEW_BOX}
      fill="currentColor"
      aria-hidden="true"
    />
  );
}

export function StoryFrame({
  className = "",
  shown = false,
  children,
}: {
  className?: string;
  shown?: boolean;
  children: ReactNode;
}) {
  return (
    <svg
      data-shown={shown || undefined}
      className={`${FRAME} opacity-0 transition-opacity duration-300 ease-out in-data-morphing:opacity-0! data-shown:opacity-100 ${className}`}
      viewBox={VIEW_BOX}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IllustratedStory({
  stages,
  stage,
  onStageChange,
  label,
  colors = STORY_COLORS,
  artClassName = "",
  under,
  extras,
  over,
  steps = true,
}: IllustratedStoryProps) {
  const current = stages[stage]!;
  const motion = current.motion ?? {};
  const [morphing, setMorphing] = useState(false);

  useEffect(() => {
    setMorphing(true);
    const timer = setTimeout(() => setMorphing(false), MORPH_MS);
    return () => clearTimeout(timer);
  }, [stage]);

  return (
    <section
      className={`grid w-[min(100%,420px)] justify-items-center gap-3.5 text-center text-(--ils-ink) ${BASE} ${colors}`}
      aria-label={label}
    >
      <div
        data-stage={current.id}
        data-morphing={morphing || undefined}
        className={`relative aspect-[160/128] w-[min(100%,380px)] data-morphing:[&_*]:animate-none! motion-reduce:[&_*]:animate-none! ${artClassName}`}
        role="img"
        aria-label={current.label}
      >
        <svg className={FRAME} viewBox={VIEW_BOX} aria-hidden="true">
          <ellipse cx="80" cy="114" rx="58" ry="5" className="fill-[rgb(0_0_0/0.06)] dark:fill-[rgb(0_0_0/0.35)]" />
        </svg>
        {under}
        <Layer layer="soft" d={current.art.soft} className={`origin-[50%_88%] ${motion.soft ?? ""}`} />
        <div className={`${FRAME} origin-[50%_88%] ${motion.body ?? ""}`}>
          {BODY.map((layer) => (
            <Layer key={layer} layer={layer} d={current.art[layer]} />
          ))}
          {extras}
          <div className={`${FRAME} ${motion.part ?? ""}`}>
            {PART.map((layer) => (
              <Layer key={layer} layer={layer} d={current.art[layer]} />
            ))}
          </div>
        </div>
        {over}
      </div>

      <div className="grid gap-1" aria-live="polite">
        <Remold.Text className="text-[22px] leading-[1.2] font-[650] tracking-[-0.015em]">{current.title}</Remold.Text>
        <Remold.Text className="text-[14px] text-(--ils-muted) tabular-nums">{current.line}</Remold.Text>
      </div>

      {steps && (
        <ol
          className="m-0 mt-1 grid list-none gap-1.5 p-0"
          style={{ gridTemplateColumns: `repeat(${stages.length}, 40px)` }}
        >
          {stages.map((entry, index) => (
            <li key={entry.id}>
              <button
                type="button"
                data-state={index < stage ? "done" : index === stage ? "current" : "next"}
                className="relative block h-1 w-full cursor-pointer overflow-hidden rounded-full border-0 bg-(--ils-track) p-0 before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-[''] after:absolute after:inset-0 after:origin-left after:rounded-[inherit] after:bg-(--ils-brand) after:[transform:scaleX(0)] after:[transition:transform_0.45s_cubic-bezier(0.22,1,0.36,1)] after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--ils-ink) data-[state=current]:after:[transform:scaleX(1)] data-[state=done]:after:[transform:scaleX(1)] motion-reduce:after:transition-none"
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

export function useStory(ms: readonly number[], playing?: boolean) {
  const [beats] = useState(() => ms.map((duration) => ({ ms: duration })));
  return useScene(beats, fromBeat, playing ?? true);
}
