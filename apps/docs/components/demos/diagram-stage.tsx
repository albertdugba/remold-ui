"use client";

import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { lineSkin, type Diagram, type DiagramOptions } from "@remold-ui/canvas";
import { useState, type ReactNode } from "react";
import { useDiagram } from "./use-diagram";

export type Say = (line: string) => void;

type Skin = "line" | "solid";

const PAPER = "#ffffff";
const INK = "#18181b";
const ERROR = "#dc2626";
const LINE_STRENGTH = 0.7;

const MONO = "font-[ui-monospace,'SF_Mono',Menlo,monospace]";
const STAGE = "not-prose relative col-span-full grid min-h-[520px] w-full overflow-hidden bg-white font-sans shadow-[inset_0_0_0_1px_rgb(24_24_27/0.08)]";
const READOUT = `${MONO} min-w-0 truncate text-[12px] text-[#8a8a92] [&_b]:font-medium [&_b]:text-[#27272a]`;
export const STAGE_BUTTON = `${MONO} h-8 cursor-pointer rounded-lg px-3 text-[12px] text-[#52525b] shadow-[inset_0_0_0_1px_rgb(24_24_27/0.12)] transition-[color,box-shadow] duration-150 ease-out hover:text-[#18181b] hover:shadow-[inset_0_0_0_1px_rgb(24_24_27/0.28)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18181b]`;
const SWITCH = `${MONO} h-7 cursor-pointer rounded-md px-2.5 text-[11.5px] capitalize text-[#8a8a92] shadow-[inset_0_0_0_1px_rgb(24_24_27/0.1)] transition-[color,box-shadow] duration-150 ease-out data-pressed:text-[#18181b] data-pressed:shadow-[inset_0_0_0_1px_rgb(24_24_27/0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18181b]`;

export interface DiagramStageProps {
  title: string;
  /** Its figure number, shown in the corner, such as "0.1". */
  figure: string;
  /** A word or two before the live caption. */
  tag: string;
  /** The solid drawing. The line skin takes its accent from `colors.packet`. */
  options: () => DiagramOptions;
  script: (diagram: Diagram, say: Say) => Promise<void>;
  /** The caption before the story starts. */
  first: string;
  /** Buttons of the figure's own, for viewers to play with it. */
  controls?: (diagram: Diagram | null, say: Say) => ReactNode;
}

function lineOptions(options: DiagramOptions): DiagramOptions {
  return { ...options, skin: lineSkin({ ink: INK, paper: PAPER, error: ERROR, strength: LINE_STRENGTH, accent: options.colors?.packet }) };
}

function SkinSwitch({ skin, onChange }: { skin: Skin; onChange: (skin: Skin) => void }) {
  return (
    <ToggleGroup
      aria-label="Illustration style"
      value={[skin]}
      onValueChange={(values) => {
        const picked = values[0];

        if (picked) onChange(picked as Skin);
      }}
      className="absolute top-5 right-6 z-10 flex gap-1"
    >
      {(["line", "solid"] as const).map((option) => (
        <Toggle key={option} value={option} className={SWITCH}>
          {option}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}

function Stage({
  skin,
  onSkinChange,
  title,
  figure,
  tag,
  options,
  script,
  first,
  controls,
}: DiagramStageProps & { skin: Skin; onSkinChange: (skin: Skin) => void }) {
  const [line, setLine] = useState(first);
  const { canvasRef, diagram, paused, togglePause, replay } = useDiagram(
    () => (skin === "line" ? lineOptions(options()) : options()),
    (diagram) => script(diagram, setLine),
  );

  return (
    <section className={STAGE} aria-label={title}>
      <span aria-hidden="true" className={`${MONO} absolute top-6 left-6 text-[11px] tracking-[0.06em] text-[#a1a1aa]`}>
        FIG {figure}
      </span>
      <SkinSwitch skin={skin} onChange={onSkinChange} />
      <canvas ref={canvasRef} className="relative block h-[460px] w-full" />
      <div className="absolute right-6 bottom-5 left-6 flex items-center justify-between gap-3">
        <p className={READOUT} aria-live="polite">
          <b>{tag}</b> · {line}
        </p>
        <span className="flex flex-none gap-1.5">
          {controls?.(diagram, setLine)}
          <button type="button" onClick={togglePause} className={STAGE_BUTTON}>
            {paused ? "Play" : "Pause"}
          </button>
          <button type="button" onClick={replay} className={STAGE_BUTTON}>
            Replay
          </button>
        </span>
      </div>
    </section>
  );
}

export function DiagramStage(props: DiagramStageProps) {
  const [skin, setSkin] = useState<Skin>("line");

  return <Stage key={skin} {...props} skin={skin} onSkinChange={setSkin} />;
}
